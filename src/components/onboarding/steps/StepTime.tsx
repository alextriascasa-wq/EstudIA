import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { PreferredStudyTime } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: PreferredStudyTime[] = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const ICONS: Record<PreferredStudyTime, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
  flexible: '🔄',
};
const COLORS: Record<PreferredStudyTime, string> = {
  morning: 'amber',
  afternoon: 'coral',
  evening: 'rose',
  night: 'violet',
  flexible: 'emerald',
};

export function StepTime({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'preferredTime'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.time.title')}</h2>
      <p>{t('onboarding.steps.time.desc')}</p>
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
              <strong className="ob-mc-title">{t(`onboarding.options.time.${opt}.title`)}</strong>
              <span className="ob-mc-desc">{t(`onboarding.options.time.${opt}.desc`)}</span>
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
