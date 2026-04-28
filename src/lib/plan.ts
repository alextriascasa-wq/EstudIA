import type {
  StudyProfile,
  StudyPlan,
  ModuleRecommendation,
  DailyBlock,
  PlanMilestone,
  RecommendedModule,
} from '@/types';

const PRIORITY_ORDER = { essential: 0, recommended: 1, optional: 2 } as const;

function pickModulesByObstacle(p: StudyProfile): ModuleRecommendation[] {
  const out: ModuleRecommendation[] = [];
  switch (p.obstacle) {
    case 'memory':
      out.push({ module: 'cards', priority: 'essential', reasonKey: 'plan.reasons.cardsMemory' });
      out.push({
        module: 'feynman',
        priority: 'recommended',
        reasonKey: 'plan.reasons.feynmanMemory',
      });
      break;
    case 'comprehension':
      out.push({ module: 'feynman', priority: 'essential', reasonKey: 'plan.reasons.feynmanComp' });
      out.push({ module: 'cards', priority: 'recommended', reasonKey: 'plan.reasons.cardsComp' });
      break;
    case 'focus':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerFocus' });
      out.push({
        module: 'sounds',
        priority: 'recommended',
        reasonKey: 'plan.reasons.soundsFocus',
      });
      break;
    case 'time':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerTime' });
      out.push({ module: 'cards', priority: 'recommended', reasonKey: 'plan.reasons.cardsTime' });
      break;
    case 'motivation':
      out.push({ module: 'timer', priority: 'essential', reasonKey: 'plan.reasons.timerMotiv' });
      out.push({
        module: 'recovery',
        priority: 'recommended',
        reasonKey: 'plan.reasons.recoveryMotiv',
      });
      break;
  }
  return out;
}

function buildModules(p: StudyProfile): ModuleRecommendation[] {
  if (p.goal === 'language') {
    const obstacleMods = pickModulesByObstacle(p).map((m) => ({
      ...m,
      priority: 'optional' as const,
    }));
    return [
      { module: 'languages', priority: 'essential', reasonKey: 'plan.reasons.languagesGoal' },
      ...obstacleMods,
    ];
  }

  const mods = pickModulesByObstacle(p);

  if (p.goal === 'exam' || p.goal === 'cert' || p.goal === 'university') {
    if (!mods.some((m) => m.module === 'exams')) {
      mods.push({ module: 'exams', priority: 'recommended', reasonKey: 'plan.reasons.examsGoal' });
    }
  }

  return mods.slice().sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function buildDailyTemplate(modules: ModuleRecommendation[], dailyMinutes: number): DailyBlock[] {
  const essentials = modules.filter((m) => m.priority === 'essential');
  const recommended = modules.filter((m) => m.priority === 'recommended');

  const picks: RecommendedModule[] = [];
  essentials.forEach((m) => picks.push(m.module));
  recommended.forEach((m) => {
    if (picks.length < 3 && !picks.includes(m.module)) picks.push(m.module);
  });
  if (picks.length === 0) picks.push('cards');

  const blocks: DailyBlock[] = [];
  if (picks.length === 1) {
    blocks.push({ order: 1, module: picks[0]!, minutes: dailyMinutes });
  } else if (picks.length === 2) {
    const firstMin = Math.round(dailyMinutes * 0.6);
    blocks.push({ order: 1, module: picks[0]!, minutes: firstMin });
    blocks.push({ order: 2, module: picks[1]!, minutes: dailyMinutes - firstMin });
  } else {
    const firstMin = Math.round(dailyMinutes * 0.5);
    const secondMin = Math.round(dailyMinutes * 0.3);
    const thirdMin = dailyMinutes - firstMin - secondMin;
    blocks.push({ order: 1, module: picks[0]!, minutes: firstMin });
    blocks.push({ order: 2, module: picks[1]!, minutes: secondMin });
    blocks.push({ order: 3, module: picks[2]!, minutes: thirdMin });
  }
  return blocks;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

function buildMilestones(p: StudyProfile): PlanMilestone[] {
  const today = new Date().toISOString().split('T')[0]!;
  const list: PlanMilestone[] = [
    {
      whenISO: addDays(today, 7),
      goalKey: 'plan.milestones.week1Cards',
      metric: 'cards_reviewed',
      target: 50,
    },
    {
      whenISO: addDays(today, 30),
      goalKey: 'plan.milestones.month1Streak',
      metric: 'streak_days',
      target: 14,
    },
  ];

  if (p.examDate) {
    list.push({
      whenISO: p.examDate,
      goalKey: 'plan.milestones.examDay',
      metric: 'exam_score',
      target: 80,
    });
    const examMs = new Date(p.examDate).getTime();
    const todayMs = new Date(today).getTime();
    if (examMs > todayMs) {
      const midISO = new Date((examMs + todayMs) / 2).toISOString().split('T')[0]!;
      list.push({
        whenISO: midISO,
        goalKey: 'plan.milestones.examMid',
        metric: 'feynman_sessions',
        target: 5,
      });
    }
  }

  return list.sort((a, b) => a.whenISO.localeCompare(b.whenISO));
}

export function buildPlan(p: StudyProfile): StudyPlan {
  const modules = buildModules(p);
  return {
    weeklyMinutes: p.dailyMinutes * 7,
    modules,
    dailyTemplate: buildDailyTemplate(modules, p.dailyMinutes),
    milestones: buildMilestones(p),
  };
}
