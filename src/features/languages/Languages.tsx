import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/components/ui/Toast';
import { today, uid } from '@/lib/date';
import { filterDueLangCards, gradeLangCard } from '@/lib/srs';
import type { LangCard, LangDeck } from '@/types';
import { ScenarioGrid } from './ScenarioGrid';
import { ConvIA } from './ConvIA';
import { ConvSummary } from './ConvSummary';
import type { Scenario } from '@/types';

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

  const [tab, setTab] = useState<'vocab' | 'converse'>('vocab');
  const [convScenario, setConvScenario] = useState<Scenario | null>(null);
  const [convSessionId, setConvSessionId] = useState<string | null>(null);
  const [convDone, setConvDone] = useState(false);
  const [pendingCardCount, setPendingCardCount] = useState(0);

  const startConvSession = useAppStore((s) => s.startConvSession);
  const queueConvCards = useAppStore((s) => s.queueConvCards);
  const convSessions = useAppStore((s) => s.convSessions);

  const activeConvSession = convSessions.find((s) => s.id === convSessionId) ?? null;

  const deck = useMemo<LangDeck | null>(
    () => (curDeck ? (langDecks.find((d) => d.id === curDeck) ?? null) : null),
    [curDeck, langDecks],
  );
  const card = useMemo<LangCard | null>(
    () => (deck && curCardId ? (deck.cards.find((c) => c.id === curCardId) ?? null) : null),
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
      x.id === deckId ? { ...x, cards: x.cards.map((c) => ({ ...c, sessionHits: 0 })) } : x,
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
            cards: d.cards.map((c) => (c.id === card.id ? gradeLangCard({ ...c }, correct) : c)),
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

  const handleSelectScenario = (scenario: Scenario): void => {
    if (!deck) return;
    const id = startConvSession(deck.id, scenario.id);
    setConvScenario(scenario);
    setConvSessionId(id);
    setConvDone(false);
    setPendingCardCount(0);
  };

  const handleConvEnd = (): void => {
    if (!activeConvSession) return;
    const vocabCorrections = activeConvSession.messages
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.corrections)
      .filter((c) => c.type === 'vocabulary');
    setPendingCardCount(vocabCorrections.length);
    setConvDone(true);
  };

  const handleAddCards = (): void => {
    if (!activeConvSession || !convSessionId) return;
    const vocabCorrections = activeConvSession.messages
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.corrections)
      .filter((c) => c.type === 'vocabulary');
    const cards = vocabCorrections.map((c) => ({
      word: c.corrected,
      translation: c.original,
      example: '',
    }));
    queueConvCards(convSessionId, cards);
    addXP(Math.min(cards.length * 2, 10));
    setPendingCardCount(0);
  };

  const handleNewConv = (): void => {
    setConvScenario(null);
    setConvSessionId(null);
    setConvDone(false);
    setPendingCardCount(0);
  };

  // ── Vocabulary review mode ──
  if (tab === 'vocab' && deck && card) {
    return (
      <div className="sec">
        <div className="lang-review-hdr">
          <div>
            <h2 className="lang-review-title">{deck.name}</h2>
            <p className="lang-review-sub">{deck.lang} — Regla del 3</p>
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
        <div className="lang-prog-bars">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`lang-prog-bar${(card.sessionHits ?? 0) > i ? ' done' : ''}`} />
          ))}
        </div>
        <div className="c fc glow" onClick={() => !showAns && setShowAns(true)}>
          <div className="lang-word-hint">Tradueix:</div>
          <div className="q">{card.word}</div>
          {showAns ? (
            <>
              <div className="a">✅ {card.translation}</div>
              {card.example && <div className="lang-card-example">&quot;{card.example}&quot;</div>}
            </>
          ) : (
            <div className="hint">Toca per veure la traducció</div>
          )}
        </div>
        {showAns && (
          <div className="lang-grade-row">
            <button className="bdanger lang-grade-wrong" onClick={() => grade(false)}>
              ❌ No ho sabia
            </button>
            <button className="bp lang-grade-right" onClick={() => grade(true)}>
              ✅ Ho sabia!
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Conversa tab: summary view ──
  if (tab === 'converse' && convDone && activeConvSession && convScenario) {
    return (
      <ConvSummary
        session={activeConvSession}
        pendingCardCount={pendingCardCount}
        onAddCards={handleAddCards}
        onNewConv={handleNewConv}
      />
    );
  }

  // ── Conversa tab: active conversation ──
  if (tab === 'converse' && convSessionId && convScenario && deck) {
    return (
      <div className="sec flex flex-col flex-1">
        <ConvIA
          sessionId={convSessionId}
          deck={deck}
          scenario={convScenario}
          onEnd={handleConvEnd}
        />
      </div>
    );
  }

  // ── Main list view ──
  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.languages.title')}</h2>
        <p>{t('headers.languages.desc')}</p>
      </div>

      {/* Tab bar */}
      <div className="lang-tabs">
        {(['vocab', 'converse'] as const).map((tabKey) => (
          <button
            key={tabKey}
            className={`lang-tab-btn${tab === tabKey ? ' on' : ''}`}
            onClick={() => setTab(tabKey)}
          >
            {tabKey === 'vocab' ? t('conv.vocabTab') : t('conv.tab')}
          </button>
        ))}
      </div>

      {/* ── Vocabulari tab content ── */}
      {tab === 'vocab' && (
        <>
          <div className="c lang-create-row">
            <div className="lang-create-field">
              <label className="lbl">Nom del deck</label>
              <input
                className="inp"
                placeholder="ex: Anglès B2"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
              />
            </div>
            <div className="lang-create-field-sm">
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
            <div className="c empty lang-empty-msg">
              <p className="lang-empty-title">Cap deck d&apos;idiomes</p>
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
                <div className="lang-deck-hdr">
                  <div>
                    <h3 className="lang-deck-title">{dk.name}</h3>
                    <span className="lang-deck-sub">
                      {dk.lang} · {dk.cards.length} paraules · {due.length} pendents
                    </span>
                  </div>
                  <div className="lang-deck-actions">
                    {due.length > 0 ? (
                      <button className="bp bp-lang" onClick={() => startReview(dk.id)}>
                        ▶ Estudiar ({due.length})
                      </button>
                    ) : (
                      <span className="badge badge-ok">Tot al dia ✓</span>
                    )}
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
                      background: 'linear-gradient(90deg,var(--i),var(--id))',
                    }}
                  />
                </div>
                <div className="lang-add-row">
                  <input
                    className="inp lang-add-inp"
                    placeholder="Paraula"
                    value={inp.word}
                    onChange={(e) => setInput(dk.id, 'word', e.target.value)}
                  />
                  <input
                    className="inp lang-add-inp"
                    placeholder="Traducció"
                    value={inp.translation}
                    onChange={(e) => setInput(dk.id, 'translation', e.target.value)}
                  />
                  <input
                    className="inp lang-add-inp-lg"
                    placeholder="Exemple (opcional)"
                    value={inp.example}
                    onChange={(e) => setInput(dk.id, 'example', e.target.value)}
                  />
                  <button className="bp bp-lang" onClick={() => addCard(dk.id)}>
                    +
                  </button>
                </div>
                {dk.cards.length > 0 && (
                  <div className="lang-word-list">
                    {dk.cards.slice(0, 20).map((c) => {
                      const dotColor =
                        c.strength >= 70
                          ? 'var(--ok)'
                          : c.strength >= 30
                            ? 'var(--w)'
                            : 'var(--err)';
                      return (
                        <div key={c.id} className="lang-word-row">
                          <div className="lang-word-dot" style={{ background: dotColor }} />
                          <span className="lang-word-name">{c.word}</span>
                          <span className="lang-word-arrow">→</span>
                          <span className="lang-word-trans">{c.translation}</span>
                          <span
                            className="tag"
                            style={{ background: 'var(--bg)', color: 'var(--tm)' }}
                          >
                            {c.strength}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Conversa tab content ── */}
      {tab === 'converse' &&
        (deck ? (
          <>
            <button className="bs" style={{ marginBottom: 16 }} onClick={() => setCurDeck(null)}>
              ← {t('conv.changeDeck')}
            </button>
            <ScenarioGrid deck={deck} onSelect={handleSelectScenario} />
          </>
        ) : langDecks.length === 0 ? (
          <div className="c empty lang-empty-msg">
            <p className="lang-empty-title">{t('conv.noDecks')}</p>
            <p>{t('conv.noDecksHint')}</p>
          </div>
        ) : (
          <div>
            <div className="sec-hdr mb-5">
              <h2>{t('conv.pickDeck')}</h2>
              <p>{t('conv.pickDeckDesc')}</p>
            </div>
            <div className="g2">
              {langDecks.map((dk) => (
                <button
                  key={dk.id}
                  className="c card-hover scenario-btn"
                  onClick={() => setCurDeck(dk.id)}
                >
                  <div className="scenario-emoji">📚</div>
                  <h3 className="scenario-title">{dk.name}</h3>
                  <span
                    className="tag"
                    style={{
                      background: 'var(--al)',
                      color: 'var(--a)',
                      border: '1px solid var(--b)',
                    }}
                  >
                    {dk.lang} · {dk.cards.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
