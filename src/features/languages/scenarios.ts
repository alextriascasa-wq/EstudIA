import type { Scenario } from '@/types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'cafe',
    emoji: '☕',
    titleKey: 'conv.scenarios.cafe',
    character: 'barista',
    difficulty: 'easy',
  },
  {
    id: 'shop',
    emoji: '🛒',
    titleKey: 'conv.scenarios.shop',
    character: 'shop assistant',
    difficulty: 'easy',
  },
  {
    id: 'directions',
    emoji: '🗺️',
    titleKey: 'conv.scenarios.directions',
    character: 'passerby',
    difficulty: 'easy',
  },
  {
    id: 'hotel',
    emoji: '🏨',
    titleKey: 'conv.scenarios.hotel',
    character: 'hotel receptionist',
    difficulty: 'medium',
  },
  {
    id: 'phone',
    emoji: '📞',
    titleKey: 'conv.scenarios.phone',
    character: 'person on the phone',
    difficulty: 'medium',
  },
  {
    id: 'debate',
    emoji: '🎬',
    titleKey: 'conv.scenarios.debate',
    character: 'film critic',
    difficulty: 'medium',
  },
  {
    id: 'doctor',
    emoji: '🏥',
    titleKey: 'conv.scenarios.doctor',
    character: 'doctor',
    difficulty: 'hard',
  },
  {
    id: 'job',
    emoji: '💼',
    titleKey: 'conv.scenarios.job',
    character: 'interviewer',
    difficulty: 'hard',
  },
];
