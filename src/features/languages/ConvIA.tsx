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

    const underlineColor =
      c.type === 'grammar' ? 'var(--w)' : c.type === 'vocabulary' ? 'var(--err)' : 'var(--i)';

    const corrIdx = idx;
    segments.push(
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

// ─── speak helper (Web Speech API TTS) ────────────────────────────────────────

// Map common deck-language labels (Catalan / Spanish / English / native names)
// onto BCP-47 codes so voice selection works regardless of how user typed it.
const LANG_MAP: Record<string, string> = {
  english: 'en-US',
  anglès: 'en-US',
  angles: 'en-US',
  inglés: 'en-US',
  ingles: 'en-US',
  'english us': 'en-US',
  'english uk': 'en-GB',
  british: 'en-GB',
  american: 'en-US',
  spanish: 'es-ES',
  español: 'es-ES',
  espanol: 'es-ES',
  espanyol: 'es-ES',
  castellà: 'es-ES',
  castella: 'es-ES',
  castellano: 'es-ES',
  french: 'fr-FR',
  francès: 'fr-FR',
  frances: 'fr-FR',
  francés: 'fr-FR',
  german: 'de-DE',
  alemany: 'de-DE',
  alemán: 'de-DE',
  aleman: 'de-DE',
  deutsch: 'de-DE',
  italian: 'it-IT',
  italià: 'it-IT',
  italia: 'it-IT',
  italiano: 'it-IT',
  portuguese: 'pt-PT',
  portuguès: 'pt-PT',
  portugués: 'pt-PT',
  portugues: 'pt-PT',
  brasileiro: 'pt-BR',
  català: 'ca-ES',
  catala: 'ca-ES',
  catalan: 'ca-ES',
  catalán: 'ca-ES',
  japanese: 'ja-JP',
  japonès: 'ja-JP',
  japonés: 'ja-JP',
  japones: 'ja-JP',
  chinese: 'zh-CN',
  xinès: 'zh-CN',
  xines: 'zh-CN',
  chino: 'zh-CN',
  mandarin: 'zh-CN',
  korean: 'ko-KR',
  coreà: 'ko-KR',
  coreano: 'ko-KR',
  russian: 'ru-RU',
  rus: 'ru-RU',
  ruso: 'ru-RU',
  arabic: 'ar-SA',
  àrab: 'ar-SA',
  arab: 'ar-SA',
  árabe: 'ar-SA',
  arabe: 'ar-SA',
  dutch: 'nl-NL',
  neerlandès: 'nl-NL',
  neerlandés: 'nl-NL',
  holandès: 'nl-NL',
  holandes: 'nl-NL',
};

function normalizeLang(input: string): string {
  const t = input.trim().toLowerCase();
  if (LANG_MAP[t]) return LANG_MAP[t];
  // Already a BCP-47 code (e.g. "en", "en-US", "pt-BR")
  if (/^[a-z]{2}(-[a-z0-9]{2,4})?$/i.test(t)) return t;
  // Try first word ("anglès B2" → "anglès")
  const first = t.split(/\s+/)[0] ?? '';
  if (LANG_MAP[first]) return LANG_MAP[first];
  return t;
}

function pickVoice(rawLang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const lang = normalizeLang(rawLang).toLowerCase();
  const prefix = lang.slice(0, 2);

  const matches = voices.filter(
    (v) =>
      v.lang.toLowerCase() === lang ||
      v.lang.toLowerCase().startsWith(`${prefix}-`) ||
      v.lang.toLowerCase() === prefix,
  );
  if (matches.length === 0) return null;

  // Score: prioritize natural/neural network voices over robotic local ones.
  const score = (v: SpeechSynthesisVoice): number => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (/natural|neural|online|wavenet|premium|enhanced/.test(n)) s += 100;
    if (/google/.test(n)) s += 40;
    if (/microsoft/.test(n)) s += 30;
    if (!v.localService) s += 25;
    if (v.lang.toLowerCase() === lang) s += 15;
    if (prefix === 'en' && v.lang.toLowerCase().startsWith('en-us')) s += 10;
    if (prefix === 'pt' && v.lang.toLowerCase().startsWith('pt-pt')) s += 5;
    if (v.default) s += 1;
    return s;
  };
  return matches.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}

function speak(text: string, lang: string, voiceURI: string | null, onDone?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const all = window.speechSynthesis.getVoices();
  const explicit = voiceURI ? all.find((vc) => vc.voiceURI === voiceURI) : null;
  const v = explicit ?? pickVoice(lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? lang;
  u.rate = 0.95;
  u.pitch = 1;
  u.onend = () => onDone?.();
  u.onerror = () => onDone?.();
  window.speechSynthesis.speak(u);
}

// Score voices for a target lang (highest = best/most natural).
function scoreVoice(v: SpeechSynthesisVoice, lang: string, prefix: string): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|online|wavenet|premium|enhanced/.test(n)) s += 100;
  if (/google/.test(n)) s += 40;
  if (/microsoft/.test(n)) s += 30;
  if (!v.localService) s += 25;
  if (v.lang.toLowerCase() === lang) s += 15;
  if (prefix === 'en' && v.lang.toLowerCase().startsWith('en-us')) s += 10;
  if (prefix === 'pt' && v.lang.toLowerCase().startsWith('pt-pt')) s += 5;
  if (v.default) s += 1;
  return s;
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
  const [interimText, setInterimText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [lastFluency, setLastFluency] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);
  const [handsFree, setHandsFree] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handsFreeRef = useRef(handsFree);
  const autoSpeakRef = useRef(autoSpeak);
  const selectedVoiceURIRef = useRef<string | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const sendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    handsFreeRef.current = handsFree;
  }, [handsFree]);
  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);
  useEffect(() => {
    selectedVoiceURIRef.current = selectedVoiceURI;
  }, [selectedVoiceURI]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, pendingText, interimText, isSpeaking]);

  // Enumerate voices for the deck's language and keep them in state.
  // Browsers populate the voice list asynchronously, so listen for `voiceschanged`.
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const populate = (): void => {
      const all = window.speechSynthesis.getVoices();
      const lang = normalizeLang(deck.lang).toLowerCase();
      const prefix = lang.slice(0, 2);
      const matched = all.filter(
        (v) =>
          v.lang.toLowerCase() === lang ||
          v.lang.toLowerCase().startsWith(`${prefix}-`) ||
          v.lang.toLowerCase() === prefix,
      );
      matched.sort((a, b) => scoreVoice(b, lang, prefix) - scoreVoice(a, lang, prefix));
      setAvailableVoices(matched);
      setSelectedVoiceURI((prev) => {
        if (prev && matched.some((v) => v.voiceURI === prev)) return prev;
        return matched[0]?.voiceURI ?? null;
      });
    };
    populate();
    window.speechSynthesis.addEventListener?.('voiceschanged', populate);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', populate);
    };
  }, [deck.lang]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      try {
        recognitionRef.current?.stop?.();
      } catch {
        /* ignore */
      }
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const targetVocab = [...deck.cards]
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
    .slice(0, 20)
    .map((c) => c.word);

  const startRecording = useCallback((): void => {
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
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = deck.lang;
    const continuous = handsFreeRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = continuous;
    finalTranscriptRef.current = '';
    setInterimText('');

    const flush = (): void => {
      const txt = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = '';
      setInterimText('');
      if (txt) void sendMessageRef.current(txt);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript: string = res[0]?.transcript ?? '';
        if (res.isFinal) {
          finalTranscriptRef.current += ` ${transcript}`;
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);

      if (handsFreeRef.current) {
        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = window.setTimeout(() => {
          try {
            recognition.stop();
          } catch {
            /* ignore */
          }
        }, 1500);
      } else if (finalTranscriptRef.current.trim()) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
      }
    };
    recognition.onerror = (): void => {
      setIsRecording(false);
      setInterimText('');
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    recognition.onend = (): void => {
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsRecording(false);
      flush();
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      /* already started — ignore */
    }
  }, [deck.lang]);

  const stopRecording = useCallback((): void => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

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

        const resumeMic = (): void => {
          if (handsFreeRef.current && !rateLimitHit) {
            window.setTimeout(() => {
              if (handsFreeRef.current) startRecording();
            }, 300);
          }
        };

        if (autoSpeakRef.current) {
          setIsSpeaking(true);
          speak(response.reply, deck.lang, selectedVoiceURIRef.current, () => {
            setIsSpeaking(false);
            resumeMic();
          });
        } else {
          resumeMic();
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
      startRecording,
    ],
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const toggleHandsFree = (): void => {
    const next = !handsFree;
    setHandsFree(next);
    if (!next) {
      stopRecording();
    } else if (!isRecording && !loading && !isSpeaking) {
      window.setTimeout(() => startRecording(), 0);
    }
  };

  const toggleAutoSpeak = (): void => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    if (!next && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleEnd = (): void => {
    abortRef.current?.abort();
    try {
      recognitionRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
        <div className="conv-hdr-right" style={{ flexWrap: 'wrap', gap: 8 }}>
          <select
            className="inp"
            value={selectedVoiceURI ?? ''}
            onChange={(e) => setSelectedVoiceURI(e.target.value || null)}
            disabled={availableVoices.length === 0}
            style={{
              padding: '6px 10px',
              fontSize: 12,
              maxWidth: 220,
              cursor: availableVoices.length === 0 ? 'not-allowed' : 'pointer',
            }}
            aria-label="Choose AI voice"
            title="Veu de la IA"
          >
            {availableVoices.length === 0 && <option value="">Sense veu</option>}
            {availableVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <button
            className="bi"
            onClick={toggleAutoSpeak}
            title={autoSpeak ? 'Veu IA: ON' : 'Veu IA: OFF'}
            style={{ opacity: autoSpeak ? 1 : 0.4 }}
            aria-label="Toggle AI voice"
          >
            🔊
          </button>
          <button
            onClick={toggleHandsFree}
            title={handsFree ? 'Mans lliures: ON' : 'Mans lliures: OFF'}
            style={{
              minHeight: 44,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: handsFree ? '2px solid var(--a)' : '1px solid var(--b)',
              background: handsFree ? 'var(--a)' : 'var(--s)',
              color: handsFree ? 'var(--bg)' : 'var(--t)',
              boxShadow: handsFree ? '0 0 14px rgba(212,160,23,0.45)' : 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'var(--transition)',
            }}
            aria-pressed={handsFree}
            aria-label="Toggle hands-free mode"
          >
            🎤 {handsFree ? 'Mans lliures ON' : 'Mans lliures OFF'}
          </button>
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
          <div key={idx} className={msg.role === 'ai' ? 'conv-msg-wrap-ai' : 'conv-msg-wrap-user'}>
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

        {interimText && !pendingText && (
          <div className="conv-msg-wrap-user">
            <div className="c conv-pending" style={{ opacity: 0.6, fontStyle: 'italic' }}>
              <div className="conv-msg-role">Tu (escoltant…)</div>
              {interimText}
            </div>
          </div>
        )}

        {loading && (
          <div className="conv-msg-wrap-ai">
            <div className="c conv-loading-bubble">···</div>
          </div>
        )}

        {isSpeaking && !loading && (
          <div className="conv-msg-wrap-ai">
            <div className="c conv-loading-bubble">🔊 parlant…</div>
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
            if (handsFree || loading || rateLimitHit) return;
            startRecording();
          }}
          onPointerUp={() => {
            if (handsFree) return;
            stopRecording();
          }}
          onPointerLeave={() => {
            if (handsFree) return;
            stopRecording();
          }}
          onClick={() => {
            if (!handsFree) return;
            if (isRecording) stopRecording();
            else if (!loading && !rateLimitHit && !isSpeaking) startRecording();
          }}
          disabled={rateLimitHit}
          aria-label={isRecording ? 'Atura' : 'Inicia'}
        >
          {isRecording ? '⏹' : '🎙️'}
        </button>
      </div>
    </div>
  );
}
