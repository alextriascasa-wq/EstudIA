import type { StudyProfile } from '@/types';

export type DraftProfile = Partial<StudyProfile>;

export interface StepProps<K extends keyof StudyProfile> {
  value: StudyProfile[K] | undefined;
  onChange: (v: StudyProfile[K]) => void;
  onNext: () => void;
  onBack: () => void;
}
