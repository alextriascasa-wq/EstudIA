import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SessionLength } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: SessionLength[] = [15, 30, 60, 90];
const ICONS: Record<SessionLength, string> = {
  15: '⚡',
  30: '⏱️',
  60: '🎯',
  90: '🔥',
};
const COLORS: Record<SessionLength, string> = {
  15: 'cyan',
  30: 'emerald',
  60: 'amber',
  90: 'coral',
};

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
            className={`ob-mc ob-c-${COLORS[opt]}${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <span className="ob-mc-icon">{ICONS[opt]}</span>
            <div className="ob-mc-body">
              <strong className="ob-mc-title">
                {t('onboarding.options.minutes.label', { min: opt })}
              </strong>
              <span className="ob-mc-desc">{t(`onboarding.options.minutes.${opt}.desc`)}</span>
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
