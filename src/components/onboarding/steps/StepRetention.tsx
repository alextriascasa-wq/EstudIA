import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { SelfRetention } from '@/types';
import type { StepProps } from '../types';

const STEPS: SelfRetention[] = [1, 2, 3, 4, 5];
const EMOJIS: Record<SelfRetention, string> = {
  1: '🥱',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🤩',
};
const COLORS: Record<SelfRetention, string> = {
  1: 'rose',
  2: 'coral',
  3: 'amber',
  4: 'emerald',
  5: 'cyan',
};

export function StepRetention({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'selfRetention'>): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.retention.title')}</h2>
      <p>{t('onboarding.steps.retention.desc')}</p>

      <div className="ob-retention-slider">
        {STEPS.map((s) => (
          <button
            key={s}
            className={`ob-mc ob-ret-btn ob-c-${COLORS[s]}${value === s ? ' on' : ''}`}
            onClick={() => onChange(s)}
          >
            <span className="ob-mc-icon" style={{ fontSize: 40 }}>
              {EMOJIS[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="ob-retention-labels">
        <span className="lbl">{t('onboarding.steps.retention.low')}</span>
        <span className="lbl">{t('onboarding.steps.retention.high')}</span>
      </div>

      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext} disabled={value === undefined}>
          {t('common.continue')} →
        </button>
      </div>
    </div>
  );
}
