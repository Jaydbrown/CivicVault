import type { NextFunction, Request, Response } from 'express';

import { PrivyClient } from '@privy-io/server-auth';

import { prisma } from '../db/prisma';
import { normalizeWalletAddress } from '../utils/wallet';

export type AuthContext = {
  userId: string;
  privyUserId: string;
  walletAddress: string;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

let _privy: PrivyClient | null = null;
function privy(): PrivyClient | null {
  const id = process.env.PRIVY_APP_ID?.trim();
  const secret = process.env.PRIVY_APP_SECRET?.trim();
  if (!id || !secret) return null;
  if (!_privy) _privy = new PrivyClient(id, secret);
  return _privy;
}

export function authConfigured(): boolean {
  return privy() !== null;
}

function bearer(req: Request): string | null {
  const h = req.header('authorization') || req.header('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

/**
 * Verify a bearer token and return the Privy user id, or null if there is no
 * token / it is invalid / auth is not configured. Does not touch the DB — used
 * by the bootstrap route (`sync-identity`) where the User row may not exist yet.
 */
export async function verifyBearer(req: Request): Promise<string | null> {
  const client = privy();
  const token = bearer(req);
  if (!client || !token) return null;
  try {
    const { userId } = await client.verifyAuthToken(token);
    return userId;
  } catch {
    return null;
  }
}

/**
 * Resolves the caller from a Privy access token and attaches `req.auth`.
 * The wallet address the caller may act on comes from the verified token →
 * User row, never from the request body or path. If a `:walletAddress` param
 * or `walletAddress` body field is present it must match, else 403.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = privy();
  if (!client) {
    res.status(503).json({ error: 'Authentication is not configured on this server' });
    return;
  }

  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  let privyUserId: string;
  try {
    const claims = await client.verifyAuthToken(token);
    privyUserId = claims.userId;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { privyUserId } });
  if (!user) {
    res.status(403).json({ error: 'No CivicVault account linked to this login. Call /api/auth/sync-identity first.' });
    return;
  }

  // If the route names a wallet, it must be the caller's own.
  const claimed =
    normalizeWalletAddress(req.params.walletAddress) ??
    normalizeWalletAddress(req.params.wallet) ??
    normalizeWalletAddress(req.body?.walletAddress);
  if (claimed && claimed !== user.walletAddress.toLowerCase()) {
    res.status(403).json({ error: 'Token does not match the requested wallet' });
    return;
  }

  req.auth = { userId: user.id, privyUserId, walletAddress: user.walletAddress };
  next();
}

/** Attaches `req.auth` when a valid token is present; never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const client = privy();
  const token = bearer(req);
  if (!client || !token) return next();
  try {
    const { userId: privyUserId } = await client.verifyAuthToken(token);
    const user = await prisma.user.findUnique({ where: { privyUserId } });
    if (user) req.auth = { userId: user.id, privyUserId, walletAddress: user.walletAddress };
  } catch {
    /* ignore — treat as anonymous */
  }
  next();
}
