import { createHmac, timingSafeEqual } from 'crypto';

import { Router } from 'express';
import { google } from 'googleapis';
import { prisma } from '../db/prisma';
import { normalizeWalletAddress } from '../utils/wallet';
import { authConfigured, requireAuth, verifyBearer } from '../middleware/auth';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

/**
 * `state` round-trips through Google and back to us unauthenticated — the
 * callback has no session, no bearer token, nothing but this string to know
 * whose account to attach Gmail to. A bare user id there is a problem even
 * with /gmail/connect locked down: client_id/redirect_uri/scope are public
 * (they're in every URL this app hands out), so anyone who *learns* a
 * victim's internal user id can build the consent URL by hand and skip
 * /gmail/connect entirely. Signing state with an HMAC + a short expiry
 * means the callback only accepts a state this server itself issued
 * recently — a bare user id, however obtained, no longer verifies.
 */
const GMAIL_STATE_SECRET = process.env.GMAIL_STATE_SECRET?.trim();
const GMAIL_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — ample for a consent flow

function signGmailState(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + GMAIL_STATE_TTL_MS })).toString('base64url');
  const sig = createHmac('sha256', GMAIL_STATE_SECRET!).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyGmailState(state: string): string | null {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  const expectedSig = createHmac('sha256', GMAIL_STATE_SECRET!).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { userId, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof userId !== 'string' || typeof exp !== 'number' || Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

/**
 * Generate a Gmail auth URL. `state` carries the user id the callback will
 * write the resulting email/tokens onto — without auth here, anyone could
 * name someone else's wallet in the body, complete the OAuth consent with
 * their OWN Google account, and have the callback attach their Gmail
 * address to the victim's account (redirecting the victim's notifications
 * to the attacker's inbox). `state` is now always the caller's own,
 * verified user id — never derived from the request body.
 *
 * Scope is intentionally just `userinfo.email`: this flow only ever uses
 * it to capture an address for notification delivery. `gmail.send` and
 * `gmail.readonly` were previously requested (full send + whole-inbox-read
 * access) but nothing in this codebase ever uses the resulting per-user
 * token to send or read mail — actual outbound mail goes through the
 * shared CivicVault mailbox (see gmail.service.ts's sendOutboundNotification),
 * not this OAuth grant. Requesting unused scopes is needless blast radius.
 */
router.post('/gmail/connect', requireAuth, async (req, res) => {
  try {
    if (!GMAIL_STATE_SECRET) {
      return res.status(503).json({ error: 'Gmail connect is not configured on this server' });
    }
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email'],
      state: signGmailState(req.auth!.userId),
      prompt: 'consent'
    });

    res.json({ url: authUrl });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// OAuth callback
router.get('/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    console.log('📞 OAuth callback received');

    const userId = GMAIL_STATE_SECRET ? verifyGmailState(String(state ?? '')) : null;
    if (!userId) {
      console.warn('[gmail] rejected callback with invalid/expired/unsigned state');
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?gmail=error`);
      return;
    }

    const { tokens } = await oauth2Client.getToken(code as string);

    // Get user email from token
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email?.trim() || undefined;
    const existing = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token ?? existing?.gmailRefreshToken ?? undefined,
        ...(email ? { email } : {}),
      },
    });

    console.log('✅ Gmail connected successfully for:', userInfo.data.email);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?gmail=connected`);
  } catch (error: any) {
    console.error('❌ OAuth error:', error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?gmail=error`);
  }
});

/**
 * Upsert user by wallet address and optionally bind their Privy user ID + email.
 * Called by the frontend on every login so Gmail and MetaMask sessions converge
 * to the same User record (keyed by walletAddress).
 *
 * If another User row already holds the same email (e.g. an old embedded-wallet
 * record from before the user linked MetaMask), their subscriptions/notifications
 * are migrated to this wallet's record and the orphan row is deleted.
 */
router.post('/sync-identity', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const email: string | undefined =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() || undefined : undefined;

    // When Privy auth is configured, the identity binding is only as trustworthy
    // as its source: take privyUserId from the verified token, never the body.
    const verifiedPrivyId = await verifyBearer(req);
    if (authConfigured() && !verifiedPrivyId) {
      return res.status(401).json({ error: 'A valid Privy access token is required' });
    }
    const privyUserId: string | undefined =
      verifiedPrivyId ??
      (typeof req.body?.privyUserId === 'string' ? req.body.privyUserId.trim() || undefined : undefined);

    // Find the current owner of this wallet address (may not exist yet)
    let user = await prisma.user.findUnique({ where: { walletAddress } });

    // If another record owns the same email, migrate its data here first
    if (email) {
      const emailOwner = await prisma.user.findUnique({ where: { email } });
      if (emailOwner && emailOwner.walletAddress !== walletAddress) {
        // Transfer subscriptions and notifications to this wallet's user (create it first if needed)
        if (!user) {
          user = await prisma.user.create({ data: { walletAddress } });
        }
        await prisma.chatSubscription.updateMany({
          where: { userId: emailOwner.id },
          data: { userId: user.id },
        });
        await prisma.notification.updateMany({
          where: { userId: emailOwner.id },
          data: { userId: user.id },
        });
        // Transfer preferences if this wallet doesn't have any yet
        const existingPrefs = await prisma.emailPreference.findUnique({ where: { userId: user.id } });
        if (!existingPrefs) {
          const orphanPrefs = await prisma.emailPreference.findUnique({ where: { userId: emailOwner.id } });
          if (orphanPrefs) {
            await prisma.emailPreference.update({ where: { id: orphanPrefs.id }, data: { userId: user.id } });
          }
        }
        await prisma.user.delete({ where: { id: emailOwner.id } });
      }
    }

    // Upsert the user record
    const data: Record<string, string | undefined> = {};
    if (email) data.email = email;
    if (privyUserId) data.privyUserId = privyUserId;

    user = await prisma.user.upsert({
      where: { walletAddress },
      update: data,
      create: { walletAddress, ...data },
    });

    const { gmailAccessToken: _a, gmailRefreshToken: _r, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (error: any) {
    console.error('sync-identity error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Check Gmail connection status.
// Auth required — self-only (requireAuth 403s on a wallet/token mismatch).
// The response also no longer echoes `email`: nothing in the app reads it
// from here (only `gmailConnected`), and this route used to leak any user's
// email to whoever knew their wallet address.
router.get('/preferences/:walletAddress', requireAuth, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    res.json({
      gmailConnected: !!user?.gmailRefreshToken,
      walletAddress
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
