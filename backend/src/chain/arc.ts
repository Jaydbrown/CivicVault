import { createPublicClient, defineChain, http, getAddress, isAddress } from 'viem';

import { DAO_FACTORY_ABI } from '../abis/DAOFactory.abi';

/**
 * Arc Testnet — Circle's L1 where USDC is the native gas token.
 * Chain id 5042002. USDC is exposed at a fixed precompile address.
 */
export const ARC_TESTNET_ID = 5042002;
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const;
export const CIRCLE_BLOCKCHAIN = 'ARC-TESTNET' as const;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

export function factoryAddress(): `0x${string}` {
  const raw = process.env.FACTORY_ADDRESS || process.env.VITE_FACTORY_ADDRESS;
  if (!raw || !isAddress(raw)) {
    throw new Error('FACTORY_ADDRESS is not set or not a valid address');
  }
  return getAddress(raw);
}

const _daoVerifyCache = new Map<string, { ok: boolean; at: number }>();
const DAO_CACHE_TTL_MS = 10 * 60_000;

/**
 * True iff `candidate` was deployed by the configured factory. Cross-checked
 * on-chain (not just against our DB) so a signing request can never target an
 * arbitrary contract. Cached for 10 minutes.
 */
export async function isFactoryDao(candidate: string): Promise<boolean> {
  if (!isAddress(candidate)) return false;
  const key = getAddress(candidate);

  const hit = _daoVerifyCache.get(key);
  if (hit && Date.now() - hit.at < DAO_CACHE_TTL_MS) return hit.ok;

  let ok = false;
  try {
    const all = (await publicClient.readContract({
      address: factoryAddress(),
      abi: DAO_FACTORY_ABI,
      functionName: 'getAllDAOs',
    })) as readonly string[];
    ok = all.some((d) => getAddress(d) === key);
  } catch {
    ok = false;
  }

  _daoVerifyCache.set(key, { ok, at: Date.now() });
  return ok;
}

const ERC20_MINI_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function usdcBalanceOf(address: string): Promise<bigint> {
  if (!isAddress(address)) return 0n;
  try {
    return (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_MINI_ABI,
      functionName: 'balanceOf',
      args: [getAddress(address)],
    })) as bigint;
  } catch {
    return 0n;
  }
}

export async function usdcAllowance(owner: string, spender: string): Promise<bigint> {
  if (!isAddress(owner) || !isAddress(spender)) return 0n;
  try {
    return (await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_MINI_ABI,
      functionName: 'allowance',
      args: [getAddress(owner), getAddress(spender)],
    })) as bigint;
  } catch {
    return 0n;
  }
}
