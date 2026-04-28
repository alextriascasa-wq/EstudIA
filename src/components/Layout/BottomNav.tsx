import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Timer, Layers, Calendar, BarChart3 } from 'lucide-react';

const TABS = [
  { to: '/', Icon: LayoutDashboard, k: 'dashboard' as const },
  { to: '/timer', Icon: Timer, k: 'timer' as const },
  { to: '/cards', Icon: Layers, k: 'cards' as const },
  { to: '/exams', Icon: Calendar, k: 'exams' as const },
  { to: '/stats', Icon: BarChart3, k: 'stats' as const },
];

export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav className="bn" aria-label="Primary">
      {TABS.map(({ to, Icon, k }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `bn-item${isActive ? ' on' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon size={22} strokeWidth={1.75} />
              <span>{t(`nav.${k}`)}</span>
              {isActive && <motion.span layoutId="bn-indicator" className="bn-dot" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
