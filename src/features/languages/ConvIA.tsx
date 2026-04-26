import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { showToast } from '@/components/ui/Toast';
import { callConverse } from '@/lib/conviaAI';
import type { ConvCorrection, ConvMessage, ConvSession, LangDeck, Scenario } from '@/types';

// ─── CorrectionPopover ────────────────────────────────────────────────────────

interface PopoverProps {
  correction: ConvCorrection;
  onDismiss: () => void;
  onAddCard: () => void;
}

function CorrectionPopover({ correction, onDismiss, onAddCard }: PopoverProps): JSX.Element {
  const { t } = useTranslation();

  const typeColor: Record<ConvCorrection['type'], string> = {
    grammar: 'var(--w)',
    vocabulary: 'var(--err)',
    fluency: 'var(--i)',
  };

  // Popover is absolutely positioned — border color is dynamic (typeColor[correction.type])
  // so position/zIndex/border must stay inline
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 20,
        background: 'var(--s2)',
        border: `1px solid ${typeColor[correction.type]}55`,
        borderRadius: 'var(--radius-sm)',
        padding: '10px 12px',
        minWidth: 220,
        maxWidth: 300,
        fontSize: 12,
        boxShadow: 'var(--shadow)',
      }}
    >
      <div style={{ color: typeColor[correction.type], fontWeight: 700, marginBottom: 6 }}>
        {t(`conv.correctionTypes.${correction.type}`)}
      </div>
      <div style={{ marginBottom: 6 }}>
        <span className="conv-corr-original">{correction.original}</span>
        <span className="conv-corr-arrow">→</span>
        <span className="conv-corr-corrected">{correction.corrected}</span>
      </div>
      <p className="conv-corr-expl">{correction.explanation}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {correction.type === 'vocabulary' && (
          <button
            className="bp"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => {
              onAddCard();
              onDismiss();
            }}
          >
            + Deck
          </button>
        )}
        <button
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--tm)',
            fontSize: 11,
            cursor: 'pointer',
            padding: '4px 0',
          }}
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── AnnotatedText ────────────────────────────────────────────────────────────

interface AnnotatedProps {
  text: string;
  corrections: ConvCorrection[];
  onAddCard: (c: ConvCorrection) => void;
}

function AnnotatedText({ text, corrections, onAddCard }: AnnotatedProps): JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (corrections.length === 0) return <>{text}</>;

  const segments: JSX.Element[] = [];
  let remaining = text;
  let key = 0;

  corrections.forEach((c, idx) => {
    const pos = remaining.toLowerCase().indexOf(c.original.toLowerCase());
    if (pos === -1) return;

    if (pos > 0) {
      segments.push(<span key={key++}>{remaining.slice(0, pos)}</span>);
    }

    // underlineColor is dynamic — must stay inline
    const underlineColor =
      c.type === 'grammar' ? 'var(--w)' : c.type === 'vocabulary' ? 'var(--err)' : 'var(--i)';

    const corrIdx = idx;
    segments.push(
      // position:relative needed for the absolute CorrectionPopover child
      <span key={key++} style={{ position: 'relative', display: 'inline' }}>
        <span
          style={{
            background: `${underlineColor}22`,
            borderBottom: `2px solid ${underlineColor}`,
            borderRadius: 3,
            padding: '0 2px',
            cursor: 'pointer',
          }}
          onClick={() => setOpenIdx(openIdx === corrIdx ? null : corrIdx)}
        >
          {remaining.slice(pos, pos + c.original.length)}
        </span>
        {openIdx === corrIdx && (
          <CorrectionPopover
            correction={c}
            onDismiss={() => setOpenIdx(null)}
            onAddCard={() => onAddCard(c)}
          />
        )}
      </span>,
    );

    remaining = remaining.slice(pos + c.original.length);
  });

  if (remaining) segments.push(<span key={key++}>{remaining}</span>);

  return <>{segments}</>;
}

// ─── ConvIA ───────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  deck: LangDeck;
  scenario: Scenario;
  onEnd: () => void;
}

export function ConvIA({ sessionId, deck, scenario, onEnd }: Props): JSX.Element {
  const { t } = useTranslation();

  const session = useAppStore(
    (s) => s.convSessions.find((x) => x.id === sessionId) ?? null,
  ) as ConvSession | null;
  const addConvMessage = useAppStore((s) => s.addConvMessage);
  const endConvSession = useAppStore((s) => s.endConvSession);
  const queueConvCards = useAppStore((s) => s.queueConvCards);
  const addXP = useAppStore((s) => s.addXP);

  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [lastFluency, setLastFluency] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, pendingText]);

  const targetVocab = [...deck.cards]
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
    .slice(0, 20)
    .map((c) => c.word);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || loading || rateLimitHit || !session) return;

      setInputText('');
      setPendingText(trimmed);
      setLoading(true);

      try {
        abortRef.current = new AbortController();
        const history = session.messages.map((m) => ({
          role: m.role as 'user' | 'ai',
          text: m.text,
        }));

        const response = await callConverse(
          {
            language: deck.lang,
            scenario: {
              id: scenario.id,
              character: scenario.character,
              title: t(scenario.titleKey),
            },
            messages: history,
            latestUserSpeech: trimmed,
            targetVocab,
          },
          abortRef.current.signal,
        );

        const userMsg: ConvMessage = {
          role: 'user',
          text: trimmed,
          corrections: response.corrections,
        };
        addConvMessage(sessionId, userMsg);
        addConvMessage(sessionId, {
          role: 'ai',
          text: response.reply,
          corrections: [],
        });

        setLastFluency(response.fluencyScore);

        if (response.newVocabCards.length > 0) {
          queueConvCards(sessionId, response.newVocabCards);
        }
      } catch (err: unknown) {
        addConvMessage(sessionId, { role: 'user', text: trimmed, corrections: [] });

        if (err instanceof Error && err.message === 'RATE_LIMIT') {
          setRateLimitHit(true);
          showToast({ title: '🚫 Límit diari assolit', desc: 'Torna demà per continuar' });
        } else if (!(err instanceof Error && err.name === 'AbortError')) {
          showToast({ title: '❌ Error de connexió', desc: 'Torna-ho a provar' });
        }
      } finally {
        setPendingText(null);
        setLoading(false);
      }
    },
    [
      loading,
      rateLimitHit,
      session,
      sessionId,
      deck,
      scenario,
      targetVocab,
      t,
      addConvMessage,
      queueConvCards,
    ],
  );

  const startRecording = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI: any =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      showToast({
        title: 'No suportat',
        desc: 'El teu navegador no suporta reconeixement de veu',
      });
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = deck.lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        void sendMessage(transcript);
      } else {
        showToast({ title: t('conv.emptyTranscript') });
      }
      setIsRecording(false);
    };
    recognition.onerror = () => {
      showToast({ title: t('conv.emptyTranscript') });
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopRecording = (): void => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleEnd = (): void => {
    abortRef.current?.abort();
    recognitionRef.current?.stop();
    const userTurns = session?.messages.filter((m) => m.role === 'user').length ?? 0;
    endConvSession(sessionId, lastFluency);
    if (userTurns >= 5) addXP(5);
    onEnd();
  };

  const handleAddCard = (correction: ConvCorrection): void => {
    queueConvCards(sessionId, [
      {
        word: correction.corrected,
        translation: correction.original,
        example: '',
      },
    ]);
    addXP(2);
    showToast({ title: '📚 Targeta afegida al deck' });
  };

  if (!session) return <div className="route-loading" />;

  const messages = session.messages;

  return (
    <div className="conv-root">
      {/* Header */}
      <div className="conv-hdr">
        <div>
          <h3 className="conv-hdr-title">
            {scenario.emoji} {t(scenario.titleKey)}
          </h3>
          <span className="conv-hdr-sub">
            {deck.name} · {deck.lang}
          </span>
        </div>
        <div className="conv-hdr-right">
          {lastFluency > 0 && (
            <span className="badge badge-a" style={{ fontWeight: 700 }}>
              {lastFluency}% {t('conv.fluency')}
            </span>
          )}
          <button className="bs" onClick={handleEnd}>
            {t('conv.endSession')}
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className="conv-messages">
        {messages.length === 0 && !pendingText && (
          <div className="empty">
            <div className="conv-empty-icon">{scenario.emoji}</div>
            <p className="conv-empty-p">{t(scenario.titleKey)}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={msg.role === 'ai' ? 'conv-msg-wrap-ai' : 'conv-msg-wrap-user'}
          >
            <div className={`c conv-msg ${msg.role === 'ai' ? 'conv-msg-ai' : 'conv-msg-user'}`}>
              <div className="conv-msg-role">
                {msg.role === 'ai' ? `${scenario.emoji} ${scenario.character}` : 'Tu'}
              </div>
              {msg.role === 'user' && msg.corrections.length > 0 ? (
                <AnnotatedText
                  text={msg.text}
                  corrections={msg.corrections}
                  onAddCard={handleAddCard}
                />
              ) : (
                <span>{msg.text}</span>
              )}
            </div>
          </div>
        ))}

        {pendingText && (
          <div className="conv-msg-wrap-user">
            <div className="c conv-pending">
              <div className="conv-msg-role">Tu</div>
              {pendingText}
            </div>
          </div>
        )}

        {loading && (
          <div className="conv-msg-wrap-ai">
            <div className="c conv-loading-bubble">···</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="conv-input-bar">
        <input
          className="inp flex-1"
          placeholder={t('conv.holdToSpeak')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void sendMessage(inputText);
          }}
          disabled={loading || rateLimitHit}
        />
        <button
          className="conv-mic-btn"
          style={{
            background: isRecording ? 'var(--err)' : 'var(--a)',
            boxShadow: isRecording
              ? '0 0 12px rgba(239,68,68,0.5)'
              : '0 0 12px rgba(212,160,23,0.4)',
            opacity: rateLimitHit ? 0.5 : 1,
          }}
          onPointerDown={() => {
            if (!loading && !rateLimitHit) startRecording();
          }}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          disabled={rateLimitHit}
          aria-label={isRecording ? 'Atura enregistrament' : 'Inicia enregistrament'}
        >
          {isRecording ? '⏹' : '🎙️'}
        </button>
      </div>
    </div>
  );
}
