/**
 * Catalan date helpers — 1:1 with Pro `fmtDate`, `daysUntil`, `today`.
 */

export const today = (): string => new Date().toISOString().split('T')[0]!;

const WEEKDAYS = ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'] as const;
const MONTHS = [
  'gen',
  'feb',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'oct',
  'nov',
  'des',
] as const;

export function fmtDate(d: string): string {
  const dt = new Date(`${d}T12:00:00`);
  return `${WEEKDAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

export function daysUntil(d: string): number {
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  const t = new Date(`${d}T12:00:00`);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - n.getTime()) / 864e5);
}

export function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function uid(): string {
  return Date.now() + Math.random().toString(36).slice(2, 7);
}

/** Monday-indexed weekly array (0=Dl … 6=Dg). */
export function weeklyIndex(dayOfWeek: number): number {
  return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
}
