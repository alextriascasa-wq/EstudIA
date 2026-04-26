import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { fmtTime, weeklyIndex } from '@/lib/date';
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
      const { incrementDailyLog, addXP } = useAppStore.getState();
      const mins = Math.round(mode.w / 60);

      const s = useAppStore.getState();
      const weekly = s.weekly.map((w) => ({ ...w }));
      const mi = weeklyIndex(new Date().getDay());
      if (weekly[mi]) weekly[mi] = { ...weekly[mi]!, m: weekly[mi]!.m + mins };

      patch({ weekly });

      incrementDailyLog({ minutes: mins, sessions: 1, pomodoros: 1 } as any);
      addXP(mins * 2);
      setResting(true);
      // Long rest every 4 pomodoros (pom mode only).
      const useLong = mode.id === 'pom' && (s.pomCount + 1) % 4 === 0;
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
      <div className="c glow tmr-card">
        <span
          className="badge tmr-phase-badge"
          style={{
            background: resting ? 'var(--okl)' : 'var(--al)',
            color: resting ? 'var(--ok)' : 'var(--a)',
          }}
        >
          {resting ? t('timer.rest') : t('timer.focus')}
        </span>
        <div className="tmr-circle">
          <svg width="240" height="240" viewBox="0 0 240 240" className="tmr-svg">
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
              {resting ? t('timer.restSub') : t('timer.focusSub', { sess: todaySess + 1 })}
            </div>
          </div>
        </div>
        <div className="tmr-btns">
          <button className="bs tmr-btn-round" onClick={onReset}>
            ↺
          </button>
          <button
            className={`bp tmr-btn-play${running ? ' active' : ''}`}
            onClick={toggle}
          >
            {running ? '⏸' : '▶'}
          </button>
          {notificationsSupported() && (
            <button
              className={`bs tmr-btn-round${!notifEnabled ? ' tmr-notif-off' : ''}`}
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
          {!notificationsSupported() && <div className="w-12" />}
        </div>
        <div className="tmr-stats">
          {[
            { v: todaySess, l: t('timer.stats.sessions') },
            { v: `${totalMin}m`, l: t('timer.stats.total') },
            { v: pomCount, l: t('timer.stats.pomodoros') },
          ].map((x, i, arr) => (
            <Fragment key={x.l}>
              <div className="tmr-stat-item">
                <div className="tmr-stat-val">{x.v}</div>
                <div className="tmr-stat-lbl">{x.l}</div>
              </div>
              {i < arr.length - 1 && <div className="tmr-divider" />}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="c c-subtle">
        <div className="info-row">
          <span className="info-icon">{resting ? '🌿' : '🔒'}</span>
          <div>
            <h4 className="info-title">
              {resting ? t('timer.duringRest') : t('timer.duringFocus')}
            </h4>
            <p className="info-body">
              {resting ? t('timer.duringRestDesc') : t('timer.duringFocusDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
