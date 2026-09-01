import { getAddress, isAddress } from 'viem';

import { DAO_FACTORY_ABI } from '../abis/DAOFactory.abi';
import { factoryAddress, publicClient } from './arc';

/** Minimal read ABI — just what the USSD menus need. */
const VAULT_READ_ABI = [
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'creator', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  {
    type: 'function',
    name: 'isVerifiedMember',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isAdmin',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  { type: 'function', name: 'investmentCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'getInvestment',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'status', type: 'uint8' },
          { name: 'category', type: 'uint8' },
          { name: 'deadline', type: 'uint256' },
          { name: 'upvotes', type: 'uint256' },
          { name: 'downvotes', type: 'uint256' },
          { name: 'fundNeeded', type: 'uint256' },
          { name: 'expectedYield', type: 'uint256' },
          { name: 'grade', type: 'uint8' },
          { name: 'documentCIDs', type: 'string[]' },
          { name: 'totalYieldGenerated', type: 'uint256' },
          { name: 'totalYieldDistributed', type: 'uint256' },
          { name: 'extensionCount', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'createdBy', type: 'address' },
        ],
      },
    ],
  },
] as const;

const GOVERNOR_READ_ABI = [
  {
    type: 'function',
    name: 'proposalCount',
    stateMutability: 'view',
    inputs: [{ name: 'dao', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getProposal',
    stateMutability: 'view',
    inputs: [
      { name: 'dao', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
    ],
    outputs: [
      { name: 'pType', type: 'uint8' },
      { name: 'proposer', type: 'address' },
      { name: 'targetAdmin', type: 'address' },
      { name: 'investmentId', type: 'uint256' },
      { name: 'votingDeadline', type: 'uint256' },
      { name: 'yesWeight', type: 'uint256' },
      { name: 'noWeight', type: 'uint256' },
      { name: 'executed', type: 'bool' },
      { name: 'snapshotDenominator', type: 'uint256' },
      { name: 'thresholdBps', type: 'uint16' },
      { name: 'quorumFloorBps', type: 'uint16' },
    ],
  },
  {
    type: 'function',
    name: 'proposalStatus',
    stateMutability: 'view',
    inputs: [
      { name: 'dao', type: 'address' },
      { name: 'proposalId', type: 'uint256' },
    ],
    outputs: [
      { name: 'open', type: 'bool' },
      { name: 'executed', type: 'bool' },
      { name: 'passing', type: 'bool' },
    ],
  },
] as const;

const GOV_LABELS = ['Remove admin', 'Freeze release', 'Unfreeze release', 'Clawback', 'Reinstate admin'];

export type UssdDao = { address: `0x${string}`; name: string };
export type UssdInvestment = { id: number; name: string; fundNeeded: bigint; upvotes: bigint };
export type UssdGovProposal = { id: number; label: string; investmentId: number; deadline: number };

export function governorAddress(): `0x${string}` | null {
  const raw = process.env.GOVERNOR_ADDRESS || process.env.VITE_GOVERNOR_ADDRESS;
  return raw && isAddress(raw) ? getAddress(raw) : null;
}

async function allDaos(): Promise<`0x${string}`[]> {
  const list = (await publicClient.readContract({
    address: factoryAddress(),
    abi: DAO_FACTORY_ABI,
    functionName: 'getAllDAOs',
  })) as readonly string[];
  return list.map((d) => getAddress(d));
}

/** DAOs where `member` is a verified member. Fine for the pilot's DAO count. */
export async function memberDaos(member: string): Promise<UssdDao[]> {
  if (!isAddress(member)) return [];
  const daos = await allDaos();
  const checks = await Promise.all(
    daos.map(async (address) => {
      try {
        const [verified, name] = await Promise.all([
          publicClient.readContract({ address, abi: VAULT_READ_ABI, functionName: 'isVerifiedMember', args: [getAddress(member)] }),
          publicClient.readContract({ address, abi: VAULT_READ_ABI, functionName: 'name' }),
        ]);
        return verified ? { address, name: name as string } : null;
      } catch {
        return null;
      }
    }),
  );
  return checks.filter((x): x is UssdDao => x !== null);
}

/** True if `account` is the creator or an admin of `dao`. Used to gate USSD enrolment. */
export async function isDaoAdmin(dao: string, account: string): Promise<boolean> {
  if (!isAddress(dao) || !isAddress(account)) return false;
  const address = getAddress(dao);
  const who = getAddress(account);
  try {
    const [isAdmin, creator] = await Promise.all([
      publicClient.readContract({ address, abi: VAULT_READ_ABI, functionName: 'isAdmin', args: [who] }),
      publicClient.readContract({ address, abi: VAULT_READ_ABI, functionName: 'creator' }),
    ]);
    return Boolean(isAdmin) || getAddress(creator as string) === who;
  } catch {
    return false;
  }
}

/** True if `account` is a KYC-verified member of `dao` (creator/admins count too). */
export async function isDaoMember(dao: string, account: string): Promise<boolean> {
  if (!isAddress(dao) || !isAddress(account)) return false;
  const address = getAddress(dao);
  const who = getAddress(account);
  try {
    const verified = await publicClient.readContract({
      address,
      abi: VAULT_READ_ABI,
      functionName: 'isVerifiedMember',
      args: [who],
    });
    if (verified) return true;
  } catch {
    /* fall through to admin/creator check */
  }
  return isDaoAdmin(dao, account);
}

/** True if any of `accounts` is a verified member of `dao`. */
export async function anyIsDaoMember(dao: string, accounts: Array<string | null | undefined>): Promise<boolean> {
  const candidates = accounts.filter((a): a is string => !!a && isAddress(a));
  const results = await Promise.all(candidates.map((a) => isDaoMember(dao, a)));
  return results.some(Boolean);
}

/** PENDING investments (status 0) still open for votes. */
export async function pendingInvestments(dao: string): Promise<UssdInvestment[]> {
  if (!isAddress(dao)) return [];
  const address = getAddress(dao);
  const count = Number(
    await publicClient.readContract({ address, abi: VAULT_READ_ABI, functionName: 'investmentCount' }),
  );
  const rows: UssdInvestment[] = [];
  for (let i = 1; i <= count; i++) {
    try {
      const inv = (await publicClient.readContract({
        address,
        abi: VAULT_READ_ABI,
        functionName: 'getInvestment',
        args: [BigInt(i)],
      })) as { id: bigint; name: string; status: number; deadline: bigint; upvotes: bigint; fundNeeded: bigint };
      if (Number(inv.status) === 0 && Number(inv.deadline) * 1000 > Date.now()) {
        rows.push({ id: Number(inv.id), name: inv.name, fundNeeded: inv.fundNeeded, upvotes: inv.upvotes });
      }
    } catch {
      /* skip */
    }
  }
  return rows;
}

/** Open governance proposals for a DAO. */
export async function openGovProposals(dao: string): Promise<UssdGovProposal[]> {
  const governor = governorAddress();
  if (!governor || !isAddress(dao)) return [];
  const address = getAddress(dao);
  const count = Number(
    await publicClient.readContract({ address: governor, abi: GOVERNOR_READ_ABI, functionName: 'proposalCount', args: [address] }),
  );
  const rows: UssdGovProposal[] = [];
  for (let i = 1; i <= count; i++) {
    try {
      const [p, status] = await Promise.all([
        publicClient.readContract({ address: governor, abi: GOVERNOR_READ_ABI, functionName: 'getProposal', args: [address, BigInt(i)] }) as Promise<readonly unknown[]>,
        publicClient.readContract({ address: governor, abi: GOVERNOR_READ_ABI, functionName: 'proposalStatus', args: [address, BigInt(i)] }) as Promise<readonly [boolean, boolean, boolean]>,
      ]);
      if (status[0]) {
        rows.push({
          id: i,
          label: GOV_LABELS[Number(p[0])] ?? `Type ${p[0]}`,
          investmentId: Number(p[3]),
          deadline: Number(p[4]),
        });
      }
    } catch {
      /* skip */
    }
  }
  return rows;
}
