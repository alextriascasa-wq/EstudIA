import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useStudyProfile, usePlan } from '@/hooks/usePlan';
import { xpInLevel } from '@/lib/xp';
import { genStudyTasks } from '@/lib/exams';
import { daysUntil, fmtDate, today } from '@/lib/date';
import { DAILY_TIPS } from '@/lib/tips';

export function Dashboard(): JSX.Element {
  const nav = useNavigate();
  const { t } = useTranslation();

  const { streak, exams, doneTasks, weekly, zNote, level, totalXp } = useAppStore();

  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const addXP = useAppStore((s) => s.addXP);

  const studyProfile = useStudyProfile();
  const plan = usePlan();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const profileBannerDismissed = useAppStore((s) => s.profileBannerDismissed);
  const dismissProfileBanner = useAppStore((s) => s.dismissProfileBanner);
  const showProfileBanner = hasCompletedOnboarding && !studyProfile && !profileBannerDismissed;

  const tasks = useMemo(() => genStudyTasks(exams), [exams]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today()), [tasks]);
  const upcoming = useMemo(() => exams.filter((e) => daysUntil(e.date) >= 0).slice(0, 4), [exams]);
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
      {showProfileBanner && (
        <div className="c zeig dash-banner">
          <div>
            <strong>{t('dashboardPersonal.profileBanner.title')}</strong>
            <p>{t('dashboardPersonal.profileBanner.desc')}</p>
          </div>
          <div className="dash-banner-actions">
            <Link to="/perfil" className="bp">
              {t('dashboardPersonal.profileBanner.cta')}
            </Link>
            <button className="bs" onClick={dismissProfileBanner}>
              {t('dashboardPersonal.profileBanner.dismiss')}
            </button>
          </div>
        </div>
      )}

      {plan && studyProfile && (
        <div className="c zeig dash-today-plan">
          <h3>{t('dashboardPersonal.todayPlan')}</h3>
          <ul className="dash-plan-blocks">
            {plan.dailyTemplate.map((b) => (
              <li key={b.order}>
                <Link to={`/${b.module}`} className="mc dash-plan-block">
                  <span>{b.minutes} min</span>
                  <strong>{t(`nav.${b.module}`)}</strong>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan && (
        <div className="g3 dash-recs">
          {plan.modules.slice(0, 3).map((m) => (
            <Link key={m.module} to={`/${m.module}`} className="mc">
              <strong>{t(`nav.${m.module}`)}</strong>
              <span>{t(m.reasonKey)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* HERO */}
      <div>
        <h1 className="t-hero">{t('dashboard.heroTitle')}</h1>
        <p className="t-body" style={{ color: 'var(--ts)', marginTop: 8 }}>
          {t('dashboard.heroDesc')}
        </p>
      </div>

      {/* BENTO ROW 1: 2fr 1fr */}
      <div className="bento">
        {/* PRIMARY: AI FLASHCARDS */}
        <div className="c glow hero-card">
          <div className="hero-card-bg">🧠</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 32, filter: 'drop-shadow(0 0 8px rgba(212,160,23,0.4))' }}>
              ✨
            </div>
            <span className="ai-power-tag">IA Power</span>
          </div>
          <h3
            className="t-h2"
            style={{ fontFamily: "'Fraunces', serif", marginBottom: 8, zIndex: 1 }}
          >
            {t('dashboard.actionCardsTitle')}
          </h3>
          <p
            className="t-sm"
            style={{ color: 'var(--ts)', lineHeight: 1.6, flex: 1, marginBottom: 28, zIndex: 1 }}
          >
            {t('dashboard.actionCardsDesc')}
          </p>
          <button className="bp w-full" onClick={() => nav('/cards')}>
            {t('dashboard.actionCardsBtn')}
          </button>
        </div>

        {/* TIMER */}
        <div className="c glow feat-card">
          <div className="feat-card-icon">⏱️</div>
          <h3>{t('dashboard.actionTimerTitle')}</h3>
          <p>{t('dashboard.actionTimerDesc')}</p>
          <button className="bs w-full" onClick={() => nav('/timer')}>
            {t('dashboard.actionTimerBtn')}
          </button>
        </div>
      </div>

      {/* BENTO ROW 2: 1fr 2fr */}
      <div className="bento-r">
        {/* EXAMS */}
        <div className="c glow feat-card">
          <div className="feat-card-icon">📝</div>
          <h3>{t('dashboard.actionExamsTitle')}</h3>
          <p>{t('dashboard.actionExamsDesc')}</p>
          <button className="bp w-full" onClick={() => nav('/exams')}>
            {t('dashboard.actionExamsBtn')}
          </button>
        </div>

        {/* 7-DAY STREAK */}
        <div className="c grad glow streak-wrap">
          <div className="streak-count">
            <div className={`streak-fire${streak > 0 ? ' active' : ''}`}>🔥</div>
            <div className={`streak-num t-mono${streak > 0 ? ' active' : ' inactive'}`}>
              {streak}
            </div>
          </div>
          <div className="streak-days">
            <div className="streak-days-title">{t('dashboard.streakTitle')}</div>
            <div className="streak-discs">
              {weekly.map((d, i) => {
                const isActive = d.m > 0;
                return (
                  <div key={d.d + i} className="streak-day">
                    <div className={`streak-disc${isActive ? ' act' : ''}`}>
                      {isActive ? '✓' : ''}
                    </div>
                    <div className={`streak-disc-lbl${isActive ? ' act' : ' off'}`}>{d.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="g2">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* LEVEL BAR */}
          <div
            className="c grad"
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}
          >
            <div className="level-avatar t-mono">{level}</div>
            <div className="level-info">
              <div className="level-info-row">
                <span>
                  {t('sidebar.level')} {level}
                </span>
                <span>
                  {cur}/{need} XP
                </span>
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
            <div className="dash-tip-icon">💡</div>
            <div>
              <div className="dash-tip-title">{t('dashboard.tipTitle')}</div>
              <div className="dash-tip-body">{tip}</div>
            </div>
          </div>

          {/* ZEIGARNIK */}
          <div className="c zeig">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 10,
                paddingLeft: 10,
              }}
            >
              <span style={{ fontSize: 17 }}>🧩</span>
              <h4 className="t-h3">{t('dashboard.zeigTitle')}</h4>
            </div>
            <textarea
              className="inp"
              placeholder={t('dashboard.zeigPlaceholder')}
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
          <div className="plan-hdr">
            <h3>{t('dashboard.todayPlan')}</h3>
            <span className="badge" style={{ background: 'var(--al)', color: 'var(--a)' }}>
              {doneToday}/{todayTasks.length}
            </span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
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
                <span className="tg">
                  {task.daysBefore === 0 ? t('common.today') : `${task.daysBefore}d`}
                </span>
              </div>
            ))
          )}

          <div className="plan-hdr plan-hdr-b" style={{ marginTop: 24 }}>
            <h3>{t('dashboard.upcomingExams')}</h3>
            <button
              className="bs"
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => nav('/exams')}
            >
              {t('dashboard.addShort')}
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>{t('dashboard.noExams')}</p>
            </div>
          ) : (
            upcoming.map((e) => {
              const d = daysUntil(e.date);
              const uc = d <= 2 ? 'var(--err)' : d <= 7 ? 'var(--w)' : 'var(--ok)';
              return (
                <div key={e.id} className="exam-item">
                  <div className="exam-dot" style={{ background: uc }} />
                  <div className="exam-item-info">
                    <div className="exam-item-name">{e.name}</div>
                    <div className="exam-item-sub">
                      {e.subject} · {fmtDate(e.date)}
                    </div>
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
