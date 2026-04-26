import { useTranslation } from 'react-i18next';
import type { Challenge } from '@/types';

const TYPE_ICONS: Record<string, string> = {
  flashcards: '🃏',
  study_time: '⏱️',
  exam: '📝',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--w)',
  accepted: 'var(--i)',
  active: 'var(--ok)',
  completed: 'var(--ts)',
  declined: 'var(--err)',
};

function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

interface Props {
  challenge: Challenge;
  myId: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export function ChallengeCard({ challenge, myId, onAccept, onDecline }: Props): JSX.Element {
  const { t } = useTranslation();
  const isCreator = challenge.creatorId === myId;
  const opponent = isCreator ? challenge.opponent : challenge.creator;
  const icon = TYPE_ICONS[challenge.type] ?? '🏆';
  const statusColor = STATUS_COLORS[challenge.status] ?? 'var(--ts)';
  const days = daysLeft(challenge.endsAt);
  const total = challenge.params.targetCount;
  const creatorScore = challenge.result?.creatorScore ?? 0;
  const opponentScore = challenge.result?.opponentScore ?? 0;
  const myScore = isCreator ? creatorScore : opponentScore;
  const theirScore = isCreator ? opponentScore : creatorScore;
  const myPct = total > 0 ? Math.min(100, (myScore / total) * 100) : 0;
  const theirPct = total > 0 ? Math.min(100, (theirScore / total) * 100) : 0;

  return (
    <div className="c challenge-card">
      <div className="challenge-card-header">
        <span className="challenge-icon">{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {t(`social.challengeType.${challenge.type}`)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ts)', marginTop: 2 }}>
            {t('social.vs')} {opponent?.username ?? t('social.unknownUser')}
          </div>
        </div>
        <span className="badge" style={{ color: statusColor, background: `${statusColor}22` }}>
          {t(`social.status.${challenge.status}`)}
        </span>
      </div>

      {(challenge.status === 'active' || challenge.status === 'accepted' || challenge.status === 'completed') && (
        <div className="challenge-progress">
          <div className="challenge-progress-row">
            <span className="challenge-progress-label">{t('social.you')}</span>
            <div className="pb" style={{ flex: 1, margin: '0 8px' }}>
              <div className="fill" style={{ width: `${myPct}%`, background: 'var(--a)' }} />
            </div>
            <span className="challenge-score" style={{ color: 'var(--a)' }}>{myScore}</span>
          </div>
          <div className="challenge-progress-row">
            <span className="challenge-progress-label">
              {opponent?.username?.split(' ')[0] ?? '—'}
            </span>
            <div className="pb" style={{ flex: 1, margin: '0 8px' }}>
              <div className="fill" style={{ width: `${theirPct}%`, background: 'var(--p)' }} />
            </div>
            <span className="challenge-score" style={{ color: 'var(--p)' }}>{theirScore}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tm)', marginTop: 6 }}>
            {t('social.target')}: {total}
            {days !== null && ` · ${days} ${t('social.daysLeft')}`}
          </div>
        </div>
      )}

      {challenge.status === 'completed' && challenge.result?.winnerId && (
        <div className="challenge-winner">
          {challenge.result.winnerId === myId
            ? `🏆 ${t('social.youWon')}`
            : `😔 ${t('social.youLost')}`}
        </div>
      )}

      {challenge.status === 'pending' && !isCreator && onAccept && onDecline && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="bs" style={{ flex: 1, fontSize: 13 }} onClick={onDecline}>
            {t('social.decline')}
          </button>
          <button className="bp" style={{ flex: 1, fontSize: 13 }} onClick={onAccept}>
            {t('social.accept')}
          </button>
        </div>
      )}

      {challenge.status === 'pending' && isCreator && (
        <p style={{ fontSize: 12, color: 'var(--ts)', marginTop: 10, textAlign: 'center' }}>
          {t('social.waitingForOpponent')}
        </p>
      )}
    </div>
  );
}
