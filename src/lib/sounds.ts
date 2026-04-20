import type { SoundKey } from '@/types';

export interface SoundMeta {
  name: string;
  ico: string;
}

/** Ordered map — key is also the noise generator type in `audio.ts`. */
export const SOUNDS: Record<SoundKey, SoundMeta> = {
  rain: { name: 'Pluja', ico: '🌧️' },
  cafe: { name: 'Cafeteria', ico: '☕' },
  fire: { name: 'Foc', ico: '🔥' },
  forest: { name: 'Bosc', ico: '🌲' },
  waves: { name: 'Ones', ico: '🌊' },
  brown: { name: 'Soroll marró', ico: '🟤' },
};

export const SOUND_ORDER: readonly SoundKey[] = ['rain', 'cafe', 'fire', 'forest', 'waves', 'brown'];
