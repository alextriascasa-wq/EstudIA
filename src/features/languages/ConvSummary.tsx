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

  const scoreColor =
    session.fluencyScore >= 70
      ? 'var(--ok)'
      : session.fluencyScore >= 40
        ? 'var(--w)'
        : 'var(--err)';

  return (
    <div className="sec" style={{ gap: 16, display: 'flex', flexDirection: 'column' }}>
      {/* Score card */}
      <div className="c" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{t('conv.sessionDone')}</h2>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: scoreColor,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {session.fluencyScore}
        </div>
        <div style={{ fontSize: 14, color: 'var(--ts)' }}>/ 100 · {t('conv.fluency')}</div>
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: 'var(--tm)',
          }}
        >
          {userMessages.length} torns · {allCorrections.length} correccions
        </div>
      </div>

      {/* Corrections list */}
      {allCorrections.length > 0 && (
        <div className="c">
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--ts)' }}>
            Correccions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allCorrections.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--bg)',
                  fontSize: 12,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <span style={{ color: 'var(--err)', textDecoration: 'line-through' }}>
                    {c.original}
                  </span>
                  <span style={{ color: 'var(--tm)', margin: '0 8px' }}>→</span>
                  <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{c.corrected}</span>
                </div>
                <p style={{ color: 'var(--ts)', margin: 0 }}>{c.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pendingCardCount > 0 && (
          <button className="bp" style={{ width: '100%' }} onClick={onAddCards}>
            {t('conv.addToDeckCta', { n: pendingCardCount })}
          </button>
        )}
        <button className="bs" style={{ width: '100%' }} onClick={onNewConv}>
          {t('conv.newConv')}
        </button>
      </div>
    </div>
  );
}
