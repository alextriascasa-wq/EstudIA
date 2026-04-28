import { useState, type ChangeEvent, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useStudyProfile } from '@/hooks/usePlan';
import { showToast } from '@/components/ui/Toast';
import type {
  StudyProfile,
  StudyGoal,
  AcademicLevel,
  StudyMethod,
  Obstacle,
  SessionLength,
  PreferredStudyTime,
  SelfRetention,
} from '@/types';

const GOALS: StudyGoal[] = ['exam', 'language', 'cert', 'university', 'other'];
const LEVELS: AcademicLevel[] = ['eso', 'batx', 'uni', 'oposicio', 'other'];
const METHODS: StudyMethod[] = ['read', 'manual', 'digital', 'mixed'];
const OBSTACLES: Obstacle[] = ['memory', 'time', 'focus', 'motivation', 'comprehension'];
const MINUTES: SessionLength[] = [15, 30, 60, 90];
const TIMES: PreferredStudyTime[] = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const RETENTIONS: SelfRetention[] = [1, 2, 3, 4, 5];

export function Profile(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useStudyProfile();
  const setStudyProfile = useAppStore((s) => s.setStudyProfile);

  const empty: StudyProfile = {
    goal: 'exam',
    level: 'uni',
    subjects: [],
    method: 'mixed',
    obstacle: 'memory',
    dailyMinutes: 30,
    preferredTime: 'evening',
    selfRetention: 3,
    examDate: null,
    completedAt: new Date().toISOString(),
    version: 1,
  };

  const [draft, setDraft] = useState<StudyProfile>(profile ?? empty);
  const [subjectInput, setSubjectInput] = useState('');

  const set = <K extends keyof StudyProfile>(k: K, v: StudyProfile[K]): void =>
    setDraft((d) => ({ ...d, [k]: v }));

  const addSubject = (): void => {
    const v = subjectInput.trim();
    if (!v || draft.subjects.includes(v) || draft.subjects.length >= 5) return;
    set('subjects', [...draft.subjects, v]);
    setSubjectInput('');
  };

  const onSave = (): void => {
    setStudyProfile({ ...draft, completedAt: new Date().toISOString() });
    showToast({ title: '✅', desc: t('profile.saved') });
    navigate('/plan');
  };

  return (
    <section className="sec">
      <header className="sec-hdr">
        <h2>{t('profile.title')}</h2>
      </header>

      <div className="c profile-form">
        <label className="lbl">{t('onboarding.steps.goal.title')}</label>
        <select
          className="inp"
          value={draft.goal}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => set('goal', e.target.value as StudyGoal)}
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {t(`onboarding.options.goal.${g}.title`)}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.level.title')}</label>
        <select
          className="inp"
          value={draft.level}
          onChange={(e) => set('level', e.target.value as AcademicLevel)}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {t(`onboarding.options.level.${l}.title`)}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.subjects.title')}</label>
        <div className="ob-tags">
          {draft.subjects.map((s) => (
            <button
              key={s}
              className="tag"
              onClick={() => set('subjects', draft.subjects.filter((x) => x !== s))}
            >
              {s} ×
            </button>
          ))}
        </div>
        <input
          className="inp"
          value={subjectInput}
          placeholder={t('onboarding.steps.subjects.placeholder')}
          onChange={(e) => setSubjectInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addSubject();
            }
          }}
        />

        <label className="lbl">{t('onboarding.steps.method.title')}</label>
        <select
          className="inp"
          value={draft.method}
          onChange={(e) => set('method', e.target.value as StudyMethod)}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {t(`onboarding.options.method.${m}.title`)}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.minutes.title')}</label>
        <select
          className="inp"
          value={draft.dailyMinutes}
          onChange={(e) => set('dailyMinutes', Number(e.target.value) as SessionLength)}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.time.title')}</label>
        <select
          className="inp"
          value={draft.preferredTime}
          onChange={(e) => set('preferredTime', e.target.value as PreferredStudyTime)}
        >
          {TIMES.map((tt) => (
            <option key={tt} value={tt}>
              {t(`onboarding.options.time.${tt}.title`)}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.obstacle.title')}</label>
        <select
          className="inp"
          value={draft.obstacle}
          onChange={(e) => set('obstacle', e.target.value as Obstacle)}
        >
          {OBSTACLES.map((o) => (
            <option key={o} value={o}>
              {t(`onboarding.options.obstacle.${o}.title`)}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.retention.title')}</label>
        <select
          className="inp"
          value={draft.selfRetention}
          onChange={(e) => set('selfRetention', Number(e.target.value) as SelfRetention)}
        >
          {RETENTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <label className="lbl">{t('onboarding.steps.examDate.title')}</label>
        <input
          className="inp"
          type="date"
          value={draft.examDate ?? ''}
          onChange={(e) => set('examDate', e.target.value || null)}
        />

        <div className="ob-actions">
          <button className="bs" onClick={() => navigate('/plan')}>
            ← {t('common.back')}
          </button>
          <button className="bp" onClick={onSave}>
            {t('profile.save')}
          </button>
        </div>
      </div>
    </section>
  );
}
