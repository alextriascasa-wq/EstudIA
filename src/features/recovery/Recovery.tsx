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

  // One random stretch per mount — Pro re-rolls on every render; keeping it
  // stable while the tab is open is friendlier to the user.
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
        <div className="c glow" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🧘</div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
            {t('recovery.nsdr.title')}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ts)',
              lineHeight: 1.5,
              marginBottom: 18,
            }}
          >
            {t('recovery.nsdr.desc')}
          </p>
          <div
            style={{
              background: 'var(--al)',
              borderRadius: 'var(--radius-sm)',
              padding: 16,
              textAlign: 'left',
            }}
          >
            {(t('recovery.nsdr.steps', { returnObjects: true }) as string[]).map((s, i) => (
              <div
                key={s}
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 5,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--a)', fontWeight: 700 }}>{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breathing 4-4-6 */}
        <div className="c glow" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌬️</div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>
            {t('recovery.breath.title')}
          </h3>
          <p
            style={{
              fontSize: 12,
              color: 'var(--ts)',
              lineHeight: 1.5,
              marginBottom: 18,
            }}
          >
            {t('recovery.breath.desc')}
          </p>
          {active ? (
            <>
              <div
                className={`breath-circle ${phase === 'inhale' ? 'inhale' : phase === 'exhale' ? 'exhale' : ''}`}
              >
                {t(`recovery.breath.${phase}`)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--ts)',
                  margin: '10px 0',
                }}
              >
                {t('recovery.breath.progress', { n: count + 1 })}
              </div>
              <button className="bs" onClick={stop}>
                {t('recovery.breath.stop')}
              </button>
            </>
          ) : (
            <>
              <div className="breath-circle">{t('recovery.breath.press')}</div>
              <button className="bp" style={{ marginTop: 16 }} onClick={start}>
                {t('recovery.breath.cycles')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Random stretch */}
      <div className="c">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--il)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            {stretch.ico}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 5 }}>
              {t(`recovery.stretches.${stretch.id}.name`)}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.5 }}>
              {t(`recovery.stretches.${stretch.id}.desc`)}
            </p>
            <span
              className="badge"
              style={{
                background: 'var(--okl)',
                color: 'var(--ok)',
                marginTop: 6,
              }}
            >
              ~{stretch.dur}s
            </span>
          </div>
        </div>
      </div>

      {/* Forbidden during break */}
      <div
        className="c"
        style={{ background: 'var(--errl)', borderColor: 'rgba(239,68,68,.15)' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, marginTop: 2 }}>⛔</span>
          <div>
            <h4
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--err)',
                marginBottom: 5,
              }}
            >
              {t('recovery.forbidden.title')}
            </h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
              {t('recovery.forbidden.desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
