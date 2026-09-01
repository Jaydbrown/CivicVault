import { Router } from 'express';
import { prisma } from '../db/prisma';
import { normalizeWalletAddress } from '../utils/wallet';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/notifications/:walletAddress
// Query params: ?page=1&limit=20&unread=true
router.get('/:walletAddress', async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const toInt = (v: unknown, fallback: number) => {
      const n = parseInt(typeof v === 'string' ? v : '', 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const page  = toInt(req.query.page, 1);
    const limit = Math.min(50, toInt(req.query.limit, 20));
    const onlyUnread = req.query.unread === 'true';

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.json({ notifications: [], total: 0, unreadCount: 0, page, limit, pages: 0 });

    const where = { userId: user.id, ...(onlyUnread ? { isRead: false } : {}) };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) return res.status(400).json({ error: 'Missing notification id' });

    const { count } = await prisma.notification.updateMany({
      where: { id, userId: req.auth!.userId },
      data: { isRead: true },
    });
    if (count === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// PATCH /api/notifications/all/:walletAddress/read — mark all as read
router.patch('/all/:walletAddress/read', requireAuth, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.json({ success: true, updated: 0 });

    const { count } = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, updated: count });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// DELETE /api/notifications/read/:walletAddress — purge all read notifications
router.delete('/read/:walletAddress', requireAuth, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) return res.status(400).json({ error: 'Invalid wallet address' });

    const user = await prisma.user.findUnique({ where: { walletAddress } });
    if (!user) return res.json({ success: true, deleted: 0 });

    const { count } = await prisma.notification.deleteMany({
      where: { userId: user.id, isRead: true },
    });
    res.json({ success: true, deleted: count });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
