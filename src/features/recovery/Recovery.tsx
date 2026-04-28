import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { STRETCHES } from '@/lib/stretches';

type BreathPhase = 'inhale' | 'hold' | 'exhale';

const PHASE_MS: Record<BreathPhase, number> = {
  inhale: 4000,
  hold: 4000,
  exhale: 6000,
};

export function Recovery(): JSX.Element {
  const { t } = useTranslation();
  const addXP = useAppStore((s) => s.addXP);

  const [active, setActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [count, setCount] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef<boolean>(false);

  // One random stretch per mount — stable while the tab is open.
  const stretch = useMemo(() => {
    const pick = STRETCHES[Math.floor(Math.random() * STRETCHES.length)];
    return pick ?? STRETCHES[0]!;
  }, []);

  const clear = (): void => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const runCycle = (cycleIdx: number): void => {
    if (!activeRef.current) return;
    setPhase('inhale');
    setCount(cycleIdx);
    timerRef.current = window.setTimeout(() => {
      if (!activeRef.current) return;
      setPhase('hold');
      timerRef.current = window.setTimeout(() => {
        if (!activeRef.current) return;
        setPhase('exhale');
        timerRef.current = window.setTimeout(() => {
          if (!activeRef.current) return;
          const next = cycleIdx + 1;
          if (next >= 8) {
            activeRef.current = false;
            setActive(false);
            addXP(10);
            return;
          }
          runCycle(next);
        }, PHASE_MS.exhale);
      }, PHASE_MS.hold);
    }, PHASE_MS.inhale);
  };

  const start = (): void => {
    clear();
    activeRef.current = true;
    setActive(true);
    setCount(0);
    runCycle(0);
  };

  const stop = (): void => {
    activeRef.current = false;
    setActive(false);
    clear();
  };

  // Cleanup on unmount.
  useEffect(
    () => () => {
      activeRef.current = false;
      clear();
    },
    [],
  );

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.recovery.title')}</h2>
        <p>{t('headers.recovery.desc')}</p>
      </div>
      <div className="g2">
        {/* NSDR */}
        <div className="c glow text-center">
          <div className="rec-icon">🧘</div>
          <h3 className="rec-card-title">{t('recovery.nsdr.title')}</h3>
          <p className="rec-card-desc">{t('recovery.nsdr.desc')}</p>
          <div className="rec-steps-box">
            {(t('recovery.nsdr.steps', { returnObjects: true }) as string[]).map((s, i) => (
              <div key={s} className="rec-step">
                <span className="rec-step-num">{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breathing 4-4-6 */}
        <div className="c glow text-center">
          <div className="rec-icon">🌬️</div>
          <h3 className="rec-card-title">{t('recovery.breath.title')}</h3>
          <p className="rec-card-desc">{t('recovery.breath.desc')}</p>
          {active ? (
            <>
              <div
                className={`breath-circle ${phase === 'inhale' ? 'inhale' : phase === 'exhale' ? 'exhale' : ''}`}
              >
                {t(`recovery.breath.${phase}`)}
              </div>
              <div className="rec-breath-progress">
                {t('recovery.breath.progress', { n: count + 1 })}
              </div>
              <button className="bs" onClick={stop}>
                {t('recovery.breath.stop')}
              </button>
            </>
          ) : (
            <>
              <div className="breath-circle">{t('recovery.breath.press')}</div>
              <button className="bp mt-4" onClick={start}>
                {t('recovery.breath.cycles')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Random stretch */}
      <div className="c">
        <div className="rec-stretch-row">
          <div className="rec-stretch-icon">{stretch.ico}</div>
          <div className="flex-1">
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>
              {t(`recovery.stretches.${stretch.id}.name`)}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.5 }}>
              {t(`recovery.stretches.${stretch.id}.desc`)}
            </p>
            <span className="badge badge-ok mt-1.5">~{stretch.dur}s</span>
          </div>
        </div>
      </div>

      {/* Forbidden during break */}
      <div className="c c-danger">
        <div className="info-row">
          <span className="info-icon">⛔</span>
          <div>
            <h4 className="danger-title">{t('recovery.forbidden.title')}</h4>
            <p className="info-body">{t('recovery.forbidden.desc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
