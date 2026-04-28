import { useTranslation } from 'react-i18next';
import { useChallenges } from './hooks/useChallenges';
import { ChallengeCard } from './ChallengeCard';
import { useAppStore } from '@/store/useAppStore';

export function ChallengeList(): JSX.Element {
  const { t } = useTranslation();
  const myId = useAppStore((s) => s.authState.user?.id ?? '');
  const { active, pending, completed, loading, error, accept, decline } = useChallenges();

  if (loading) {
    return (
      <div className="c empty">
        <p style={{ color: 'var(--ts)' }}>…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="c empty">
        <p style={{ color: 'var(--err)' }}>{error}</p>
      </div>
    );
  }

  const hasAny = active.length > 0 || pending.length > 0 || completed.length > 0;

  if (!hasAny) {
    return (
      <div className="c empty">
        <span style={{ fontSize: 40 }}>⚔️</span>
        <h3>{t('social.noChallenges')}</h3>
        <p style={{ color: 'var(--ts)', marginTop: 4 }}>{t('social.noChallengesHint')}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {pending.length > 0 && (
        <section>
          <h4 className="lbl" style={{ marginBottom: 12 }}>
            {t('social.incomingChallenges')} ({pending.length})
          </h4>
          <div className="g2">
            {pending.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                myId={myId}
                onAccept={() => void accept(c.id)}
                onDecline={() => void decline(c.id)}
              />
            ))}
          </div>
        </section>
      )}

      {active.length > 0 && (
        <section>
          <h4 className="lbl" style={{ marginBottom: 12 }}>
            {t('social.activeChallenges')} ({active.length})
          </h4>
          <div className="g2">
            {active.map((c) => (
              <ChallengeCard key={c.id} challenge={c} myId={myId} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h4 className="lbl" style={{ marginBottom: 12 }}>
            {t('social.completedChallenges')}
          </h4>
          <div className="g2">
            {completed.map((c) => (
              <ChallengeCard key={c.id} challenge={c} myId={myId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
