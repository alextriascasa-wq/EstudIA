import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Timer,
  Layers,
  Bot,
  Globe,
  Calendar,
  BarChart3,
  Users,
  Cloud,
  Music,
  Heart,
  Compass,
  Moon,
  Sun,
  Save,
  FolderInput,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
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

interface NavItem {
  tab: Tab;
  Icon: LucideIcon;
}

const PRIMARY_NAV: readonly NavItem[] = [
  { tab: 'dashboard', Icon: LayoutDashboard },
  { tab: 'timer', Icon: Timer },
  { tab: 'cards', Icon: Layers },
  { tab: 'feynman', Icon: Bot },
  { tab: 'languages', Icon: Globe },
];

const SECONDARY_NAV: readonly NavItem[] = [
  { tab: 'plan', Icon: Sparkles },
  { tab: 'exams', Icon: Calendar },
  { tab: 'stats', Icon: BarChart3 },
  { tab: 'social', Icon: Users },
  { tab: 'cloud', Icon: Cloud },
];

const TERTIARY_NAV: readonly NavItem[] = [
  { tab: 'sounds', Icon: Music },
  { tab: 'recovery', Icon: Heart },
  { tab: 'techniques', Icon: Compass },
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

  const [canInstall, setCanInstall] = useState(!!getInstallPrompt());
  const [showIOSHint, setShowIOSHint] = useState(false);
  useEffect(() => onInstallPromptChange(() => setCanInstall(!!getInstallPrompt())), []);

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

  const renderItem = (item: NavItem, showAiBadge = false): JSX.Element => (
    <NavLink
      key={item.tab}
      to={`/${item.tab === 'dashboard' ? '' : item.tab}`}
      className={({ isActive }) => `nb${isActive ? ' on' : ''}`}
      end={item.tab === 'dashboard'}
    >
      <item.Icon size={20} strokeWidth={1.75} />
      <span>{t(`nav.${item.tab}`)}</span>
      {showAiBadge && <span className="ai-badge">IA</span>}
    </NavLink>
  );

  return (
    <nav className="sb">
      <div className="sb-brand">
        <h1 className="brand-logo">
          Estud<strong>IA</strong>
        </h1>
        <p>{t('brand.tagline')}</p>
      </div>

      <div className="sb-xp">
        <div className="sb-xp-row">
          <span className="sb-level">Lv {level}</span>
          <span className="body-s muted">
            {cur}/{need}
          </span>
        </div>
        <div className="pb xp">
          <motion.div
            className="fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="sb-streak-row">
          <span className="badge streak">🔥 {streak}d</span>
          <span className="body-s muted">{totalXp.toLocaleString()} XP</span>
        </div>
      </div>

      {PRIMARY_NAV.map((item) => renderItem(item, ['cards', 'feynman'].includes(item.tab)))}

      <div className="sb-divider" />

      {SECONDARY_NAV.map((item) => renderItem(item, item.tab === 'exams'))}

      <div className="sb-divider" />

      {TERTIARY_NAV.map((item) => renderItem(item))}

      <div className="sb-ft">
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
        <div className="row">
          <span className="k conn-row">
            <span className={`conn-dot${online ? '' : ' off'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

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
          <button className="install-banner ios" onClick={() => setShowIOSHint((p) => !p)}>
            📲 {t('sidebar.installIOS')}
          </button>
        )}
        {showIOSHint && <div className="ios-hint">{t('sidebar.installIOSSteps')}</div>}

        <div className="sb-tools">
          <button onClick={toggle} aria-label={t('sidebar.themeToggle')}>
            {theme === 'dark' ? (
              <Sun size={16} strokeWidth={1.75} />
            ) : (
              <Moon size={16} strokeWidth={1.75} />
            )}
          </button>
          <button onClick={onExport} aria-label={t('sidebar.export')}>
            <Save size={16} strokeWidth={1.75} />
          </button>
          <label aria-label={t('sidebar.import')}>
            <FolderInput size={16} strokeWidth={1.75} />
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
          </label>
        </div>
      </div>
    </nav>
  );
}
