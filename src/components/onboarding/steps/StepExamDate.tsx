import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StepProps } from '../types';

export function StepExamDate({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'examDate'>): JSX.Element {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0]!;
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.examDate.title')}</h2>
      <p>{t('onboarding.steps.examDate.desc')}</p>
      <input
        className="inp"
        type="date"
        min={today}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      />
      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext}>
          {t('common.continue')} →
        </button>
        <button
          className="bi"
          onClick={() => {
            onChange(null);
            onNext();
          }}
        >
          {t('onboarding.steps.examDate.skip')}
        </button>
      </div>
    </div>
  );
}
