import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import type { ActiveExamState } from '@/types';

const fixture: ActiveExamState = {
  topic: 'Revolució Francesa',
  type: 'test',
  questions: [
    { id: 'q1', q: 'Any inici?', options: ['1789', '1776', '1815', '1848'], correctAnswer: '1789' },
    { id: 'q2', q: 'Rei executat?', options: ['Lluís XIV', 'Lluís XV', 'Lluís XVI', 'Lluís XVIII'], correctAnswer: 'Lluís XVI' },
  ],
  answers: { q1: '1789' },
  currentIdx: 1,
  startedAt: '2026-04-24T10:00:00.000Z',
};

describe('activeExam persistence', () => {
  beforeEach(() => {
    useAppStore.getState().clearActiveExam();
  });

  it('starts, updates, and clears activeExam', () => {
    useAppStore.getState().startActiveExam(fixture);
    expect(useAppStore.getState().activeExam).toEqual(fixture);

    useAppStore.getState().updateActiveExam({ currentIdx: 2, answers: { q1: '1789', q2: 'Lluís XVI' } });
    const after = useAppStore.getState().activeExam;
    expect(after?.currentIdx).toBe(2);
    expect(after?.answers).toEqual({ q1: '1789', q2: 'Lluís XVI' });

    useAppStore.getState().clearActiveExam();
    expect(useAppStore.getState().activeExam).toBeNull();
  });

  it('updateActiveExam is a no-op when no active exam', () => {
    useAppStore.getState().clearActiveExam();
    useAppStore.getState().updateActiveExam({ currentIdx: 99 });
    expect(useAppStore.getState().activeExam).toBeNull();
  });
});
