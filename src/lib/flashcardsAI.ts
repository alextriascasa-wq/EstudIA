/**
 * Client-side integration for AI Flashcard generation.
 */

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export interface GenCard {
  q: string;
  a: string;
}

export async function generateFlashcards(
  text: string,
  count: number,
  signal?: AbortSignal
): Promise<GenCard[]> {
  const url = `${WORKER_URL}/generate-cards`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, count, language: 'ca' }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Has superat el límit diari d\'ús de la IA (30 peticions).');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`Error de connexió amb l'IA: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('La IA ha retornat un format invàlid.');
  }

  return data as GenCard[];
}
