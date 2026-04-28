import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildPlan } from '@/lib/plan';
import { computeImprovement } from '@/lib/improvement';
import type { StudyProfile, StudyPlan, ImprovementBreakdown } from '@/types';

export function useStudyProfile(): StudyProfile | null {
  return useAppStore((s) => s.studyProfile);
}

export function usePlan(): StudyPlan | null {
  const profile = useStudyProfile();
  return useMemo(() => (profile ? buildPlan(profile) : null), [profile]);
}

export function useImprovement(): ImprovementBreakdown | null {
  const profile = useStudyProfile();
  return useMemo(() => (profile ? computeImprovement(profile) : null), [profile]);
}
