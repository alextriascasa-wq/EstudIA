import type { Friend } from '@/types';
import { xpInLevel } from '@/lib/xp';

export function FriendCard({ friend, onShare }: { friend: Friend, onShare: (f: Friend) => void }): JSX.Element {
  const { cur, need } = xpInLevel({ level: friend.level, totalXp: friend.totalXp });
  const pct = Math.min(100, (cur / Math.max(need, 1)) * 100);

  return (
    <div className="c card-hover glass" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <span className="badge" style={{ background: friend.isOnline ? 'var(--okl)' : 'var(--bl)', color: friend.isOnline ? 'var(--okd)' : 'var(--ts)' }}>
          <span className={`conn-dot${friend.isOnline ? '' : ' off'}`} style={{ marginRight: 4 }} />
          {friend.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 40, width: 60, height: 60, background: 'var(--al)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {friend.avatar}
        </div>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 800 }}>{friend.name}</h4>
          <div style={{ fontSize: 13, color: 'var(--ts)', marginTop: 4 }}>
            Nv. {friend.level} · 🔥 {friend.streak}d
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tm)', marginBottom: 4 }}>
          <span>{cur} XP</span>
          <span>{need} XP</span>
        </div>
        <div className="pb pb-sm">
          <div className="fill" style={{ width: `${pct}%`, background: 'var(--tm)' }} />
        </div>
      </div>

      <button className="bp" style={{ width: '100%', padding: '8px', fontSize: 13 }} onClick={() => onShare(friend)}>
        📤 Compartir Recurs
      </button>
    </div>
  );
}
