import { Router } from 'express';

import { usdcBalanceOf } from '../chain/arc';
import { requireAuth } from '../middleware/auth';
import { getUsdNgnRate, usdc6ToNaira } from '../services/fiatRate.service';
import { circleConfigured, ensureWallet, getWallet, submitCall, txStatus } from '../services/wallet';

const router = Router();

router.use(requireAuth);

function guard(res: import('express').Response, err: unknown): void {
  const status = (err as { status?: number })?.status ?? 500;
  res.status(status === 500 ? 502 : status).json({
    error: err instanceof Error ? err.message : 'Wallet request failed',
  });
}

// POST /api/wallet/ensure — provision / return the caller's wallet.
// May return { setup } — a Circle challenge the client must complete (first-time PIN/passkey).
router.post('/ensure', async (req, res) => {
  if (!circleConfigured()) return res.status(503).json({ error: 'Wallets are not configured on this server' });
  try {
    const r = await ensureWallet(req.auth!.userId);
    res.json(r);
  } catch (err) {
    guard(res, err);
  }
});

// GET /api/wallet — address, tier, USDC + ₦ balance, rate.
router.get('/', async (req, res) => {
  try {
    const wallet = await getWallet(req.auth!.userId);
    if (!wallet) return res.status(404).json({ error: 'No wallet provisioned' });
    const [usdc6, rate] = await Promise.all([usdcBalanceOf(wallet.address), getUsdNgnRate()]);
    res.json({
      address: wallet.address,
      tier: wallet.tier,
      state: wallet.state,
      usdcBalance: usdc6.toString(),
      nairaBalance: await usdc6ToNaira(usdc6),
      nairaRate: rate,
    });
  } catch (err) {
    guard(res, err);
  }
});

// POST /api/wallet/call — { daoAddress, functionName, args }
// Runs the tx policy, then returns a challenge (Tier 1) or a submitted ref (Tier 2).
router.post('/call', async (req, res) => {
  const { daoAddress, functionName, args } = req.body ?? {};
  if (typeof daoAddress !== 'string' || typeof functionName !== 'string' || !Array.isArray(args)) {
    return res.status(400).json({ error: 'Expected { daoAddress, functionName, args[] }' });
  }
  try {
    const result = await submitCall(req.auth!.userId, { daoAddress, functionName, args });
    res.json(result);
  } catch (err) {
    guard(res, err);
  }
});

// GET /api/wallet/tx/:refId — poll a submitted call.
router.get('/tx/:refId', async (req, res) => {
  try {
    res.json(await txStatus(req.auth!.userId, req.params.refId));
  } catch (err) {
    guard(res, err);
  }
});

export default router;
