/**
 * Web Audio helpers — procedural noise generators (rain / cafe / fire / forest / waves / brown)
 * and the 3-note timer chime.
 *
 * 1:1 port from Pro. Each noise type has the same buffer math so the audible feel matches.
 */

import type { SoundKey } from '@/types';

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export function getCtx(): AudioContext {
  return ensureCtx();
}

export interface ActiveNoise {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

export function createNoise(type: SoundKey): ActiveNoise {
  const c = ensureCtx();
  const bufferSize = 2 * c.sampleRate;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
  } else if (type === 'rain') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
      if (Math.random() < 0.001) data[i]! *= 4;
    }
  } else if (type === 'fire') {
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.04 * w) / 1.04;
      data[i] = last * 2;
      if (Math.random() < 0.005) data[i]! *= 3;
    }
  } else if (type === 'cafe') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
      if (Math.random() < 0.002) data[i]! *= 5;
    }
  } else if (type === 'waves') {
    for (let i = 0; i < bufferSize; i++) {
      const t = i / c.sampleRate;
      data[i] = Math.sin(t * 0.1) * 0.3 * (Math.random() * 2 - 1) + (Math.random() * 2 - 1) * 0.1;
    }
  } else if (type === 'forest') {
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
      if (Math.random() < 0.0005) data[i] = Math.sin(i / 100) * 0.8;
    }
  }

  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const gain = c.createGain();
  gain.gain.value = 0;
  src.connect(gain);
  gain.connect(c.destination);
  src.start();
  return { src, gain };
}

/** Timer chime — 3 descending sine notes when the phase ends. */
export function playChime(kind: 'done' | 'start'): void {
  try {
    const c = ensureCtx();
    const freqs = kind === 'done' ? [523.25, 659.25, 783.99] : [392, 330, 262];
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, c.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.15 + 0.35);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime + i * 0.15);
      osc.stop(c.currentTime + i * 0.15 + 0.35);
    });
  } catch {
    // AudioContext may be locked before user interaction — silently ignore.
  }
}
