import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StudyMethod } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyMethod[] = ['read', 'manual', 'digital', 'mixed'];

export function StepMethod({ value, onChange, onNext, onBack }: StepProps<'method'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.method.title')}</h2>
      <p>{t('onboarding.steps.method.desc')}</p>
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
            <strong>{t(`onboarding.options.method.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.method.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
