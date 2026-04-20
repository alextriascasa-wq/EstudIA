export type StretchId = 'neck' | 'arms' | 'twist' | 'forward' | 'cervical';

export interface Stretch {
  id: StretchId;
  dur: number;
  ico: string;
}

/** 5 recovery stretches — data only; name/desc live in i18n (recovery.stretches.<id>). */
export const STRETCHES: readonly Stretch[] = [
  { id: 'neck', dur: 30, ico: '🔄' },
  { id: 'arms', dur: 45, ico: '🙆' },
  { id: 'twist', dur: 60, ico: '🔀' },
  { id: 'forward', dur: 25, ico: '🙇' },
  { id: 'cervical', dur: 30, ico: '😌' },
];
