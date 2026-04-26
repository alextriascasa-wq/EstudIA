import { useTranslation } from 'react-i18next';
import type { ActivityEvent } from '@/types';

const EVENT_ICONS: Record<string, string> = {
  cards_completed: '🃏',
  streak_milestone: '🔥',
  exam_done: '📝',
  challenge_won: '🏆',
  study_session: '⏱️',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ara mateix';
  if (mins < 60) return `fa ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `fa ${hrs} h`;
  return `fa ${Math.floor(hrs / 24)} d`;
}

export function ActivityItem({ event }: { event: ActivityEvent }): JSX.Element {
  const { t } = useTranslation();
  const icon = EVENT_ICONS[event.type] ?? '📌';
  const username = event.user?.username ?? t('social.unknownUser');
  const avatarLetter = (event.user?.username?.[0] ?? '?').toUpperCase();

  const description = (() => {
    const p = event.payload;
    switch (event.type) {
      case 'cards_completed':
        return t('social.feed.cardsCompleted', { count: Number(p.count ?? 0) });
      case 'streak_milestone':
        return t('social.feed.streakMilestone', { days: Number(p.days ?? 0) });
      case 'exam_done':
        return t('social.feed.examDone', { score: Number(p.score ?? 0) });
      case 'challenge_won':
        return t('social.feed.challengeWon');
      case 'study_session':
        return t('social.feed.studySession', { minutes: Number(p.minutes ?? 0) });
      default:
        return t('social.feed.activity');
    }
  })();

  return (
    <div className="activity-item">
      <div className="activity-avatar">{avatarLetter}</div>
      <div className="activity-body">
        <div className="activity-line">
          <span className="activity-user">{username}</span>
          <span className="activity-desc">{description}</span>
        </div>
        <div className="activity-meta">
          <span className="activity-icon">{icon}</span>
          <span>{formatRelative(event.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
