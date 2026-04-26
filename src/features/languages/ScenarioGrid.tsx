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
      <div className="c empty lang-empty-msg">
        <p className="lang-empty-title">{t('conv.noDecks')}</p>
        <p>{t('conv.vocabTab')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="sec-hdr mb-5">
        <h2>{t('conv.pickScenario')}</h2>
        <p>
          {deck.name} · {deck.lang}
        </p>
      </div>
      <div className="g2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            className="c card-hover scenario-btn"
            onClick={() => onSelect(s)}
          >
            <div className="scenario-emoji">{s.emoji}</div>
            <h3 className="scenario-title">{t(s.titleKey)}</h3>
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
