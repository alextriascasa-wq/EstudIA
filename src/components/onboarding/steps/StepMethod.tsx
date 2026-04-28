import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { StudyMethod } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: StudyMethod[] = ['read', 'manual', 'digital', 'mixed'];
const ICONS: Record<StudyMethod, string> = {
  read: '📖',
  manual: '✍️',
  digital: '💻',
  mixed: '🔀',
};
const COLORS: Record<StudyMethod, string> = {
  read: 'amber',
  manual: 'coral',
  digital: 'cyan',
  mixed: 'emerald',
};

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
            className={`ob-mc ob-c-${COLORS[opt]}${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <span className="ob-mc-icon">{ICONS[opt]}</span>
            <div className="ob-mc-body">
              <strong className="ob-mc-title">{t(`onboarding.options.method.${opt}.title`)}</strong>
              <span className="ob-mc-desc">{t(`onboarding.options.method.${opt}.desc`)}</span>
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
