import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { Obstacle } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: Obstacle[] = ['memory', 'time', 'focus', 'motivation', 'comprehension'];

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
            className={`mc${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <strong>{t(`onboarding.options.obstacle.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.obstacle.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
