import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/components/ui/Toast';
import { today, uid } from '@/lib/date';
import { filterDueLangCards, gradeLangCard } from '@/lib/srs';
import type { LangCard, LangDeck } from '@/types';

export function Languages(): JSX.Element {
  const { t } = useTranslation();
  const langDecks = useAppStore((s) => s.langDecks);
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);
  const incrementDailyLog = useAppStore((s) => s.incrementDailyLog);

  const [curDeck, setCurDeck] = useState<string | null>(null);
  const [curCardId, setCurCardId] = useState<string | null>(null);
  const [showAns, setShowAns] = useState<boolean>(false);
  const [newDeckName, setNewDeckName] = useState<string>('');
  const [newDeckLang, setNewDeckLang] = useState<string>('');
  const [cardInputs, setCardInputs] = useState<
    Record<string, { word: string; translation: string; example: string }>
  >({});

  const deck = useMemo<LangDeck | null>(
    () => (curDeck ? langDecks.find((d) => d.id === curDeck) ?? null : null),
    [curDeck, langDecks],
  );
  const card = useMemo<LangCard | null>(
    () => (deck && curCardId ? deck.cards.find((c) => c.id === curCardId) ?? null : null),
    [deck, curCardId],
  );

  const addDeck = (): void => {
    const name = newDeckName.trim();
    const lang = newDeckLang.trim();
    if (!name || !lang) return;
    patch({ langDecks: [...langDecks, { id: uid(), name, lang, cards: [] }] });
    save();
    setNewDeckName('');
    setNewDeckLang('');
  };

  const deleteDeck = (id: string): void => {
    patch({ langDecks: langDecks.filter((d) => d.id !== id) });
    if (curDeck === id) {
      setCurDeck(null);
      setCurCardId(null);
    }
    save();
  };

  const addCard = (deckId: string): void => {
    const inp = cardInputs[deckId] ?? { word: '', translation: '', example: '' };
    if (!inp.word.trim() || !inp.translation.trim()) return;
    const next = langDecks.map((d) =>
      d.id === deckId
        ? {
            ...d,
            cards: [
              ...d.cards,
              {
                id: uid(),
                word: inp.word,
                translation: inp.translation,
                example: inp.example || '',
                hits: 0,
                sessionHits: 0,
                nextReview: today(),
                interval: 1,
                strength: 0,
              },
            ],
          }
        : d,
    );
    patch({ langDecks: next });
    save();
    setCardInputs((prev) => ({
      ...prev,
      [deckId]: { word: '', translation: '', example: '' },
    }));
  };

  const startReview = (deckId: string): void => {
    const d = langDecks.find((x) => x.id === deckId);
    if (!d) return;
    const due = filterDueLangCards(d.cards);
    if (due.length === 0) {
      showToast({ title: '✅ Tot al dia!', desc: 'No hi ha paraules pendents' });
      return;
    }
    const next = langDecks.map((x) =>
      x.id === deckId
        ? { ...x, cards: x.cards.map((c) => ({ ...c, sessionHits: 0 })) }
        : x,
    );
    patch({ langDecks: next });
    setCurDeck(deckId);
    setCurCardId(due[0]!.id);
    setShowAns(false);
  };

  const grade = (correct: boolean): void => {
    if (!deck || !card) return;
    const mutableDecks = langDecks.map((d) =>
      d.id === deck.id
        ? {
            ...d,
            cards: d.cards.map((c) =>
              c.id === card.id ? gradeLangCard({ ...c }, correct) : c,
            ),
          }
        : d,
    );
    patch({ langDecks: mutableDecks });
    incrementDailyLog({ cards: 1, correct: correct ? 1 : 0 });
    if (correct) addXP(3);

    const freshDeck = mutableDecks.find((d) => d.id === deck.id);
    if (!freshDeck) return;
    const due = filterDueLangCards(freshDeck.cards).filter((c) => c.sessionHits < 3);
    if (due.length > 0) {
      due.sort((a, b) => (a.sessionHits ?? 0) - (b.sessionHits ?? 0));
      setCurCardId(due[0]!.id);
      setShowAns(false);
    } else {
      setCurCardId(null);
      setCurDeck(null);
      showToast({ title: "🎉 Sessió d'idiomes completa!", desc: '' });
    }
  };

  const setInput = (
    deckId: string,
    key: 'word' | 'translation' | 'example',
    value: string,
  ): void => {
    setCardInputs((prev) => ({
      ...prev,
      [deckId]: {
        ...{ word: '', translation: '', example: '' },
        ...prev[deckId],
        [key]: value,
      },
    }));
  };

  // Review mode
  if (deck && card) {
    return (
      <div className="sec">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{deck.name}</h2>
            <p style={{ fontSize: 12, color: 'var(--ts)' }}>
              {deck.lang} — Regla del 3
            </p>
          </div>
          <button
            className="bs"
            onClick={() => {
              setCurDeck(null);
              setCurCardId(null);
            }}
          >
            ✕ Sortir
          </button>
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
                    ? 'linear-gradient(90deg,var(--i),var(--id))'
                    : 'var(--bl)',
                transition: '.3s',
              }}
            />
          ))}
        </div>
        <div className="c fc glow" onClick={() => !showAns && setShowAns(true)}>
          <div style={{ fontSize: 11, color: 'var(--tm)', marginBottom: 10 }}>
            Tradueix:
          </div>
          <div className="q">{card.word}</div>
          {showAns ? (
            <>
              <div className="a">✅ {card.translation}</div>
              {card.example && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ts)',
                    marginTop: 10,
                    fontStyle: 'italic',
                  }}
                >
                  &quot;{card.example}&quot;
                </div>
              )}
            </>
          ) : (
            <div className="hint">Toca per veure la traducció</div>
          )}
        </div>
        {showAns && (
          <div style={{ display: 'flex', gap: 14 }}>
            <button
              className="bdanger"
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
              onClick={() => grade(false)}
            >
              ❌ No ho sabia
            </button>
            <button
              className="bp"
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: 15,
                background: 'linear-gradient(135deg,var(--i),var(--id))',
              }}
              onClick={() => grade(true)}
            >
              ✅ Ho sabia!
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.languages.title')}</h2>
        <p>{t('headers.languages.desc')}</p>
      </div>
      <div
        className="c"
        style={{ display: 'flex', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 150 }}>
          <label className="lbl">Nom del deck</label>
          <input
            className="inp"
            placeholder="ex: Anglès B2"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label className="lbl">Idioma</label>
          <input
            className="inp"
            placeholder="ex: Anglès"
            value={newDeckLang}
            onChange={(e) => setNewDeckLang(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDeck()}
          />
        </div>
        <button className="bp" onClick={addDeck}>
          + Crear
        </button>
      </div>
      {langDecks.length === 0 && (
        <div className="c empty" style={{ padding: 48 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t)', marginBottom: 8 }}>
            Cap deck d&apos;idiomes
          </p>
          <p>Crea un deck per aprendre vocabulari amb repetició espaïada</p>
        </div>
      )}
      {langDecks.map((dk) => {
        const due = filterDueLangCards(dk.cards);
        const avgStr =
          dk.cards.length > 0
            ? Math.round(dk.cards.reduce((s, c) => s + c.strength, 0) / dk.cards.length)
            : 0;
        const inp = cardInputs[dk.id] ?? { word: '', translation: '', example: '' };
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
                  {dk.lang} · {dk.cards.length} paraules · {due.length} pendents
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {due.length > 0 ? (
                  <button
                    className="bp"
                    style={{ background: 'linear-gradient(135deg,var(--i),var(--id))' }}
                    onClick={() => startReview(dk.id)}
                  >
                    ▶ Estudiar ({due.length})
                  </button>
                ) : (
                  <span
                    className="badge"
                    style={{ background: 'var(--okl)', color: 'var(--ok)' }}
                  >
                    Tot al dia ✓
                  </span>
                )}
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
                  background: 'linear-gradient(90deg,var(--i),var(--id))',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <input
                className="inp"
                placeholder="Paraula"
                style={{ flex: 1, minWidth: 120 }}
                value={inp.word}
                onChange={(e) => setInput(dk.id, 'word', e.target.value)}
              />
              <input
                className="inp"
                placeholder="Traducció"
                style={{ flex: 1, minWidth: 120 }}
                value={inp.translation}
                onChange={(e) => setInput(dk.id, 'translation', e.target.value)}
              />
              <input
                className="inp"
                placeholder="Exemple (opcional)"
                style={{ flex: 1, minWidth: 150 }}
                value={inp.example}
                onChange={(e) => setInput(dk.id, 'example', e.target.value)}
              />
              <button
                className="bp"
                style={{ background: 'linear-gradient(135deg,var(--i),var(--id))' }}
                onClick={() => addCard(dk.id)}
              >
                +
              </button>
            </div>
            {dk.cards.length > 0 && (
              <div
                style={{
                  maxHeight: 160,
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
                      padding: '7px 10px',
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
                    <span style={{ fontWeight: 600 }}>{c.word}</span>
                    <span style={{ color: 'var(--tm)' }}>→</span>
                    <span style={{ color: 'var(--ts)', flex: 1 }}>{c.translation}</span>
                    <span
                      className="tag"
                      style={{ background: 'var(--bg)', color: 'var(--tm)' }}
                    >
                      {c.strength}%
                    </span>
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
