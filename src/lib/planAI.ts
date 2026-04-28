import type { StudyProfile, StudyPlan } from '@/types';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787';

export async function generatePlanNarrative(
  profile: StudyProfile,
  plan: StudyPlan,
  locale: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${WORKER_URL}/generate-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, plan, locale }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('RATE_LIMIT');
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { narrative?: string };
  if (!data.narrative) throw new Error('Invalid response from AI proxy');
  return data.narrative;
}
