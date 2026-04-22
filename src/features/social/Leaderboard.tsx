import { useAppStore } from '@/store/useAppStore';

export function Leaderboard({ sortedFriends, sortBy }: { sortedFriends: any[], sortBy: 'xp' | 'streak' | 'weeklyMinutes' }): JSX.Element {
  const { level, totalXp, streak, weekly } = useAppStore();
  const myWeeklyMinutes = weekly.reduce((acc, curr) => acc + curr.m, 0);

  const me = {
    id: 'me',
    name: 'Tu',
    avatar: '😎',
    level,
    totalXp,
    streak,
    weeklyMinutes: myWeeklyMinutes,
    isOnline: true,
    league: useAppStore(s => s.league) || 'Bronze',
  };

  const leagueUsers = sortedFriends.filter((f) => f.league === me.league);
  const all = [...leagueUsers, me].sort((a, b) => b[sortBy] - a[sortBy]);

  const top3 = all.slice(0, 3);

  const getMedal = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `${idx + 1}`;
  };

  const getLeagueIcon = (league: string) => {
    switch (league) {
      case 'Bronze': return '🟤';
      case 'Plata': return '⚪';
      case 'Or': return '🟡';
      case 'Diamant': return '💎';
      case 'Mestre': return '👑';
      default: return '🏆';
    }
  };

  return (
    <div className="c glass">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>🏆 Rànquing Setmanal</h3>
        <div className="badge" style={{ fontSize: 14, background: 'var(--al)', color: 'var(--a)', padding: '6px 12px' }}>
          {getLeagueIcon(me.league)} Lliga de {me.league}
        </div>
      </div>
      
      {/* Podium for top 3 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, marginBottom: 32, height: 160 }}>
        {top3[1] && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 32, position: 'relative' }}>
              {top3[1].avatar}
              <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: 16 }}>🥈</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>{top3[1].name}</div>
            <div style={{ fontSize: 11, color: 'var(--ts)' }}>{top3[1][sortBy]}</div>
            <div style={{ width: 70, height: 80, background: 'linear-gradient(180deg, var(--al), transparent)', borderRadius: '8px 8px 0 0', marginTop: 8 }} />
          </div>
        )}
        
        {top3[0] && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 40, position: 'relative' }}>
              {top3[0].avatar}
              <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: 20 }}>🥇</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 8 }}>{top3[0].name}</div>
            <div style={{ fontSize: 12, color: 'var(--a)', fontWeight: 700 }}>{top3[0][sortBy]}</div>
            <div style={{ width: 80, height: 110, background: 'linear-gradient(180deg, var(--pl), transparent)', borderRadius: '8px 8px 0 0', marginTop: 8 }} />
          </div>
        )}

        {top3[2] && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 28, position: 'relative' }}>
              {top3[2].avatar}
              <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: 14 }}>🥉</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8 }}>{top3[2].name}</div>
            <div style={{ fontSize: 10, color: 'var(--ts)' }}>{top3[2][sortBy]}</div>
            <div style={{ width: 60, height: 60, background: 'linear-gradient(180deg, var(--w), transparent)', opacity: 0.2, borderRadius: '8px 8px 0 0', marginTop: 8 }} />
          </div>
        )}
      </div>

      {/* List for the rest */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {all.map((user, idx) => (
          <div 
            key={user.id}
            className={`c card-hover ${user.id === 'me' ? 'pulse-glow' : ''}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              padding: '12px 16px',
              border: user.id === 'me' ? '1px solid var(--a)' : 'none',
              background: user.id === 'me' ? 'var(--al)' : 'var(--bg)'
            }}
          >
            <div style={{ width: 24, fontWeight: 800, color: 'var(--tm)' }}>
              {getMedal(idx)}
            </div>
            <div style={{ fontSize: 24 }}>{user.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</span>
                <span className="badge" style={{ background: 'var(--pl)', color: 'var(--pd)', fontSize: 10 }}>Nv. {user.level}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: 'var(--a)', fontSize: 15 }}>
                {sortBy === 'xp' ? `${user.totalXp} XP` : sortBy === 'streak' ? `🔥 ${user.streak}d` : `${user.weeklyMinutes} min`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
