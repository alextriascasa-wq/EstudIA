import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { xpInLevel } from '@/lib/xp';
import { genStudyTasks } from '@/lib/exams';
import { daysUntil, fmtDate, today } from '@/lib/date';
import { DAILY_TIPS } from '@/lib/tips';

export function Dashboard(): JSX.Element {
  const nav = useNavigate();
  const { t } = useTranslation();

  const {
    streak,
    exams,
    doneTasks,
    weekly,
    zNote,
    level,
    totalXp,
  } = useAppStore();

  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);

  const tasks = useMemo(() => genStudyTasks(exams), [exams]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today()), [tasks]);
  const upcoming = useMemo(
    () => exams.filter((e) => daysUntil(e.date) >= 0).slice(0, 4),
    [exams],
  );
  const doneToday = todayTasks.filter((t) => doneTasks.includes(t.id)).length;
  const { cur, need } = xpInLevel({ level, totalXp });

  const onToggle = (taskId: string): void => {
    const i = doneTasks.indexOf(taskId);
    const next = i >= 0 ? doneTasks.filter((x) => x !== taskId) : [...doneTasks, taskId];
    patch({ doneTasks: next });
    if (i < 0) addXP(8);
    save();
  };

  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length] ?? DAILY_TIPS[0]!;

  return (
    <div className="sec">
      {/* HERO / WELCOME HUB */}
      <div style={{ marginBottom: 10, marginTop: 10 }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto', letterSpacing: '-0.8px', marginBottom: 8 }}>
          {t('dashboard.heroTitle')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ts)' }}>
          {t('dashboard.heroDesc')}
        </p>
      </div>

      {/* BENTO ROW 1: 2/3 + 1/3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* PRIMARY: IA FLASHCARDS */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 32, background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.09), rgba(224, 92, 58, 0.06))', border: '1px solid rgba(212, 160, 23, 0.25)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -8, right: -12, fontSize: 90, opacity: 0.04 }}>🧠</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div style={{ fontSize: 32, filter: 'drop-shadow(0 0 8px rgba(212,160,23,0.4))' }}>✨</div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: 'var(--a)', color: '#0F0D0A', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              IA Power
            </span>
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 8, zIndex: 1 }}>{t('dashboard.actionCardsTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 28, zIndex: 1 }}>
            {t('dashboard.actionCardsDesc')}
          </p>
          <button className="bp" style={{ width: '100%' }} onClick={() => nav('/cards')}>
            {t('dashboard.actionCardsBtn')}
          </button>
        </div>

        {/* TIMER */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏱️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>{t('dashboard.actionTimerTitle')}</h3>
          <p style={{ fontSize: 12, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 20 }}>
            {t('dashboard.actionTimerDesc')}
          </p>
          <button className="bs" style={{ width: '100%' }} onClick={() => nav('/timer')}>
            {t('dashboard.actionTimerBtn')}
          </button>
        </div>
      </div>

      {/* BENTO ROW 2: 1/3 + 2/3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 }}>
        {/* IA EXAMS */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📝</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>{t('dashboard.actionExamsTitle')}</h3>
          <p style={{ fontSize: 12, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 20 }}>
            {t('dashboard.actionExamsDesc')}
          </p>
          <button className="bp" style={{ width: '100%' }} onClick={() => nav('/exams')}>
            {t('dashboard.actionExamsBtn')}
          </button>
        </div>

        {/* 7-DAY STREAK */}
        <div className="c grad glow" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 44, filter: streak > 0 ? 'drop-shadow(0 0 12px rgba(212, 160, 23, 0.5))' : 'grayscale(1)', transform: streak > 0 ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s' }}>
              🔥
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, fontFamily: "'DM Mono', monospace", color: streak > 0 ? 'var(--a)' : 'var(--ts)', marginTop: 4 }}>
              {streak}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 14 }}>{t('dashboard.streakTitle')}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
              {weekly.map((d, i) => {
                 const isActive = d.m > 0;
                 return (
                   <div key={d.d + i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                     <div style={{
                       width: 34, height: 34, borderRadius: '50%',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       background: isActive ? 'linear-gradient(135deg, var(--a), var(--ad))' : 'var(--bg)',
                       border: `2px solid ${isActive ? 'var(--a)' : 'var(--b)'}`,
                       color: isActive ? '#0F0D0A' : 'var(--ts)',
                       fontWeight: 800, fontSize: 13,
                       boxShadow: isActive ? '0 0 12px rgba(212, 160, 23, 0.35)' : 'none'
                     }}>
                       {isActive ? '✓' : ''}
                     </div>
                     <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? 'var(--a)' : 'var(--ts)' }}>
                       {d.d}
                     </div>
                   </div>
                 )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="g2">
        {/* LEVEL & STREAK INFO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* LEVEL BAR */}
          <div className="c grad" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--a), var(--ad))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 500,
                fontFamily: "'DM Mono', monospace",
                color: '#0F0D0A',
                boxShadow: '0 4px 15px rgba(212, 160, 23, 0.35)',
              }}
            >
              {level}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{t('sidebar.level')} {level}</span>
                <span style={{ fontSize: 12, color: 'var(--ts)', fontFamily: "'DM Mono', monospace" }}>{cur}/{need} XP</span>
              </div>
              <div className="pb pb-lg">
                <div
                  className="fill"
                  style={{
                    width: `${(cur / Math.max(need, 1)) * 100}%`,
                    background: 'linear-gradient(90deg, var(--a), var(--a2))',
                  }}
                />
              </div>
            </div>
          </div>

          {/* DAILY TIP */}
          <div className="c grad2" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                flexShrink: 0,
              }}
            >
              💡
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{t('dashboard.tipTitle')}</h4>
              <p style={{ fontSize: 12, color: 'var(--ts)', lineHeight: 1.65 }}>{tip}</p>
            </div>
          </div>

          {/* ZEIGARNIK */}
          <div className="c zeig">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingLeft: 10 }}>
              <span style={{ fontSize: 17 }}>🧩</span>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700 }}>{t('dashboard.zeigTitle')}</h4>
              </div>
            </div>
            <textarea
              className="inp"
              placeholder={t('dashboard.zeigPlaceholder')}
              style={{ paddingLeft: 18 }}
              defaultValue={zNote}
              onBlur={(e) => {
                patch({ zNote: e.target.value });
                save();
              }}
            />
          </div>
        </div>

        {/* TODAY'S PLAN */}
        <div className="c">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderLeft: '3px solid var(--a)', paddingLeft: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{t('dashboard.todayPlan')}</h3>
            <span className="badge" style={{ background: 'var(--al)', color: 'var(--a)' }}>
              {doneToday}/{todayTasks.length}
            </span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <p>{t('dashboard.noTasks')}</p>
            </div>
          ) : (
            todayTasks.map((task) => (
              <div
                key={task.id}
                className={`ti${doneTasks.includes(task.id) ? ' done' : ''}`}
                onClick={() => onToggle(task.id)}
              >
                <span style={{ fontSize: 15 }}>{doneTasks.includes(task.id) ? '✅' : '⭕'}</span>
                <div className="info">
                  <div className="nm">{task.examName}</div>
                  <div className="ds">{task.session}</div>
                </div>
                <span className="tg">{task.daysBefore === 0 ? t('common.today') : `${task.daysBefore}d`}</span>
              </div>
            ))
          )}

          {/* UPCOMING EXAMS IN PLAN */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 14, borderLeft: '3px solid var(--b)', paddingLeft: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif" }}>{t('dashboard.upcomingExams')}</h3>
            <button className="bs" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => nav('/exams')}>
              {t('dashboard.addShort')}
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>
              <p>{t('dashboard.noExams')}</p>
            </div>
          ) : (
            upcoming.map((e) => {
              const d = daysUntil(e.date);
              const uc = d <= 2 ? 'var(--err)' : d <= 7 ? 'var(--w)' : 'var(--ok)';
              return (
                <div
                  key={e.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--bg)', marginBottom: 6 }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: uc }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ts)' }}>{e.subject} · {fmtDate(e.date)}</div>
                  </div>
                  <span className="badge" style={{ color: uc, background: `${uc}15` }}>
                    {d === 0 ? t('common.today') : d === 1 ? t('common.tomorrow') : `${d}d`}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
