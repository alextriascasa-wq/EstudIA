import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { SOUNDS, SOUND_ORDER } from '@/lib/sounds';
import { createNoise, getCtx, type ActiveNoise } from '@/lib/audio';
import type { SoundKey } from '@/types';

/**
 * Sound mixer — persistent Web Audio nodes keyed by SoundKey.
 *
 * The audio graph lives outside React (in a ref) so volume changes do not
 * rebuild the nodes. On unmount the module keeps playing — Pro behaves the
 * same way when navigating between sections.
 */
export function Sounds(): JSX.Element {
  const { t } = useTranslation();
  const soundPrefs = useAppStore((s) => s.soundPrefs);
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);

  const nodesRef = useRef<Partial<Record<SoundKey, ActiveNoise>>>({});

  // Re-apply persisted volumes on mount (after reload / tab change).
  useEffect(() => {
    SOUND_ORDER.forEach((key) => {
      const vol = soundPrefs[key] ?? 0;
      if (vol > 0) applyVolume(key, vol);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyVolume = (key: SoundKey, vol: number): void => {
    const ctx = getCtx();
    if (vol > 0) {
      if (!nodesRef.current[key]) nodesRef.current[key] = createNoise(key);
      const node = nodesRef.current[key]!;
      node.gain.gain.linearRampToValueAtTime(vol / 100, ctx.currentTime + 0.1);
    } else {
      const node = nodesRef.current[key];
      if (node) node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    }
  };

  const setVolume = (key: SoundKey, vol: number): void => {
    patch({ soundPrefs: { ...soundPrefs, [key]: vol } });
    save();
    applyVolume(key, vol);
  };

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.sounds.title')}</h2>
        <p>{t('headers.sounds.desc')}</p>
      </div>
      <div className="c glow">
        <div className="snd-list">
          {SOUND_ORDER.map((key) => {
            const snd = SOUNDS[key];
            const vol = soundPrefs[key] ?? 0;
            return (
              <div key={key} className="snd-ch">
                <div className="snd-ico">{snd.ico}</div>
                <span className="snd-name">{snd.name}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={vol}
                  onChange={(e) => setVolume(key, Number(e.target.value))}
                />
                <span className="snd-vol">{vol}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="c c-subtle">
        <div className="info-row">
          <span className="info-icon">🔬</span>
          <div>
            <h4 className="info-title">Per què funciona?</h4>
            <p className="info-body">
              El soroll ambient constant (especialment soroll marró i pluja) actua com a
              &quot;màscara acústica&quot;: neutralitza els sons imprevisibles de
              l&apos;entorn que fragmenten la concentració. El nivell ideal és prou alt
              per cobrir distraccions però prou baix per no molestar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
