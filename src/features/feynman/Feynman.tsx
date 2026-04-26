import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { analyzeFeynmanReply } from '@/lib/feynman';
import { askFeynman } from '@/lib/feynmanAI';
import type { FeynmanMessage } from '@/types';

export function Feynman(): JSX.Element {
  const { t } = useTranslation();
  const addXP = useAppStore((s) => s.addXP);

  const patch = useAppStore((s) => s.patch);
  const feynmanHistory = useAppStore((s) => s.feynmanHistory);

  const [topic, setTopic] = useState<string>('');
  const [topicDraft, setTopicDraft] = useState<string>('');
  const [level, setLevel] = useState<number>(0);
  const [messages, setMessages] = useState<FeynmanMessage[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [lastSource, setLastSource] = useState<'ai' | 'fallback' | null>(null);
  const [rateRemaining, setRateRemaining] = useState<number | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ca-ES';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) {
          setDraft((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(t('feynman.noSpeech'));
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const start = (): void => {
    const topicTrim = topicDraft.trim();
    if (!topicTrim) return;
    setTopic(topicTrim);
    setLevel(0);
    const firstMsg: FeynmanMessage = {
      role: 'ai',
      text: t('feynman.firstMsg', { topic: topicTrim }),
      timestamp: new Date().toISOString(),
      source: 'ai',
    };
    setMessages([firstMsg]);
    patch({ feynmanHistory: [...feynmanHistory, { ...firstMsg, topic: topicTrim } as any] });
    setLastSource(null);
    addXP(5);
  };

  const send = async (): Promise<void> => {
    const userText = draft.trim();
    if (!userText) return;

    const userMsg: FeynmanMessage = {
      role: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setIsAiLoading(true);

    let aiReplyText = '';
    let source: 'ai' | 'fallback' = 'fallback';

    try {
      if (!navigator.onLine) throw new Error('Offline');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const { reply, remaining } = await askFeynman(
        topic,
        [...messages, userMsg].map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.text,
          timestamp: m.timestamp || new Date().toISOString(),
          source: 'ai',
        })),
        controller.signal,
      );

      clearTimeout(timeoutId);

      aiReplyText = reply;
      source = 'ai';
      setRateRemaining(remaining);
      setLastSource('ai');
    } catch (e) {
      console.warn('Feynman AI failed, falling back to basic mode', e);
      const fallbackResult = analyzeFeynmanReply({
        userText,
        topic,
        feynLevel: level,
      });
      aiReplyText = fallbackResult.text;
      source = 'fallback';
      setLastSource('fallback');
      setLevel(fallbackResult.nextLevel);
      if (fallbackResult.xpGain > 0) addXP(fallbackResult.xpGain);
    }

    const aiMsg: FeynmanMessage = {
      role: 'ai',
      text: aiReplyText,
      timestamp: new Date().toISOString(),
      source,
    };

    setMessages((prev) => [...prev, aiMsg]);

    patch({
      feynmanHistory: [...feynmanHistory, { ...userMsg, topic } as any, { ...aiMsg, topic } as any],
    });

    setIsAiLoading(false);
  };

  const resetTopic = (): void => {
    setTopic('');
    setTopicDraft('');
    setLevel(0);
    setMessages([]);
  };

  const levelBg = level >= 3 ? 'var(--okl)' : level >= 1 ? 'var(--wl)' : 'var(--errl)';
  const levelColor = level >= 3 ? 'var(--ok)' : level >= 1 ? 'var(--w)' : 'var(--err)';
  const srcBg = lastSource === 'ai' ? 'var(--okl)' : 'var(--wl)';
  const srcColor = lastSource === 'ai' ? 'var(--ok)' : 'var(--w)';

  return (
    <div className="sec">
      <div className="sec-hdr flex justify-between items-start">
        <div>
          <h2>{t('headers.feynman.title')}</h2>
          <p>{t('headers.feynman.desc')}</p>
        </div>
        {topic && lastSource && (
          <div
            className="badge feynman-src-badge"
            style={{ background: srcBg, color: srcColor }}
            title={lastSource === 'fallback' ? t('feynman.titleFallback') : t('feynman.titleAi')}
          >
            {lastSource === 'ai' ? t('feynman.aiReal') : t('feynman.aiBasic')}
            {rateRemaining !== null && lastSource === 'ai' && (
              <span className="feynman-src-remaining">
                {t('feynman.remaining', { n: rateRemaining })}
              </span>
            )}
          </div>
        )}
      </div>

      {!topic ? (
        <div className="c glow feynman-empty">
          <div className="feynman-empty-icon">🧠</div>
          <h3 className="feynman-empty-title">{t('feynman.prompt')}</h3>
          <p className="feynman-empty-desc">{t('feynman.intro')}</p>
          <div className="feynman-start-row">
            <input
              className="inp"
              placeholder={t('feynman.topicPh')}
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
            />
            <button className="bp" onClick={start}>
              {t('feynman.start')}
            </button>
          </div>
        </div>
      ) : (
        <div className="c">
          <div className="feynman-chat-hdr">
            <div className="feynman-topic-info">
              <h3 className="t-h3">📝 {topic}</h3>
              <span className="badge" style={{ background: levelBg, color: levelColor }}>
                {t('feynman.comprehension')}:{' '}
                {level >= 3
                  ? t('feynman.levelHigh')
                  : level >= 1
                    ? t('feynman.levelMed')
                    : t('feynman.levelLow')}
              </span>
            </div>
            <button className="bs bs-sm" onClick={resetTopic}>
              {t('feynman.newTopic')}
            </button>
          </div>
          <div className="chat-area" ref={chatRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}
                dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br>') }}
              />
            ))}
          </div>
          <div
            className="chat-input"
            style={{ opacity: isAiLoading ? 0.6 : 1, pointerEvents: isAiLoading ? 'none' : 'auto' }}
          >
            <button
              className={`bs feynman-mic${isListening ? ' active' : ''}`}
              onClick={toggleListening}
              disabled={isAiLoading}
              title={isListening ? t('feynman.listenStop') : t('feynman.listenStart')}
            >
              <span className="feynman-mic-icon">{isListening ? '🛑' : '🎙️'}</span>
            </button>
            <textarea
              className="inp chat-textarea"
              placeholder={
                isListening
                  ? t('feynman.phListening')
                  : isAiLoading
                    ? t('feynman.phThinking')
                    : t('feynman.phExplain')
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={isAiLoading}
            />
            <button
              className="bp px-6"
              onClick={send}
              disabled={isAiLoading || !draft.trim()}
            >
              {isAiLoading ? '...' : t('feynman.send')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
