import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Obstacle } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: Obstacle[] = ['memory', 'time', 'focus', 'motivation', 'comprehension'];
const ICONS: Record<Obstacle, string> = {
  memory: '🧠',
  time: '⏳',
  focus: '🎯',
  motivation: '🔥',
  comprehension: '💡',
};
const COLORS: Record<Obstacle, string> = {
  memory: 'amber',
  time: 'cyan',
  focus: 'coral',
  motivation: 'rose',
  comprehension: 'emerald',
};

export function StepObstacle({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'obstacle'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.obstacle.title')}</h2>
      <p>{t('onboarding.steps.obstacle.desc')}</p>
      <div className="g2">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            className={`ob-mc ob-c-${COLORS[opt]}${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <span className="ob-mc-icon">{ICONS[opt]}</span>
            <div className="ob-mc-body">
              <strong className="ob-mc-title">{t(`onboarding.options.obstacle.${opt}.title`)}</strong>
              <span className="ob-mc-desc">{t(`onboarding.options.obstacle.${opt}.desc`)}</span>
            </div>
            {value === opt && <span className="ob-mc-check">✓</span>}
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
