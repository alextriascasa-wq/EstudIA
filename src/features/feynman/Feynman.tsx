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
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const start = (): void => {
    const t = topicDraft.trim();
    if (!t) return;
    setTopic(t);
    setLevel(0);
    const firstMsg: FeynmanMessage = {
      role: 'ai',
      text: `D'acord! Seré un nen de 5 anys molt curiós 🧒\n\nExplica'm: <strong>"${t}"</strong>\n\nQuè és això? Necessito que ho expliquis tan fàcil que ho entengui qualsevol persona del carrer. Res de paraules complicades!`,
      timestamp: new Date().toISOString(),
      source: 'ai'
    };
    setMessages([firstMsg]);
    patch({ feynmanHistory: [...feynmanHistory, { ...firstMsg, topic: t } as any] });
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
    
    // Optimistic UI
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setIsAiLoading(true);

    let aiReplyText = '';
    let source: 'ai' | 'fallback' = 'fallback';

    try {
      if (!navigator.onLine) throw new Error('Offline');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const { reply, remaining } = await askFeynman(topic, [...messages, userMsg].map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text,
        timestamp: m.timestamp || new Date().toISOString(),
        source: 'ai'
      })), controller.signal);
      
      clearTimeout(timeoutId);
      
      aiReplyText = reply;
      source = 'ai';
      setRateRemaining(remaining);
      setLastSource('ai');
    } catch (e) {
      console.warn('Feynman AI failed, falling back to basic mode', e);
      // Fallback
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
    
    // Save to global history
    patch({
      feynmanHistory: [
        ...feynmanHistory,
        { ...userMsg, topic } as any,
        { ...aiMsg, topic } as any
      ]
    });
    
    setIsAiLoading(false);
  };

  const resetTopic = (): void => {
    setTopic('');
    setTopicDraft('');
    setLevel(0);
    setMessages([]);
  };

  return (
    <div className="sec">
      <div className="sec-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>{t('headers.feynman.title')}</h2>
          <p>{t('headers.feynman.desc')}</p>
        </div>
        {topic && lastSource && (
          <div
            className="badge"
            style={{
              background: lastSource === 'ai' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: lastSource === 'ai' ? 'var(--ok)' : 'var(--w)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11
            }}
            title={lastSource === 'fallback' ? "S'ha activat el mode bàsic (offline o limit d'ús)." : "IA amb Gemini."}
          >
            {lastSource === 'ai' ? '🟢 IA real' : '⚙️ Mode bàsic'}
            {rateRemaining !== null && lastSource === 'ai' && (
              <span style={{opacity: 0.6, marginLeft: 4}}>({rateRemaining} restants)</span>
            )}
          </div>
        )}
      </div>
      {!topic ? (
        <div className="c glow" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 52, marginBottom: 18 }}>🧠</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
            Quin concepte vols dominar?
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--ts)',
              marginBottom: 22,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Escriu un tema i hauràs d&apos;explicar-lo sense jerga. L&apos;IA detecta il·lusions
            de competència i et fa preguntes socràtiques.
          </p>
          <div style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
            <input
              className="inp"
              placeholder="ex: Mitosi, Derivades, La Revolució Francesa..."
              style={{ fontSize: 14 }}
              value={topicDraft}
              onChange={(e) => setTopicDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
            />
            <button className="bp" onClick={start}>
              Començar
            </button>
          </div>
        </div>
      ) : (
        <div className="c">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>📝 {topic}</h3>
              <span
                className="badge"
                style={{
                  background:
                    level >= 3 ? 'var(--okl)' : level >= 1 ? 'var(--wl)' : 'var(--errl)',
                  color:
                    level >= 3 ? 'var(--ok)' : level >= 1 ? 'var(--w)' : 'var(--err)',
                }}
              >
                Comprensió: {level >= 3 ? 'ALTA' : level >= 1 ? 'MITJA' : 'BAIXA'}
              </span>
            </div>
            <button
              className="bs"
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={resetTopic}
            >
              Nou tema
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
          <div className="chat-input" style={{ opacity: isAiLoading ? 0.6 : 1, pointerEvents: isAiLoading ? 'none' : 'auto' }}>
            <input
              className="inp"
              placeholder={isAiLoading ? "Penseu..." : "Explica amb les teves paraules..."}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={isAiLoading}
            />
            <button className="bp" onClick={send} disabled={isAiLoading}>
              {isAiLoading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
