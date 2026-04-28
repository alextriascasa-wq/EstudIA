import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { uid } from '@/lib/date';
import {
  generateZeroSession,
  checkZeroAnswer,
  checkHumanitiesAnswer,
} from '@/lib/zeroSessionAI';
import type {
  StemSession,
  HumanitiesSession,
  ZeroSessionResult,
  ZeroSubjectMode,
} from '@/types';

type ZeroStep =
  | 'setup'
  | 'loading'
  | 'stem-example'
  | 'stem-practice'
  | 'humanities-map'
  | 'humanities-recall'
  | 'results';

interface ZeroResultsState {
  score: number;
  gaps: string[];
  feedback: string;
  flashcardSuggestions: string[];
  topic: string;
  mode: ZeroSubjectMode;
}

export function ZeroSession(): JSX.Element {
  const { t, i18n } = useTranslation();
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);
  const zeroSessions = useAppStore((s) => s.zeroSessions);
  const decks = useAppStore((s) => s.decks);

  const [step, setStep] = useState<ZeroStep>('setup');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<ZeroSubjectMode>('stem');
  const [error, setError] = useState('');
  const [stemSession, setStemSession] = useState<StemSession | null>(null);
  const [humanitiesSession, setHumanitiesSession] = useState<HumanitiesSession | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<ZeroResultsState | null>(null);
  const [flashcardsCreated, setFlashcardsCreated] = useState(false);

  const generate = async (): Promise<void> => {
    if (notes.trim().length < 50) {
      setError(t('zero.setup.minLength'));
      return;
    }
    setError('');
    setStep('loading');
    try {
      const session = await generateZeroSession(notes, mode, i18n.language);
      if (mode === 'stem') {
        setStemSession(session as StemSession);
        setStep('stem-example');
      } else {
        setHumanitiesSession(session as HumanitiesSession);
        setStep('humanities-map');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('zero.error'));
      setStep('setup');
    }
  };

  const checkStem = async (): Promise<void> => {
    if (!stemSession || !userAnswer.trim()) return;
    setStep('loading');
    try {
      const problem = stemSession.practiceProblems[0]!;
      const result = await checkZeroAnswer(
        problem.problem,
        userAnswer,
        problem.answer,
        i18n.language
      );
      const gaps = result.correct ? [] : [result.feedback];
      const suggestions = result.correct ? [] : [stemSession.workedExample.problem];
      addXP(result.score >= 70 ? 30 : 20);
      const record: ZeroSessionResult = {
        id: uid(),
        date: new Date().toISOString().split('T')[0]!,
        topic: stemSession.topic,
        mode: 'stem',
        score: result.score,
        gaps,
      };
      patch({ zeroSessions: [...zeroSessions, record] });
      save();
      setResults({
        score: result.score,
        gaps,
        feedback: result.feedback,
        flashcardSuggestions: suggestions,
        topic: stemSession.topic,
        mode: 'stem',
      });
      setStep('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('zero.error'));
      setStep('stem-practice');
    }
  };

  const checkHumanities = async (): Promise<void> => {
    if (!humanitiesSession || !userAnswer.trim()) return;
    setStep('loading');
    try {
      const q = humanitiesSession.recallQuestions[0]!;
      const result = await checkHumanitiesAnswer(
        q.question,
        userAnswer,
        q.idealAnswer,
        q.rubric,
        i18n.language
      );
      addXP(result.score >= 70 ? 30 : 20);
      const record: ZeroSessionResult = {
        id: uid(),
        date: new Date().toISOString().split('T')[0]!,
        topic: humanitiesSession.topic,
        mode: 'humanities',
        score: result.score,
        gaps: result.gaps,
      };
      patch({ zeroSessions: [...zeroSessions, record] });
      save();
      setResults({
        score: result.score,
        gaps: result.gaps,
        feedback: result.feedback,
        flashcardSuggestions: result.flashcardSuggestions,
        topic: humanitiesSession.topic,
        mode: 'humanities',
      });
      setStep('results');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('zero.error'));
      setStep('humanities-recall');
    }
  };

  const createFlashcards = (): void => {
    if (!results?.flashcardSuggestions.length || flashcardsCreated) return;
    const topic = results.topic;
    const newCards = results.flashcardSuggestions.map((suggestion) => ({
      id: uid(),
      q: suggestion,
      a: '…',
      subject: topic,
      hits: 0,
      sessionHits: 0,
      nextReview: new Date().toISOString().split('T')[0]!,
      strength: 0,
      interval: 1,
      lastSeen: null as null,
    }));
    const existingDeck = decks.find((d) => d.name === topic);
    if (existingDeck) {
      patch({
        decks: decks.map((d) =>
          d.id === existingDeck.id ? { ...d, cards: [...d.cards, ...newCards] } : d
        ),
      });
    } else {
      patch({ decks: [...decks, { id: uid(), name: topic, cards: newCards }] });
    }
    save();
    setFlashcardsCreated(true);
  };

  const reset = (): void => {
    setStep('setup');
    setNotes('');
    setMode('stem');
    setError('');
    setStemSession(null);
    setHumanitiesSession(null);
    setUserAnswer('');
    setResults(null);
    setFlashcardsCreated(false);
  };

  // ── LOADING ──
  if (step === 'loading') {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center' }}>
        <div className="pulse-glow" style={{ fontSize: 40, marginBottom: 16 }}>🧭</div>
        <p style={{ color: 'var(--ts)', fontSize: 14 }}>{t('zero.loading')}</p>
      </div>
    );
  }

  // ── SETUP ──
  if (step === 'setup') {
    return (
      <div style={{ marginTop: 10 }}>
        <div className="c" style={{ border: '1px solid var(--b)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{t('zero.setup.title')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ts)', marginBottom: 16 }}>{t('zero.setup.desc')}</p>
          <label className="lbl">{t('zero.setup.notesLabel')}</label>
          <textarea
            className="inp"
            style={{ minHeight: 120, marginBottom: 16 }}
            placeholder={t('zero.setup.placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <label className="lbl" style={{ marginBottom: 10, display: 'block' }}>
            {t('zero.setup.modeLabel')}
          </label>
          <div className="g2" style={{ gap: 10, marginBottom: 20 }}>
            <div className={`mc ${mode === 'stem' ? 'on' : ''}`} onClick={() => setMode('stem')}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🔬</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t('zero.setup.stem')}</div>
              <div style={{ fontSize: 11, color: 'var(--ts)', marginTop: 4 }}>{t('zero.setup.stemDesc')}</div>
            </div>
            <div className={`mc ${mode === 'humanities' ? 'on' : ''}`} onClick={() => setMode('humanities')}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>📖</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t('zero.setup.humanities')}</div>
              <div style={{ fontSize: 11, color: 'var(--ts)', marginTop: 4 }}>{t('zero.setup.humanitiesDesc')}</div>
            </div>
          </div>
          {error && (
            <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'var(--errl)', borderRadius: 'var(--radius-sm)' }}>
              {error}
            </div>
          )}
          <button className="bp" style={{ width: '100%' }} onClick={generate}>
            {t('zero.setup.cta')}
          </button>
        </div>
        <div className="zero-science-badge">
          🔬 {t('zero.scienceBadge')}
        </div>
      </div>
    );
  }

  // ── STEM: WORKED EXAMPLE ──
  if (step === 'stem-example' && stemSession) {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('zero.worked.title')}</h3>
            <div style={{ fontSize: 12, color: 'var(--a)', marginTop: 2 }}>{stemSession.topic}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 24, height: 4, borderRadius: 2, background: n <= 2 ? 'var(--a)' : 'var(--sh)' }} />
            ))}
          </div>
        </div>
        <div className="c" style={{ border: '1px solid var(--b)', marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--ts)', marginBottom: 12 }}>{stemSession.concept}</p>
          <div style={{ padding: '14px 16px', background: 'var(--al)', borderRadius: 'var(--radius-sm)', marginBottom: 16, borderLeft: '3px solid var(--a)' }}>
            <div style={{ fontSize: 12, color: 'var(--a)', fontWeight: 700, marginBottom: 8 }}>
              📋 {t('zero.worked.problem')}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{stemSession.workedExample.problem}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stemSession.workedExample.steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--a)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ paddingTop: 2 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--okl)', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--ok)', fontWeight: 700 }}>
            ✓ {stemSession.workedExample.answer}
          </div>
        </div>
        <button className="bp" style={{ width: '100%' }} onClick={() => { setUserAnswer(''); setStep('stem-practice'); }}>
          {t('zero.worked.cta')} →
        </button>
      </div>
    );
  }

  // ── STEM: PRACTICE ──
  if (step === 'stem-practice' && stemSession) {
    const problem = stemSession.practiceProblems[0]!;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('zero.practice.title')}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 24, height: 4, borderRadius: 2, background: n <= 3 ? 'var(--a)' : 'var(--sh)' }} />
            ))}
          </div>
        </div>
        <div className="c" style={{ border: '1px solid var(--b)', marginBottom: 12 }}>
          <div style={{ padding: '14px 16px', background: 'var(--s2)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--ts)', marginBottom: 6 }}>{t('zero.practice.problem')}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{problem.problem}</div>
          </div>
          <label className="lbl">{t('zero.practice.answerLabel')}</label>
          <textarea
            className="inp"
            style={{ minHeight: 100, marginBottom: 12 }}
            placeholder={t('zero.practice.placeholder')}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          {error && (
            <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <button className="bp" style={{ width: '100%' }} onClick={checkStem} disabled={!userAnswer.trim()}>
            {t('zero.practice.cta')}
          </button>
        </div>
      </div>
    );
  }

  // ── HUMANITIES: CONCEPT MAP ──
  if (step === 'humanities-map' && humanitiesSession) {
    const { conceptMap } = humanitiesSession;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('zero.map.title')}</h3>
            <div style={{ fontSize: 12, color: 'var(--p)', marginTop: 2 }}>{humanitiesSession.topic}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 24, height: 4, borderRadius: 2, background: n <= 2 ? 'var(--p)' : 'var(--sh)' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {conceptMap.themes.length > 0 && (
            <div className="c" style={{ border: '1px solid var(--pl)' }}>
              <div style={{ fontSize: 12, color: 'var(--p)', fontWeight: 700, marginBottom: 8 }}>🎭 {t('zero.map.themes')}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                {conceptMap.themes.map((theme, i) => (
                  <span key={i} className="badge" style={{ background: 'var(--pl)', color: 'var(--p)' }}>{theme}</span>
                ))}
              </div>
            </div>
          )}
          {conceptMap.keyFigures.length > 0 && (
            <div className="c" style={{ border: '1px solid var(--b)' }}>
              <div style={{ fontSize: 12, color: 'var(--ts)', fontWeight: 700, marginBottom: 8 }}>👤 {t('zero.map.figures')}</div>
              {conceptMap.keyFigures.map((fig, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: 'var(--t)' }}>{fig.name}</span>
                  <span style={{ color: 'var(--ts)' }}>— {fig.role}</span>
                </div>
              ))}
            </div>
          )}
          {conceptMap.keyQuotes && conceptMap.keyQuotes.length > 0 && (
            <div className="c" style={{ border: '1px solid var(--b)' }}>
              <div style={{ fontSize: 12, color: 'var(--ts)', fontWeight: 700, marginBottom: 8 }}>💬 {t('zero.map.quotes')}</div>
              {conceptMap.keyQuotes.map((quote, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--t)', fontStyle: 'italic', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid var(--p)' }}>
                  "{quote}"
                </div>
              ))}
            </div>
          )}
          {conceptMap.timeline && conceptMap.timeline.length > 0 && (
            <div className="c" style={{ border: '1px solid var(--b)' }}>
              <div style={{ fontSize: 12, color: 'var(--ts)', fontWeight: 700, marginBottom: 8 }}>📅 {t('zero.map.timeline')}</div>
              {conceptMap.timeline.map((event, i) => (
                <div key={i} style={{ fontSize: 13, marginBottom: 4, color: 'var(--t)' }}>{event}</div>
              ))}
            </div>
          )}
        </div>
        <button className="bp" style={{ width: '100%' }} onClick={() => { setUserAnswer(''); setStep('humanities-recall'); }}>
          {t('zero.map.cta')} →
        </button>
      </div>
    );
  }

  // ── HUMANITIES: ACTIVE RECALL ──
  if (step === 'humanities-recall' && humanitiesSession) {
    const question = humanitiesSession.recallQuestions[0]!;
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('zero.recall.title')}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 24, height: 4, borderRadius: 2, background: n <= 3 ? 'var(--p)' : 'var(--sh)' }} />
            ))}
          </div>
        </div>
        <div className="c" style={{ border: '1px solid var(--b)', marginBottom: 12 }}>
          <div style={{ padding: '14px 16px', background: 'var(--pl)', borderRadius: 'var(--radius-sm)', marginBottom: 16, borderLeft: '3px solid var(--p)' }}>
            <div style={{ fontSize: 12, color: 'var(--p)', fontWeight: 700, marginBottom: 6 }}>🧠 {t('zero.recall.question')}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{question.question}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--tm)', marginBottom: 6 }}>{t('zero.recall.rubricLabel')}</div>
            {question.rubric.map((criterion, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--ts)', marginBottom: 3 }}>• {criterion}</div>
            ))}
          </div>
          <label className="lbl">{t('zero.recall.answerLabel')}</label>
          <textarea
            className="inp"
            style={{ minHeight: 120, marginBottom: 12 }}
            placeholder={t('zero.recall.placeholder')}
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          {error && (
            <div style={{ color: 'var(--err)', fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}
          <button
            className="bp"
            style={{ width: '100%', background: 'var(--p)' }}
            onClick={checkHumanities}
            disabled={!userAnswer.trim()}
          >
            {t('zero.recall.cta')}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (step === 'results' && results) {
    const scoreColor = results.score >= 70 ? 'var(--ok)' : results.score >= 40 ? 'var(--w)' : 'var(--err)';
    const scoreIcon = results.score >= 70 ? '✅' : results.score >= 40 ? '⚠️' : '❌';
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('zero.results.title')}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3, 4].map((n) => (
              <div key={n} style={{ width: 24, height: 4, borderRadius: 2, background: 'var(--a)' }} />
            ))}
          </div>
        </div>
        <div className="c" style={{ border: '1px solid var(--b)', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 48, fontWeight: 900, color: scoreColor }}>{results.score}%</div>
          <div style={{ fontSize: 14, color: 'var(--ts)' }}>{scoreIcon} {t('zero.results.firstSession')}</div>
          <div style={{ fontSize: 13, color: 'var(--tm)', marginTop: 8 }}>{results.feedback}</div>
        </div>
        {results.gaps.length > 0 && (
          <div className="c" style={{ border: '1px solid var(--wl)', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--w)', marginBottom: 8 }}>⚠️ {t('zero.results.gaps')}</div>
            {results.gaps.map((gap, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--ts)', marginBottom: 4 }}>• {gap}</div>
            ))}
          </div>
        )}
        <div className="c" style={{ background: 'var(--al)', border: '1px solid rgba(212,160,23,0.2)', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🌙 {t('zero.results.nsdr')}</div>
          <div style={{ fontSize: 12, color: 'var(--ts)' }}>{t('zero.results.nsdrDesc')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.flashcardSuggestions.length > 0 && (
            <button
              className={flashcardsCreated ? 'bs' : 'bp'}
              onClick={createFlashcards}
              disabled={flashcardsCreated}
              style={{ width: '100%' }}
            >
              {flashcardsCreated
                ? `✅ ${t('zero.results.flashcardsCreated')}`
                : `📇 ${t('zero.results.flashcards')}`}
            </button>
          )}
          <button className="bs" style={{ width: '100%' }} onClick={reset}>
            {t('zero.results.retry')}
          </button>
        </div>
      </div>
    );
  }

  return <></>;
}
