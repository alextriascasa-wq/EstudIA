import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StudyGoal } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyGoal[] = ['exam', 'language', 'cert', 'university', 'other'];
const ICONS: Record<StudyGoal, string> = {
  exam: '📚',
  language: '🌍',
  cert: '🎓',
  university: '🏛️',
  other: '✨',
};
const COLORS: Record<StudyGoal, string> = {
  exam: 'amber',
  language: 'emerald',
  cert: 'cyan',
  university: 'coral',
  other: 'rose',
};

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
            className={`ob-mc ob-c-${COLORS[opt]}${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <span className="ob-mc-icon">{ICONS[opt]}</span>
            <div className="ob-mc-body">
              <strong className="ob-mc-title">{t(`onboarding.options.goal.${opt}.title`)}</strong>
              <span className="ob-mc-desc">{t(`onboarding.options.goal.${opt}.desc`)}</span>
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
