import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { PreferredStudyTime } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: PreferredStudyTime[] = ['morning', 'afternoon', 'evening', 'night', 'flexible'];

export function StepTime({ value, onChange, onNext, onBack }: StepProps<'preferredTime'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.time.title')}</h2>
      <p>{t('onboarding.steps.time.desc')}</p>
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
            <strong>{t(`onboarding.options.time.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.time.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
