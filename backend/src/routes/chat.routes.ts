import { randomUUID } from 'crypto';

import { Router } from 'express';

import { prisma } from '../db/prisma';
import { rabbitUrlConfigured } from '../messaging/connection';
import { enqueueChatWebhookJob } from '../messaging/publish/chatMessage.publisher';
import type { ChatMessageReceivedPayload } from '../messaging/types';
import {
  processChatMessageDispatch,
} from '../services/chat-notification.processor';

import { normalizeWalletAddress } from '../utils/wallet';
import { requireAuth } from '../middleware/auth';
import { anyIsDaoMember } from '../chain/reads';
import { daoChatConfigured, insertDaoChatMessage } from '../services/daoChat.service';

const router = Router();

/**
 * POST /api/chat/message — the only authorised write path for DAO chat.
 * The caller must be a verified member of `daoAddress` on-chain (checked
 * against their linked wallet and their Circle wallet). Reads + realtime
 * stay client-direct.
 */
router.post('/message', requireAuth, async (req, res) => {
  try {
    if (!daoChatConfigured()) {
      return res.status(503).json({ error: 'Chat backend not configured' });
    }
    const daoRaw = typeof req.body?.daoAddress === 'string' ? req.body.daoAddress.trim().toLowerCase() : '';
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const attachmentUrl =
      typeof req.body?.attachmentUrl === 'string' && req.body.attachmentUrl.trim()
        ? req.body.attachmentUrl.trim()
        : null;
    const senderLabel = typeof req.body?.senderLabel === 'string' ? req.body.senderLabel.trim() : '';

    if (!/^0x[a-f0-9]{40}$/.test(daoRaw)) return res.status(400).json({ error: 'Invalid DAO address' });
    if (!content && !attachmentUrl) return res.status(400).json({ error: 'Message cannot be empty' });

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    const candidates = [req.auth!.walletAddress, user?.circleWalletAddress ?? null];

    if (!(await anyIsDaoMember(daoRaw, candidates))) {
      return res.status(403).json({ error: 'Only verified members of this DAO can post here' });
    }

    const message = await insertDaoChatMessage({
      daoAddress: daoRaw,
      senderWallet: req.auth!.walletAddress,
      senderLabel: senderLabel || req.auth!.walletAddress,
      content,
      attachmentUrl,
    });
    res.json({ message });
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Failed to send message' });
  }
});

router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { walletAddress: rawWallet, daoAddress: rawDao, receiveNotifications, email } = req.body;
    const walletAddress = normalizeWalletAddress(rawWallet);
    const daoNorm = typeof rawDao === 'string' ? rawDao.trim().toLowerCase() : '';

    if (!walletAddress) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    if (!daoNorm || !daoNorm.startsWith('0x')) {
      return res.status(400).json({ error: 'Invalid DAO address' });
    }

    console.log('📝 Subscribe request:', { walletAddress, daoAddress: daoNorm, receiveNotifications });

    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { walletAddress, email: typeof email === 'string' && email.trim() ? email.trim() : undefined },
      });
    } else if (email && typeof email === 'string' && email.trim() && !user.email) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { email: email.trim() },
      });
    }

    const subscription = await prisma.chatSubscription.upsert({
      where: {
        userId_daoAddress: {
          userId: user.id,
          daoAddress: daoNorm,
        },
      },
      update: { receiveNotifications: Boolean(receiveNotifications) },
      create: {
        userId: user.id,
        daoAddress: daoNorm,
        receiveNotifications: Boolean(receiveNotifications),
      },
    });

    console.log('✅ Subscription created:', subscription.id);
    res.json({ success: true, subscription });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Subscribe error:', message);
    res.status(500).json({ error: message });
  }
});

// Auth required — self-only. Which DAOs a wallet is subscribed to
// notifications for shouldn't be enumerable by anyone else.
router.get('/subscriptions/:walletAddress', requireAuth, async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.params.walletAddress);
    if (!walletAddress) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        chatSubscriptions: true,
      },
    });

    res.json(user?.chatSubscriptions || []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get subscriptions error:', message);
    res.status(500).json({ error: message });
  }
});

/**
 * Webhook publishes to RabbitMQ (preferred) — workers handle DB writes + SMTP jobs.
 * Falls back synchronous if broker absent or publish fails.
 *
 * This fires the actual outbound emails (via the CivicVault Gmail mailbox) to
 * every DAO subscriber, so it must be gated the same way as `/message`: the
 * caller must be authenticated and a verified member of `daoAddress` — an open
 * version of this let anyone relay arbitrary HTML through our Gmail account to
 * real users' inboxes. `senderWallet` (the real identity) always comes from
 * the verified token, never the body. `senderName` is a cosmetic display
 * label the caller may still supply — it must never be an email address,
 * since it gets broadcast to every other subscriber in the outbound email.
 */
router.post('/webhook/new-message', requireAuth, async (req, res) => {
  try {
    const { daoAddress, daoName, message, senderName, timestamp } = req.body;
    const daoKey = typeof daoAddress === 'string' ? daoAddress.trim().toLowerCase() : '';

    if (!daoKey) {
      return res.status(400).json({ error: 'daoAddress is required' });
    }
    if (!/^0x[a-f0-9]{40}$/.test(daoKey)) {
      return res.status(400).json({ error: 'Invalid DAO address' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    const candidates = [req.auth!.walletAddress, user?.circleWalletAddress ?? null];
    if (!(await anyIsDaoMember(daoKey, candidates))) {
      return res.status(403).json({ error: 'Only verified members of this DAO can trigger notifications for it' });
    }

    // A cosmetic display label the caller may supply (same fallback pattern
    // as /message's senderLabel) — never the sender's email, which would
    // otherwise get broadcast to every other subscriber in this DAO. Capped
    // and always suffixed with the real (short) address: a verified member
    // could otherwise pick an arbitrary label (e.g. "CivicVault Support")
    // to impersonate someone else in the notification — low risk since it's
    // HTML-escaped and limited to verified members, but the short address
    // gives every recipient a way to see who actually sent it regardless.
    const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    const MAX_SENDER_NAME_LEN = 40;
    const bodySenderName = typeof senderName === 'string' ? senderName.trim().slice(0, MAX_SENDER_NAME_LEN) : '';

    const preview = typeof message === 'string' ? message : '';
    const msgStr = bodySenderName
      ? `${bodySenderName} (${shortAddr(req.auth!.walletAddress)})`
      : shortAddr(req.auth!.walletAddress);
    const titleDao = typeof daoName === 'string' ? daoName : 'Community';
    const ts = typeof timestamp === 'number' ? timestamp : Date.now();
    const sender = req.auth!.walletAddress;

    console.log(`📨 Webhook: ${titleDao} from ${msgStr}`);

    if (rabbitUrlConfigured()) {
      try {
        const { correlationId } = await enqueueChatWebhookJob({
          daoAddress: daoKey,
          daoName: titleDao,
          message: preview,
          senderWallet: sender,
          senderName: msgStr,
          timestamp: ts,
        });

        const excludingSender = normalizeWalletAddress(sender);
        const estimatedRecipients = await prisma.chatSubscription.count({
          where: {
            daoAddress: daoKey,
            receiveNotifications: true,
            ...(excludingSender
              ? { user: { walletAddress: { not: excludingSender } } }
              : {}),
          },
        });

        return res.status(202).json({
          success: true,
          queued: true,
          correlationId,
          estimatedRecipients: Math.max(0, estimatedRecipients),
        });
      } catch (queueErr: unknown) {
        const warn = queueErr instanceof Error ? queueErr.message : String(queueErr);
        console.warn('[webhook] RabbitMQ publish failed — running synchronous pipeline:', warn);
      }
    }

    const correlationId = `sync:${randomUUID()}`;
    const payload: ChatMessageReceivedPayload = {
      v: 1,
      correlationId,
      daoAddress: daoKey,
      daoName: titleDao,
      message: preview,
      senderWallet: sender,
      senderName: msgStr,
      timestamp: ts,
    };

    const outcome = await processChatMessageDispatch(payload, null, { mode: 'sync' });

    return res.json({
      success: true,
      queued: false,
      correlationId,
      notified: outcome.emailJobsPublished,
      inAppNotifications: outcome.inAppNotifications,
      subscribers: outcome.subscriberCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
