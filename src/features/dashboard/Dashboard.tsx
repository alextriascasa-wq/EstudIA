import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { xpInLevel } from '@/lib/xp';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { genStudyTasks } from '@/lib/exams';
import { daysUntil, fmtDate, today, weeklyIndex } from '@/lib/date';
import { DAILY_TIPS } from '@/lib/tips';

export function Dashboard(): JSX.Element {
  const nav = useNavigate();
  const { t } = useTranslation();

  const {
    todaySess,
    totalMin,
    streak,
    cardsToday,
    decks,
    memStrength,
    quizCorrect,
    quizTotal,
    exams,
    doneTasks,
    weekly,
    heatmap,
    achievements,
    zNote,
    level,
    totalXp,
  } = useAppStore();

  const patch = useAppStore((s) => s.patch);
  const save = useAppStore((s) => s.save);
  const toggleTask = useAppStore((s) => s.patch);
  const addXP = useAppStore((s) => s.addXP);

  const tasks = useMemo(() => genStudyTasks(exams), [exams]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today()), [tasks]);
  const upcoming = useMemo(
    () => exams.filter((e) => daysUntil(e.date) >= 0).slice(0, 4),
    [exams],
  );
  const doneToday = todayTasks.filter((t) => doneTasks.includes(t.id)).length;
  const maxW = Math.max(...weekly.map((w) => w.m), 30);
  const tI = weeklyIndex(new Date().getDay());
  const { cur, need } = xpInLevel({ level, totalXp });

  const onToggle = (taskId: string): void => {
    const i = doneTasks.indexOf(taskId);
    const next = i >= 0 ? doneTasks.filter((x) => x !== taskId) : [...doneTasks, taskId];
    toggleTask({ doneTasks: next });
    if (i < 0) addXP(8);
    save();
  };

  const tip = DAILY_TIPS[new Date().getDate() % DAILY_TIPS.length] ?? DAILY_TIPS[0]!;

  // 90-day heatmap
  const heatmapCells = useMemo(() => {
    const now = new Date();
    const cells: { ds: string; mins: number; lvl: 0 | 1 | 2 | 3 | 4 }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0]!;
      const mins = heatmap[ds] ?? 0;
      const lvl = mins === 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
      cells.push({ ds, mins, lvl });
    }
    return cells;
  }, [heatmap]);

  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0);
  const stats = [
    {
      l: t('dashboard.stats.sessions'),
      v: todaySess,
      c: 'var(--a)',
      bg: 'var(--al)',
      ico: '🎯',
      sub: t('dashboard.stats.sessionsSub', { min: totalMin }),
    },
    {
      l: t('dashboard.stats.memStrength'),
      v: `${memStrength}%`,
      c: 'var(--p)',
      bg: 'var(--pl)',
      ico: '🧠',
      sub: t('dashboard.stats.memStrengthSub', { correct: quizCorrect, total: quizTotal }),
    },
    {
      l: t('dashboard.stats.streak'),
      v: `${streak}d`,
      c: 'var(--w)',
      bg: 'var(--wl)',
      ico: '🔥',
      sub: streak >= 7 ? t('dashboard.stats.streakGood') : t('dashboard.stats.streakBad'),
    },
    {
      l: t('dashboard.stats.cards'),
      v: cardsToday,
      c: 'var(--ok)',
      bg: 'var(--okl)',
      ico: '📇',
      sub: t('dashboard.stats.cardsSub', { total: totalCards }),
    },
  ];

  return (
    <div className="sec">
      {/* LEVEL BAR */}
      <div
        className="c grad"
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px' }}
      >
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {t('sidebar.level')} {level}
            </span>
            <span style={{ fontSize: 12, color: 'var(--ts)' }}>
              {cur}/{need} XP
            </span>
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
        <div
          style={{
            textAlign: 'center',
            paddingLeft: 12,
            borderLeft: '1px solid rgba(99,102,241,.2)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>{totalXp}</div>
          <div style={{ fontSize: 10, color: 'var(--ts)' }}>{t('dashboard.xpTotal')}</div>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="g4">
        {stats.map((s) => (
          <div key={s.l} className="c sc glow">
            <div className="top">
              <span>{s.l}</span>
              <div className="ib" style={{ background: s.bg, fontSize: 17 }}>
                {s.ico}
              </div>
            </div>
            <div className="val" style={{ color: s.c }}>
              {s.v}
            </div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* TODAY'S PLAN + UPCOMING EXAMS */}
      <div className="g2">
        <div className="c">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
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
        </div>
        <div className="c">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('dashboard.upcomingExams')}</h3>
            <button
              className="bs"
              style={{ padding: '5px 12px', fontSize: 11 }}
              onClick={() => nav('/exams')}
            >
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 13px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: uc,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ts)' }}>
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

      {/* HEATMAP */}
      <div className="c">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>{t('dashboard.heatmap')}</h3>
          <div
            style={{
              display: 'flex',
              gap: 4,
              alignItems: 'center',
              fontSize: 10,
              color: 'var(--tm)',
            }}
          >
            {t('dashboard.heatmapLess')}
            {[0, 1, 2, 3, 4].map((lvl) => (
              <div
                key={lvl}
                className="hm-cell"
                data-lvl={lvl === 0 ? undefined : String(lvl)}
                style={{ width: 10, height: 10 }}
              />
            ))}
            {t('dashboard.heatmapMore')}
          </div>
        </div>
        <div className="heatmap">
          {heatmapCells.map((c) => (
            <div
              key={c.ds}
              className="hm-cell"
              data-lvl={c.lvl === 0 ? undefined : String(c.lvl)}
              title={`${fmtDate(c.ds)}: ${c.mins}min`}
            />
          ))}
        </div>
      </div>

      {/* WEEKLY CHART + MEMORY */}
      <div className="g2">
        <div className="c">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{t('dashboard.weekly')}</h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              height: 120,
              padding: '0 8px',
            }}
          >
            {weekly.map((d, i) => {
              const h = d.m > 0 ? Math.max((d.m / maxW) * 100, 5) : 3;
              return (
                <div
                  key={d.d + i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--a)' }}>
                    {d.m > 0 ? `${d.m}m` : ''}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 38,
                      height: `${h}px`,
                      borderRadius: 6,
                      background:
                        i === tI
                          ? 'linear-gradient(180deg,var(--a),var(--ad))'
                          : d.m > 0
                            ? 'var(--al)'
                            : 'var(--bl)',
                      transition: 'height .5s ease',
                      boxShadow: i === tI ? '0 2px 8px rgba(99,102,241,.3)' : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      color: i === tI ? 'var(--a)' : 'var(--tm)',
                      fontWeight: i === tI ? 700 : 400,
                    }}
                  >
                    {d.d}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="c">
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>{t('dashboard.retention')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 5,
                }}
              >
                <span style={{ color: 'var(--ts)' }}>{t('dashboard.memStrength')}</span>
                <span style={{ fontWeight: 700 }}>{memStrength}%</span>
              </div>
              <div className="pb">
                <div
                  className="fill"
                  style={{
                    width: `${memStrength}%`,
                    background:
                      memStrength >= 70
                        ? 'var(--ok)'
                        : memStrength >= 40
                          ? 'var(--w)'
                          : 'var(--err)',
                  }}
                />
              </div>
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 5,
                }}
              >
                <span style={{ color: 'var(--ts)' }}>{t('dashboard.quizAccuracy')}</span>
                <span style={{ fontWeight: 700 }}>
                  {quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0}%
                </span>
              </div>
              <div className="pb">
                <div
                  className="fill"
                  style={{
                    width: `${quizTotal > 0 ? (quizCorrect / quizTotal) * 100 : 0}%`,
                    background: 'linear-gradient(90deg,var(--a),var(--p))',
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ts)' }}>
              {t('dashboard.quizSummary', { total: quizTotal, correct: quizCorrect })}
            </div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS PREVIEW */}
      <div className="c">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 800 }}>
            {t('dashboard.achievements', { unlocked: achievements.length, total: ACHIEVEMENTS.length })}
          </h3>
          <button
            className="bs"
            style={{ padding: '5px 12px', fontSize: 11 }}
            onClick={() => nav('/stats')}
          >
            {t('common.seeAll')}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(44px,1fr))',
            gap: 8,
          }}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                title={`${a.name}: ${a.desc}`}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: unlocked
                    ? 'linear-gradient(135deg,var(--wl),var(--pl))'
                    : 'var(--bl)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  filter: unlocked ? undefined : 'grayscale(1)',
                  opacity: unlocked ? 1 : 0.3,
                  transition: 'var(--transition)',
                }}
              >
                {a.ico}
              </div>
            );
          })}
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
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700 }}>{t('dashboard.zeigTitle')}</h4>
            <p style={{ fontSize: 11, color: 'var(--ts)' }}>{t('dashboard.zeigDesc')}</p>
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

      {/* DAILY TIP */}
      <div className="c grad2" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,.6)',
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
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>
            {t('dashboard.tipTitle')}
          </h4>
          <p style={{ fontSize: 12, color: 'var(--ts)', lineHeight: 1.65 }}>{tip}</p>
        </div>
      </div>
    </div>
  );
}
