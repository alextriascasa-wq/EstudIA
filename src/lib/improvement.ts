import type {
  StudyProfile,
  ImprovementBreakdown,
  ImprovementFactor,
} from '@/types';

const BASELINE_BY_METHOD: Record<StudyProfile['method'], number> = {
  read: 15,
  manual: 25,
  digital: 35,
  mixed: 30,
};

export function computeImprovement(p: StudyProfile): ImprovementBreakdown {
  const baseline = Math.max(
    0,
    BASELINE_BY_METHOD[p.method] + (p.selfRetention - 3) * 5,
  );

  const factors: ImprovementFactor[] = [];

  if (p.method === 'read' || p.method === 'manual') {
    factors.push({
      key: 'srs',
      labelKey: 'improvement.factors.srs',
      delta: 25,
      reasonKey: 'improvement.reasons.srs',
    });
  } else if (p.method === 'mixed') {
    factors.push({
      key: 'srs',
      labelKey: 'improvement.factors.srs',
      delta: 15,
      reasonKey: 'improvement.reasons.srsMixed',
    });
  }

  if (p.obstacle === 'comprehension' || p.goal === 'university') {
    factors.push({
      key: 'feynman',
      labelKey: 'improvement.factors.feynman',
      delta: 12,
      reasonKey: 'improvement.reasons.feynman',
    });
  }

  if (p.dailyMinutes <= 30) {
    factors.push({
      key: 'spacing',
      labelKey: 'improvement.factors.spacing',
      delta: 15,
      reasonKey: 'improvement.reasons.spacing',
    });
  }

  if (p.preferredTime !== 'flexible') {
    factors.push({
      key: 'consistency',
      labelKey: 'improvement.factors.consistency',
      delta: 10,
      reasonKey: 'improvement.reasons.consistency',
    });
  }

  if (p.obstacle === 'focus') {
    factors.push({
      key: 'focus',
      labelKey: 'improvement.factors.focus',
      delta: 8,
      reasonKey: 'improvement.reasons.focus',
    });
  }

  if (p.obstacle === 'memory') {
    factors.push({
      key: 'memory',
      labelKey: 'improvement.factors.memory',
      delta: 12,
      reasonKey: 'improvement.reasons.memory',
    });
  }

  const sum = factors.reduce((acc, f) => acc + f.delta, 0);
  const projected = Math.min(95, baseline + sum);
  const delta = projected - baseline;

  return { baseline, factors, projected, delta };
}
