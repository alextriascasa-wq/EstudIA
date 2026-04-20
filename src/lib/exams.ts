import type { AppState, StudyTask } from '@/types';
import { daysUntil, today } from './date';

/**
 * Generate spaced study tasks — 1:1 with Pro `genStudyTasks`.
 * Difficulty → offset days: difícil [0,1,2,4,7,14], mitjà [0,1,3,7,14], fàcil [0,2,5,12].
 */
export function genStudyTasks(exams: AppState['exams']): StudyTask[] {
  const tasks: StudyTask[] = [];
  const td = today();
  exams.forEach((ex) => {
    if (daysUntil(ex.date) < 0) return;
    const iv =
      ex.difficulty === 'difícil'
        ? [0, 1, 2, 4, 7, 14]
        : ex.difficulty === 'mitjà'
          ? [0, 1, 3, 7, 14]
          : [0, 2, 5, 12];
    iv.forEach((i) => {
      const sd = new Date(`${ex.date}T12:00:00`);
      sd.setDate(sd.getDate() - i);
      const ss = sd.toISOString().split('T')[0]!;
      if (ss >= td) {
        const session =
          i === 0
            ? 'Repàs final + simulacre'
            : i <= 2
              ? 'Recuperació activa intensiva (Regla del 3)'
              : i <= 7
                ? 'Pràctica intercalada + Feynman'
                : 'Primera passada + Interrogació elaborativa';
        tasks.push({
          id: `${ex.id}-${i}`,
          examName: ex.name,
          subject: ex.subject,
          date: ss,
          session,
          daysBefore: i,
        });
      }
    });
  });
  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}
