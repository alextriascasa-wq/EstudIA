import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Sidebar } from '@/components/Layout/Sidebar';
import { TopBar } from '@/components/Layout/TopBar';
import { ToastHost } from '@/components/ui/Toast';
import { XPPopupHost } from '@/components/ui/XPPopup';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { BottomNav } from '@/components/Layout/BottomNav';

const Dashboard = lazy(() =>
  import('@/features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const Timer = lazy(() => import('@/features/timer/Timer').then((m) => ({ default: m.Timer })));
const Flashcards = lazy(() =>
  import('@/features/flashcards/Flashcards').then((m) => ({ default: m.Flashcards })),
);
const Feynman = lazy(() =>
  import('@/features/feynman/Feynman').then((m) => ({ default: m.Feynman })),
);
const Languages = lazy(() =>
  import('@/features/languages/Languages').then((m) => ({ default: m.Languages })),
);
const Sounds = lazy(() => import('@/features/sounds/Sounds').then((m) => ({ default: m.Sounds })));
const Recovery = lazy(() =>
  import('@/features/recovery/Recovery').then((m) => ({ default: m.Recovery })),
);
const Exams = lazy(() => import('@/features/exams/Exams').then((m) => ({ default: m.Exams })));
const Stats = lazy(() => import('@/features/stats/Stats').then((m) => ({ default: m.Stats })));
const Techniques = lazy(() =>
  import('@/features/techniques/Techniques').then((m) => ({ default: m.Techniques })),
);
const Social = lazy(() => import('@/features/social/Social').then((m) => ({ default: m.Social })));
const CloudSync = lazy(() =>
  import('@/features/cloud/CloudSync').then((m) => ({ default: m.CloudSync })),
);
const Plan = lazy(() => import('@/features/plan/Plan').then((m) => ({ default: m.Plan })));
const Profile = lazy(() =>
  import('@/features/profile/Profile').then((m) => ({ default: m.Profile })),
);
import { useAppStore } from '@/store/useAppStore';
import { useCloudSync } from '@/hooks/useCloudSync';
import { filterDueFlashcards } from '@/lib/srs';
import { updateAppBadge } from '@/lib/notifications';

export default function App(): JSX.Element {
  useCloudSync();
  const rolloverIfNeeded = useAppStore((s) => s.rolloverIfNeeded);
  const checkAchievements = useAppStore((s) => s.checkAchievements);
  const save = useAppStore((s) => s.save);
  const decks = useAppStore((s) => s.decks);

  useEffect(() => {
    let dueCount = 0;
    decks.forEach((d) => {
      dueCount += filterDueFlashcards(d.cards).length;
    });
    updateAppBadge(dueCount);
  }, [decks]);

  useEffect(() => {
    rolloverIfNeeded();
    save();
    const t = window.setTimeout(() => checkAchievements(), 500);
    return () => window.clearTimeout(t);
  }, [rolloverIfNeeded, save, checkAchievements]);

  return (
    <>
      <OnboardingWizard />
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="mn">
          <Suspense fallback={<div className="route-loading" />}>
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
              <Route path="/cloud" element={<CloudSync />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <ToastHost />
      <XPPopupHost />
      <BottomNav />
    </>
  );
}
