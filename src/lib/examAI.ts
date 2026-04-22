import type { QuizQuestion, QuizType } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export async function generateExam(topic: string, type: QuizType, count: number, language: string): Promise<QuizQuestion[]> {
  const res = await fetch(`${WORKER_URL}/exam-generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, type, count, language }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate exam: ${res.status}`);
  }

  return res.json();
}

export async function correctExam(questions: QuizQuestion[], language: string): Promise<{id: string, isCorrect: boolean, feedback: string}[]> {
  const res = await fetch(`${WORKER_URL}/exam-correct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions, language }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to correct exam: ${res.status}`);
  }

  return res.json();
}
