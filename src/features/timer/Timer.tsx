import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { fmtTime, today, weeklyIndex } from '@/lib/date';
import { playChime } from '@/lib/audio';
import { TIMER_MODES } from './modes';
import { useInterval } from '@/hooks/useInterval';
import {
  notificationsSupported,
  notifPermission,
  requestNotifPermission,
  sendTimerNotification,
} from '@/lib/notifications';

export function Timer(): JSX.Element {
  const { t } = useTranslation();
  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);
  const todaySess = useAppStore((s) => s.todaySess);
  const totalMin = useAppStore((s) => s.totalMin);
  const pomCount = useAppStore((s) => s.pomCount);

  const [modeIdx, setModeIdx] = useState<number>(0);
  const [left, setLeft] = useState<number>(TIMER_MODES[0]!.w);
  const [running, setRunning] = useState<boolean>(false);
  const [resting, setResting] = useState<boolean>(false);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(
    notificationsSupported() && notifPermission() === 'granted',
  );
  const nextRef = useRef<() => void>(() => undefined);

  const mode = TIMER_MODES[modeIdx]!;
  const totalForPhase = resting ? mode.r : mode.w;
  const pct = ((totalForPhase - left) / totalForPhase) * 100;
  const r = 106;
  const circumference = 2 * Math.PI * r;

  // Side-effect when a focus phase ends: bump stats, XP, toggle rest.
  const onPhaseEnd = (): void => {
    playChime('done');
    // Browser notification
    if (notifEnabled) {
      sendTimerNotification(
        resting ? t('timer.rest') : '✅ ' + t('timer.focus'),
        resting
          ? t('timer.notifRestDone')
          : t('timer.notifFocusDone', { mode: t(`timer.modes.${mode.id}.nm`) }),
      );
    }
    if (!resting) {
      const mins = Math.round(mode.w / 60);
      const newTotalMin = totalMin + mins;
      const newTodaySess = todaySess + 1;
      const newPomCount = pomCount + 1;
      const dateKey = today();
      const s = useAppStore.getState();
      const nextHeatmap = { ...s.heatmap, [dateKey]: (s.heatmap[dateKey] ?? 0) + mins };
      const weekly = s.weekly.map((w) => ({ ...w }));
      const mi = weeklyIndex(new Date().getDay());
      if (weekly[mi]) weekly[mi] = { ...weekly[mi]!, m: weekly[mi]!.m + mins };
      const dailyLog = [...s.dailyLog];
      const existing = dailyLog.find((d) => d.date === dateKey);
      if (existing) {
        existing.minutes += mins;
        existing.sessions += 1;
      } else {
        dailyLog.push({ date: dateKey, minutes: mins, cards: 0, correct: 0, sessions: 1 });
      }
      patch({
        totalMin: newTotalMin,
        todaySess: newTodaySess,
        pomCount: newPomCount,
        heatmap: nextHeatmap,
        weekly,
        dailyLog,
      });
      save();
      addXP(mins * 2);
      setResting(true);
      // Long rest every 4 pomodoros (pom mode only).
      const useLong = mode.id === 'pom' && newPomCount % 4 === 0;
      setLeft(useLong ? (mode.lr ?? mode.r) : mode.r);
    } else {
      setResting(false);
      setLeft(mode.w);
    }
    setRunning(false);
  };

  // Keep the latest version of onPhaseEnd in a ref (avoid re-creating interval).
  useEffect(() => {
    nextRef.current = onPhaseEnd;
  });

  useInterval(
    () => {
      setLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => nextRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    },
    running ? 1000 : null,
  );

  const onSetMode = (i: number): void => {
    setModeIdx(i);
    setRunning(false);
    setResting(false);
    setLeft(TIMER_MODES[i]!.w);
  };

  const onReset = (): void => {
    setRunning(false);
    setResting(false);
    setLeft(mode.w);
  };

  const toggle = (): void => setRunning((prev) => !prev);

  return (
    <div className="sec">
      {/* MODE CARDS */}
      <div className="g3">
        {TIMER_MODES.map((md, i) => (
          <div
            key={md.id}
            className={`c mc${i === modeIdx ? ' on' : ''}`}
            onClick={() => onSetMode(i)}
          >
            <div className="mn-name">
              {md.ico} {t(`timer.modes.${md.id}.nm`)}
            </div>
            <div className="mn-desc">
              {md.ds} — {t(`timer.modes.${md.id}.ideal`)}
            </div>
          </div>
        ))}
      </div>

      {/* TIMER CIRCLE */}
      <div className="c glow" style={{ textAlign: 'center', padding: '44px 24px' }}>
        <span
          className="badge"
          style={{
            fontSize: 12,
            padding: '6px 18px',
            borderRadius: 20,
            background: resting ? 'var(--okl)' : 'var(--al)',
            color: resting ? 'var(--ok)' : 'var(--a)',
            letterSpacing: 1,
          }}
        >
          {resting ? t('timer.rest') : t('timer.focus')}
        </span>
        <div className="tmr-circle">
          <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="120" cy="120" r={r} fill="none" stroke="var(--bl)" strokeWidth="8" />
            <circle
              cx="120"
              cy="120"
              r={r}
              fill="none"
              stroke={resting ? 'var(--ok)' : 'url(#tmGrad)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset .5s' }}
            />
            <defs>
              <linearGradient id="tmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: 'var(--a)' }} />
                <stop offset="100%" style={{ stopColor: 'var(--p)' }} />
              </linearGradient>
            </defs>
          </svg>
          <div className="tmr-time">
            <div className="dig">{fmtTime(left)}</div>
            <div className="sub">
              {resting
                ? t('timer.restSub')
                : t('timer.focusSub', { sess: todaySess + 1 })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
          <button
            className="bs"
            style={{
              borderRadius: '50%',
              width: 48,
              height: 48,
              padding: 0,
              justifyContent: 'center',
            }}
            onClick={onReset}
          >
            ↺
          </button>
          <button
            className="bp"
            style={{
              borderRadius: 16,
              width: 68,
              height: 68,
              padding: 0,
              justifyContent: 'center',
              fontSize: 26,
              background: running
                ? 'linear-gradient(135deg,var(--err),var(--errd))'
                : undefined,
            }}
            onClick={toggle}
          >
            {running ? '⏸' : '▶'}
          </button>
          {notificationsSupported() && (
            <button
              className="bs"
              style={{
                borderRadius: '50%',
                width: 48,
                height: 48,
                padding: 0,
                justifyContent: 'center',
                opacity: notifEnabled ? 1 : 0.45,
              }}
              title={notifEnabled ? t('timer.notifOn') : t('timer.notifOff')}
              onClick={async () => {
                if (notifEnabled) {
                  setNotifEnabled(false);
                } else {
                  const granted = await requestNotifPermission();
                  setNotifEnabled(granted);
                }
              }}
            >
              {notifEnabled ? '🔔' : '🔕'}
            </button>
          )}
          {!notificationsSupported() && <div style={{ width: 48 }} />}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 32 }}>
          {[
            { v: todaySess, l: t('timer.stats.sessions') },
            { v: `${totalMin}m`, l: t('timer.stats.total') },
            { v: pomCount, l: t('timer.stats.pomodoros') },
          ].map((x, i, arr) => (
            <div key={x.l} style={{ display: 'contents' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{x.v}</div>
                <div style={{ fontSize: 11, color: 'var(--tm)' }}>{x.l}</div>
              </div>
              {i < arr.length - 1 && <div style={{ width: 1, background: 'var(--b)' }} />}
            </div>
          ))}
        </div>
      </div>

      <div
        className="c"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: 'var(--bg)',
          borderColor: 'var(--bl)',
        }}
      >
        <span style={{ fontSize: 17, marginTop: 2 }}>{resting ? '🌿' : '🔒'}</span>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 5 }}>
            {resting ? t('timer.duringRest') : t('timer.duringFocus')}
          </h4>
          <p style={{ fontSize: 12, color: 'var(--ts)', lineHeight: 1.6 }}>
            {resting ? t('timer.duringRestDesc') : t('timer.duringFocusDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
