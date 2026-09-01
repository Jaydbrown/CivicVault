/**
 * Outbound SMS via Africa's Talking. Used for transaction confirmations to the
 * feature-phone tier. No-op (logged) when unconfigured.
 */
export async function sendSms(to: string, message: string): Promise<void> {
  const username = process.env.AT_USERNAME?.trim();
  const apiKey = process.env.AT_API_KEY?.trim();
  if (!username || !apiKey) {
    console.log(`[sms:noop] ${to} :: ${message}`);
    return;
  }

  const base =
    process.env.AT_BASE_URL?.trim() ||
    (username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com');
  try {
    const body = new URLSearchParams({ username, to, message });
    if (process.env.AT_SENDER_ID?.trim()) body.set('from', process.env.AT_SENDER_ID.trim());

    const res = await fetch(`${base}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`[sms] ${res.status} ${await res.text().catch(() => '')}`);
  } catch (err) {
    console.warn('[sms] send failed:', err instanceof Error ? err.message : err);
  }
}
