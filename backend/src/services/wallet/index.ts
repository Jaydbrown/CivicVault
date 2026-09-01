import { randomUUID } from 'crypto';

import { prisma } from '../../db/prisma';
import { circleConfigured } from './circleApi';
import { CustodialCircleProvider } from './custodialProvider';
import { evaluate, type WalletTier } from './txPolicy';
import type { SubmitResult, TxStatus, WalletInfo, WalletProvider } from './types';
import { UserControlledCircleProvider } from './userControlledProvider';

export { circleConfigured };
export type { WalletInfo, SubmitResult, TxStatus };

const userControlled = new UserControlledCircleProvider();
const custodial = new CustodialCircleProvider();

function providerFor(tier: WalletTier): WalletProvider {
  return tier === 'CUSTODIAL' ? custodial : userControlled;
}

async function tierOf(userId: string): Promise<WalletTier> {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return u.walletTier === 'CUSTODIAL' ? 'CUSTODIAL' : 'USER_CONTROLLED';
}

async function alert(kind: string, detail: Record<string, unknown>): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL?.trim();
  const line = `[wallet] ${kind} ${JSON.stringify(detail)}`;
  console.warn(line);
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `🔐 ${line}` }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    /* alerting must never break the request path */
  }
}

// Per-user rate limit on signing requests.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Number(process.env.WALLET_CALL_RATE_MAX ?? '12');
const _hits = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (_hits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  _hits.set(userId, arr);
  return arr.length > RATE_MAX;
}

export async function ensureWallet(userId: string): Promise<{ wallet?: WalletInfo; setup?: unknown }> {
  return providerFor(await tierOf(userId)).ensureWallet(userId);
}

export async function getWallet(userId: string): Promise<WalletInfo | null> {
  return providerFor(await tierOf(userId)).getWallet(userId);
}

export type CallInput = { daoAddress: string; functionName: string; args: unknown[] };

export async function submitCall(userId: string, input: CallInput): Promise<SubmitResult> {
  const tier = await tierOf(userId);

  if (rateLimited(userId)) {
    await alert('rate_limit', { userId, functionName: input.functionName });
    throw Object.assign(new Error('Too many wallet actions — slow down'), { status: 429 });
  }

  const verdict = await evaluate({
    to: input.daoAddress,
    functionName: input.functionName,
    args: input.args,
    tier,
  });

  const refId = randomUUID();

  if (!verdict.ok) {
    await prisma.circleTxLog.create({
      data: {
        userId,
        tier,
        to: input.daoAddress,
        selector: '0x',
        functionName: input.functionName,
        argsJson: JSON.stringify(input.args),
        refId,
        state: 'POLICY_REJECTED',
        error: verdict.reason,
      },
    });
    await alert('policy_rejected', { userId, functionName: input.functionName, reason: verdict.reason });
    throw Object.assign(new Error(`Not permitted: ${verdict.reason}`), { status: 403 });
  }

  const log = await prisma.circleTxLog.create({
    data: {
      userId,
      tier,
      to: verdict.to,
      selector: verdict.selector,
      functionName: input.functionName,
      argsJson: JSON.stringify(verdict.abiParameters),
      refId,
      state: 'CREATED',
    },
  });

  try {
    const result = await providerFor(tier).submitContractCall(userId, {
      contractAddress: verdict.to,
      abiFunctionSignature: verdict.abiFunctionSignature,
      abiParameters: verdict.abiParameters as unknown[],
      refId,
    });
    await prisma.circleTxLog.update({
      where: { id: log.id },
      data: {
        state: 'PENDING',
        challengeId: result.kind === 'challenge' ? result.envelope.challengeId : null,
        circleTxId: result.kind === 'submitted' ? result.circleTxId : null,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.circleTxLog.update({ where: { id: log.id }, data: { state: 'FAILED', error: message } });
    await alert('submit_failed', { userId, functionName: input.functionName, error: message });
    throw err;
  }
}

export async function txStatus(userId: string, refId: string): Promise<TxStatus> {
  const log = await prisma.circleTxLog.findUnique({ where: { refId } });
  if (!log || log.userId !== userId) throw Object.assign(new Error('Unknown transaction'), { status: 404 });

  const status = await providerFor(log.tier === 'CUSTODIAL' ? 'CUSTODIAL' : 'USER_CONTROLLED').getTxStatus(
    userId,
    refId,
  );

  if (status.state !== log.state) {
    await prisma.circleTxLog.update({
      where: { refId },
      data: { state: status.state, txHash: status.txHash ?? null, error: status.error ?? null },
    });
    if (status.state === 'FAILED') await alert('tx_failed', { userId, refId, error: status.error });
  }
  return status;
}
