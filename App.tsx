
import React, { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import AppShell from './layouts/AppShell';
import Dashboard from './views/Dashboard';
import Discover from './views/Discover';
import CreateDAO from './views/CreateDAO';
import KYCVerification from './views/KYCVerification';
import InvestmentListing from './views/InvestmentListing';
import VotingInterface from './views/VotingInterface';
import WalletView from './views/Wallet';
import YieldsView from './views/Yields';
import MessagesView from './views/Messages';
import ProfileView from './views/Profile';
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";
import { ToastContainer } from 'react-toastify';
import { notifyWarning } from './utils/toast';
import { BACKEND_URL } from './utils/backendUrl';
import { getCanonicalWalletAddress } from './utils/walletResolution';

export type ViewState = 'landing' | 'dashboard' | 'my-daos' | 'discover' | 'investments' | 'messages' | 'profile' | 'create-dao' | 'kyc' | 'vote-proposal' | 'wallet' | 'yields';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [hasShownSplashLongEnough, setHasShownSplashLongEnough] = useState(false);

  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setHasShownSplashLongEnough(true);
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  // Reset membership check on logout, and set initial view on login
  useEffect(() => {
    if (!authenticated) {
      setView('landing');
    }
  }, [authenticated]);

  // Register / upsert the user in the backend on every login so wallet, email,
  // and Privy user ID stay in sync even if the user never visits their profile.
  useEffect(() => {
    if (!authenticated || !user) return;
    const walletAddress = getCanonicalWalletAddress(user, wallets);
    if (!walletAddress) return;
    const email = user.email?.address?.toLowerCase() ?? undefined;
    fetch(`${BACKEND_URL}/api/auth/sync-identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, email, privyUserId: user.id }),
    }).catch(() => { /* non-critical — app works without backend */ });
  }, [authenticated, user, wallets]);

  useEffect(() => {
    const isDynamicImportFailure = (reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason ?? '');
      const lower = message.toLowerCase();
      return (
        lower.includes('failed to fetch dynamically imported module') ||
        lower.includes('dynamically imported module') ||
        lower.includes('importing a module script failed')
      );
    };

    const handleImportFailure = (reason: unknown) => {
      if (!isDynamicImportFailure(reason)) return;
      const key = 'civicvault_dynamic_import_reloaded_once';
      const hasReloaded = typeof window !== 'undefined' && sessionStorage.getItem(key) === '1';
      if (!hasReloaded && typeof window !== 'undefined') {
        sessionStorage.setItem(key, '1');
        notifyWarning('App updated. Reloading to sync latest files...');
        setTimeout(() => {
          window.location.reload();
        }, 300);
        return;
      }
      notifyWarning('App files are out of sync. Please hard refresh (Ctrl/Cmd + Shift + R).');
    };

    const onError = (event: ErrorEvent) => {
      handleImportFailure(event.error ?? event.message);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleImportFailure(event.reason);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  const handleVote = (id: string) => {
    setSelectedProposalId(id);
    setView('vote-proposal');
  };
  

  if (!ready || !hasShownSplashLongEnough) {
    return (
      <>
        <div className="w-full min-h-screen flex items-center justify-center bg-[#0e1117]">
          <KineticTextLoader
            text="CivicVault"
            className="[&_p]:!text-white [&_.rounded-full]:!bg-emerald-400"
          />
        </div>
        <ToastContainer position="top-right" newestOnTop theme="colored" />
      </>
    );
  }

  if (!authenticated) {
    return (
      <>
        <LandingPage
          onViewChange={() => setView('dashboard')}
          onLogin={() => { login(); setView('dashboard'); }}
          isAuthenticated={false}
        />
        <ToastContainer position="top-right" newestOnTop theme="colored" />
      </>
    );
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage onViewChange={setView} onLogin={() => setView('dashboard')} isAuthenticated />
        <ToastContainer position="top-right" newestOnTop theme="colored" />
      </>
    );
  }

  return (
    <>
      <AppShell currentView={view} onViewChange={setView} user={user} onLogout={logout}>
        {view === 'dashboard'     && <Dashboard onViewChange={setView} onVote={handleVote} user={user} />}
        {view === 'discover'      && <Discover />}
        {view === 'my-daos'       && <Discover />}
        {view === 'create-dao'    && <CreateDAO onComplete={() => setView('dashboard')} />}
        {view === 'kyc'           && <KYCVerification onComplete={() => setView('dashboard')} />}
        {view === 'investments'   && <InvestmentListing onVote={handleVote} />}
        {view === 'vote-proposal' && <VotingInterface proposalId={selectedProposalId} onBack={() => setView('dashboard')} />}
        {view === 'wallet'        && <WalletView user={user} />}
        {view === 'yields'        && <YieldsView />}
        {view === 'messages'      && <MessagesView />}
        {view === 'profile'       && <ProfileView />}
      </AppShell>
      <ToastContainer position="top-right" newestOnTop theme="colored" />
    </>
  );
};

export default App;
