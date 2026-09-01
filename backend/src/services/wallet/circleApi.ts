import { randomUUID } from 'crypto';

const BASE = 'https://api.circle.com/v1/w3s';
const TIMEOUT_MS = 15_000;

export function circleConfigured(): boolean {
  return !!process.env.CIRCLE_API_KEY?.trim();
}

type CircleInit = {
  method?: string;
  body?: unknown;
  userToken?: string;
};

/** Thin Circle W3S REST wrapper: bearer auth, request id, hard timeout, typed errors. */
export async function circle<T = unknown>(path: string, init: CircleInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CIRCLE_API_KEY}`,
        'X-Request-Id': randomUUID(),
        ...(init.userToken ? { 'X-User-Token': init.userToken } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as { data?: T; message?: string }) : {};
    if (!res.ok) {
      throw new Error(`Circle ${path} → ${res.status} ${json?.message ?? text}`);
    }
    return (json.data ?? {}) as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Circle ${path} timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const newIdempotencyKey = randomUUID;
