import { getAddress, isAddress, toFunctionSelector } from 'viem';

import { factoryAddress, isFactoryDao, USDC_ADDRESS } from '../../chain/arc';

/**
 * The backend is not a general-purpose relayer. It may only ever ask a user's
 * wallet to perform a fixed set of CivicVault member actions against
 * factory-verified contracts. Anything else — above all a bare token
 * `transfer` — is rejected here, before a challenge is ever created.
 */

export type WalletTier = 'USER_CONTROLLED' | 'CUSTODIAL';

export type CallRequest = {
  to: string;
  functionName: string;
  args: unknown[];
  tier: WalletTier;
};

export type PolicyResult =
  | { ok: true; to: `0x${string}`; selector: `0x${string}`; abiFunctionSignature: string; abiParameters: unknown[] }
  | { ok: false; reason: string };

// function name -> full solidity signature (used for selector + Circle abiFunctionSignature)
const ALLOWED: Record<string, string> = {
  // CivicVault member actions
  vote: 'vote(uint256,uint256,uint8)',
  claimYield: 'claimYield(uint256)',
  withdrawStake: 'withdrawStake(uint256)',
  reclaimClawback: 'reclaimClawback(uint256)',
  exitDAO: 'exitDAO()',
  // ERC-20 approve (USDC only, spender must be a factory DAO)
  approve: 'approve(address,uint256)',
  // CivicVaultGovernor member actions
  openProposal: 'openProposal(address,uint8,address,uint256)',
  voteOnProposal: 'voteOnProposal(address,uint256,bool)',
  executeProposal: 'executeProposal(address,uint256)',
};

// Selectors that must never be routed through the backend, even if some future
// edit adds them to ALLOWED by mistake.
const FORBIDDEN_SIGNATURES = [
  'transfer(address,uint256)',
  'transferFrom(address,address,uint256)',
  'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
];
const FORBIDDEN_SELECTORS = new Set(FORBIDDEN_SIGNATURES.map((s) => toFunctionSelector(s)));

// Hard ceiling on a single custodial-tier approval (USDC has 6 decimals).
const CUSTODIAL_MAX_APPROVE = BigInt(process.env.CUSTODIAL_MAX_APPROVE_USDC ?? '100') * 1_000_000n;

function governorAddress(): `0x${string}` | null {
  const raw = process.env.GOVERNOR_ADDRESS || process.env.VITE_GOVERNOR_ADDRESS;
  return raw && isAddress(raw) ? getAddress(raw) : null;
}

export async function evaluate(req: CallRequest): Promise<PolicyResult> {
  const sig = ALLOWED[req.functionName];
  if (!sig) return { ok: false, reason: `function "${req.functionName}" is not permitted` };

  const selector = toFunctionSelector(sig);
  if (FORBIDDEN_SELECTORS.has(selector)) return { ok: false, reason: 'forbidden selector' };

  if (!isAddress(req.to)) return { ok: false, reason: 'invalid target address' };
  const to = getAddress(req.to);

  const gov = governorAddress();
  const isGovCall = ['openProposal', 'voteOnProposal', 'executeProposal'].includes(req.functionName);
  const isApprove = req.functionName === 'approve';

  if (isGovCall) {
    if (!gov || to !== gov) return { ok: false, reason: 'governor calls must target the configured governor' };
  } else if (isApprove) {
    if (to !== getAddress(USDC_ADDRESS)) return { ok: false, reason: 'approve is only permitted on USDC' };
    const [spender, amount] = req.args as [string, string | bigint];
    if (!isAddress(spender) || !(await isFactoryDao(spender))) {
      return { ok: false, reason: 'approve spender must be a factory-verified DAO' };
    }
    if (req.tier === 'CUSTODIAL' && BigInt(amount) > CUSTODIAL_MAX_APPROVE) {
      return { ok: false, reason: 'approval exceeds custodial ceiling' };
    }
  } else {
    // Direct CivicVault member action — target must be a factory DAO.
    if (to === factoryAddress()) return { ok: false, reason: 'direct factory calls are not permitted' };
    if (!(await isFactoryDao(to))) return { ok: false, reason: 'target is not a factory-verified DAO' };
  }

  return { ok: true, to, selector, abiFunctionSignature: sig, abiParameters: req.args };
}
