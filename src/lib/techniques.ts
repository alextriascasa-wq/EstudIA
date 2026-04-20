export interface Technique {
  nm: string;
  ico: string;
  rat: 'Alta' | 'Mod-Alta' | 'Recuperació';
  bg: string;
  col: string;
  sum: string;
  steps: readonly string[];
}

/** 5 science-backed study techniques — verbatim from Pro. */
export const TECHNIQUES: readonly Technique[] = [
  {
    nm: 'Recuperació Activa',
    ico: '🧠',
    rat: 'Alta',
    bg: 'var(--al)',
    col: 'var(--a)',
    sum: '3 recuperacions correctes per sessió.',
    steps: [
      'Llegeix 15-20 min',
      'Tanca apunts',
      'Escriu TOT el que recordis',
      'Compara i marca errors',
      'Repeteix fins 3 encerts',
      'Programa repàs SRS',
    ],
  },
  {
    nm: 'Repetició Espaïada',
    ico: '🔄',
    rat: 'Alta',
    bg: 'var(--pl)',
    col: 'var(--p)',
    sum: 'Intervals creixents: 1h × 5 dies > 5h × 1 dia.',
    steps: [
      'Dia 0: Estudi + 3 recuperacions',
      'Dia 2: Primer repàs',
      'Dia 7: Segon repàs',
      'Dia 21: Tercer repàs',
      'Dia 45+: Manteniment',
      "Usa Flashcards de l'app",
    ],
  },
  {
    nm: 'Tècnica Feynman',
    ico: '💡',
    rat: 'Alta',
    bg: 'var(--wl)',
    col: 'var(--w)',
    sum: '+34% rendiment analític.',
    steps: [
      'Escriu el concepte',
      'Explica amb paraules simples',
      'Identifica buits',
      'Omple buits',
      'Simplifica amb analogies',
      'Repeteix fins fluïdesa',
    ],
  },
  {
    nm: 'Pràctica Intercalada',
    ico: '⚡',
    rat: 'Mod-Alta',
    bg: 'var(--okl)',
    col: 'var(--ok)',
    sum: 'Barreja problemes. Mode Caos.',
    steps: [
      'Selecciona 3-4 temes',
      'Barreja en ordre aleatori',
      'NO miris apunts',
      'Identifica errors',
      'Augmenta similitud',
      'Ideal per STEM',
    ],
  },
  {
    nm: 'NSDR',
    ico: '🌙',
    rat: 'Recuperació',
    bg: 'var(--il)',
    col: 'var(--i)',
    sum: '+65% dopamina.',
    steps: [
      "Estira't, tanca ulls",
      'Respiracions diafragmàtiques',
      'Escaneja cos',
      'Consciència 10-20 min',
      'Ones theta',
      'Obre ulls lentament',
    ],
  },
];
