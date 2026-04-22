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
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 8 }}>
          {t('dashboard.heroTitle')}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ts)' }}>
          {t('dashboard.heroDesc')}
        </p>
      </div>

      <div className="g3" style={{ marginBottom: 20 }}>
        {/* ACTION 1: TIMER */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⏱️</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t('dashboard.actionTimerTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 24 }}>
            {t('dashboard.actionTimerDesc')}
          </p>
          <button className="bp" style={{ width: '100%', background: 'var(--s)', color: 'var(--t)', border: '1px solid var(--b)' }} onClick={() => nav('/timer')}>
            {t('dashboard.actionTimerBtn')}
          </button>
        </div>

        {/* ACTION 2: IA FLASHCARDS (PRIMARY HOOK) */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 28, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))', border: '1px solid rgba(139, 92, 246, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -10, right: -15, fontSize: 100, opacity: 0.05 }}>🧠</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ fontSize: 36, filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.5))' }}>✨</div>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 6, background: 'var(--p)', color: '#fff', textTransform: 'uppercase', letterSpacing: 1, boxShadow: '0 0 10px rgba(139,92,246,0.4)', animation: 'pulse 2s infinite' }}>
              IA Power
            </span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, zIndex: 1 }}>{t('dashboard.actionCardsTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 24, zIndex: 1 }}>
            {t('dashboard.actionCardsDesc')}
          </p>
          <button className="bp" style={{ width: '100%', background: 'linear-gradient(90deg, var(--p), #ec4899)', color: '#fff', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)' }} onClick={() => nav('/cards')}>
            {t('dashboard.actionCardsBtn')}
          </button>
        </div>

        {/* ACTION 3: IA EXAM */}
        <div className="c glow" style={{ display: 'flex', flexDirection: 'column', padding: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📝</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t('dashboard.actionExamsTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 24 }}>
            {t('dashboard.actionExamsDesc')}
          </p>
          <button className="bp" style={{ width: '100%' }} onClick={() => nav('/exams')}>
            {t('dashboard.actionExamsBtn')}
          </button>
        </div>
      </div>
      {/* 7-DAY STREAK (DUOLINGO STYLE) */}
      <div className="c grad glow" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 48, filter: streak > 0 ? 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.5))' : 'grayscale(1)', transform: streak > 0 ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.3s' }}>
            🔥
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: streak > 0 ? 'var(--w)' : 'var(--ts)', marginTop: 4 }}>
            {streak}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>{t('dashboard.streakTitle')}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {weekly.map((d, i) => {
               const isActive = d.m > 0;
               return (
                 <div key={d.d + i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                   <div style={{ 
                     width: 36, height: 36, borderRadius: '50%', 
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     background: isActive ? 'linear-gradient(135deg, var(--w), var(--wd))' : 'var(--bg)',
                     border: `2px solid ${isActive ? 'var(--w)' : 'var(--b)'}`,
                     color: isActive ? '#fff' : 'var(--ts)',
                     fontWeight: 800, fontSize: 14,
                     boxShadow: isActive ? '0 0 15px rgba(245, 158, 11, 0.4)' : 'none'
                   }}>
                     {isActive ? '✓' : ''}
                   </div>
                   <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--w)' : 'var(--ts)' }}>
                     {d.d}
                   </div>
                 </div>
               )
            })}
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
                background: 'linear-gradient(135deg,var(--a),var(--p))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 900,
                color: '#fff',
                boxShadow: '0 4px 15px rgba(99,102,241,.35)',
              }}
            >
              {level}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{t('sidebar.level')} {level}</span>
                <span style={{ fontSize: 12, color: 'var(--ts)' }}>{cur}/{need} XP</span>
              </div>
              <div className="pb pb-lg">
                <div
                  className="fill"
                  style={{
                    width: `${(cur / Math.max(need, 1)) * 100}%`,
                    background: 'linear-gradient(90deg,var(--a),var(--p))',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('dashboard.todayPlan')}</h3>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('dashboard.upcomingExams')}</h3>
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
