import { useTranslation } from 'react-i18next';
import { useFeed } from './hooks/useFeed';
import { ActivityItem } from './ActivityItem';
import type { Friendship } from '@/types';

interface Props {
  accepted: Friendship[];
}

export function ActivityFeed({ accepted }: Props): JSX.Element {
  const { t } = useTranslation();
  const friendIds = accepted.map((f) => f.friendId);
  const { events, loading, error } = useFeed(friendIds);

  if (loading) {
    return (
      <div className="social-feed-empty">
        <div className="pulse-glow" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--al)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="c empty">
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={{ color: 'var(--err)', marginTop: 8 }}>{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="c empty">
        <span style={{ fontSize: 40 }}>📭</span>
        <h3>{t('social.noFeed')}</h3>
        <p style={{ color: 'var(--ts)', marginTop: 4 }}>{t('social.noFeedHint')}</p>
      </div>
    );
  }

  return (
    <div className="social-feed">
      {events.map((ev) => (
        <ActivityItem key={ev.id} event={ev} />
      ))}
    </div>
  );
}
