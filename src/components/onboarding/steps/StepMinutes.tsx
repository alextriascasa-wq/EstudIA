import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionLength } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: SessionLength[] = [15, 30, 60, 90];

export function StepMinutes({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'dailyMinutes'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.minutes.title')}</h2>
      <p>{t('onboarding.steps.minutes.desc')}</p>
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
            <strong>{t('onboarding.options.minutes.label', { min: opt })}</strong>
            <span>{t(`onboarding.options.minutes.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
