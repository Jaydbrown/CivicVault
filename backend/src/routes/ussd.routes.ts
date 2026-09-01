import { Router } from 'express';

import { isDaoAdmin } from '../chain/reads';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';
import { ensureWallet } from '../services/wallet';
import { handleUssd } from '../ussd/menu';
import { getSession } from '../ussd/session';

const router = Router();

/**
 * Africa's Talking USSD callback. One POST per menu step; the response body is
 * plain text, `CON ` to keep the session open or `END ` to close it.
 * Body: { sessionId, phoneNumber, text, serviceCode }
 */
router.post('/', async (req, res) => {
  const sessionId = String(req.body?.sessionId ?? '');
  const phone = String(req.body?.phoneNumber ?? '').trim();
  const text = String(req.body?.text ?? '');

  res.set('Content-Type', 'text/plain');
  if (!sessionId || !phone) {
    res.send('END Invalid request.');
    return;
  }

  // The aggregator sends the whole path (`1*2*5000`); we act on the last segment.
  const parts = text.split('*');
  const input = parts[parts.length - 1] ?? '';

  try {
    const session = getSession(sessionId, phone);
    const reply = await handleUssd(session, input);
    res.send(`${reply.close ? 'END' : 'CON'} ${reply.text}`);
  } catch (err) {
    console.error('[ussd] handler error:', err instanceof Error ? err.message : err);
    res.send('END Something went wrong. Please dial again.');
  }
});

/**
 * Facilitator enrolment. The authenticated caller must be a creator/admin of the
 * target DAO on-chain. Creates a CUSTODIAL User + provisions a custodial wallet +
 * maps the phone number. The member sets their PIN on first dial-in, and the
 * facilitator still adds/KYCs them as a DAO member through the normal flow.
 */
router.post('/enroll', requireAuth, async (req, res) => {
  const phoneNumber = String(req.body?.phoneNumber ?? '').trim();
  const daoAddress = String(req.body?.daoAddress ?? '').trim();
  if (!/^\+?\d{7,15}$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'phoneNumber must be E.164 (e.g. +2348012345678)' });
  }
  const e164 = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

  if (!(await isDaoAdmin(daoAddress, req.auth!.walletAddress))) {
    return res.status(403).json({ error: 'Only a creator/admin of this DAO can enrol members' });
  }

  const existing = await prisma.ussdUser.findUnique({ where: { phoneNumber: e164 }, include: { user: true } });
  if (existing) {
    return res.json({ phoneNumber: e164, walletAddress: existing.user.circleWalletAddress, alreadyEnrolled: true });
  }

  try {
    const user = await prisma.user.create({
      data: { walletAddress: `ussd:${e164}`.toLowerCase(), walletTier: 'CUSTODIAL' },
    });
    const { wallet } = await ensureWallet(user.id);
    if (wallet?.address) {
      await prisma.user.update({ where: { id: user.id }, data: { walletAddress: wallet.address.toLowerCase() } });
    }
    await prisma.ussdUser.create({
      data: { phoneNumber: e164, userId: user.id, enrolledBy: req.auth!.walletAddress },
    });
    res.json({ phoneNumber: e164, walletAddress: wallet?.address, alreadyEnrolled: false });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Enrolment failed' });
  }
});

export default router;
