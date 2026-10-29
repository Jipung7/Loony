import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DynamicIsland } from './components/DynamicIsland';
import { FullDashboard } from './components/FullDashboard';
import { MobileCompanion } from './components/MobileCompanion';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';

const AppShell: React.FC = () => {
  const { settings, isStateHydrated } = useApp();
  const isMobileBrowser =
    typeof navigator !== 'undefined' && /Android|Mobile/i.test(navigator.userAgent);

  if (isMobileBrowser) {
    return <MobileCompanion />;
  }

  // Tunggu data lokal selesai dimuat agar pengguna lama tidak melihat kilasan onboarding
  if (!isStateHydrated) return null;

  // Pengguna baru: kapsul & jendela belum dimulai sampai menekan Mulai / Lewati
  if (settings.hasCompletedOnboarding === false) {
    return (
      <div className="min-h-screen w-full bg-transparent relative overflow-hidden">
        <WelcomeOnboarding />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-transparent relative overflow-hidden pointer-events-none">
      <DynamicIsland />
      <FullDashboard />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
};

export default App;
