import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcademicLevel } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: AcademicLevel[] = ['eso', 'batx', 'uni', 'oposicio', 'other'];

export function StepLevel({ value, onChange, onNext, onBack }: StepProps<'level'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.level.title')}</h2>
      <p>{t('onboarding.steps.level.desc')}</p>
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
            <strong>{t(`onboarding.options.level.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.level.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
