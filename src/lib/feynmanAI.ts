/**
 * AI Integration for Feynman Tutor via Cloudflare Worker proxy
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export interface FeynmanMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  source: 'ai' | 'fallback';
}

export async function askFeynman(
  topic: string,
  messages: FeynmanMessage[],
  signal?: AbortSignal
): Promise<{ reply: string; remaining: number }> {
  const url = `${WORKER_URL}/feynman`;

  // We only send the role and text to the worker.
  const payload = {
    topic,
    messages: messages.map((m) => ({ role: m.role, text: m.text })),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const remainingHeader = response.headers.get('X-RateLimit-Remaining');
  const remaining = remainingHeader ? parseInt(remainingHeader, 10) : 0;

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = await response.json();
  if (!data.reply) {
    throw new Error('Invalid response from AI proxy');
  }

  return { reply: data.reply, remaining };
}
