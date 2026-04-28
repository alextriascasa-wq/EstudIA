import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Flame, Zap, Play, Sparkles, BookOpen, Brain, FileText, ListChecks } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useStudyProfile, usePlan } from '@/hooks/usePlan';
import { xpInLevel } from '@/lib/xp';
import { genStudyTasks } from '@/lib/exams';
import { daysUntil, fmtDate, today } from '@/lib/date';
import { DAILY_TIPS } from '@/lib/tips';

const HEATMAP_DAYS = 90;

function buildHeatmapCells(
  heatmap: Record<string, number>,
  days: number,
): Array<{ key: string; lvl: 0 | 1 | 2 | 3 | 4; min: number }> {
  const cells: Array<{ key: string; lvl: 0 | 1 | 2 | 3 | 4; min: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0]!;
    const min = heatmap[key] ?? 0;
    let lvl: 0 | 1 | 2 | 3 | 4 = 0;
    if (min > 0 && min < 15) lvl = 1;
    else if (min < 30) lvl = 2;
    else if (min < 60) lvl = 3;
    else if (min >= 60) lvl = 4;
    cells.push({ key, lvl, min });
  }
  return cells;
}

export function Dashboard(): JSX.Element {
  const nav = useNavigate();
  const { t } = useTranslation();

  const {
    streak,
    exams,
    doneTasks,
    zNote,
    level,
    totalXp,
    todaySess,
    totalMin,
    memStrength,
    cardsToday,
    heatmap,
  } = useAppStore();

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
  const todayTasks = useMemo(() => tasks.filter((tk) => tk.date === today()), [tasks]);
  const upcoming = useMemo(() => exams.filter((e) => daysUntil(e.date) >= 0).slice(0, 4), [exams]);
  const doneToday = todayTasks.filter((tk) => doneTasks.includes(tk.id)).length;
  const { cur, need } = xpInLevel({ level, totalXp });
  const xpPct = Math.min(100, (cur / Math.max(need, 1)) * 100);
  const cells = useMemo(() => buildHeatmapCells(heatmap, HEATMAP_DAYS), [heatmap]);
  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length] ?? DAILY_TIPS[0]!;

  const nextExam = upcoming[0];
  const daysToExam = nextExam ? daysUntil(nextExam.date) : null;

  const onToggle = (taskId: string): void => {
    const i = doneTasks.indexOf(taskId);
    const next = i >= 0 ? doneTasks.filter((x) => x !== taskId) : [...doneTasks, taskId];
    patch({ doneTasks: next });
    if (i < 0) addXP(8);
    save();
  };

  return (
    <section className="sec">
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

      {/* HERO + HUD STRIP */}
      <div className="dash-hero">
        <div className="dash-hero-left">
          <span className="lbl">{t('common.today')}</span>
          <h1 className="display-xl">
            <span className="accent-gradient">EstudIA</span>
          </h1>
          <p className="body-l muted">{t('dashboard.heroDesc')}</p>
          <div className="dash-hero-ctas">
            <button className="bp bp-hero bp-exams" onClick={() => nav('/exams')}>
              <BookOpen size={20} />
              {t('dashboard.actionExamsBtn')}
            </button>
            <button className="bs" onClick={() => nav('/timer')}>
              <Play size={18} />
              {t('dashboard.actionTimerBtn')}
            </button>
          </div>
        </div>

        <motion.aside
          className="hud-strip"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hud-block streak">
            <motion.div
              className="streak-flame"
              animate={streak > 0 ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Flame size={28} />
            </motion.div>
            <div>
              <div className="hud-num">{streak}</div>
              <div className="lbl">{t('dashboard.streakTitle')}</div>
            </div>
          </div>

          <div className="hud-divider" />

          <div className="hud-block xp">
            <div className="hud-num">
              <Zap size={20} />
              Lv {level}
            </div>
            <div className="pb pb-lg xp">
              <motion.div
                className="fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpPct}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              />
            </div>
            <div className="body-s muted">
              {cur}/{need} XP
            </div>
          </div>
        </motion.aside>
      </div>

      {/* EXAMS — most important feature, prominent right after hero */}
      <div className="c glow exams-hero" data-feat="exams">
        <div className="card-hdr">
          <h2 className="h2-card feat-exams-title">
            <BookOpen size={22} />
            {t('dashboard.upcomingExams')}
          </h2>
          {nextExam && daysToExam !== null && daysToExam < 7 && (
            <span className="badge coral">{daysToExam}d</span>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noExams')}</p>
            <button className="bp bp-exams" onClick={() => nav('/exams')} style={{ marginTop: 14 }}>
              {t('dashboard.addShort')}
            </button>
          </div>
        ) : (
          <>
            {upcoming.map((e) => {
              const d = daysUntil(e.date);
              const tone = d <= 2 ? 'coral' : d <= 7 ? 'amber' : 'ok';
              return (
                <div key={e.id} className="exam-item">
                  <div className="exam-item-info">
                    <div className="exam-item-name">{e.name}</div>
                    <div className="exam-item-sub">
                      {e.subject} · {fmtDate(e.date)}
                    </div>
                  </div>
                  <span className={`badge ${tone}`}>
                    {d === 0 ? t('common.today') : d === 1 ? t('common.tomorrow') : `${d}d`}
                  </span>
                </div>
              );
            })}
            <button
              className="bs"
              onClick={() => nav('/exams')}
              style={{ marginTop: 12, width: '100%' }}
            >
              {t('dashboard.addShort')}
            </button>
          </>
        )}
      </div>

      {/* TODAY'S PLAN */}
      <div className="c glow today-plan">
        <div className="card-hdr">
          <h2 className="h2-card">
            <ListChecks size={20} />
            {t('dashboard.todayPlan')}
          </h2>
          <span className="badge indigo">
            {doneToday}/{todayTasks.length}
          </span>
        </div>
        {todayTasks.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noTasks')}</p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <div
              key={task.id}
              className={`ti${doneTasks.includes(task.id) ? ' done' : ''}`}
              onClick={() => onToggle(task.id)}
            >
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
      </div>

      {/* STATS ROW — 4 compact cards, each w/ feature accent */}
      <div className="g4 stats-row">
        <div className="c stat-card" data-feat="timer">
          <div className="stat-hdr">
            <Play size={16} /> <span className="lbl">{t('dashboard.stats.sessions')}</span>
          </div>
          <div className="stat-value feat-timer">{todaySess}</div>
          <div className="body-s muted">{t('dashboard.stats.sessionsSub', { min: totalMin })}</div>
        </div>
        <div className="c stat-card" data-feat="cards">
          <div className="stat-hdr">
            <Brain size={16} /> <span className="lbl">{t('dashboard.stats.memStrength')}</span>
          </div>
          <div className="stat-value feat-cards">{memStrength}%</div>
          <div className="body-s muted">{t('dashboard.memStrength')}</div>
        </div>
        <div className="c stat-card" data-feat="streak">
          <div className="stat-hdr">
            <Flame size={16} /> <span className="lbl">{t('dashboard.stats.streak')}</span>
          </div>
          <div className={`stat-value${streak >= 3 ? ' feat-streak' : ' muted'}`}>{streak}d</div>
          <div className="body-s muted">
            {streak >= 3 ? t('dashboard.stats.streakGood') : t('dashboard.stats.streakBad')}
          </div>
        </div>
        <div className="c stat-card" data-feat="feynman">
          <div className="stat-hdr">
            <Sparkles size={16} /> <span className="lbl">{t('dashboard.stats.cards')}</span>
          </div>
          <div className="stat-value feat-feynman">{cardsToday}</div>
          <div className="body-s muted">{t('dashboard.stats.cardsSub', { total: cardsToday })}</div>
        </div>
      </div>

      {/* HEATMAP */}
      <div className="c">
        <h2 className="h2-card">
          <FileText size={20} />
          {t('dashboard.heatmap')}
        </h2>
        <div className="heatmap" style={{ marginTop: 14 }}>
          {cells.map((c) => (
            <div key={c.key} className="hm-cell" data-lvl={c.lvl} title={`${c.key}: ${c.min}m`} />
          ))}
        </div>
        <div className="heatmap-legend">
          <span className="body-s muted">{t('dashboard.heatmapLess')}</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className="hm-cell" data-lvl={l} />
          ))}
          <span className="body-s muted">{t('dashboard.heatmapMore')}</span>
        </div>
      </div>

      {/* ZEIGARNIK + DAILY TIP */}
      <div className="g2">
        <div className="c zeig">
          <h3 className="h2-card">{t('dashboard.zeigTitle')}</h3>
          <p className="body-s muted" style={{ margin: '6px 0 12px' }}>
            {t('dashboard.zeigDesc')}
          </p>
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

        <div className="c">
          <h3 className="h2-card">{t('dashboard.tipTitle')}</h3>
          <p className="body-l" style={{ marginTop: 10, color: 'var(--ts)' }}>
            {tip}
          </p>
        </div>
      </div>
    </section>
  );
}
