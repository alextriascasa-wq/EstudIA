import { useTranslation } from 'react-i18next';
import type { ConvCorrection, ConvSession } from '@/types';

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

      {/* Corrections list — grouped by type */}
      {allCorrections.length > 0 &&
        (() => {
          const types: ConvCorrection['type'][] = ['grammar', 'vocabulary', 'fluency'];
          const typeColor: Record<ConvCorrection['type'], string> = {
            grammar: 'var(--w)',
            vocabulary: 'var(--err)',
            fluency: 'var(--i)',
          };
          const groups = types.map((type) => ({
            type,
            items: allCorrections.filter((c) => c.type === type),
          }));
          return (
            <div className="c">
              <h3 className="conv-corr-title">Correccions ({allCorrections.length})</h3>
              <div className="conv-corr-list">
                {groups.map(({ type, items }) =>
                  items.length === 0 ? null : (
                    <div key={type} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          color: typeColor[type],
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: 8,
                        }}
                      >
                        {t(`conv.correctionTypes.${type}`)} · {items.length}
                      </div>
                      {items.map((c, i) => (
                        <div
                          key={i}
                          className="conv-corr-item"
                          style={{ borderLeft: `3px solid ${typeColor[type]}55`, paddingLeft: 10 }}
                        >
                          <div className="mb-1">
                            <span className="conv-corr-original">{c.original}</span>
                            <span className="conv-corr-arrow">→</span>
                            <span className="conv-corr-corrected">{c.corrected}</span>
                          </div>
                          <p className="conv-corr-expl">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
            </div>
          );
        })()}

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
