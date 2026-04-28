import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StudyGoal } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyGoal[] = ['exam', 'language', 'cert', 'university', 'other'];

export function StepGoal({ value, onChange, onNext, onBack }: StepProps<'goal'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.goal.title')}</h2>
      <p>{t('onboarding.steps.goal.desc')}</p>
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
            <strong>{t(`onboarding.options.goal.${opt}.title`)}</strong>
            <span>{t(`onboarding.options.goal.${opt}.desc`)}</span>
          </button>
        ))}
      </div>
      <button className="bs ob-back" onClick={onBack}>
        ← {t('common.back')}
      </button>
    </div>
  );
}
