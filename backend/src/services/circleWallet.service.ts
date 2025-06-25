import { prisma } from '../db/prisma';

const CIRCLE_BASE_URL = 'https://api.circle.com/v1/w3s';

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

  const idempotencyKey = `civicvault-${walletAddress.toLowerCase()}-${Date.now()}`;

  const res = await fetch(`${CIRCLE_BASE_URL}/developer/wallets`, {
    method: 'POST',
    headers: circleHeaders(),
    body: JSON.stringify({
      idempotencyKey,
      entitySecretCiphertext: process.env.CIRCLE_ENTITY_SECRET,
      walletSetId: process.env.CIRCLE_WALLET_SET_ID,
      blockchains: ['ARC-TESTNET'],
      count: 1,
      metadata: [{ name: `CivicVault-${walletAddress.slice(0, 8)}`, refId: walletAddress }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Circle wallet creation failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    data: { wallets: Array<{ id: string; address: string; blockchain: string; state: string }> };
  };

  const created = data.data.wallets[0];
  if (!created) throw new Error('Circle returned no wallet in response');

  await prisma.user.update({
    where: { walletAddress },
    data: {
      circleWalletId: created.id,
      circleWalletAddress: created.address,
    },
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

  const res = await fetch(`${CIRCLE_BASE_URL}/wallets/${user.circleWalletId}`, {
    headers: circleHeaders(),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    data: { wallet: { id: string; address: string; blockchain: string; state: string } };
  };

  return {
    walletId: data.data.wallet.id,
    address: data.data.wallet.address,
    blockchain: data.data.wallet.blockchain,
    state: data.data.wallet.state,
  };
}

export async function getCircleWalletBalance(walletId: string): Promise<string> {
  if (!isConfigured()) return '0';

  const res = await fetch(`${CIRCLE_BASE_URL}/wallets/${walletId}/balances`, {
    headers: circleHeaders(),
  });

  if (!res.ok) return '0';

  const data = (await res.json()) as {
    data: { tokenBalances: Array<{ token: { symbol: string }; amount: string }> };
  };

  const usdcBalance = data.data.tokenBalances.find((b) => b.token.symbol === 'USDC');
  return usdcBalance?.amount ?? '0';
}
