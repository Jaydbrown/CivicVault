import { Router } from 'express';
import { prisma } from '../db/prisma';
import { normalizeWalletAddress } from '../utils/wallet';

const router = Router();

// POST /api/users — create or upsert user by wallet address
router.post('/', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });
    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: {},
      create: { walletAddress },
    });
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/users/:walletAddress — user with preferences + notifications
router.get('/:walletAddress', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { preferences: true, notifications: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { gmailAccessToken: _a, gmailRefreshToken: _r, ...safe } = user;
    res.json(safe);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/users/:walletAddress/subscriptions — chat subscriptions
router.get('/:walletAddress/subscriptions', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });
    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { chatSubscriptions: true },
    });
    res.json(user?.chatSubscriptions ?? []);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const VALID_DIGEST_VALUES = ['INSTANT', 'DAILY', 'NEVER'] as const;

// GET /api/users/:walletAddress/profile — enriched user profile
router.get('/:walletAddress/profile', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        preferences: true,
        chatSubscriptions: { where: { receiveNotifications: true } },
        notifications: {
          where: { isRead: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const [totalNotifications, unreadCount, activeSubscriptions] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id } }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
      prisma.chatSubscription.count({ where: { userId: user.id, receiveNotifications: true } }),
    ]);

    // Strip sensitive OAuth tokens before returning
    const { gmailAccessToken: _a, gmailRefreshToken: _r, ...safeUser } = user;

    res.json({
      ...safeUser,
      gmailConnected: !!user.gmailRefreshToken,
      totalNotifications,
      unreadCount,
      activeSubscriptions,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PATCH /api/users/:walletAddress — update email
router.patch('/:walletAddress', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const emailRaw = req.body?.email;
    const email = typeof emailRaw === 'string' ? (emailRaw.trim() || null) : undefined;

    if (email === undefined) return res.status(400).json({ error: 'No updatable fields provided' });

    // Release the email from any other wallet before claiming it
    if (email) {
      await prisma.user.updateMany({
        where: { email, NOT: { walletAddress } },
        data: { email: null },
      });
    }

    const user = await prisma.user.upsert({
      where: { walletAddress },
      update: { email },
      create: { walletAddress, email: email ?? undefined },
    });

    const { gmailAccessToken: _a, gmailRefreshToken: _r, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /api/users/:walletAddress/preferences — get email notification preferences
router.get('/:walletAddress/preferences', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { preferences: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.preferences ?? { defaults: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PATCH /api/users/:walletAddress/preferences — update notification preferences
router.patch('/:walletAddress/preferences', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      notifyNewInvestment,
      notifyVoteCast,
      notifyYieldAvailable,
      notifyInvestmentActive,
      emailDigest,
    } = req.body;

    const updates: Record<string, boolean | string> = {};
    if (typeof notifyNewInvestment  === 'boolean') updates.notifyNewInvestment  = notifyNewInvestment;
    if (typeof notifyVoteCast       === 'boolean') updates.notifyVoteCast       = notifyVoteCast;
    if (typeof notifyYieldAvailable === 'boolean') updates.notifyYieldAvailable = notifyYieldAvailable;
    if (typeof notifyInvestmentActive === 'boolean') updates.notifyInvestmentActive = notifyInvestmentActive;
    if (typeof emailDigest === 'string' && (VALID_DIGEST_VALUES as readonly string[]).includes(emailDigest)) {
      updates.emailDigest = emailDigest;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid preference fields provided' });
    }

    const preferences = await prisma.emailPreference.upsert({
      where: { userId: user.id },
      update: updates,
      create: { userId: user.id, ...updates },
    });

    res.json({ success: true, preferences });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
