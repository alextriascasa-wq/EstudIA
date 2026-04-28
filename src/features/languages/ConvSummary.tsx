import { useTranslation } from 'react-i18next';
import type { ConvSession } from '@/types';

interface Props {
  session: ConvSession;
  pendingCardCount: number;
  onAddCards: () => void;
  onNewConv: () => void;
}

export function ConvSummary({
  session,
  pendingCardCount,
  onAddCards,
  onNewConv,
}: Props): JSX.Element {
  const { t } = useTranslation();

  const userMessages = session.messages.filter((m) => m.role === 'user');
  const allCorrections = userMessages.flatMap((m) => m.corrections);

  // scoreColor is runtime-computed — must stay inline
  const scoreColor =
    session.fluencyScore >= 70
      ? 'var(--ok)'
      : session.fluencyScore >= 40
        ? 'var(--w)'
        : 'var(--err)';

  return (
    <div className="sec conv-summary">
      {/* Score card */}
      <div className="c conv-score-card">
        <div className="conv-score-icon">🎉</div>
        <h2 className="conv-score-title">{t('conv.sessionDone')}</h2>
        <div className="conv-score-num" style={{ color: scoreColor }}>
          {session.fluencyScore}
        </div>
        <div className="conv-score-sub">/ 100 · {t('conv.fluency')}</div>
        <div className="conv-score-meta">
          {userMessages.length} torns · {allCorrections.length} correccions
        </div>
      </div>

      {/* Corrections list */}
      {allCorrections.length > 0 && (
        <div className="c">
          <h3 className="conv-corr-title">Correccions</h3>
          <div className="conv-corr-list">
            {allCorrections.map((c, i) => (
              <div key={i} className="conv-corr-item">
                <div className="mb-1">
                  <span className="conv-corr-original">{c.original}</span>
                  <span className="conv-corr-arrow">→</span>
                  <span className="conv-corr-corrected">{c.corrected}</span>
                </div>
                <p className="conv-corr-expl">{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="conv-actions">
        {pendingCardCount > 0 && (
          <button className="bp w-full" onClick={onAddCards}>
            {t('conv.addToDeckCta', { n: pendingCardCount })}
          </button>
        )}
        <button className="bs w-full" onClick={onNewConv}>
          {t('conv.newConv')}
        </button>
      </div>
    </div>
  );
}
