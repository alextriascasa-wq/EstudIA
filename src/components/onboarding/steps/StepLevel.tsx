import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { AcademicLevel } from '@/types';
import type { StepProps } from '../types';

const OPTIONS: AcademicLevel[] = ['eso', 'batx', 'uni', 'oposicio', 'other'];
const ICONS: Record<AcademicLevel, string> = {
  eso: '🎒',
  batx: '📖',
  uni: '🎓',
  oposicio: '🎯',
  other: '✨',
};
const COLORS: Record<AcademicLevel, string> = {
  eso: 'cyan',
  batx: 'amber',
  uni: 'coral',
  oposicio: 'emerald',
  other: 'rose',
};

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
            className={`ob-mc ob-c-${COLORS[opt]}${value === opt ? ' on' : ''}`}
            onClick={() => {
              onChange(opt);
              onNext();
            }}
          >
            <span className="ob-mc-icon">{ICONS[opt]}</span>
            <div className="ob-mc-body">
              <strong className="ob-mc-title">{t(`onboarding.options.level.${opt}.title`)}</strong>
              <span className="ob-mc-desc">{t(`onboarding.options.level.${opt}.desc`)}</span>
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
