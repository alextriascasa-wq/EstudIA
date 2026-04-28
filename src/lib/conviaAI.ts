/**
 * AI Integration for ConvIA conversation practice via Cloudflare Worker proxy.
 * Mirrors the feynmanAI.ts pattern.
 */
import type { ConvCorrection } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export interface ConvPayload {
  language: string;
  scenario: {
    id: string;
    character: string;
    title: string;
  };
  messages: { role: 'user' | 'ai'; text: string }[];
  latestUserSpeech: string;
  targetVocab: string[];
}

export interface ConvResponse {
  reply: string;
  corrections: ConvCorrection[];
  newVocabCards: { word: string; translation: string; example: string }[];
  fluencyScore: number;
}

export async function callConverse(
  payload: ConvPayload,
  signal?: AbortSignal,
): Promise<ConvResponse> {
  const response = await fetch(`${WORKER_URL}/converse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('RATE_LIMIT');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as Partial<ConvResponse>;

  return {
    reply: data.reply ?? '',
    corrections: data.corrections ?? [],
    newVocabCards: data.newVocabCards ?? [],
    fluencyScore: typeof data.fluencyScore === 'number' ? data.fluencyScore : 0,
  };
}
