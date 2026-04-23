import type { StemSession, HumanitiesSession } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export async function generateZeroSession(
  notes: string,
  mode: 'stem' | 'humanities',
  language: string
): Promise<StemSession | HumanitiesSession> {
  const res = await fetch(`${WORKER_URL}/zero-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes, mode, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<StemSession | HumanitiesSession>;
}

export async function checkZeroAnswer(
  problem: string,
  userAnswer: string,
  idealAnswer: string,
  language: string
): Promise<{ correct: boolean; feedback: string; score: number }> {
  const res = await fetch(`${WORKER_URL}/zero-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, userAnswer, idealAnswer, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<{ correct: boolean; feedback: string; score: number }>;
}

export async function checkHumanitiesAnswer(
  question: string,
  userAnswer: string,
  idealAnswer: string,
  rubric: string[],
  language: string
): Promise<{ score: number; gaps: string[]; feedback: string; flashcardSuggestions: string[] }> {
  const res = await fetch(`${WORKER_URL}/zero-check-humanities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, userAnswer, idealAnswer, rubric, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json() as Promise<{ score: number; gaps: string[]; feedback: string; flashcardSuggestions: string[] }>;
}
