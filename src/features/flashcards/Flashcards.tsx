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

const renderText = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <img 
          key={i} 
          src={match[2]} 
          alt={match[1]} 
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: 8, objectFit: 'contain' }} 
        />
      );
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
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

  // AI Generation State
  const [aiTopic, setAiTopic] = useState('');
  const [aiFile, setAiFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [aiCount, setAiCount] = useState<number>(5);
  const [isAiLoading, setIsAiLoading] = useState(false);

  type AITarget = 'new' | string[];
  const [aiTarget, setAiTarget] = useState<AITarget>('new');

  const deck = useMemo<Deck | null>(
    () => (curDeck ? decks.find((d) => d.id === curDeck) ?? null : null),
    [curDeck, decks],
  );
  const card = useMemo<Flashcard | null>(
    () => (deck && curCardId ? deck.cards.find((c) => c.id === curCardId) ?? null : null),
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
    save();
  };

  const handleAIGenerate = async () => {
    if (!aiTopic.trim() && !aiFile) return;
    if (Array.isArray(aiTarget) && aiTarget.length === 0) return;
    setIsAiLoading(true);
    try {
      const payload: { count: number; language: string; text?: string; fileData?: string; mimeType?: string } = {
        count: aiCount,
        language: 'ca',
      };
      if (aiTopic.trim()) payload.text = aiTopic;
      if (aiFile) {
        payload.fileData = aiFile.data;
        payload.mimeType = aiFile.type;
      }

      const res = await fetch(`${WORKER_URL}/generate-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error de connexió amb la IA');
      const data: { q: string; a: string }[] = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('La IA no ha generat cap targeta.');
      }

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

      if (aiTarget === 'new') {
        const newDeck: Deck = {
          id: uid(),
          name: `Generat: ${aiTopic.substring(0, 15) || 'Apunts'}...`,
          cards: mkCards(),
        };
        patch({ decks: [newDeck, ...decks] });
      } else {
        const targetIds = new Set(aiTarget);
        const updated = decks.map((d) =>
          targetIds.has(d.id) ? { ...d, cards: [...d.cards, ...mkCards()] } : d,
        );
        patch({ decks: updated });
      }

      save();
      setAiTopic('');
      setAiFile(null);
      showToast({
        title: '✨ Fet!',
        desc:
          aiTarget === 'new'
            ? `S'han generat ${data.length} flashcards.`
            : `S'han afegit ${data.length} flashcards a ${(aiTarget as string[]).length} ${(aiTarget as string[]).length === 1 ? 'deck' : 'decks'}.`,
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
      showToast({ title: 'Importació exitosa', desc: `S'han importat ${newDeck.cards.length} targetes.` });
    } catch (err: unknown) {
      showToast({ title: 'Error', desc: err instanceof Error ? err.message : 'Error desconegut', kind: 'info' });
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
      showToast({ title: 'Error', desc: err instanceof Error ? err.message : 'Error desconegut', kind: 'info' });
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
      x.id === deckId
        ? { ...x, cards: x.cards.map((c) => ({ ...c, sessionHits: 0 })) }
        : x,
    );
    patch({ decks: next });
    setCurDeck(deckId);
    setCurCardId(due[0]!.id);
    setShowAns(false);
  };

  const grade = (rating: Rating): void => {
    if (!deck || !card) return;
    const correct = rating !== Rating.Again;

    // Mutate the specific card through a fresh copy.
    const mutableDecks = decks.map((d) =>
      d.id === deck.id
        ? {
            ...d,
            cards: d.cards.map((c) =>
              c.id === card.id ? gradeWithFSRS({ ...c }, rating) : c,
            ),
          }
        : d,
    );

    patch({ decks: mutableDecks });
    incrementDailyLog({ cards: 1, correct: correct ? 1 : 0 });
    if (correct) addXP(5);
    save();

    // Pick next due card (not yet graduated this session).
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

  // Review mode
  if (deck && card) {
    const due = filterDueFlashcards(deck.cards);
    const remaining = due.filter((c) => c.sessionHits < 3).length;
    return (
      <div className="sec">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{deck.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--ts)' }}>
              {t('cards.rule3')}
            </p>
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background: 'var(--al)', color: 'var(--a)' }}>
            {t('cards.pending', { n: remaining })}
          </span>
          <span className="badge" style={{ background: 'var(--okl)', color: 'var(--ok)' }}>
            {t('cards.session', { n: card.sessionHits ?? 0 })}
          </span>
          <span className="badge" style={{ background: 'var(--pl)', color: 'var(--p)' }}>
            {t('cards.strength', { n: card.strength })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 7,
                borderRadius: 4,
                background:
                  (card.sessionHits ?? 0) > i
                    ? 'linear-gradient(90deg,var(--ok),var(--okd))'
                    : 'var(--bl)',
                transition: '.3s',
              }}
            />
          ))}
        </div>
        <div 
          className={`flip-card ${showAns ? 'flipped' : ''}`} 
          onClick={() => !showAns && setShowAns(true)}
          style={{ cursor: showAns ? 'default' : 'pointer', margin: '24px 0' }}
        >
          <div className="flip-card-inner">
            <div className="flip-card-front">
              <div style={{ fontSize: 11, color: 'var(--tm)', position: 'absolute', top: 16, left: 16 }}>
                {card.subject || t('cards.defaultSubject')}
              </div>
              <div className="q" style={{ fontSize: 24, fontWeight: 800, textAlign: 'center' }}>
                {renderText(card.q)}
              </div>
              <div className="hint" style={{ position: 'absolute', bottom: 16, color: 'var(--ts)', fontSize: 13, animation: 'pulseGlow 2s infinite alternate' }}>
                {t('cards.tapReveal')}
              </div>
            </div>
            <div className="flip-card-back">
              <div style={{ fontSize: 11, color: 'var(--ts)', position: 'absolute', top: 16, left: 16 }}>
                Resposta
              </div>
              <div className="a" style={{ fontSize: 20, textAlign: 'center' }}>
                {renderText(card.a)}
              </div>
            </div>
          </div>
        </div>
        {showAns && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="bdanger"
              style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              onClick={() => grade(Rating.Again)}
            >
              <span style={{ fontWeight: 800 }}>Tornar a veure</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>(Again)</span>
            </button>
            <button
              className="bs"
              style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', borderColor: 'var(--w)', color: 'var(--w)' }}
              onClick={() => grade(Rating.Hard)}
            >
              <span style={{ fontWeight: 800 }}>Difícil</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>(Hard)</span>
            </button>
            <button
              className="bp"
              style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(135deg,var(--ok),var(--okd))' }}
              onClick={() => grade(Rating.Good)}
            >
              <span style={{ fontWeight: 800 }}>Bé</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>(Good)</span>
            </button>
            <button
              className="bp"
              style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
              onClick={() => grade(Rating.Easy)}
            >
              <span style={{ fontWeight: 800 }}>Fàcil</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>(Easy)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.cards.title')}</h2>
        <p>{t('headers.cards.desc')}</p>
      </div>
      <div
        className="c"
        style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
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
        <label className="bs" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '12px 18px', gap: 6 }}>
          📦 Importar Anki
          <input type="file" accept=".apkg" style={{ display: 'none' }} onChange={handleAnkiImport} />
        </label>
      </div>
      {/* Always-visible AI generation panel */}
      <div className="c" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ background: 'var(--s2)', color: 'var(--a)', padding: 12, borderRadius: 12, fontSize: 20, flexShrink: 0 }}>🧠</div>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: 4, fontSize: 15 }}>Extracció de Conceptes (IA)</strong>
            <span style={{ fontSize: 13, color: 'var(--tm)', display: 'block', marginBottom: 12 }}>Pots escriure el text o pujar els teus apunts en imatge o PDF per extreure les targetes clau.</span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {aiFile ? (
                <div style={{ padding: 12, background: 'var(--sh)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📄 {aiFile.name}</div>
                  <button className="bi" onClick={() => setAiFile(null)}>✕</button>
                </div>
              ) : (
                <label className="inp" style={{ borderStyle: 'dashed', textAlign: 'center', padding: '24px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 24 }}>📥</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Pujar fitxer (PDF o Imatge)</span>
                  <span style={{ fontSize: 11, color: 'var(--tm)' }}>Fins a 5MB</span>
                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
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
                <div className="lbl">{t('flashcards.aiTarget.label')}</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                  <label style={{ display: 'flex', gap: 6, cursor: 'pointer', alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      checked={aiTarget === 'new'}
                      onChange={() => setAiTarget('new')}
                    />
                    {t('flashcards.aiTarget.new')}
                  </label>
                  <label style={{ display: 'flex', gap: 6, cursor: 'pointer', alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="radio"
                      checked={Array.isArray(aiTarget)}
                      onChange={() => setAiTarget([])}
                      disabled={decks.length === 0}
                    />
                    {t('flashcards.aiTarget.existing')}
                  </label>
                </div>
                {Array.isArray(aiTarget) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, maxHeight: 140, overflowY: 'auto', padding: 8, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    {decks.map((d) => (
                      <label key={d.id} style={{ display: 'flex', gap: 8, cursor: 'pointer', fontSize: 13 }}>
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
                <select className="inp" style={{ flex: 1 }} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} disabled={isAiLoading}>
                  <option value="5">5 targetes</option>
                  <option value="10">10 targetes</option>
                  <option value="20">20 targetes</option>
                </select>
                <button
                  className="bp"
                  style={{ flex: 2 }}
                  onClick={handleAIGenerate}
                  disabled={isAiLoading || (!aiTopic.trim() && !aiFile) || (Array.isArray(aiTarget) && aiTarget.length === 0)}
                >
                  {isAiLoading ? 'Analitzant i Generant...' : '✨ Extreure Conceptes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {decks.length === 0 && (
        <div className="c glow empty" style={{ padding: 40, marginTop: 20, textAlign: 'left' }}>
          <div style={{ fontSize: 40, marginBottom: 15 }}>🧠</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>Comença a estudiar amb Flashcards</h3>
          <p style={{ color: 'var(--ts)', marginBottom: 20, lineHeight: 1.5 }}>
            Les targetes de memòria (flashcards) fan servir la repetició espaiada per garantir que no oblidis el que aprens. Tens diverses maneres de començar:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--al)', color: 'var(--a)', padding: 8, borderRadius: 8, fontSize: 16 }}>✍️</div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>1. Crea targetes manualment</strong>
                <span style={{ fontSize: 13, color: 'var(--tm)' }}>Fes servir el formulari de dalt per crear un deck i anar afegint preguntes i respostes.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--s2)', color: 'var(--a)', padding: 8, borderRadius: 8, fontSize: 16 }}>🧠</div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>2. Extracció de Conceptes (IA)</strong>
                <span style={{ fontSize: 13, color: 'var(--tm)' }}>Fes servir el panell de dalt per extreure targetes des de text o fitxers PDF/imatge.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ background: 'var(--okl)', color: 'var(--ok)', padding: 8, borderRadius: 8, fontSize: 16 }}>📦</div>
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>3. Importa un fitxer d'Anki (.apkg)</strong>
                <span style={{ fontSize: 13, color: 'var(--tm)' }}>Si ja fas servir Anki, pots importar els teus decks directament fent clic al botó "Importar Anki".</span>
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800 }}>{dk.name}</h3>
                <span style={{ fontSize: 11, color: 'var(--ts)' }}>
                  {t('cards.deckSummary', { cards: dk.cards.length, due: due.length, avg: avgStr })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {due.length > 0 ? (
                  <button className="bp" onClick={() => startReview(dk.id)}>
                    {t('cards.study', { n: due.length })}
                  </button>
                ) : (
                  <span
                    className="badge"
                    style={{ background: 'var(--okl)', color: 'var(--ok)' }}
                  >
                    {t('cards.allClear')}
                  </span>
                )}
                <button className="bs" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => handleAnkiExport(dk)} title="Exportar a Anki (.apkg)">
                  ⬇️ Exportar
                </button>
                <button className="bi" onClick={() => deleteDeck(dk.id)}>
                  🗑
                </button>
              </div>
            </div>
            <div className="pb" style={{ marginBottom: 14 }}>
              <div
                className="fill"
                style={{
                  width: `${avgStr}%`,
                  background: 'linear-gradient(90deg,var(--ok),var(--okd))',
                }}
              />
            </div>
            <div
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}
            >
              <input
                className="inp"
                placeholder={t('cards.phQuestion')}
                style={{ flex: 2, minWidth: 180 }}
                value={inp.q}
                onChange={(e) => setInput(dk.id, 'q', e.target.value)}
              />
              <input
                className="inp"
                placeholder={t('cards.phAnswer')}
                style={{ flex: 2, minWidth: 180 }}
                value={inp.a}
                onChange={(e) => setInput(dk.id, 'a', e.target.value)}
              />
              <input
                className="inp"
                placeholder={t('cards.phSubject')}
                style={{ flex: 1, minWidth: 80 }}
                value={inp.s}
                onChange={(e) => setInput(dk.id, 's', e.target.value)}
              />
              <button className="bp" onClick={() => addCard(dk.id)}>
                +
              </button>
            </div>
            {dk.cards.length > 0 && (
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {dk.cards.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'var(--bg)',
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background:
                          c.strength >= 70
                            ? 'var(--ok)'
                            : c.strength >= 30
                              ? 'var(--w)'
                              : 'var(--err)',
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.q}
                    </span>
                    <span style={{ color: 'var(--ts)', fontSize: 10 }}>
                      {c.sessionHits ?? 0}/3
                    </span>
                    <span
                      className="tag"
                      style={{
                        background: c.strength >= 70 ? 'var(--okl)' : 'var(--bg)',
                        color: c.strength >= 70 ? 'var(--ok)' : 'var(--tm)',
                      }}
                    >
                      {c.strength}%
                    </span>
                    <button
                      className="bi"
                      style={{ fontSize: 10, padding: 3 }}
                      onClick={() => deleteCard(dk.id, c.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
