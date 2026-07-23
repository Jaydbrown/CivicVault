import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { closePublishConnectionGracefully, rabbitHealthCheck } from './messaging/connection';
import { prisma } from './db/prisma';

import authRoutes         from './routes/auth.routes';
import chatRoutes         from './routes/chat.routes';
import notificationRoutes from './routes/notifications.routes';
import usersRoutes        from './routes/users.routes';
import circleWalletRoutes from './routes/circleWallet.routes';

const app = express();

const allowedOrigins = [
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : ['http://localhost:3000']),
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth',          authRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users',         usersRoutes);
app.use('/api/circle-wallet', circleWalletRoutes);

// Platform statistics
app.get('/api/stats', async (_req, res) => {
  try {
    const [totalUsers, totalNotifications, activeSubscriptions, unreadNotifications] = await Promise.all([
      prisma.user.count(),
      prisma.notification.count(),
      prisma.chatSubscription.count({ where: { receiveNotifications: true } }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);
    res.json({ totalUsers, totalNotifications, activeSubscriptions, unreadNotifications, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', async (_req, res) => {
  const gmailOAuth         = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
  const fromEmail          = !!(process.env.GMAIL_FROM_EMAIL?.trim() || process.env.GMAIL_USER?.trim());
  const oauthMailer        = !!process.env.GMAIL_MAILER_REFRESH_TOKEN?.trim();
  const appPassword        = !!process.env.GMAIL_APP_PASSWORD?.trim();
  const rabbit             = await rabbitHealthCheck();
  res.json({
    status: 'ok',
    gmailConfigured: gmailOAuth,
    outboundMailConfigured: fromEmail && (oauthMailer || appPassword),
    rabbitmq: rabbit,
    timestamp: new Date().toISOString(),
  });
});

// API directory
app.get('/', (_req, res) => {
  res.json({
    message: 'CivicVault Backend Running!',
    endpoints: {
      auth: {
        'POST /api/auth/sync-identity':               'Upsert user; link wallet + email + privyUserId',
        'POST /api/auth/gmail/connect':               'Begin Gmail OAuth flow',
        'GET  /api/auth/gmail/callback':              'OAuth redirect handler',
        'GET  /api/auth/preferences/:wallet':         'Gmail connection status',
      },
      chat: {
        'POST /api/chat/subscribe':                   'Subscribe wallet to DAO notifications',
        'GET  /api/chat/subscriptions/:wallet':       'List DAO subscriptions for wallet',
        'POST /api/chat/webhook/new-message':         'Trigger chat email notifications (202 queued)',
      },
      users: {
        'POST   /api/users':                          'Create or upsert user',
        'GET    /api/users/:wallet':                  'Get user (with preferences + recent notifications)',
        'PATCH  /api/users/:wallet':                  'Update email address',
        'GET    /api/users/:wallet/profile':          'Enriched profile with unread + subscription counts',
        'GET    /api/users/:wallet/preferences':      'Get notification preferences',
        'PATCH  /api/users/:wallet/preferences':      'Update notification preferences',
        'GET    /api/users/:wallet/subscriptions':    'List DAO chat subscriptions',
      },
      notifications: {
        'GET    /api/notifications/:wallet':          'Paginated in-app notifications (?page&limit&unread)',
        'PATCH  /api/notifications/:id/read':         'Mark one notification read',
        'PATCH  /api/notifications/all/:wallet/read': 'Mark all notifications read',
        'DELETE /api/notifications/read/:wallet':     'Purge all read notifications',
      },
      platform: {
        'GET /api/stats':                             'Platform-wide counts (users, notifications, subscriptions)',
        'GET /api/health':                            'Service health check',
      },
    },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📧 Gmail OAuth: ${process.env.GMAIL_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  const hasFrom     = !!(process.env.GMAIL_FROM_EMAIL?.trim() || process.env.GMAIL_USER?.trim());
  const hasOutbound = !!(process.env.GMAIL_MAILER_REFRESH_TOKEN?.trim() || process.env.GMAIL_APP_PASSWORD?.trim());
  if (hasFrom && hasOutbound) {
    console.log('📧 Outbound SMTP: Ready');
  } else {
    console.warn('📧 Outbound mail not fully configured — set GMAIL_FROM_EMAIL + GMAIL_MAILER_REFRESH_TOKEN or GMAIL_APP_PASSWORD');
  }
  if (process.env.RABBITMQ_URL?.trim()) {
    console.log('🐇 RabbitMQ: configured — run `npm run worker` for consumers');
  } else {
    console.warn('🐇 RabbitMQ: disabled — webhook runs synchronously');
  }
});

const shutdownApi = async (signal: string) => {
  console.warn(`${signal}: closing Rabbit publish channel…`);
  await closePublishConnectionGracefully();
  process.exit(0);
};
process.once('SIGINT',  () => void shutdownApi('SIGINT'));
process.once('SIGTERM', () => void shutdownApi('SIGTERM'));
