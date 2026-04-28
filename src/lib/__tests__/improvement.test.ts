import { describe, it, expect } from 'vitest';
import { computeImprovement } from '@/lib/improvement';
import type { StudyProfile } from '@/types';

const base: StudyProfile = {
  goal: 'exam',
  level: 'uni',
  subjects: ['Anatomia'],
  method: 'read',
  obstacle: 'memory',
  dailyMinutes: 30,
  preferredTime: 'evening',
  selfRetention: 3,
  examDate: null,
  completedAt: '2026-04-27T10:00:00.000Z',
  version: 1,
};

describe('computeImprovement', () => {
  it('returns baseline 15 for read+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'read', selfRetention: 3 });
    expect(r.baseline).toBe(15);
  });

  it('returns baseline 25 for manual+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'manual', selfRetention: 3 });
    expect(r.baseline).toBe(25);
  });

  it('returns baseline 35 for digital+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'digital', selfRetention: 3 });
    expect(r.baseline).toBe(35);
  });

  it('returns baseline 30 for mixed+selfRetention 3', () => {
    const r = computeImprovement({ ...base, method: 'mixed', selfRetention: 3 });
    expect(r.baseline).toBe(30);
  });

  it('shifts baseline by +/-5 per selfRetention step from 3', () => {
    const r1 = computeImprovement({ ...base, method: 'read', selfRetention: 1 });
    const r5 = computeImprovement({ ...base, method: 'read', selfRetention: 5 });
    expect(r1.baseline).toBe(5);
    expect(r5.baseline).toBe(25);
  });

  it('adds srs factor +25 when method=read', () => {
    const r = computeImprovement({ ...base, method: 'read' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(25);
  });

  it('adds srs factor +25 when method=manual', () => {
    const r = computeImprovement({ ...base, method: 'manual' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(25);
  });

  it('adds srs factor +15 when method=mixed', () => {
    const r = computeImprovement({ ...base, method: 'mixed' });
    const f = r.factors.find((x) => x.key === 'srs');
    expect(f?.delta).toBe(15);
  });

  it('omits srs factor when method=digital', () => {
    const r = computeImprovement({ ...base, method: 'digital' });
    expect(r.factors.find((x) => x.key === 'srs')).toBeUndefined();
  });

  it('adds feynman factor +12 when obstacle=comprehension', () => {
    const r = computeImprovement({ ...base, obstacle: 'comprehension' });
    expect(r.factors.find((x) => x.key === 'feynman')?.delta).toBe(12);
  });

  it('adds feynman factor +12 when goal=university', () => {
    const r = computeImprovement({ ...base, goal: 'university', obstacle: 'time' });
    expect(r.factors.find((x) => x.key === 'feynman')?.delta).toBe(12);
  });

  it('adds spacing factor +15 when dailyMinutes <= 30', () => {
    const r = computeImprovement({ ...base, dailyMinutes: 30 });
    expect(r.factors.find((x) => x.key === 'spacing')?.delta).toBe(15);
  });

  it('omits spacing factor when dailyMinutes > 30', () => {
    const r = computeImprovement({ ...base, dailyMinutes: 60 });
    expect(r.factors.find((x) => x.key === 'spacing')).toBeUndefined();
  });

  it('adds consistency factor +10 when preferredTime != flexible', () => {
    const r = computeImprovement({ ...base, preferredTime: 'morning' });
    expect(r.factors.find((x) => x.key === 'consistency')?.delta).toBe(10);
  });

  it('omits consistency factor when preferredTime=flexible', () => {
    const r = computeImprovement({ ...base, preferredTime: 'flexible' });
    expect(r.factors.find((x) => x.key === 'consistency')).toBeUndefined();
  });

  it('adds focus factor +8 when obstacle=focus', () => {
    const r = computeImprovement({ ...base, obstacle: 'focus' });
    expect(r.factors.find((x) => x.key === 'focus')?.delta).toBe(8);
  });

  it('adds memory factor +12 when obstacle=memory', () => {
    const r = computeImprovement({ ...base, obstacle: 'memory' });
    expect(r.factors.find((x) => x.key === 'memory')?.delta).toBe(12);
  });

  it('caps projected at 95', () => {
    const r = computeImprovement({
      ...base,
      method: 'read',
      selfRetention: 5,
      obstacle: 'memory',
      dailyMinutes: 15,
      preferredTime: 'morning',
      goal: 'university',
    });
    expect(r.projected).toBe(95);
  });

  it('delta equals projected minus baseline', () => {
    const r = computeImprovement(base);
    expect(r.delta).toBe(r.projected - r.baseline);
  });
});
