import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { today } from '@/lib/date';
import { ACHIEVEMENTS } from '@/lib/achievements';

export function Stats(): JSX.Element {
  const { t } = useTranslation();
  const state = useAppStore((s) => s);

  const stats7 = useMemo(() => {
    const td = new Date(today());
    const last7 = state.dailyLog.filter((d) => {
      const diff = (td.getTime() - new Date(d.date).getTime()) / 864e5;
      return diff < 7;
    });
    const totalMins7 = last7.reduce((s, d) => s + d.minutes, 0);
    const totalCards7 = last7.reduce((s, d) => s + d.cards, 0);
    const totalCorrect7 = last7.reduce((s, d) => s + d.correct, 0);
    const avgMin7 = last7.length > 0 ? Math.round(totalMins7 / 7) : 0;
    return { totalMins7, totalCards7, totalCorrect7, avgMin7 };
  }, [state.dailyLog]);

  const { totalMins7, totalCards7, totalCorrect7, avgMin7 } = stats7;

  const heatmapCells = useMemo(() => {
    const cells = [];
    const todayDate = new Date();
    for (let i = 119; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0]!;
      const val = state.heatmap[iso] || 0;
      let lvl = 0;
      if (val > 0) lvl = 1;
      if (val >= 30) lvl = 2;
      if (val >= 60) lvl = 3;
      if (val >= 120) lvl = 4;
      cells.push({ date: iso, lvl, val });
    }
    return cells;
  }, [state.heatmap]);

  const topCards = [
    { l: 'Últims 7 dies', v: `${totalMins7}m`, sub: 'temps total', c: 'var(--a)' },
    { l: 'Mitjana diària', v: `${avgMin7}m`, sub: 'objectiu: 120m', c: 'var(--p)' },
    {
      l: 'Cards 7d',
      v: totalCards7,
      sub: `${totalCorrect7} correctes`,
      c: 'var(--i)',
    },
    {
      l: 'Precisió 7d',
      v: totalCards7 > 0 ? `${Math.round((totalCorrect7 / totalCards7) * 100)}%` : '--',
      sub: 'objectiu: 85%',
      c: 'var(--ok)',
    },
  ];

  const globalStats = [
    { l: 'Total hores', v: `${(state.totalMin / 60).toFixed(1)}h` },
    { l: 'Total sessions', v: state.pomCount },
    { l: 'Ratxa màxima', v: `${state.streak}d` },
    { l: 'XP Total', v: state.totalXp },
    { l: 'Total flashcards', v: state.quizTotal },
    {
      l: 'Precisió global',
      v:
        state.quizTotal > 0
          ? `${Math.round((state.quizCorrect / state.quizTotal) * 100)}%`
          : '--',
    },
    { l: 'Decks creats', v: state.decks.length + state.langDecks.length },
    { l: 'Nivell', v: state.level },
  ];

  return (
    <div className="sec">
      <div className="sec-hdr">
        <h2>{t('headers.stats.title')}</h2>
        <p>{t('headers.stats.desc')}</p>
      </div>

      <div className="g4">
        {topCards.map((s) => (
          <div key={s.l} className="c sc">
            <div className="top">
              <span>{s.l}</span>
            </div>
            <div className="val" style={{ color: s.c }}>
              {s.v}
            </div>
            <div className="sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="c">
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
          🏅 Assoliments ({state.achievements.length}/{ACHIEVEMENTS.length})
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
          }}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = state.achievements.includes(a.id);
            return (
              <div key={a.id} className={`ach ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="ach-ico">{a.ico}</div>
                <div className="ach-info">
                  <div className="ach-name">{unlocked ? a.name : '???'}</div>
                  <div className="ach-desc">{a.desc}</div>
                </div>
                {unlocked && (
                  <span
                    className="badge"
                    style={{ background: 'var(--okl)', color: 'var(--ok)' }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="c">
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
          🔥 Activitat (Últims 120 dies)
        </h3>
        <div className="heatmap" style={{ marginBottom: 12 }}>
          {heatmapCells.map((c) => (
            <div 
              key={c.date} 
              className="hm-cell" 
              data-lvl={c.lvl} 
              title={`${c.date}: ${c.val} minuts d'estudi`} 
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--ts)', alignItems: 'center' }}>
          <span>Menys</span>
          <div className="hm-cell" data-lvl="0" style={{ background: 'var(--bg)', border: '1px solid var(--b)' }} />
          <div className="hm-cell" data-lvl="1" />
          <div className="hm-cell" data-lvl="2" />
          <div className="hm-cell" data-lvl="3" />
          <div className="hm-cell" data-lvl="4" />
          <span>Més</span>
        </div>
      </div>

      <div className="c">
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>
          📈 Estadístiques globals
        </h3>
        <div className="g2">
          {globalStats.map((s) => (
            <div
              key={s.l}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--bl)',
              }}
            >
              <span style={{ color: 'var(--ts)', fontSize: 13 }}>{s.l}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
