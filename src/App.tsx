import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { ToastHost } from '@/components/ui/Toast';
import { XPPopupHost } from '@/components/ui/XPPopup';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Timer } from '@/features/timer/Timer';
import { Flashcards } from '@/features/flashcards/Flashcards';
import { Feynman } from '@/features/feynman/Feynman';
import { Languages } from '@/features/languages/Languages';
import { Sounds } from '@/features/sounds/Sounds';
import { Recovery } from '@/features/recovery/Recovery';
import { Exams } from '@/features/exams/Exams';
import { Stats } from '@/features/stats/Stats';
import { Techniques } from '@/features/techniques/Techniques';
import { Social } from '@/features/social/Social';
import { OnboardingModal } from '@/components/ui/OnboardingModal';
import { useAppStore } from '@/store/useAppStore';

export default function App(): JSX.Element {
  const rolloverIfNeeded = useAppStore((s) => s.rolloverIfNeeded);
  const checkAchievements = useAppStore((s) => s.checkAchievements);
  const save = useAppStore((s) => s.save);

  useEffect(() => {
    rolloverIfNeeded();
    save();
    const t = window.setTimeout(() => checkAchievements(), 500);
    return () => window.clearTimeout(t);
  }, [rolloverIfNeeded, save, checkAchievements]);

  return (
    <>
      <OnboardingModal />
      <Sidebar />
      <main className="mn">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timer" element={<Timer />} />
          <Route path="/cards" element={<Flashcards />} />
          <Route path="/feynman" element={<Feynman />} />
          <Route path="/languages" element={<Languages />} />
          <Route path="/sounds" element={<Sounds />} />
          <Route path="/recovery" element={<Recovery />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/social" element={<Social />} />
          <Route path="/techniques" element={<Techniques />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastHost />
      <XPPopupHost />
    </>
  );
}
