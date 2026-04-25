import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { JSX, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { xpInLevel } from '@/lib/xp';
import { useTheme } from '@/hooks/useTheme';
import { showToast } from '@/components/ui/Toast';
import { LOCALE_META, SUPPORTED_LOCALES, setLocale, type Locale } from '@/i18n';
import {
  getInstallPrompt,
  onInstallPromptChange,
  triggerInstall,
  isIOSSafari,
  isOnline,
  onConnectivityChange,
} from '@/lib/pwa';
import type { AppState, Tab } from '@/types';

type IconProps = SVGProps<SVGSVGElement>;

const Icon = {
  Dashboard: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Timer: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Cards: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Feynman: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),

  Languages: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Sounds: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  Recovery: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Exams: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Stats: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Techniques: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Social: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  Cloud: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...p}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  ),
};

interface NavItem {
  tab: Tab;
  icon: (p: IconProps) => JSX.Element;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { tab: 'dashboard', icon: Icon.Dashboard },
  { tab: 'timer', icon: Icon.Timer },
  { tab: 'cards', icon: Icon.Cards },
  { tab: 'exams', icon: Icon.Exams },
];

const SECONDARY_NAV: readonly NavItem[] = [
  { tab: 'stats', icon: Icon.Stats },
  { tab: 'feynman', icon: Icon.Feynman },
  { tab: 'techniques', icon: Icon.Techniques },
  { tab: 'languages', icon: Icon.Languages },
  { tab: 'sounds', icon: Icon.Sounds },
  { tab: 'recovery', icon: Icon.Recovery },
  { tab: 'social', icon: Icon.Social },
  { tab: 'cloud', icon: Icon.Cloud },
];

export function Sidebar(): JSX.Element {
  const level = useAppStore((s) => s.level);
  const totalXp = useAppStore((s) => s.totalXp);
  const streak = useAppStore((s) => s.streak);
  const setState = useAppStore((s) => s.setState);
  const { theme, toggle } = useTheme();
  const { t, i18n } = useTranslation();

  const { cur, need } = xpInLevel({ level, totalXp });
  const pct = Math.min(100, (cur / Math.max(need, 1)) * 100);

  // PWA install prompt
  const [canInstall, setCanInstall] = useState(!!getInstallPrompt());
  const [showIOSHint, setShowIOSHint] = useState(false);
  useEffect(() => onInstallPromptChange(() => setCanInstall(!!getInstallPrompt())), []);

  // Online / Offline
  const [online, setOnline] = useState(isOnline());
  useEffect(() => onConnectivityChange(setOnline), []);

  const onExport = (): void => {
    const s = useAppStore.getState();
    const data = {
      todaySess: s.todaySess,
      totalMin: s.totalMin,
      streak: s.streak,
      lastDate: s.lastDate,
      pomCount: s.pomCount,
      weekly: s.weekly,
      exams: s.exams,
      decks: s.decks,
      doneTasks: s.doneTasks,
      zNote: s.zNote,
      feynmanHistory: s.feynmanHistory,
      memStrength: s.memStrength,
      quizTotal: s.quizTotal,
      quizCorrect: s.quizCorrect,
      cardsToday: s.cardsToday,
      xp: s.xp,
      level: s.level,
      totalXp: s.totalXp,
      achievements: s.achievements,
      heatmap: s.heatmap,
      langDecks: s.langDecks,
      soundPrefs: s.soundPrefs,
      dailyLog: s.dailyLog,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `estudia-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = (ev: React.ChangeEvent<HTMLInputElement>): void => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e): void => {
      try {
        const parsed = JSON.parse(String(e.target?.result ?? '')) as Partial<AppState>;
        setState({ ...useAppStore.getState(), ...parsed } as AppState);
        showToast({ title: `✅ ${t('common.import')}`, desc: t('common.importSuccess') });
      } catch {
        showToast({ title: '❌ Error', desc: t('common.invalidFile') });
      }
    };
    r.readAsText(f);
    ev.target.value = '';
  };

  const currentLocale = (i18n.resolvedLanguage as Locale) ?? 'ca';

  return (
    <nav className="sb">
      <div className="sb-brand">
        <h1 className="brand-logo">Estud<strong>IA</strong></h1>
        <p>{t('brand.tagline')}</p>
      </div>
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.tab}
          to={`/${item.tab === 'dashboard' ? '' : item.tab}`}
          className={({ isActive }) => `nb${isActive ? ' on' : ''}`}
          end={item.tab === 'dashboard'}
        >
          <item.icon />
          <span>{t(`nav.${item.tab}`)}</span>
          {['cards', 'exams'].includes(item.tab) && (
            <span className="ai-badge">IA</span>
          )}
        </NavLink>
      ))}

      <div className="nb-section">{t('sidebar.moreTools')}</div>

      {SECONDARY_NAV.map((item) => (
        <NavLink
          key={item.tab}
          to={`/${item.tab === 'dashboard' ? '' : item.tab}`}
          className={({ isActive }) => `nb${isActive ? ' on' : ''}`}
          end={item.tab === 'dashboard'}
        >
          <item.icon />
          <span>{t(`nav.${item.tab}`)}</span>
          {['feynman'].includes(item.tab) && (
            <span className="ai-badge">IA</span>
          )}
        </NavLink>
      ))}
      <div className="sb-ft">
        <div className="row">
          <span className="k">{t('sidebar.level')}</span>
          <span className="v">{level}</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="row">
          <span className="k">{t('sidebar.xpOf', { cur, need })}</span>
          <span className="v">{t('sidebar.streak', { days: streak })}</span>
        </div>
        <div className="row">
          <span className="k">{t('sidebar.language')}</span>
          <div className="sb-locale">
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                className="sb-locale-btn"
                onClick={() => setLocale(loc)}
                title={LOCALE_META[loc].name}
                aria-pressed={currentLocale === loc}
              >
                {LOCALE_META[loc].flag}
              </button>
            ))}
          </div>
        </div>
        {/* Connectivity indicator */}
        <div className="row">
          <span className="k conn-row">
            <span className={`conn-dot${online ? '' : ' off'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* PWA Install banner */}
        {canInstall && (
          <button
            className="install-banner"
            onClick={async () => {
              const ok = await triggerInstall();
              if (ok) setCanInstall(false);
            }}
          >
            📲 {t('sidebar.install')}
          </button>
        )}
        {!canInstall && isIOSSafari() && (
          <button
            className="install-banner ios"
            onClick={() => setShowIOSHint((p) => !p)}
          >
            📲 {t('sidebar.installIOS')}
          </button>
        )}
        {showIOSHint && (
          <div className="ios-hint">
            {t('sidebar.installIOSSteps')}
          </div>
        )}

        <div className="sb-tools">
          <button onClick={toggle} aria-label={t('sidebar.themeToggle')}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={onExport} aria-label={t('sidebar.export')}>
            💾
          </button>
          <label aria-label={t('sidebar.import')}>
            📂
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={onImport}
            />
          </label>
        </div>
      </div>
    </nav>
  );
}
