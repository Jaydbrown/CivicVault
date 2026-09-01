import { createHash } from 'crypto';

import { prisma } from '../db/prisma';

const CIRCLE_BASE_URL = 'https://api.circle.com/v1/w3s';
const CIRCLE_TIMEOUT_MS = 15_000;

function circleHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
  };
}

function isConfigured(): boolean {
  return !!(
    process.env.CIRCLE_API_KEY?.trim() &&
    process.env.CIRCLE_ENTITY_SECRET?.trim() &&
    process.env.CIRCLE_WALLET_SET_ID?.trim()
  );
}

/** fetch() with a hard timeout so a hung Circle API call can't pin an event-loop worker. */
async function circleFetch(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CIRCLE_TIMEOUT_MS);
  try {
    return await fetch(`${CIRCLE_BASE_URL}${path}`, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Circle API timed out after ${CIRCLE_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deterministic idempotency key for wallet creation. A UUID derived from the
 * wallet address, so a retried request reuses Circle's original result instead
 * of provisioning a second wallet.
 */
function walletCreationIdempotencyKey(walletAddress: string): string {
  const h = createHash('sha256').update(`civicvault:wallet:${walletAddress}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    `8${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join('-');
}

export type CircleWalletInfo = {
  walletId: string;
  address: string;
  blockchain: string;
  state: string;
};

export async function createCircleWalletForUser(
  walletAddress: string
): Promise<CircleWalletInfo | null> {
  if (!isConfigured()) return null;

  // Check if user already has a Circle wallet stored
  const user = await prisma.user.findUnique({ where: { walletAddress } });
  if (user?.circleWalletId && user?.circleWalletAddress) {
    return {
      walletId: user.circleWalletId,
      address: user.circleWalletAddress,
      blockchain: 'ARC-TESTNET',
      state: 'LIVE',
    };
  }

  const res = await circleFetch('/developer/wallets', {
    method: 'POST',
    headers: circleHeaders(),
    body: JSON.stringify({
      idempotencyKey: walletCreationIdempotencyKey(walletAddress),
      entitySecretCiphertext: process.env.CIRCLE_ENTITY_SECRET,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
      blockchains: ['ARC-TESTNET'],
      count: 1,
      metadata: [{ name: `CivicVault-${walletAddress.slice(0, 8)}`, refId: walletAddress }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Circle wallet creation failed: ${res.status} ${body}`);
  }

  const data = (await res.json().catch(() => null)) as {
    data?: { wallets?: Array<{ id: string; address: string; blockchain: string; state: string }> };
  } | null;

  const created = data?.data?.wallets?.[0];
  if (!created) throw new Error('Circle returned no wallet in response');

  // The user row may not exist yet (wallet provisioned before identity sync).
  await prisma.user.upsert({
    where: { walletAddress },
    update: { circleWalletId: created.id, circleWalletAddress: created.address },
    create: { walletAddress, circleWalletId: created.id, circleWalletAddress: created.address },
  });

  return {
    walletId: created.id,
    address: created.address,
    blockchain: created.blockchain,
    state: created.state,
  };
}

export async function getCircleWalletForUser(
  walletAddress: string
): Promise<CircleWalletInfo | null> {
  if (!isConfigured()) return null;

  const user = await prisma.user.findUnique({ where: { walletAddress } });
  if (!user?.circleWalletId) return null;

  const res = await circleFetch(`/wallets/${user.circleWalletId}`, { headers: circleHeaders() });
  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as {
    data?: { wallet?: { id: string; address: string; blockchain: string; state: string } };
  } | null;

  const wallet = data?.data?.wallet;
  if (!wallet) return null;

  return {
    walletId: wallet.id,
    address: wallet.address,
    blockchain: wallet.blockchain,
    state: wallet.state,
  };
}

export async function getCircleWalletBalance(walletId: string): Promise<string> {
  if (!isConfigured() || !walletId) return '0';

  const res = await circleFetch(`/wallets/${walletId}/balances`, { headers: circleHeaders() });
  if (!res.ok) return '0';

  const data = (await res.json().catch(() => null)) as {
    data?: { tokenBalances?: Array<{ token?: { symbol?: string }; amount?: string }> };
  } | null;

  const balances = data?.data?.tokenBalances;
  if (!Array.isArray(balances)) return '0';

  const usdcBalance = balances.find((b) => b?.token?.symbol === 'USDC');
  return usdcBalance?.amount ?? '0';
}
