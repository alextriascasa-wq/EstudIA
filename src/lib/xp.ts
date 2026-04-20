import type { AppState } from '@/types';

/**
 * Cumulative XP required to reach each level (index = level).
 * 51 entries for levels 1-50 — ported verbatim from Pro.
 */
export const XP_TABLE: readonly number[] = [
  0, 100, 220, 360, 520, 700, 900, 1120, 1360, 1620, 1900, 2200, 2520, 2860, 3220, 3600, 4000,
  4420, 4860, 5320, 5800, 6300, 6820, 7360, 7920, 8500, 9100, 9720, 10360, 11020, 11700, 12400,
  13120, 13860, 14620, 15400, 16200, 17020, 17860, 18720, 19600, 20500, 21420, 22360, 23320, 24300,
  25300, 26320, 27360, 28420, 30000,
];

export function xpForLevel(level: number): number {
  return level < 50 ? (XP_TABLE[level] ?? 30000) - (XP_TABLE[level - 1] ?? 0) : 1000;
}

export function xpInLevel(state: Pick<AppState, 'level' | 'totalXp'>): {
  cur: number;
  need: number;
} {
  const prev = XP_TABLE[state.level - 1] ?? 0;
  const next = XP_TABLE[state.level] ?? prev + 1000;
  return { cur: state.totalXp - prev, need: next - prev };
}
