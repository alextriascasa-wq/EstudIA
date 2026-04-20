import type { TimerMode } from '@/types';

/**
 * Timer modes — ported verbatim from Pro (d120 remains commented out per source).
 * `w` is focus seconds, `r` break seconds, `lr` is the long-rest for Pomodoro.
 */
export const TIMER_MODES: readonly TimerMode[] = [
  {
    id: 'pom',
    nm: 'Pomodoro',
    w: 25 * 60,
    r: 5 * 60,
    lr: 15 * 60,
    ico: '⏱️',
    ds: '25/5 min',
    ideal: 'Flashcards, repàs, vocabulari',
  },
  {
    id: 'd52',
    nm: 'Ultradian',
    w: 52 * 60,
    r: 17 * 60,
    ico: '🧠',
    ds: '52/17 min',
    ideal: 'Estudi mixt, lectura activa',
  },
  {
    id: 'd90',
    nm: 'Deep Work',
    w: 90 * 60,
    r: 27 * 60,
    ico: '⚡',
    ds: '90/27 min',
    ideal: 'Mates, física, programació',
  },
];
