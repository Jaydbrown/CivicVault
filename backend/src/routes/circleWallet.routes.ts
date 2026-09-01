import { Router } from 'express';
import {
  createCircleWalletForUser,
  getCircleWalletForUser,
  getCircleWalletBalance,
} from '../services/circleWallet.service';
import { normalizeWalletAddress } from '../utils/wallet';

const router = Router();

// POST /api/circle-wallet/:wallet — create or return existing Circle wallet
router.post('/:wallet', async (req, res) => {
  const wallet = normalizeWalletAddress(req.params.wallet);
  if (!wallet) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }
  try {
    const info = await createCircleWalletForUser(wallet);
    if (!info) {
      res.status(503).json({ error: 'Circle Programmable Wallets not configured on this server' });
      return;
    }
    res.json({ wallet: info });
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Circle request failed' });
  }
});

// GET /api/circle-wallet/:wallet — fetch existing Circle wallet info + balance
router.get('/:wallet', async (req, res) => {
  const wallet = normalizeWalletAddress(req.params.wallet);
  if (!wallet) {
    res.status(400).json({ error: 'Invalid wallet address' });
    return;
  }
  try {
    const info = await getCircleWalletForUser(wallet);
    if (!info) {
      res.status(404).json({ error: 'No Circle wallet found for this address' });
      return;
    }
    const balance = await getCircleWalletBalance(info.walletId);
    res.json({ wallet: { ...info, usdcBalance: balance } });
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Circle request failed' });
  }
});

export default router;
