import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/components/ui/Toast';
import { today, uid } from '@/lib/date';
import { filterDueFlashcards, gradeWithFSRS } from '@/lib/srs';
import { Rating } from 'ts-fsrs';
import { importApkg, exportApkg } from '@/lib/anki';
import type { Deck, Flashcard } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

type AITarget = 'new' | string[];

const renderText = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return <img key={i} src={match[2]} alt={match[1]} className="fc-img" />;
    }
    return (
      <span key={i} className="fc-text">
        {part}
      </span>
    );
  });
};

export function Flashcards(): JSX.Element {
  const { t } = useTranslation();
  const decks = useAppStore((s) => s.decks);
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);
  const incrementDailyLog = useAppStore((s) => s.incrementDailyLog);

  const [curDeck, setCurDeck] = useState<string | null>(null);
  const [curCardId, setCurCardId] = useState<string | null>(null);
  const [showAns, setShowAns] = useState<boolean>(false);
  const [newDeckName, setNewDeckName] = useState<string>('');
  const [cardInputs, setCardInputs] = useState<Record<string, { q: string; a: string; s: string }>>(
    {},
  );

  const [aiTopic, setAiTopic] = useState('');
  const [aiFile, setAiFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [aiCount, setAiCount] = useState<number>(5);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState<AITarget>('new');

  const deck = useMemo<Deck | null>(
    () => (curDeck ? (decks.find((d) => d.id === curDeck) ?? null) : null),
    [curDeck, decks],
  );
  const card = useMemo<Flashcard | null>(
    () => (deck && curCardId ? (deck.cards.find((c) => c.id === curCardId) ?? null) : null),
    [deck, curCardId],
  );

  const addDeck = (): void => {
    const name = newDeckName.trim();
    if (!name) return;
    patch({ decks: [...decks, { id: uid(), name, cards: [] }] });
    save();
    setNewDeckName('');
  };

  const deleteDeck = (id: string): void => {
    patch({ decks: decks.filter((d) => d.id !== id) });
    if (curDeck === id) {
      setCurDeck(null);
      setCurCardId(null);
    }
    setAiTarget((prev) => (Array.isArray(prev) ? prev.filter((tid) => tid !== id) : prev));
    save();
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim() && !aiFile) return;
    if (Array.isArray(aiTarget) && aiTarget.length === 0) return;
    setIsAiLoading(true);
    try {
      const payload: {
        count: number;
        language: string;
        text?: string;
        fileData?: string;
        mimeType?: string;
      } = {
        count: aiCount,
        language: 'ca',
      };
      if (aiTopic.trim()) payload.text = aiTopic;
      if (aiFile) {
        payload.fileData = aiFile.data;
        payload.mimeType = aiFile.type;
      }

      const fetchWithRetry = async (attempt = 0): Promise<Response> => {
        const r = await fetch(`${WORKER_URL}/generate-cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!r.ok && (r.status === 503 || r.status === 500) && attempt < 2) {
          await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
          return fetchWithRetry(attempt + 1);
        }
        return r;
      };

      const res = await fetchWithRetry();

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        const reason = errBody.error || `${res.status}`;
        if (res.status === 429) {
          throw new Error("Has superat el límit diari d'ús de la IA (30 peticions).");
        }
        if (/high demand|overloaded|503/i.test(reason)) {
          throw new Error('La IA està saturada ara mateix. Torna-ho a provar en uns segons.');
        }
        throw new Error(`No s'ha pogut generar: ${reason}`);
      }
      const data: { q: string; a: string }[] = await res.json();

      if (data && typeof data === 'object' && !Array.isArray(data) && 'error' in data) {
        throw new Error(`No s'ha pogut generar: ${(data as { error: string }).error}`);
      }

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('La IA no ha generat cap targeta.');
      }

      // Read fresh state after the async fetch so concurrent mutations aren't lost
      const freshDecks = useAppStore.getState().decks;

      // Factory: fresh ids per call so fan-out has unique ids per deck
      const mkCards = (): Flashcard[] =>
        data.map((c) => ({
          id: uid(),
          q: c.q,
          a: c.a,
          subject: 'General',
          hits: 0,
          sessionHits: 0,
          nextReview: today(),
          strength: 0,
          interval: 1,
          lastSeen: null,
        }));

      const targetIds = Array.isArray(aiTarget) ? new Set(aiTarget) : null;
      const validTargets = targetIds ? freshDecks.filter((d) => targetIds.has(d.id)) : [];

      if (aiTarget === 'new') {
        const newDeck: Deck = {
          id: uid(),
          name: `Generat: ${aiTopic.substring(0, 15) || 'Apunts'}...`,
          cards: mkCards(),
        };
        patch({ decks: [newDeck, ...freshDecks] });
      } else {
        if (validTargets.length === 0) {
          showToast({
            title: 'Error',
            desc: 'Cap deck seleccionat ja no existeix.',
            kind: 'info',
          });
          return;
        }
        const updated = freshDecks.map((d) =>
          targetIds!.has(d.id) ? { ...d, cards: [...d.cards, ...mkCards()] } : d,
        );
        patch({ decks: updated });
      }

      save();
      setAiTopic('');
      setAiFile(null);
      const targetCount = Array.isArray(aiTarget) ? validTargets.length : 0;
      showToast({
        title: '✨ Fet!',
        desc:
          aiTarget === 'new'
            ? `S'han generat ${data.length} flashcards.`
            : `S'han afegit ${data.length} flashcards a ${targetCount} ${targetCount === 1 ? 'deck' : 'decks'}.`,
      });
    } catch (error: unknown) {
      showToast({
        title: 'Error',
        desc: error instanceof Error ? error.message : 'Error desconegut',
        kind: 'info',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast({ title: 'Error', desc: 'El fitxer és massa gran (màx. 5MB)', kind: 'info' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64Data = result.split(',')[1];
      if (base64Data) {
        setAiFile({ name: file.name, type: file.type, data: base64Data });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAnkiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const newDeck = await importApkg(file);
      patch({ decks: [...useAppStore.getState().decks, newDeck] });
      save();
      showToast({
        title: 'Importació exitosa',
        desc: `S'han importat ${newDeck.cards.length} targetes.`,
      });
    } catch (err: unknown) {
      showToast({
        title: 'Error',
        desc: err instanceof Error ? err.message : 'Error desconegut',
        kind: 'info',
      });
    }
    e.target.value = '';
  };

  const handleAnkiExport = async (deckToExport: Deck) => {
    try {
      const zipBlob = await exportApkg(deckToExport);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deckToExport.name}.apkg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      showToast({
        title: 'Error',
        desc: err instanceof Error ? err.message : 'Error desconegut',
        kind: 'info',
      });
    }
  };

  const addCard = (deckId: string): void => {
    const inp = cardInputs[deckId] ?? { q: '', a: '', s: '' };
    if (!inp.q.trim() || !inp.a.trim()) return;
    const next = decks.map((d) =>
      d.id === deckId
        ? {
            ...d,
            cards: [
              ...d.cards,
              {
                id: uid(),
                q: inp.q,
                a: inp.a,
                subject: inp.s || 'General',
                hits: 0,
                sessionHits: 0,
                nextReview: today(),
                strength: 0,
                interval: 1,
                lastSeen: null,
              },
            ],
          }
        : d,
    );
    patch({ decks: next });
    save();
    setCardInputs((prev) => ({ ...prev, [deckId]: { q: '', a: '', s: '' } }));
  };

  const deleteCard = (deckId: string, cardId: string): void => {
    const next = decks.map((d) =>
      d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
    );
    patch({ decks: next });
    save();
  };

  const startReview = (deckId: string): void => {
    const d = decks.find((x) => x.id === deckId);
    if (!d) return;
    const due = filterDueFlashcards(d.cards);
    if (due.length === 0) return;
    const next = decks.map((x) =>
      x.id === deckId ? { ...x, cards: x.cards.map((c) => ({ ...c, sessionHits: 0 })) } : x,
    );
    patch({ decks: next });
    setCurDeck(deckId);
    setCurCardId(due[0]!.id);
    setShowAns(false);
  };

  const grade = (rating: Rating): void => {
    if (!deck || !card) return;
    const correct = rating !== Rating.Again;

    const mutableDecks = decks.map((d) =>
      d.id === deck.id
        ? {
            ...d,
            cards: d.cards.map((c) => (c.id === card.id ? gradeWithFSRS({ ...c }, rating) : c)),
          }
        : d,
    );

    patch({ decks: mutableDecks });
    incrementDailyLog({ cards: 1, correct: correct ? 1 : 0 });
    if (correct) addXP(5);
    save();

    const freshDeck = mutableDecks.find((d) => d.id === deck.id);
    if (!freshDeck) return;
    const due = filterDueFlashcards(freshDeck.cards).filter((c) => c.sessionHits < 3);
    if (due.length > 0) {
      due.sort((a, b) => (a.sessionHits ?? 0) - (b.sessionHits ?? 0));
      setCurCardId(due[0]!.id);
      setShowAns(false);
    } else {
      setCurCardId(null);
      setCurDeck(null);
      showToast({ title: t('cards.sessionDone'), desc: t('cards.sessionDoneDesc') });
    }
  };

  const setInput = (deckId: string, key: 'q' | 'a' | 's', value: string): void => {
    setCardInputs((prev) => ({
      ...prev,
      [deckId]: { ...{ q: '', a: '', s: '' }, ...prev[deckId], [key]: value },
    }));
  };

  // ── REVIEW MODE ──────────────────────────────────────────────────
  if (deck && card) {
    const due = filterDueFlashcards(deck.cards);
    const remaining = due.filter((c) => c.sessionHits < 3).length;
    const hits = card.sessionHits ?? 0;
    return (
      <div className="sec">
        <div className="fc-review-hdr">
          <div>
            <h2 className="fc-review-title">{deck.name}</h2>
            <p className="fc-review-sub">{t('cards.rule3')}</p>
          </div>
          <button
            className="bs"
            onClick={() => {
              setCurDeck(null);
              setCurCardId(null);
            }}
          >
            {t('cards.exit')}
          </button>
        </div>

        <div className="fc-badges">
          <span className="badge badge-a">{t('cards.pending', { n: remaining })}</span>
          <span className="badge badge-ok">{t('cards.session', { n: hits })}</span>
          <span className="badge badge-p">{t('cards.strength', { n: card.strength })}</span>
        </div>

        <div className="fc-session-bars">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`fc-session-bar${hits > i ? ' done' : ''}`} />
          ))}
        </div>

        <div
          className={`flip-card fc-flip-wrap${showAns ? ' flipped' : ''}`}
          onClick={() => !showAns && setShowAns(true)}
          style={{ cursor: showAns ? 'default' : 'pointer' }}
        >
          <div className="flip-card-inner">
            <div className="flip-card-front">
              <div className="fc-card-subject">{card.subject || t('cards.defaultSubject')}</div>
              <div className="fc-card-q">{renderText(card.q)}</div>
              <div className="fc-card-hint">{t('cards.tapReveal')}</div>
            </div>
            <div className="flip-card-back">
              <div className="fc-card-ans-lbl">Resposta</div>
              <div className="fc-card-a">{renderText(card.a)}</div>
            </div>
          </div>
        </div>

        {showAns && (
          <div className="fc-grade-btns">
            <button className="bdanger grade-btn" onClick={() => grade(Rating.Again)}>
              <span className="grade-btn-label">Tornar a veure</span>
              <span className="grade-btn-sub">(Again)</span>
            </button>
            <button className="bs bs-warn grade-btn" onClick={() => grade(Rating.Hard)}>
              <span className="grade-btn-label">Difícil</span>
              <span className="grade-btn-sub">(Hard)</span>
            </button>
            <button className="bp bp-ok grade-btn" onClick={() => grade(Rating.Good)}>
              <span className="grade-btn-label">Bé</span>
              <span className="grade-btn-sub">(Good)</span>
            </button>
            <button className="bp bp-info grade-btn" onClick={() => grade(Rating.Easy)}>
              <span className="grade-btn-label">Fàcil</span>
              <span className="grade-btn-sub">(Easy)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── DECK LIST MODE ────────────────────────────────────────────────
  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.cards.title')}</h2>
        <p>{t('headers.cards.desc')}</p>
      </div>

      <div className="c deck-create-row">
        <div className="deck-name-input">
          <label className="lbl">{t('cards.newDeck')}</label>
          <input
            className="inp"
            placeholder={t('cards.newDeckPh')}
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDeck()}
          />
        </div>
        <button className="bp" onClick={addDeck}>
          {t('cards.createDeck')}
        </button>
        <label className="bs anki-import-btn">
          📦 Importar Anki
          <input
            type="file"
            accept=".apkg"
            style={{ display: 'none' }}
            onChange={handleAnkiImport}
          />
        </label>
      </div>

      {/* Always-visible AI generation panel */}
      <div className="c" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              background: 'var(--s2)',
              color: 'var(--a)',
              padding: 12,
              borderRadius: 12,
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🧠
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: 4, fontSize: 15 }}>
              Extracció de Conceptes (IA)
            </strong>
            <span style={{ fontSize: 13, color: 'var(--tm)', display: 'block', marginBottom: 12 }}>
              Pots escriure el text o pujar els teus apunts en imatge o PDF per extreure les
              targetes clau.
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiFile ? (
                <div
                  style={{
                    padding: 12,
                    background: 'var(--sh)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📄 {aiFile.name}</div>
                  <button className="bi" onClick={() => setAiFile(null)}>
                    ✕
                  </button>
                </div>
              ) : (
                <label
                  className="inp"
                  style={{
                    borderStyle: 'dashed',
                    textAlign: 'center',
                    padding: '24px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 24 }}>📥</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Pujar fitxer (PDF o Imatge)</span>
                  <span style={{ fontSize: 11, color: 'var(--tm)' }}>Fins a 5MB</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                </label>
              )}

              <textarea
                className="inp"
                placeholder="O bé, enganxa els teus apunts aquí..."
                style={{ minHeight: 80 }}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                disabled={isAiLoading}
              />

              {/* Target selector */}
              <div>
                <div className="lbl">{t('cards.aiTarget.label')}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <label
                    style={{
                      display: 'flex',
                      gap: 6,
                      cursor: 'pointer',
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="ai-target"
                      checked={aiTarget === 'new'}
                      onChange={() => setAiTarget('new')}
                    />
                    {t('cards.aiTarget.new')}
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      gap: 6,
                      cursor: 'pointer',
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="ai-target"
                      checked={Array.isArray(aiTarget)}
                      onChange={() => setAiTarget([])}
                      disabled={decks.length === 0}
                    />
                    {t('cards.aiTarget.existing')}
                  </label>
                </div>
                {Array.isArray(aiTarget) && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      marginBottom: 8,
                      maxHeight: 140,
                      overflowY: 'auto',
                      padding: 8,
                      background: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {decks.map((d) => (
                      <label
                        key={d.id}
                        style={{ display: 'flex', gap: 8, cursor: 'pointer', fontSize: 13 }}
                      >
                        <input
                          type="checkbox"
                          checked={aiTarget.includes(d.id)}
                          onChange={(e) => {
                            setAiTarget((prev) => {
                              if (!Array.isArray(prev)) return prev;
                              return e.target.checked
                                ? [...prev, d.id]
                                : prev.filter((id) => id !== d.id);
                            });
                          }}
                        />
                        {d.name} <span style={{ color: 'var(--tm)' }}>({d.cards.length})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="inp"
                  style={{ flex: 1 }}
                  value={aiCount}
                  onChange={(e) => setAiCount(Number(e.target.value))}
                  disabled={isAiLoading}
                >
                  <option value="5">5 targetes</option>
                  <option value="10">10 targetes</option>
                  <option value="20">20 targetes</option>
                </select>
                <button
                  className="bp"
                  style={{ flex: 2 }}
                  onClick={handleAIGenerate}
                  disabled={
                    isAiLoading ||
                    (!aiTopic.trim() && !aiFile) ||
                    (Array.isArray(aiTarget) && aiTarget.length === 0)
                  }
                >
                  {isAiLoading ? 'Analitzant i Generant...' : '✨ Extreure Conceptes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {decks.length === 0 && (
        <div className="c glow fc-empty-body">
          <div className="fc-empty-icon">🧠</div>
          <h3 className="fc-empty-title">Comença a estudiar amb Flashcards</h3>
          <p className="fc-empty-desc">
            Les targetes de memòria (flashcards) fan servir la repetició espaiada per garantir que
            no oblidis el que aprens. Tens diverses maneres de començar:
          </p>
          <div className="fc-empty-steps">
            <div className="fc-empty-step">
              <div className="fc-step-icon badge-a">✍️</div>
              <div>
                <strong className="fc-ai-title">1. Crea targetes manualment</strong>
                <span className="fc-ai-desc">
                  Fes servir el formulari de dalt per crear un deck i anar afegint preguntes i
                  respostes.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  background: 'var(--s2)',
                  color: 'var(--a)',
                  padding: 8,
                  borderRadius: 8,
                  fontSize: 16,
                }}
              >
                🧠
              </div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>
                  2. Extracció de Conceptes (IA)
                </strong>
                <span style={{ fontSize: 13, color: 'var(--tm)' }}>
                  Fes servir el panell de dalt per extreure targetes des de text o fitxers
                  PDF/imatge.
                </span>
              </div>
            </div>
            <div className="fc-empty-step">
              <div className="fc-step-icon badge-ok">📦</div>
              <div>
                <strong className="fc-ai-title">3. Importa un fitxer d'Anki (.apkg)</strong>
                <span className="fc-ai-desc">
                  Si ja fas servir Anki, pots importar els teus decks directament fent clic al botó
                  "Importar Anki".
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {decks.map((dk) => {
        const due = filterDueFlashcards(dk.cards);
        const avgStr =
          dk.cards.length > 0
            ? Math.round(dk.cards.reduce((s, c) => s + c.strength, 0) / dk.cards.length)
            : 0;
        const inp = cardInputs[dk.id] ?? { q: '', a: '', s: '' };
        return (
          <div key={dk.id} className="c glow">
            <div className="deck-hdr">
              <div>
                <h3 className="deck-title">{dk.name}</h3>
                <span className="deck-sub">
                  {t('cards.deckSummary', { cards: dk.cards.length, due: due.length, avg: avgStr })}
                </span>
              </div>
              <div className="deck-actions">
                {due.length > 0 ? (
                  <button className="bp" onClick={() => startReview(dk.id)}>
                    {t('cards.study', { n: due.length })}
                  </button>
                ) : (
                  <span className="badge badge-ok">{t('cards.allClear')}</span>
                )}
                <button
                  className="bs bs-sm"
                  onClick={() => handleAnkiExport(dk)}
                  title="Exportar a Anki (.apkg)"
                >
                  ⬇️ Exportar
                </button>
                <button className="bi" onClick={() => deleteDeck(dk.id)}>
                  🗑
                </button>
              </div>
            </div>
            <div className="pb mb-3.5">
              <div
                className="fill"
                style={{
                  width: `${avgStr}%`,
                  background: 'linear-gradient(90deg,var(--ok),var(--okd))',
                }}
              />
            </div>
            <div className="deck-inputs">
              <input
                className="inp deck-input-q"
                placeholder={t('cards.phQuestion')}
                value={inp.q}
                onChange={(e) => setInput(dk.id, 'q', e.target.value)}
              />
              <input
                className="inp deck-input-a"
                placeholder={t('cards.phAnswer')}
                value={inp.a}
                onChange={(e) => setInput(dk.id, 'a', e.target.value)}
              />
              <input
                className="inp deck-input-s"
                placeholder={t('cards.phSubject')}
                value={inp.s}
                onChange={(e) => setInput(dk.id, 's', e.target.value)}
              />
              <button className="bp" onClick={() => addCard(dk.id)}>
                +
              </button>
            </div>
            {dk.cards.length > 0 && (
              <div className="card-list">
                {dk.cards.slice(0, 20).map((c) => {
                  const dotColor =
                    c.strength >= 70 ? 'var(--ok)' : c.strength >= 30 ? 'var(--w)' : 'var(--err)';
                  const tagBg = c.strength >= 70 ? 'var(--okl)' : 'var(--bg)';
                  const tagColor = c.strength >= 70 ? 'var(--ok)' : 'var(--tm)';
                  return (
                    <div key={c.id} className="card-item">
                      <div className="card-dot" style={{ background: dotColor }} />
                      <span className="card-q">{c.q}</span>
                      <span className="card-hits">{c.sessionHits ?? 0}/3</span>
                      <span className="tag" style={{ background: tagBg, color: tagColor }}>
                        {c.strength}%
                      </span>
                      <button className="bi bs-sm" onClick={() => deleteCard(dk.id, c.id)}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
