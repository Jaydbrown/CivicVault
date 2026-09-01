import { Router } from 'express';

import { getUsdNgnRate, nairaToUsdc6, usdc6ToNaira } from '../services/fiatRate.service';

const router = Router();

// GET /api/fiat/rate — current ₦/USD rate used for display + estimates.
router.get('/rate', async (_req, res) => {
  try {
    res.json({ usdNgn: await getUsdNgnRate(), asOf: new Date().toISOString() });
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Rate unavailable' });
  }
});

// GET /api/fiat/quote?naira=5000  or  ?usdc6=3000000
router.get('/quote', async (req, res) => {
  try {
    const naira = Number(req.query.naira);
    const usdc6 = typeof req.query.usdc6 === 'string' ? BigInt(req.query.usdc6) : null;

    if (Number.isFinite(naira) && naira > 0) {
      return res.json({ naira, usdc6: (await nairaToUsdc6(naira)).toString() });
    }
    if (usdc6 !== null && usdc6 > 0n) {
      return res.json({ usdc6: usdc6.toString(), naira: await usdc6ToNaira(usdc6) });
    }
    res.status(400).json({ error: 'Pass ?naira= or ?usdc6=' });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Bad quote request' });
  }
});

export default router;
