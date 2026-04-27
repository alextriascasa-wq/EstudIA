import { useTranslation } from 'react-i18next';
import type { Friendship } from '@/types';

interface Props {
  friendship: Friendship;
  onUnfriend: () => void;
}

export function FriendCard({ friendship, onUnfriend }: Props): JSX.Element {
  const { t } = useTranslation();
  const profile = friendship.friend;
  const name = profile?.username ?? friendship.friendId;
  const avatarLetter = (name[0] ?? '?').toUpperCase();
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="c card-hover friend-card">
      <div className="friend-card-header">
        <div className="friend-avatar">{avatarLetter}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ts)', marginTop: 2 }}>
            {xp.toLocaleString()} XP · 🔥 {streak}d
          </div>
        </div>
      </div>

      <button
        className="bs"
        style={{ width: '100%', fontSize: 12, marginTop: 12, padding: '6px 0' }}
        onClick={onUnfriend}
      >
        {t('social.removeFriend')}
      </button>
    </div>
  );
}
