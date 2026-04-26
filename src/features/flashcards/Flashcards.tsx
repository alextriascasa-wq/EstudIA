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
          className="fc-img"
        />
      );
    }
    return <span key={i} className="fc-text">{part}</span>;
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
    setIsAiLoading(true);
    try {
      const payload: any = { count: aiCount, language: 'ca' };
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

      const newDeck: Deck = {
        id: uid(),
        name: `Generat: ${aiTopic.substring(0, 15)}...`,
        cards: data.map((c) => ({
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
        })),
      };

      patch({ decks: [newDeck, ...decks] });
      save();
      setAiTopic('');
      setAiFile(null);
      showToast({ title: '✨ Fet!', desc: `S'han generat ${data.length} flashcards.` });
    } catch (error: any) {
      showToast({ title: 'Error', desc: error.message, kind: 'info' });
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
    } catch (err: any) {
      showToast({ title: 'Error', desc: err.message, kind: 'info' });
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
    } catch (err: any) {
      showToast({ title: 'Error', desc: err.message, kind: 'info' });
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
              <div className="fc-card-subject">
                {card.subject || t('cards.defaultSubject')}
              </div>
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
          <input type="file" accept=".apkg" style={{ display: 'none' }} onChange={handleAnkiImport} />
        </label>
      </div>

      {decks.length === 0 && (
        <div className="c glow fc-empty-body">
          <div className="fc-empty-icon">🧠</div>
          <h3 className="fc-empty-title">Comença a estudiar amb Flashcards</h3>
          <p className="fc-empty-desc">
            Les targetes de memòria (flashcards) fan servir la repetició espaiada per garantir que no oblidis el que aprens. Tens diverses maneres de començar:
          </p>
          <div className="fc-empty-steps">
            <div className="fc-empty-step">
              <div className="fc-step-icon badge-a">✍️</div>
              <div>
                <strong className="fc-ai-title">1. Crea targetes manualment</strong>
                <span className="fc-ai-desc">Fes servir el formulari de dalt per crear un deck i anar afegint preguntes i respostes.</span>
              </div>
            </div>
            <div className="fc-empty-step">
              <div className="fc-step-icon-lg" style={{ background: 'var(--s2)', color: 'var(--a)' }}>🧠</div>
              <div className="fc-ai-section">
                <strong className="fc-ai-title">2. Extracció de Conceptes (IA)</strong>
                <span className="fc-ai-desc">Pots escriure el text o pujar els teus apunts en imatge o PDF per extreure les targetes clau.</span>
                <div className="fc-ai-inputs">
                  {aiFile ? (
                    <div className="fc-file-preview">
                      <div className="fc-file-name">📄 {aiFile.name}</div>
                      <button className="bi" onClick={() => setAiFile(null)}>✕</button>
                    </div>
                  ) : (
                    <label className="inp fc-upload-zone">
                      <span className="fc-upload-icon">📥</span>
                      <span className="fc-upload-label">Pujar fitxer (PDF o Imatge)</span>
                      <span className="fc-upload-limit">Fins a 5MB</span>
                      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                    </label>
                  )}
                  <textarea
                    className="inp"
                    placeholder="O bé, enganxa els teus apunts aquí..."
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    disabled={isAiLoading}
                  />
                  <div className="fc-ai-row">
                    <select
                      className="inp fc-ai-count"
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      disabled={isAiLoading}
                    >
                      <option value="5">5 targetes</option>
                      <option value="10">10 targetes</option>
                      <option value="20">20 targetes</option>
                    </select>
                    <button
                      className="bp fc-ai-generate"
                      onClick={handleAIGenerate}
                      disabled={isAiLoading || (!aiTopic.trim() && !aiFile)}
                    >
                      {isAiLoading ? 'Analitzant i Generant...' : '✨ Extreure Conceptes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="fc-empty-step">
              <div className="fc-step-icon badge-ok">📦</div>
              <div>
                <strong className="fc-ai-title">3. Importa un fitxer d'Anki (.apkg)</strong>
                <span className="fc-ai-desc">Si ja fas servir Anki, pots importar els teus decks directament fent clic al botó "Importar Anki".</span>
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
                <button className="bs bs-sm" onClick={() => handleAnkiExport(dk)} title="Exportar a Anki (.apkg)">
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
              <button className="bp" onClick={() => addCard(dk.id)}>+</button>
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
