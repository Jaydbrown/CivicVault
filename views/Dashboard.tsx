import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, BellOff, Check, CircleDollarSign, Layers,
  Mail, MapPin, Plus, RefreshCw, Search, ShieldCheck, TrendingUp,
  Users, Zap, ArrowRight, Leaf,
} from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import type { ViewState } from '../App';
import { DeadlineChip, FundingProgress, RoleTags, StatusChip } from '../components/UI';
import type { User } from '@privy-io/react-auth';
import {
  fetchActiveDaos, fetchAllInvestments, fetchDaoUserRole, fetchYieldRows,
  formatUsdcAmount, statusLabel,
  type DaoUserRole, type OnchainDao, type OnchainInvestment, type YieldRow,
} from '../utils/civicVaultContracts';
import { formatTxError, notifyError, notifySuccess } from '../utils/toast';
import { BACKEND_URL } from '../utils/backendUrl';
import { getCanonicalWalletAddress } from '../utils/walletResolution';
import { usePrivy } from '@privy-io/react-auth';

const subscriberEmailFromUser = (user: User | null | undefined): string | undefined =>
  typeof user?.email?.address === 'string' ? user.email.address.trim() : undefined;

function timeAgo(secondsTs: number): string {
  const diff = Math.floor(Date.now() / 1000) - secondsTs;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Metric card ───────────────────────────────────────────────────────────────
const Metric: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ReactNode;
  variant?: 'forest' | 'leaf' | 'cream' | 'white';
}> = ({ label, value, sublabel, icon, variant = 'white' }) => {
  const base = 'rounded-2xl p-5 flex flex-col gap-3';
  const styles: Record<string, string> = {
    forest: `${base} bg-[#1a4731] text-white shadow-lg shadow-[#1a4731]/20`,
    leaf:   `${base} bg-[#2d7a4f] text-white shadow-lg shadow-[#2d7a4f]/20`,
    cream:  `${base} bg-[#161b27] border border-slate-700`,
    white:  `${base} bg-white border border-slate-200 shadow-sm`,
  };
  const iconWrap: Record<string, string> = {
    forest: 'bg-white/15 p-2 rounded-xl w-fit',
    leaf:   'bg-white/15 p-2 rounded-xl w-fit',
    cream:  'bg-green-100 text-[#1a4731] p-2 rounded-xl w-fit',
    white:  'bg-slate-100 text-[#2d7a4f] p-2 rounded-xl w-fit',
  };
  const valueStyle: Record<string, string> = {
    forest: 'text-2xl font-extrabold text-white',
    leaf:   'text-2xl font-extrabold text-white',
    cream:  'text-2xl font-extrabold text-white',
    white:  'text-2xl font-extrabold text-slate-900',
  };
  const labelStyle: Record<string, string> = {
    forest: 'text-xs font-medium text-white/70 uppercase tracking-wider',
    leaf:   'text-xs font-medium text-white/70 uppercase tracking-wider',
    cream:  'text-xs font-medium text-slate-400 uppercase tracking-wider',
    white:  'text-xs font-medium text-slate-500 uppercase tracking-wider',
  };
  return (
    <div className={styles[variant]}>
      <div className={iconWrap[variant]}>{icon}</div>
      <div>
        <p className={labelStyle[variant]}>{label}</p>
        <p className={valueStyle[variant]}>{value}</p>
        {sublabel && <p className="text-xs opacity-60 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
};

// ── Gmail pill ────────────────────────────────────────────────────────────────
const GmailConnectionStatus: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/preferences/${walletAddress}`)
      .then((r) => r.json())
      .then((d) => setIsConnected(!!d.gmailConnected))
      .catch(() => null);
  }, [walletAddress]);

  const connectGmail = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/auth/gmail/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });
      const { url } = await r.json();
      window.location.href = url;
    } catch {
      notifyError('Failed to connect Gmail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 border ${
          isConnected
            ? 'bg-green-50 text-[#1a4731] border-green-200'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Mail className="w-3.5 h-3.5" />
        {isConnected ? 'Gmail Connected' : 'Connect Gmail'}
        {isConnected && <Check className="w-3 h-3 text-[#2d7a4f]" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-5 z-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#2d7a4f]" /> Email Notifications
              </h4>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#1a4731] bg-green-50 p-3 rounded-xl border border-green-100">
                  <Check className="w-4 h-4 shrink-0" /> Gmail is connected
                </div>
                <button onClick={connectGmail} className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Reconnect Gmail
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Get alerts for investment proposals, yield deposits, and DAO chat.</p>
                <button
                  onClick={connectGmail}
                  disabled={loading}
                  className="w-full py-2.5 navy-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Connecting…' : 'Connect Gmail Account'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Notification bell ─────────────────────────────────────────────────────────
const DaoNotificationToggle: React.FC<{
  walletAddress: string; daoAddress: string; subscriberEmail?: string;
}> = ({ walletAddress, daoAddress, subscriberEmail }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/chat/subscriptions/${walletAddress}`)
      .then((r) => r.json())
      .then((subs: any[]) => {
        const match = subs.find((s) => s.daoAddress === daoAddress.toLowerCase());
        setSubscribed(match?.receiveNotifications ?? false);
      })
      .catch(() => null);
  }, [walletAddress, daoAddress]);

  const toggle = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND_URL}/api/chat/subscribe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, daoAddress, receiveNotifications: !subscribed, email: subscriberEmail }),
      });
      if (r.ok) {
        setSubscribed(!subscribed);
        notifySuccess(subscribed ? 'Notifications disabled' : 'Notifications enabled');
      }
    } catch {
      notifyError('Failed to update preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle} disabled={loading}
      title={subscribed ? 'Disable email notifications' : 'Enable email notifications'}
      className={`p-2 rounded-xl transition ${subscribed ? 'bg-green-50 text-[#2d7a4f]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
    >
      {subscribed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
    </button>
  );
};

const STATUS_DOT: Record<number, string> = {
  0: 'bg-amber-400',
  1: 'bg-[#5cb87a]',
  2: 'bg-slate-400',
  3: 'bg-red-400',
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
interface DashboardProps {
  onViewChange: (view: ViewState) => void;
  onVote: (id: string) => void;
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange, onVote, user }) => {
  const [daos, setDaos]               = useState<OnchainDao[]>([]);
  const [investments, setInvestments] = useState<OnchainInvestment[]>([]);
  const [yields, setYields]           = useState<YieldRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [rolesByDao, setRolesByDao]   = useState<Record<string, DaoUserRole>>({});
  const [daoPage, setDaoPage]         = useState(1);
  const [proposalPage, setProposalPage] = useState(1);
  const PAGE_SIZE = 5;

  const { wallets }   = useWallets();
  const { user: privyUser } = usePrivy();
  const walletAddress = getCanonicalWalletAddress(privyUser, wallets) as `0x${string}` | undefined || undefined;
  const subscriberEmail = subscriberEmailFromUser(user);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = useMemo(() => {
    const email = user?.email?.address;
    if (email) return email.split('@')[0];
    const google = (user as any)?.google?.name;
    if (google) return google;
    return null;
  }, [user]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [daoRows, invRows, yieldRows] = await Promise.all([
        fetchActiveDaos(),
        fetchAllInvestments(),
        fetchYieldRows(),
      ]);
      setDaos(daoRows);
      setInvestments(invRows);
      setYields(yieldRows);
      setError('');
    } catch (err) {
      const msg = formatTxError(err, 'Failed to load dashboard.');
      setError(msg);
      if (isRefresh) notifyError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const load = async () => {
      if (!walletAddress) { setRolesByDao({}); return; }
      const pendingDaos = Array.from(
        new Set(investments.filter((i) => i.status === 0).map((i) => i.daoAddress.toLowerCase())),
      );
      if (pendingDaos.length === 0) { setRolesByDao({}); return; }
      try {
        const pairs = await Promise.all(
          pendingDaos.map(async (dao) =>
            [dao, await fetchDaoUserRole(dao as `0x${string}`, walletAddress)] as const,
          ),
        );
        setRolesByDao(Object.fromEntries(pairs));
      } catch { setRolesByDao({}); }
    };
    void load();
  }, [walletAddress, investments]);

  const totals = useMemo(() => {
    const totalTvl        = daos.reduce((s, d) => s + d.tvlRaw, 0n);
    const totalYield      = yields.reduce((s, r) => s + r.totalYield, 0n);
    const totalDistributed = yields.reduce((s, r) => s + r.distributed, 0n);
    const claimable       = yields.reduce((s, r) => s + r.claimable, 0n);
    const proposed        = investments.filter((i) => i.status === 0);
    const active          = investments.filter((i) => i.status === 1);
    return { totalTvl, totalYield, totalDistributed, claimable, proposed, active };
  }, [daos, investments, yields]);

  const recentActivity = useMemo(
    () => [...investments].sort((a, b) => Number(b.createdAt - a.createdAt)).slice(0, 6),
    [investments],
  );

  const pagedDaos      = useMemo(() => daos.slice((daoPage - 1) * PAGE_SIZE, daoPage * PAGE_SIZE), [daos, daoPage]);
  const pagedProposals = useMemo(
    () => totals.proposed.slice((proposalPage - 1) * PAGE_SIZE, proposalPage * PAGE_SIZE),
    [totals.proposed, proposalPage],
  );
  const daoPages      = Math.max(1, Math.ceil(daos.length / PAGE_SIZE));
  const proposalPages = Math.max(1, Math.ceil(totals.proposed.length / PAGE_SIZE));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 flex flex-col items-center gap-4 text-[#2d7a4f]">
        <Leaf className="w-7 h-7 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-500 w-full min-w-0">

      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl navy-bg px-6 py-8 sm:px-8 sm:py-10">
        {/* Decorative leaf shape */}
        <svg className="absolute right-0 top-0 h-full opacity-10 pointer-events-none" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
          <path d="M300 0 C200 0 80 60 100 200 L300 200Z" fill="white"/>
          <path d="M300 0 C260 40 200 80 240 200 L300 200Z" fill="white" opacity="0.5"/>
        </svg>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="text-green-300 text-sm font-medium mb-1">{greeting}{displayName ? `, ${displayName}` : ''}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Your CivicVault</h1>
            <p className="text-green-200/80 text-sm mt-1">
              {daos.length > 0
                ? `${daos.length} active DAO${daos.length !== 1 ? 's' : ''} · ${totals.proposed.length} open proposal${totals.proposed.length !== 1 ? 's' : ''}`
                : 'No DAOs yet — create or discover one to get started.'}
            </p>
            {error && <p className="text-red-300 text-sm mt-2">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {walletAddress && <GmailConnectionStatus walletAddress={walletAddress} />}
            <button
              type="button" onClick={() => void loadData(true)} disabled={refreshing}
              className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-semibold hover:bg-white/20 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button" onClick={() => onViewChange('discover')}
              className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl text-xs font-semibold hover:bg-white/20 flex items-center gap-2 transition"
            >
              <Search className="w-3.5 h-3.5" /> Discover
            </button>
            <button
              type="button" onClick={() => onViewChange('create-dao')}
              className="px-4 py-2 bg-[#5cb87a] text-white rounded-xl text-xs font-bold hover:bg-[#4da868] flex items-center gap-2 transition shadow-lg shadow-black/20"
            >
              <Plus className="w-3.5 h-3.5" /> Create DAO
            </button>
          </div>
        </div>
      </div>

      {/* ── Metrics ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Metric label="Total TVL" value={formatUsdcAmount(totals.totalTvl)}
          icon={<CircleDollarSign className="w-4 h-4" />} variant="forest" />
        <Metric label="Generated Yield" value={formatUsdcAmount(totals.totalYield)}
          icon={<TrendingUp className="w-4 h-4" />} variant="leaf" />
        <Metric label="Distributed" value={formatUsdcAmount(totals.totalDistributed)}
          icon={<Layers className="w-4 h-4" />} variant="cream" />
        <Metric label="Active DAOs" value={String(daos.length)}
          icon={<Users className="w-4 h-4" />} variant="white" />
        <Metric label="Open Proposals" value={String(totals.proposed.length)}
          sublabel={totals.active.length > 0 ? `${totals.active.length} active` : undefined}
          icon={<Zap className="w-4 h-4" />}
          variant={totals.proposed.length > 0 ? 'cream' : 'white'}
          />
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Active DAOs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#5cb87a]" />
              <h2 className="text-sm font-bold text-slate-900">Active DAOs</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{daos.length}</span>
          </div>
          {daos.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-slate-400 px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#2d7a4f] opacity-50" />
              </div>
              <p className="text-sm text-center">No DAOs deployed yet.<br/>Be the first in your community.</p>
              <button
                onClick={() => onViewChange('create-dao')}
                className="mt-1 text-xs font-bold text-[#2d7a4f] hover:underline flex items-center gap-1"
              >
                Create your first DAO <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
                {pagedDaos.map((dao) => {
                  const userRole = rolesByDao[dao.address.toLowerCase()];
                  return (
                    <div key={dao.address} className="px-5 py-4 hover:bg-slate-100/60 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl navy-bg flex items-center justify-center shrink-0 shadow-sm shadow-[#1a4731]/20">
                            <Leaf className="w-4 h-4 text-[#5cb87a]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{dao.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />{dao.location || 'No location'}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-slate-500">
                              <span className="flex items-center gap-1 text-[#2d7a4f] font-semibold">
                                <CircleDollarSign className="w-3 h-3" />{dao.tvlFormatted}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />{dao.memberCount} members
                              </span>
                            </div>
                            {userRole && (
                              <div className="mt-2">
                                <RoleTags isCreator={userRole.isCreator} isAdmin={userRole.isAdmin}
                                  isFinanceManager={userRole.isFinanceManager} isVerifiedMember={userRole.isVerifiedMember} />
                              </div>
                            )}
                          </div>
                        </div>
                        {walletAddress && (
                          <DaoNotificationToggle walletAddress={walletAddress} daoAddress={dao.address} subscriberEmail={subscriberEmail} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {daoPages > 1 && (
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
                  <button onClick={() => setDaoPage((p) => Math.max(1, p - 1))} disabled={daoPage <= 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <p className="text-xs text-slate-400">{daoPage} / {daoPages}</p>
                  <button onClick={() => setDaoPage((p) => Math.min(daoPages, p + 1))} disabled={daoPage >= daoPages}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Proposals */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-bold text-slate-900">Open Proposals</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{totals.proposed.length}</span>
          </div>
          {totals.proposed.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-slate-400 px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#2d7a4f] opacity-50" />
              </div>
              <p className="text-sm text-center">No pending proposals right now.<br/>All caught up!</p>
            </div>
          ) : (
            <>
              <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
                {pagedProposals.map((proposal) => {
                  const role    = rolesByDao[proposal.daoAddress.toLowerCase()];
                  const canVote = Boolean(walletAddress && role?.isVerifiedMember);
                  const secsLeft = Number(proposal.deadline) - Math.floor(Date.now() / 1000);
                  return (
                    <div key={`${proposal.daoAddress}-${proposal.id}`}
                      className="px-5 py-4 hover:bg-slate-100/60 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[proposal.status] ?? 'bg-slate-300'}`} />
                            <p className="font-bold text-slate-900 text-sm truncate">{proposal.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{proposal.daoName}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusChip status={statusLabel(proposal.status)} />
                            <DeadlineChip secondsLeft={secsLeft} />
                          </div>
                          <div className="mt-2">
                            <FundingProgress raised={proposal.upvotes} target={proposal.fundNeeded} />
                          </div>
                        </div>
                        <div className="shrink-0">
                          {canVote ? (
                            <button
                              onClick={() => onVote(`${proposal.daoAddress}:${proposal.id.toString()}`)}
                              className="px-4 py-2 navy-bg text-white text-xs font-bold rounded-xl hover:opacity-90 transition"
                            >Vote</button>
                          ) : (
                            <button
                              onClick={() => onViewChange('kyc')}
                              className="px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                            >Join</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {proposalPages > 1 && (
                <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100">
                  <button onClick={() => setProposalPage((p) => Math.max(1, p - 1))} disabled={proposalPage <= 1}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Prev</button>
                  <p className="text-xs text-slate-400">{proposalPage} / {proposalPages}</p>
                  <button onClick={() => setProposalPage((p) => Math.min(proposalPages, p + 1))} disabled={proposalPage >= proposalPages}
                    className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2d7a4f]" />
            <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
          </div>
          <button onClick={() => onViewChange('investments')}
            className="text-xs font-bold text-[#2d7a4f] hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#2d7a4f] opacity-50" />
            </div>
            <p className="text-sm">No activity yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActivity.map((item) => (
              <div key={`${item.daoAddress}-${item.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-100/50 transition-colors">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">{item.daoName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusChip status={statusLabel(item.status)} />
                  <span className="text-[10px] text-slate-400">{timeAgo(Number(item.createdAt))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom CTA strip ─────────────────────────────────────────────────── */}
      {walletAddress && (
        <div className="rounded-2xl overflow-hidden">
          <div className="bg-slate-100 border border-green-100 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 rounded-xl navy-bg flex items-center justify-center shrink-0 shadow-sm shadow-[#1a4731]/20">
              <Mail className="w-5 h-5 text-[#5cb87a]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#1a4731] text-sm">Stay updated via email</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {daos.some((d) => rolesByDao[d.address.toLowerCase()]?.isVerifiedMember)
                  ? "You're a verified DAO member. Enable email alerts for proposals and yield deposits."
                  : 'Complete KYC in a DAO to receive investment notifications.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button onClick={() => onViewChange('kyc')}
                className="px-4 py-2 text-xs font-semibold border border-green-200 text-[#1a4731] rounded-xl bg-white hover:bg-green-50 transition flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> KYC / Admin
              </button>
              <button onClick={() => onViewChange('messages')}
                className="px-4 py-2 text-xs font-semibold navy-bg text-white rounded-xl hover:opacity-90 transition">
                Open Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
