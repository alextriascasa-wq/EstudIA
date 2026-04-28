import { useMemo, useState, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import type { StudyProfile } from '@/types';
import type { DraftProfile } from './types';
import { StepGoal } from './steps/StepGoal';
import { StepLevel } from './steps/StepLevel';
import { StepSubjects } from './steps/StepSubjects';
import { StepExamDate } from './steps/StepExamDate';
import { StepMethod } from './steps/StepMethod';
import { StepMinutes } from './steps/StepMinutes';
import { StepTime } from './steps/StepTime';
import { StepObstacle } from './steps/StepObstacle';
import { StepRetention } from './steps/StepRetention';
import { Processing } from './steps/Processing';
import { Results } from './steps/Results';

type StepKey =
  | 'goal'
  | 'level'
  | 'subjects'
  | 'examDate'
  | 'method'
  | 'minutes'
  | 'time'
  | 'obstacle'
  | 'retention'
  | 'processing'
  | 'results';

const PHASES: Record<StepKey, 1 | 2 | 3 | null> = {
  goal: 1,
  level: 1,
  subjects: 1,
  examDate: 1,
  method: 2,
  minutes: 2,
  time: 2,
  obstacle: 3,
  retention: 3,
  processing: null,
  results: null,
};

export function OnboardingWizard(): JSX.Element | null {
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  const studyProfile = useAppStore((s) => s.studyProfile);
  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const xp = useAppStore((s) => s.xp);
  const decks = useAppStore((s) => s.decks);
  const setStudyProfile = useAppStore((s) => s.setStudyProfile);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [draft, setDraft] = useState<DraftProfile>({});
  const [stepIdx, setStepIdx] = useState(0);

  const steps: StepKey[] = useMemo(() => {
    const goalNeedsDate =
      draft.goal === 'exam' || draft.goal === 'cert' || draft.goal === 'university';
    const list: StepKey[] = [
      'goal',
      'level',
      'subjects',
      ...(goalNeedsDate ? (['examDate'] as StepKey[]) : []),
      'method',
      'minutes',
      'time',
      'obstacle',
      'retention',
      'processing',
      'results',
    ];
    return list;
  }, [draft.goal]);

  if (!hasHydrated) return null;
  if (studyProfile) return null;
  if (hasCompletedOnboarding && (xp > 0 || decks.length > 0)) return null;

  const cur = steps[stepIdx]!;
  const phase = PHASES[cur];
  const totalPhaseSteps = steps.filter((s) => PHASES[s] === phase).length;
  const phaseStepIdx = steps.slice(0, stepIdx + 1).filter((s) => PHASES[s] === phase).length;

  const next = (): void => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const back = (): void => setStepIdx((i) => Math.max(0, i - 1));

  const change = <K extends keyof StudyProfile>(key: K, v: StudyProfile[K]): void => {
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const finalize = (): void => {
    const profile: StudyProfile = {
      goal: draft.goal!,
      level: draft.level!,
      subjects: draft.subjects ?? [],
      method: draft.method!,
      obstacle: draft.obstacle!,
      dailyMinutes: draft.dailyMinutes!,
      preferredTime: draft.preferredTime!,
      selfRetention: draft.selfRetention!,
      examDate: draft.examDate ?? null,
      completedAt: new Date().toISOString(),
      version: 1,
    };
    setStudyProfile(profile);
    navigate('/');
  };

  const renderStep = (): JSX.Element | null => {
    switch (cur) {
      case 'goal':
        return (
          <StepGoal
            value={draft.goal}
            onChange={(v) => change('goal', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'level':
        return (
          <StepLevel
            value={draft.level}
            onChange={(v) => change('level', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'subjects':
        return (
          <StepSubjects
            value={draft.subjects}
            onChange={(v) => change('subjects', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'examDate':
        return (
          <StepExamDate
            value={draft.examDate}
            onChange={(v) => change('examDate', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'method':
        return (
          <StepMethod
            value={draft.method}
            onChange={(v) => change('method', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'minutes':
        return (
          <StepMinutes
            value={draft.dailyMinutes}
            onChange={(v) => change('dailyMinutes', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'time':
        return (
          <StepTime
            value={draft.preferredTime}
            onChange={(v) => change('preferredTime', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'obstacle':
        return (
          <StepObstacle
            value={draft.obstacle}
            onChange={(v) => change('obstacle', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'retention':
        return (
          <StepRetention
            value={draft.selfRetention}
            onChange={(v) => change('selfRetention', v)}
            onNext={next}
            onBack={back}
          />
        );
      case 'processing':
        return <Processing onDone={next} />;
      case 'results':
        return <Results draft={draft as StudyProfile} onFinish={finalize} />;
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ob-overlay">
      <div className="ob-modal c glow">
        {phase !== null && (
          <div className="ob-progress">
            <div className="ob-phase-dots">
              {[1, 2, 3].map((p) => {
                const cls =
                  p === phase ? 'active' : p < phase ? 'done' : '';
                return <span key={p} className={`ob-phase-dot ${cls}`} />;
              })}
            </div>
            <span className="ob-phase-label">
              {t(`onboarding.phases.${phase}`)} · {phaseStepIdx} / {totalPhaseSteps}
            </span>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={cur}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
