
import React, { useEffect, useMemo, useState } from 'react';
import {
  Compass, MessageSquare, User, Bell, LayoutDashboard,
  Globe, Wallet, House, LogOut, Coins, ArrowLeft,
  Leaf, UserPlus, Plus, LayoutGrid,
} from 'lucide-react';
import type { ViewState } from '../App';
import { useWallets, type User as PrivyUser } from '@privy-io/react-auth';
import { getChainName } from '../utils/chainUtils';
import { fetchActiveDaos, fetchAllInvestments, fetchYieldRows, formatUsdcAmount, type OnchainDao } from '../utils/civicVaultContracts';
import {
  loadDaoChatMessages,
  subscribeDaoChat,
  MESSAGES_NAV_DAO_STORAGE_KEY,
} from '../utils/daoChat';
import { Button, Modal } from '../components/UI';
import { APP_CHAIN_NAME } from '../utils/contract';
import { UserAvatar } from '../components/UserAvatar';
import {
  PROFILE_AVATAR_CHANGED_EVENT,
  getStoredProfileAvatarUrl,
  profileAvatarStorageKey,
} from '../utils/profileAvatar';
import {
  formatWalletEncapsulated,
  getAccountDisplayName,
  getAccountInitial,
} from '../utils/userDisplay';

interface AppShellProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  user: PrivyUser | null;
  onLogout: () => void;
}

const PAGE_TITLES: Record<ViewState, string> = {
  dashboard: 'Dashboard',
  discover: 'Discover DAOs',
  investments: 'Neighborhoods',
  messages: 'Messages',
  profile: 'Profile',
  wallet: 'My Wallet',
  yields: 'Yields',
  kyc: 'KYC & Admin',
  'create-dao': 'Create DAO',
  'vote-proposal': 'Vote on Proposal',
  landing: 'CivicVault',
  'my-daos': 'My DAOs',
};

const AppShell: React.FC<AppShellProps> = ({ children, currentView, onViewChange, user, onLogout }) => {
  const { wallets } = useWallets();
  const connectedEthWallet = (
    wallets.find((w) => w.type === 'ethereum' && w.walletClientType !== 'privy') ||
    wallets.find((w) => w.type === 'ethereum')
  ) as { address?: string; chainId?: string } | undefined;

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trackedDaoAddresses, setTrackedDaoAddresses] = useState<string[]>([]);

  type BellNotification = {
    id: string;
    title: string;
    subtitle: string;
    view: ViewState;
    daoAddress?: string;
  };
  const [notifications, setNotifications] = useState<BellNotification[]>([]);

  const LAST_SEEN_KEY = 'civicvault_chat_last_seen_by_room';

  const readLastSeen = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
  };

  const writeLastSeen = (value: Record<string, number>) => {
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(value));
  };

  const ethWallet = user?.linkedAccounts?.find(
    (account) => account.type === 'wallet' && 'chainType' in account && account.chainType === 'ethereum'
  ) as { chainId?: string; address?: string } | undefined;
  const walletAddress = (connectedEthWallet?.address || ethWallet?.address) as `0x${string}` | undefined;
  const accountDisplayName = useMemo(() => getAccountDisplayName(user, walletAddress ?? ''), [user, walletAddress]);
  const accountInitial = useMemo(() => getAccountInitial(accountDisplayName, user?.email?.address), [accountDisplayName, user?.email?.address]);

  const rawChainName = connectedEthWallet?.chainId ? getChainName(connectedEthWallet.chainId) : getChainName(ethWallet?.chainId);
  const isWalletConnected = Boolean(walletAddress);
  const effectiveChainName = isWalletConnected && rawChainName === 'Not Connected' ? APP_CHAIN_NAME : rawChainName;
  const connectionLabel = isWalletConnected ? `Connected · ${effectiveChainName}` : 'Not Connected';

  const refreshUnread = async () => {
    try {
      const daos = await fetchActiveDaos();
      const daoAddresses = daos.map((dao) => dao.address.toLowerCase());
      setTrackedDaoAddresses(daoAddresses);
      const lastSeen = readLastSeen();
      const messageSets = await Promise.all(daoAddresses.map((address) => loadDaoChatMessages(address, 300)));
      const self = walletAddress?.toLowerCase() ?? '';
      let total = 0;
      daoAddresses.forEach((address, idx) => {
        const seenAt = lastSeen[address] ?? 0;
        total += messageSets[idx].filter((msg) => msg.createdAt > seenAt && self && msg.senderWallet.toLowerCase() !== self).length;
      });
      setUnreadCount(total);
    } catch { setUnreadCount(0); }
  };

  const markAllChatAsRead = async () => {
    try {
      const daos = await fetchActiveDaos();
      const daoAddresses = daos.map((dao) => dao.address.toLowerCase());
      const messagesByDao = await Promise.all(daoAddresses.map((address) => loadDaoChatMessages(address, 300)));
      const lastSeen = readLastSeen();
      daoAddresses.forEach((address, idx) => {
        const lastMessage = messagesByDao[idx][messagesByDao[idx].length - 1];
        lastSeen[address] = lastMessage?.createdAt ?? Date.now();
      });
      writeLastSeen(lastSeen);
      setUnreadCount(0);
    } catch { /* no-op */ }
  };

  const refreshNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const [investments, yields, daos] = await Promise.all([
        fetchAllInvestments(),
        fetchYieldRows(walletAddress as `0x${string}` | undefined),
        fetchActiveDaos(),
      ]);
      const lastSeenMap = readLastSeen();
      const self = walletAddress?.toLowerCase() ?? '';
      const chatRows: Array<BellNotification & { _ts: number }> = [];
      for (const dao of daos) {
        if (!self) break;
        const addr = dao.address.toLowerCase();
        const msgs = await loadDaoChatMessages(addr, 150);
        const seen = lastSeenMap[addr] ?? 0;
        const incoming = msgs.filter((m) => m.createdAt > seen && m.senderWallet.toLowerCase() !== self);
        if (incoming.length === 0) continue;
        const latest = incoming[incoming.length - 1]!;
        const textPreview = latest.content.trim().slice(0, 72) + (latest.content.trim().length > 72 ? '…' : '');
        const preview = latest.attachmentUrl?.trim() ? (textPreview ? `📷 ${textPreview}` : '📷 Photo shared') : textPreview || 'New message';
        chatRows.push({
          id: `chat-${addr}-${latest.id}`,
          title: `Messages · ${dao.name}`,
          subtitle: incoming.length > 1 ? `${incoming.length} new · ${preview}` : `${latest.senderLabel}: ${preview}`,
          view: 'messages',
          daoAddress: dao.address,
          _ts: latest.createdAt,
        });
      }
      chatRows.sort((a, b) => b._ts - a._ts);
      const chatItems: BellNotification[] = chatRows.map(({ _ts: _t, ...rest }) => rest);
      const investmentItems = investments.filter((item) => item.status === 0).slice(0, 4).map((item) => ({
        id: `proposal-${item.daoAddress}-${item.id}`,
        title: `Vote needed: ${item.name}`,
        subtitle: `${item.daoName}`,
        view: 'investments' as ViewState,
      }));
      const yieldItems = yields.filter((item) => item.claimable > 0n).slice(0, 4).map((item) => ({
        id: `yield-${item.daoAddress}-${item.investmentId}`,
        title: `Claim available: ${item.investmentName}`,
        subtitle: `${item.daoName} · ${formatUsdcAmount(item.claimable)} claimable`,
        view: 'yields' as ViewState,
      }));
      setNotifications([...chatItems, ...investmentItems, ...yieldItems]);
    } catch { setNotifications([]); } finally { setNotificationsLoading(false); }
  };

  useEffect(() => { void refreshUnread(); }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) { setProfileAvatarUrl(null); return; }
    setProfileAvatarUrl(getStoredProfileAvatarUrl(walletAddress));
    const onAvatarEvent = (ev: Event) => {
      const w = (ev as CustomEvent<{ wallet?: string }>).detail?.wallet;
      if (w && walletAddress && w === walletAddress.toLowerCase()) setProfileAvatarUrl(getStoredProfileAvatarUrl(walletAddress));
    };
    const onStorage = (e: StorageEvent) => {
      if (!walletAddress || e.key !== profileAvatarStorageKey(walletAddress)) return;
      setProfileAvatarUrl(getStoredProfileAvatarUrl(walletAddress));
    };
    window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, onAvatarEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, onAvatarEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, [walletAddress]);

  useEffect(() => {
    if (isNotificationsOpen) void refreshNotifications();
  }, [isNotificationsOpen, walletAddress]);

  useEffect(() => {
    if (currentView === 'messages') void markAllChatAsRead();
    else void refreshUnread();
  }, [currentView]);

  useEffect(() => {
    if (trackedDaoAddresses.length === 0) return;
    const unsubs = trackedDaoAddresses.map((address) =>
      subscribeDaoChat(address, () => {
        if (currentView === 'messages') void markAllChatAsRead();
        else void refreshUnread();
      }),
    );
    return () => { unsubs.forEach((unsub) => unsub()); };
  }, [trackedDaoAddresses, currentView]);

  const primaryNavItems = useMemo(() => [
    { id: 'dashboard' as ViewState, label: 'Home', icon: LayoutDashboard },
    { id: 'discover' as ViewState, label: 'Explore', icon: Compass },
    { id: 'investments' as ViewState, label: 'Hoods', icon: House },
    { id: 'messages' as ViewState, label: 'Chat', icon: MessageSquare, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'profile' as ViewState, label: 'Profile', icon: User },
  ], [unreadCount]);

  const moreNavItems = [
    { id: 'wallet' as ViewState, label: 'My Wallet', icon: Wallet },
    { id: 'yields' as ViewState, label: 'Yields', icon: Coins },
    { id: 'kyc' as ViewState, label: 'KYC / Admin', icon: UserPlus },
  ];

  const navigate = (view: ViewState) => {
    onViewChange(view);
    setShowMoreSheet(false);
  };

  const hasNotifications = notifications.length > 0 || unreadCount > 0;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0e1117] flex flex-col w-full max-w-[100vw] overflow-x-clip">

      {/* ── Top Header ── */}
      <header className="shrink-0 bg-white border-b border-slate-100 sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)]">
        <div className="h-14 flex items-center justify-between px-3 sm:px-5 max-w-screen-xl mx-auto w-full gap-3">

          {/* Logo */}
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="navy-bg p-1.5 rounded-xl flex items-center justify-center">
              <Leaf className="text-white w-4 h-4" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">CivicVault</span>
          </button>

          {/* Page title — mobile only, centered */}
          <span className="absolute left-1/2 -translate-x-1/2 sm:hidden font-semibold text-sm text-slate-700 truncate max-w-[40vw] pointer-events-none">
            {PAGE_TITLES[currentView] ?? 'CivicVault'}
          </span>

          {/* Right controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Back to landing — desktop only */}
            <button
              onClick={() => onViewChange('landing')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Site
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((o) => !o)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {hasNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-full sm:right-0 mt-0 sm:mt-2 w-auto sm:w-80 max-w-[min(100vw-1.5rem,20rem)] max-h-[min(24rem,70vh)] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overscroll-contain">
                  <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">Notifications</p>
                    <button
                      onClick={() => void refreshNotifications()}
                      className="text-xs font-bold text-[#1a4731] hover:underline"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="p-2">
                    {notificationsLoading ? (
                      <p className="text-sm text-slate-500 p-3">Loading…</p>
                    ) : notifications.length === 0 ? (
                      unreadCount > 0 ? (
                        <div className="p-3">
                          <p className="text-sm text-slate-600">You have unread community messages.</p>
                          <button
                            onClick={() => { navigate('messages'); setIsNotificationsOpen(false); }}
                            className="mt-2 text-sm font-bold text-[#1a4731] hover:underline"
                          >
                            Open Messages
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 p-3">No new notifications.</p>
                      )
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.daoAddress?.trim()) sessionStorage.setItem(MESSAGES_NAV_DAO_STORAGE_KEY, item.daoAddress.trim().toLowerCase());
                            navigate(item.view);
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full text-left p-3 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{item.subtitle}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User chip — desktop */}
            <button
              onClick={() => navigate('profile')}
              className="hidden sm:flex items-center gap-2 bg-slate-50 pl-1.5 pr-3 py-1 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors max-w-[200px]"
            >
              <UserAvatar imageUrl={profileAvatarUrl} initials={accountInitial} size={26} />
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {isWalletConnected ? accountDisplayName : user?.email?.address || 'User'}
                </span>
                {walletAddress && (
                  <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">
                    {formatWalletEncapsulated(walletAddress)}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-x-clip overflow-y-auto p-3 sm:p-4 lg:p-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="max-w-screen-xl mx-auto px-1 sm:px-4">
          <div className="flex items-stretch justify-around h-16 sm:h-[4.5rem]">

            {primaryNavItems.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 flex-1 rounded-none transition-colors relative ${
                    isActive ? 'text-[#1a4731]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1a4731] rounded-full" />
                  )}

                  <div className={`relative p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#1a4731]/10' : ''}`}>
                    <Icon className="w-[1.25rem] h-[1.25rem] sm:w-[1.35rem] sm:h-[1.35rem]" />
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[1rem] h-4 px-[3px] flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none border-2 border-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  <span className={`text-[9px] sm:text-[10px] font-semibold leading-none ${isActive ? 'text-[#1a4731]' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* More button */}
            <button
              type="button"
              onClick={() => setShowMoreSheet((o) => !o)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 rounded-none transition-colors relative ${
                showMoreSheet ? 'text-[#1a4731]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {showMoreSheet && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1a4731] rounded-full" />
              )}
              <div className={`p-1.5 rounded-xl transition-all ${showMoreSheet ? 'bg-[#1a4731]/10' : ''}`}>
                <LayoutGrid className="w-[1.25rem] h-[1.25rem] sm:w-[1.35rem] sm:h-[1.35rem]" />
              </div>
              <span className={`text-[9px] sm:text-[10px] font-semibold leading-none ${showMoreSheet ? 'text-[#1a4731]' : ''}`}>
                More
              </span>
            </button>

          </div>
        </div>
      </nav>

      {/* ── More Sheet ── */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50" onClick={() => setShowMoreSheet(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '80dvh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Connection status + back link */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
              <div className={`flex items-center gap-2 text-xs font-semibold ${isWalletConnected ? 'text-[#1a4731]' : 'text-slate-400'}`}>
                <Globe className="w-3.5 h-3.5" />
                {connectionLabel}
              </div>
              <button
                onClick={() => { onViewChange('landing'); setShowMoreSheet(false); }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to site
              </button>
            </div>

            {/* Secondary nav grid */}
            <div className="p-5 grid grid-cols-3 gap-3">
              {moreNavItems.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.id)}
                    className={`flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-[#1a4731]/8 border-[#1a4731]/20 text-[#1a4731]'
                        : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-green-50 hover:border-green-100 hover:text-[#1a4731]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Create DAO CTA */}
            <div className="px-5 pb-3">
              <button
                type="button"
                onClick={() => navigate('create-dao')}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl navy-bg text-white font-bold text-sm hover:opacity-90 active:opacity-80 transition-opacity shadow-lg shadow-[#1a4731]/20"
              >
                <Plus className="w-4 h-4" />
                Create New DAO
              </button>
            </div>

            {/* Sign out */}
            <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => { setShowMoreSheet(false); setShowLogoutConfirm(true); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-600 hover:bg-red-50 active:bg-red-100 font-semibold text-sm transition-colors border border-red-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout confirm */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Sign Out"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>Sign Out</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Are you sure you want to sign out from this device?</p>
      </Modal>
    </div>
  );
};

export default AppShell;
