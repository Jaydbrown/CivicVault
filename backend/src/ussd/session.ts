/**
 * USSD session state, keyed by the aggregator's sessionId. In-memory: USSD
 * sessions live < 2 minutes and the aggregator drives every step, so a Map with
 * a short TTL is sufficient for a single backend instance. For multi-instance,
 * swap this for Redis (same interface).
 */

export type UssdNode =
  | 'WELCOME'
  | 'SET_PIN'
  | 'SET_PIN_CONFIRM'
  | 'ENTER_PIN'
  | 'MENU'
  | 'VOTE_PICK_DAO'
  | 'VOTE_PICK_INV'
  | 'VOTE_AMOUNT'
  | 'VOTE_CONFIRM'
  | 'GOV_PICK_DAO'
  | 'GOV_PICK_PROP'
  | 'GOV_CONFIRM'
  | 'DAOS_LIST'
  | 'BALANCE';

export type UssdSession = {
  sessionId: string;
  phone: string;
  node: UssdNode;
  authed: boolean;
  userId?: string;
  data: Record<string, string | number>;
  // ephemeral lists shown to the user, so a numeric pick maps back to an id
  choices?: Array<{ label: string; value: string }>;
  pendingPin?: string; // during SET_PIN
  updatedAt: number;
};

const TTL_MS = 3 * 60_000;
const store = new Map<string, UssdSession>();

export function getSession(sessionId: string, phone: string): UssdSession {
  const now = Date.now();
  const existing = store.get(sessionId);
  if (existing && now - existing.updatedAt < TTL_MS) {
    existing.updatedAt = now;
    return existing;
  }
  const fresh: UssdSession = {
    sessionId,
    phone,
    node: 'WELCOME',
    authed: false,
    data: {},
    updatedAt: now,
  };
  store.set(sessionId, fresh);
  return fresh;
}

export function saveSession(s: UssdSession): void {
  s.updatedAt = Date.now();
  store.set(s.sessionId, s);
}

export function endSession(sessionId: string): void {
  store.delete(sessionId);
}

// Periodic sweep so abandoned sessions don't leak.
const sweep = setInterval(() => {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, s] of store) if (s.updatedAt < cutoff) store.delete(id);
}, TTL_MS) as { unref?: () => void };
sweep.unref?.();
