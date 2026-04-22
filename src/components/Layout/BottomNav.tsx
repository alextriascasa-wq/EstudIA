import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Timer, 
  Library, 
  MessageSquare, 
  Cloud 
} from 'lucide-react';

export function BottomNav() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const loc = useLocation();

  const tabs = [
    { id: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { id: '/timer', icon: Timer, label: t('nav.timer') },
    { id: '/cards', icon: Library, label: t('nav.cards') },
    { id: '/feynman', icon: MessageSquare, label: t('nav.feynman') },
    { id: '/cloud', icon: Cloud, label: t('nav.cloud') },
  ];

  return (
    <nav className="bn">
      {tabs.map((tab) => {
        const isOn = loc.pathname === tab.id;
        return (
          <button
            key={tab.id}
            className={`bn-item ${isOn ? 'on' : ''}`}
            onClick={() => nav(tab.id)}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
