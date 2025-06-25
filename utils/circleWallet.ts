import { BACKEND_URL } from './backendUrl';

export type CircleWallet = {
  walletId: string;
  address: string;
  blockchain: string;
  state: string;
  usdcBalance?: string;
};

export async function fetchOrCreateCircleWallet(
  privyWalletAddress: string
): Promise<CircleWallet | null> {
  if (!privyWalletAddress) return null;
  try {
    // Try to fetch existing first
    const getRes = await fetch(`${BACKEND_URL}/api/circle-wallet/${privyWalletAddress}`);
    if (getRes.ok) {
      const data = await getRes.json() as { wallet: CircleWallet };
      return data.wallet;
    }
    // Create if not found
    const postRes = await fetch(`${BACKEND_URL}/api/circle-wallet/${privyWalletAddress}`, {
      method: 'POST',
    });
    if (!postRes.ok) return null;
    const data = await postRes.json() as { wallet: CircleWallet };
    return data.wallet;
  } catch {
    return null;
  }
}

export async function fetchCircleWalletBalance(
  privyWalletAddress: string
): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/circle-wallet/${privyWalletAddress}`);
    if (!res.ok) return '0';
    const data = await res.json() as { wallet: CircleWallet };
    return data.wallet.usdcBalance ?? '0';
  } catch {
    return '0';
  }
}
