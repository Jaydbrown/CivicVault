import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Scale, ShieldOff, Snowflake, Undo2, HandCoins, ShieldCheck, Vote } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWallets } from '@privy-io/react-auth';

import { Card, Button, ProgressBar, SkeletonCard, EmptyState } from '../components/UI';
import { countdown } from '../utils/format';
import { maskAddress } from '../utils/address';
import { formatTxError, notifyError, notifySuccess, notifyWarning } from '../utils/toast';
import { useMemberSigner } from '../utils/useMemberSigner';
import {
  fetchWalletDaoRoles,
  fetchDaoAdmins,
  fetchAllInvestments,
  fetchGovProposals,
  openGovProposal,
  voteOnGovProposal,
  executeGovProposal,
  governorConfigured,
  formatUsdcAmount,
  GOV_PROPOSAL_LABELS,
  type GovProposal,
  type GovProposalType,
  type WalletDaoRoleRow,
  type OnchainInvestment,
  type PrivyEthereumWallet,
} from '../utils/civicVaultContracts';

const TYPE_META: Record<GovProposalType, { icon: React.FC<{ className?: string }>; needs: 'admin' | 'investment' }> = {
  0: { icon: ShieldOff, needs: 'admin' },
  1: { icon: Snowflake, needs: 'investment' },
  2: { icon: Undo2, needs: 'investment' },
  3: { icon: HandCoins, needs: 'investment' },
  4: { icon: ShieldCheck, needs: 'admin' },
};

const GovernanceView: React.FC = () => {
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.type === 'ethereum');
  const { ensure: ensureSigner, address: signerAddress } = useMemberSigner();
  const viewer = signerAddress as `0x${string}` | undefined;

  const [memberDaos, setMemberDaos] = useState<WalletDaoRoleRow[]>([]);
  const [daoAddress, setDaoAddress] = useState<`0x${string}` | ''>('');
  const [admins, setAdmins] = useState<`0x${string}`[]>([]);
  const [investments, setInvestments] = useState<OnchainInvestment[]>([]);
  const [proposals, setProposals] = useState<GovProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const [newType, setNewType] = useState<GovProposalType>(0);
  const [newAdmin, setNewAdmin] = useState('');
  const [newInvestment, setNewInvestment] = useState('');

  const configured = governorConfigured();

  useEffect(() => {
    let live = true;
    (async () => {
      if (!viewer) { setMemberDaos([]); return; }
      const roles = await fetchWalletDaoRoles(viewer).catch(() => []);
      if (!live) return;
      const eligible = roles.filter((r) => r.isVerifiedMember || r.isCreator || r.isAdmin);
      setMemberDaos(eligible);
      setDaoAddress((cur) => cur || (eligible[0]?.daoAddress as `0x${string}`) || '');
    })();
    return () => { live = false; };
  }, [viewer]);

  const loadDao = useCallback(async () => {
    if (!configured || !daoAddress) { setProposals([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [adm, invs, props] = await Promise.all([
        fetchDaoAdmins(daoAddress),
        fetchAllInvestments(),
        fetchGovProposals(daoAddress, viewer),
      ]);
      setAdmins(adm);
      setInvestments(invs.filter((i) => i.daoAddress.toLowerCase() === daoAddress.toLowerCase()));
      setProposals(props);
    } catch (err) {
      notifyError(formatTxError(err, 'Could not load governance data.'));
    } finally {
      setLoading(false);
    }
  }, [configured, daoAddress, viewer]);

  useEffect(() => { void loadDao(); }, [loadDao]);

  const activeInvestments = useMemo(
    () => investments.filter((i) => i.status === 1),
    [investments],
  );

  const needs = TYPE_META[newType].needs;

  const submitProposal = async () => {
    if (!daoAddress || !wallet) return;
    if (needs === 'admin' && !newAdmin) { notifyWarning('Pick an admin.'); return; }
    if (needs === 'investment' && !newInvestment) { notifyWarning('Pick an investment.'); return; }
    setBusy('create');
    try {
      const signer = await ensureSigner();
      await openGovProposal(
        wallet as unknown as PrivyEthereumWallet,
        {
          daoAddress,
          pType: newType,
          targetAdmin: needs === 'admin' ? (newAdmin as `0x${string}`) : undefined,
          investmentId: needs === 'investment' ? Number(newInvestment) : undefined,
        },
        signer,
      );
      notifySuccess('Proposal opened.');
      setNewAdmin(''); setNewInvestment('');
      await loadDao();
    } catch (err) {
      notifyError(formatTxError(err, 'Could not open the proposal.'));
    } finally {
      setBusy('');
    }
  };

  const castVote = async (p: GovProposal, support: boolean) => {
    if (!daoAddress || !wallet) return;
    setBusy(`vote-${p.id}`);
    try {
      await voteOnGovProposal(wallet as unknown as PrivyEthereumWallet, daoAddress, p.id, support, await ensureSigner());
      notifySuccess('Vote cast.');
      await loadDao();
    } catch (err) {
      notifyError(formatTxError(err, 'Vote failed.'));
    } finally {
      setBusy('');
    }
  };

  const runExecute = async (p: GovProposal) => {
    if (!daoAddress || !wallet) return;
    setBusy(`exec-${p.id}`);
    try {
      await executeGovProposal(wallet as unknown as PrivyEthereumWallet, daoAddress, p.id, await ensureSigner());
      notifySuccess('Proposal executed.');
      await loadDao();
    } catch (err) {
      notifyError(formatTxError(err, 'Execution failed.'));
    } finally {
      setBusy('');
    }
  };

  if (!configured) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 text-center space-y-3">
          <Scale className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Member governance</h1>
          <p className="text-sm text-muted-foreground">
            Stake-weighted votes to remove an admin, freeze a release, or claw back an
            investment are implemented and land with the next contract deployment
            (part of the security-audit cycle). This screen activates automatically
            once <code>VITE_GOVERNOR_ADDRESS</code> is set.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Scale className="w-7 h-7 text-emerald-600" /> Governance
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Members — not the creator — hold the final say. Voting power is the USDC you have
          committed to this DAO.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold uppercase text-muted-foreground">DAO</label>
        <select
          value={daoAddress}
          onChange={(e) => setDaoAddress(e.target.value as `0x${string}`)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">Select a DAO you belong to…</option>
          {memberDaos.map((d) => (
            <option key={d.daoAddress} value={d.daoAddress}>{d.daoName}</option>
          ))}
        </select>
      </div>

      {daoAddress && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-foreground">Open a proposal</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(Number(e.target.value) as GovProposalType)}
              className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
            >
              {([0, 1, 2, 3, 4] as GovProposalType[]).map((t) => (
                <option key={t} value={t}>{GOV_PROPOSAL_LABELS[t]}</option>
              ))}
            </select>

            {needs === 'admin' ? (
              <select
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm sm:col-span-2"
              >
                <option value="">Select admin…</option>
                {admins.map((a) => (
                  <option key={a} value={a}>{maskAddress(a)}</option>
                ))}
              </select>
            ) : (
              <select
                value={newInvestment}
                onChange={(e) => setNewInvestment(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm sm:col-span-2"
              >
                <option value="">Select investment…</option>
                {(newType === 2 ? investments : activeInvestments).map((i) => (
                  <option key={i.id} value={i.id}>#{i.id} · {i.name}</option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={submitProposal} loading={busy === 'create'} size="sm">
            Open proposal
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} className="p-5" lines={2} />)}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={<Vote className="w-6 h-6" />}
          title={daoAddress ? 'No proposals yet' : 'Pick a DAO to see its governance'}
          hint={
            daoAddress
              ? 'Open the first one above — remove an admin, freeze a release, or claw back an investment.'
              : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-4">
          <AnimatePresence initial={false}>
          {proposals.map((p) => {
            const Icon = TYPE_META[p.pType].icon;
            const total = p.yesWeight + p.noWeight;
            const yesPct = total === 0n ? 0 : Number((p.yesWeight * 100n) / total);
            const secsLeft = p.votingDeadline - Math.floor(Date.now() / 1000);
            const state = p.executed
              ? (p.passing ? 'Executed' : 'Rejected')
              : p.open
                ? 'Open'
                : p.passing ? 'Passed — awaiting execution' : 'Failed';
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-bold text-foreground">
                        #{p.id} · {GOV_PROPOSAL_LABELS[p.pType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_META[p.pType].needs === 'admin'
                          ? `Target: ${maskAddress(p.targetAdmin)}`
                          : `Investment #${p.investmentId}`}
                        {' · '}by {maskAddress(p.proposer)}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                    {state}
                  </span>
                </div>

                <ProgressBar value={yesPct} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Yes {formatUsdcAmount(p.yesWeight)}</span>
                  <span>No {formatUsdcAmount(p.noWeight)}</span>
                </div>
                {p.open && (
                  <p className="text-[11px] text-muted-foreground">
                    {secsLeft > 0
                      ? `${countdown(secsLeft)} · needs ${p.thresholdBps / 100}% of votes cast${
                          p.quorumFloorBps ? ` and ${p.quorumFloorBps / 100}% turnout` : ''
                        }`
                      : 'Voting closed'}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  {p.open && !p.hasVoted && (
                    <>
                      <Button size="sm" variant="secondary" loading={busy === `vote-${p.id}`} onClick={() => castVote(p, true)}>
                        Vote yes
                      </Button>
                      <Button size="sm" variant="outline" loading={busy === `vote-${p.id}`} onClick={() => castVote(p, false)}>
                        Vote no
                      </Button>
                    </>
                  )}
                  {p.open && p.hasVoted && <p className="text-xs text-emerald-600 font-bold self-center">You voted</p>}
                  {!p.open && !p.executed && (
                    <Button size="sm" loading={busy === `exec-${p.id}`} onClick={() => runExecute(p)}>
                      Execute
                    </Button>
                  )}
                </div>
              </Card>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

export default GovernanceView;
