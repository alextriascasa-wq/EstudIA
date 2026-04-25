import { useTranslation } from 'react-i18next';
import type { LangDeck, Scenario } from '@/types';
import { SCENARIOS } from './scenarios';

interface Props {
  deck: LangDeck | null;
  onSelect: (scenario: Scenario) => void;
}

const DIFF_COLOR: Record<Scenario['difficulty'], string> = {
  easy: 'var(--ok)',
  medium: 'var(--w)',
  hard: 'var(--err)',
};

export function ScenarioGrid({ deck, onSelect }: Props): JSX.Element {
  const { t } = useTranslation();

  if (!deck) {
    return (
      <div className="c empty" style={{ padding: 48 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--t)', marginBottom: 8 }}>
          {t('conv.noDecks')}
        </p>
        <p>{t('conv.vocabTab')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr" style={{ marginBottom: 20 }}>
        <h2>{t('conv.pickScenario')}</h2>
        <p>
          {deck.name} · {deck.lang}
        </p>
      </div>
      <div className="g2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className="c card-hover"
            style={{
              textAlign: 'left',
              cursor: 'pointer',
              border: '1px solid var(--b)',
              padding: 20,
              background: 'var(--s)',
              borderRadius: 'var(--radius)',
              width: '100%',
            }}
            onClick={() => onSelect(s)}
          >
            <div style={{ fontSize: 36, marginBottom: 10 }}>{s.emoji}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--t)' }}>
              {t(s.titleKey)}
            </h3>
            <span
              className="tag"
              style={{
                background: `${DIFF_COLOR[s.difficulty]}22`,
                color: DIFF_COLOR[s.difficulty],
                border: `1px solid ${DIFF_COLOR[s.difficulty]}44`,
              }}
            >
              {t(`conv.difficulty.${s.difficulty}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
