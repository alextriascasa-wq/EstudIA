import { describe, it, expect } from 'vitest';
import { buildPlan } from '@/lib/plan';
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

describe('buildPlan', () => {
  it('weeklyMinutes equals dailyMinutes * 7', () => {
    const r = buildPlan({ ...base, dailyMinutes: 30 });
    expect(r.weeklyMinutes).toBe(210);
  });

  it('cards is essential when obstacle=memory', () => {
    const r = buildPlan({ ...base, obstacle: 'memory' });
    expect(r.modules.find((m) => m.module === 'cards')?.priority).toBe('essential');
  });

  it('feynman is essential when obstacle=comprehension', () => {
    const r = buildPlan({ ...base, obstacle: 'comprehension' });
    expect(r.modules.find((m) => m.module === 'feynman')?.priority).toBe('essential');
  });

  it('timer is essential when obstacle=focus', () => {
    const r = buildPlan({ ...base, obstacle: 'focus' });
    expect(r.modules.find((m) => m.module === 'timer')?.priority).toBe('essential');
  });

  it('languages overrides others when goal=language', () => {
    const r = buildPlan({ ...base, goal: 'language', obstacle: 'memory' });
    expect(r.modules[0]?.module).toBe('languages');
    expect(r.modules[0]?.priority).toBe('essential');
  });

  it('exams added when goal=exam', () => {
    const r = buildPlan({ ...base, goal: 'exam' });
    expect(r.modules.find((m) => m.module === 'exams')).toBeDefined();
  });

  it('dailyTemplate sums to dailyMinutes', () => {
    const r = buildPlan({ ...base, dailyMinutes: 60 });
    const total = r.dailyTemplate.reduce((acc, b) => acc + b.minutes, 0);
    expect(total).toBe(60);
  });

  it('dailyTemplate sums to dailyMinutes for 90', () => {
    const r = buildPlan({ ...base, dailyMinutes: 90 });
    const total = r.dailyTemplate.reduce((acc, b) => acc + b.minutes, 0);
    expect(total).toBe(90);
  });

  it('modules sorted essential before recommended before optional', () => {
    const r = buildPlan(base);
    const order = ['essential', 'recommended', 'optional'];
    let lastIdx = 0;
    r.modules.forEach((m) => {
      const idx = order.indexOf(m.priority);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    });
  });

  it('milestones include +7d and +30d when no examDate', () => {
    const r = buildPlan({ ...base, examDate: null });
    expect(r.milestones.length).toBeGreaterThanOrEqual(2);
    expect(r.milestones.some((m) => m.metric === 'cards_reviewed')).toBe(true);
    expect(r.milestones.some((m) => m.metric === 'streak_days')).toBe(true);
  });

  it('milestones include exam countdown when examDate set', () => {
    const r = buildPlan({
      ...base,
      examDate: '2026-06-01',
      goal: 'exam',
    });
    expect(r.milestones.some((m) => m.metric === 'exam_score')).toBe(true);
  });
});
