import { useState, type JSX, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { StepProps } from '../types';

const MAX_SUBJECTS = 5;

export function StepSubjects({
  value,
  onChange,
  onNext,
  onBack,
}: StepProps<'subjects'>): JSX.Element {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const subjects = value ?? [];

  const addSubject = (): void => {
    const v = input.trim();
    if (!v || subjects.includes(v) || subjects.length >= MAX_SUBJECTS) return;
    onChange([...subjects, v]);
    setInput('');
  };

  const remove = (s: string): void => onChange(subjects.filter((x) => x !== s));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubject();
    }
  };

  return (
    <div className="ob-step">
      <h2>{t('onboarding.steps.subjects.title')}</h2>
      <p>{t('onboarding.steps.subjects.desc', { max: MAX_SUBJECTS })}</p>
      <div className="ob-tags">
        {subjects.map((s) => (
          <button key={s} className="tag" onClick={() => remove(s)}>
            {s} ×
          </button>
        ))}
      </div>
      <input
        className="inp"
        placeholder={t('onboarding.steps.subjects.placeholder')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        disabled={subjects.length >= MAX_SUBJECTS}
      />
      <div className="ob-actions">
        <button className="bs" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <button className="bp" onClick={onNext} disabled={subjects.length === 0}>
          {t('common.continue')} →
        </button>
      </div>
    </div>
  );
}
