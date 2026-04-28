import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn,
  LogOut,
  Cloud,
  Settings as SettingsIcon,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { signOut } from '@/lib/supabase';
import { AuthModal } from '@/components/ui/AuthModal';
import { showToast } from '@/components/ui/Toast';

const NAV_TITLE_KEYS: Record<string, string> = {
  '/': 'nav.dashboard',
  '/timer': 'nav.timer',
  '/cards': 'nav.cards',
  '/feynman': 'nav.feynman',
  '/languages': 'nav.languages',
  '/exams': 'nav.exams',
  '/stats': 'nav.stats',
  '/social': 'nav.social',
  '/cloud': 'nav.cloud',
  '/sounds': 'nav.sounds',
  '/recovery': 'nav.recovery',
  '/techniques': 'nav.techniques',
};

function initialsFromEmail(email: string | null | undefined): string {
  if (!email) return '··';
  const before = email.split('@')[0] ?? '';
  const parts = before.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return before.slice(0, 2).toUpperCase();
}

export function TopBar(): JSX.Element {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();
  const user = useAppStore((s) => s.authState.user);
  const streak = useAppStore((s) => s.streak);

  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (ev: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const titleKey = NAV_TITLE_KEYS[loc.pathname] ?? 'nav.dashboard';
  const title = t(titleKey);

  const onLogout = async (): Promise<void> => {
    setMenuOpen(false);
    await signOut();
    showToast({ title: '👋', desc: t('auth.signedOut') });
  };

  const initials = initialsFromEmail(user?.email);

  return (
    <>
      <header className="tb">
        <div className="tb-left">
          <button
            className="bi tb-menu"
            aria-label="Menu"
            onClick={() => document.body.classList.toggle('sb-open')}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          <span className="tb-title">{title}</span>
        </div>

        <div className="tb-right">
          {streak > 0 && (
            <span className="badge streak tb-streak" title={t('dashboard.streakTitle')}>
              🔥 {streak}d
            </span>
          )}

          {user ? (
            <div className="tb-user-wrap" ref={menuRef}>
              <button
                className="tb-avatar"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={user.email ?? 'Account'}
                aria-expanded={menuOpen}
              >
                <span>{initials}</span>
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="tb-menu-pop c"
                    initial={{ opacity: 0, scale: 0.96, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="tb-menu-hdr">
                      <div className="tb-avatar tb-avatar-lg">
                        <span>{initials}</span>
                      </div>
                      <div className="tb-menu-id">
                        <div className="tb-menu-name">{user.email}</div>
                        <div className="body-s muted">{t('auth.signedIn')}</div>
                      </div>
                    </div>
                    <button
                      className="tb-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        nav('/cloud');
                      }}
                    >
                      <Cloud size={16} strokeWidth={1.75} />
                      <span>{t('nav.cloud')}</span>
                    </button>
                    <button
                      className="tb-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        nav('/social');
                      }}
                    >
                      <UserIcon size={16} strokeWidth={1.75} />
                      <span>{t('auth.profile')}</span>
                    </button>
                    <button
                      className="tb-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        nav('/cloud');
                      }}
                    >
                      <SettingsIcon size={16} strokeWidth={1.75} />
                      <span>{t('auth.settings')}</span>
                    </button>
                    <div className="tb-menu-sep" />
                    <button className="tb-menu-item danger" onClick={onLogout}>
                      <LogOut size={16} strokeWidth={1.75} />
                      <span>{t('auth.signOut')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button className="bp tb-signin" onClick={() => setAuthOpen(true)}>
              <LogIn size={16} strokeWidth={1.75} />
              <span>{t('auth.signIn')}</span>
            </button>
          )}
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
