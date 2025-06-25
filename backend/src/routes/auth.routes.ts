import { Router } from 'express';
import { google } from 'googleapis';
import { prisma } from '../db/prisma';
import { normalizeWalletAddress } from '../utils/wallet';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Generate Gmail auth URL
router.post('/gmail/connect', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    if (!walletAddress) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    console.log('📧 Gmail connect request for:', walletAddress);

    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress },
      });
    }
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
      state: user.id,
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

    const { tokens } = await oauth2Client.getToken(code as string);

    // Get user email from token
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();

    const email = userInfo.data.email?.trim() || undefined;
    const existing = await prisma.user.findUnique({ where: { id: state as string } });

    await prisma.user.update({
      where: { id: state as string },
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
    const privyUserId: string | undefined =
      typeof req.body?.privyUserId === 'string' ? req.body.privyUserId.trim() || undefined : undefined;

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

// Check Gmail connection status
router.get('/preferences/:walletAddress', async (req, res) => {
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
      email: user?.email,
      walletAddress
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
