import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChallenges } from './hooks/useChallenges';
import type { Friendship, ChallengeType } from '@/types';

interface Props {
  friends: Friendship[];
  onClose: () => void;
}

const CHALLENGE_TYPES: ChallengeType[] = ['flashcards', 'study_time', 'exam'];

export function CreateChallenge({ friends, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { create } = useChallenges();

  const [opponentId, setOpponentId] = useState(friends[0]?.friendId ?? '');
  const [type, setType] = useState<ChallengeType>('flashcards');
  const [duration, setDuration] = useState(7);
  const [target, setTarget] = useState(50);
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponentId) return;
    setSubmitting(true);
    try {
      await create(opponentId, type, {
        durationDays: duration,
        targetCount: target,
        subject: subject || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="c create-challenge-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18 }}>{t('social.createChallenge')}</h3>
          <button className="bi" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="lbl">{t('social.opponent')}</label>
            <select className="inp" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              {friends.map((f) => (
                <option key={f.id} value={f.friendId}>
                  {f.friend?.username ?? f.friendId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="lbl">{t('social.challengeType.label')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CHALLENGE_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  className={`mc${type === ct ? ' on' : ''}`}
                  style={{ flex: 1, fontSize: 13 }}
                  onClick={() => setType(ct)}
                >
                  {t(`social.challengeType.${ct}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="lbl">
              {t('social.challengeDuration')} ({duration} {t('social.days')})
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--a)' }}
            />
          </div>

          <div>
            <label className="lbl">{t('social.challengeTarget')}</label>
            <input
              type="number"
              className="inp"
              min={1}
              max={1000}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="lbl">{t('social.subject')} ({t('common.optional')})</label>
            <input
              type="text"
              className="inp"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('social.subjectPlaceholder')}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="bs" style={{ flex: 1 }} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="bp" style={{ flex: 1 }} disabled={submitting || !opponentId}>
              {submitting ? '…' : t('social.sendChallenge')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
