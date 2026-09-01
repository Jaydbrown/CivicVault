import { apiFetch } from "./apiFetch";

/**
 * Naira ⇄ USDC display helpers. The chain only ever holds USDC (6dp); people —
 * especially the USSD tier — think in ₦. Conversion at deposit/withdraw time is
 * done by a licensed partner; this is the display + estimate layer.
 */

const FALLBACK_RATE = 1600; // ₦/USD until the backend answers
let _rate = FALLBACK_RATE;

export async function refreshNairaRate(): Promise<number> {
  try {
    const { usdNgn } = await apiFetch<{ usdNgn: number }>("/api/fiat/rate", { auth: false });
    if (Number.isFinite(usdNgn) && usdNgn > 0) _rate = usdNgn;
  } catch {
    /* keep last known / fallback */
  }
  return _rate;
}

export function nairaRate(): number {
  return _rate;
}

/** USDC minor units (6dp) → "₦12,500". */
export function formatNaira(usdc6: bigint | string): string {
  const raw = typeof usdc6 === "string" ? BigInt(usdc6 || "0") : usdc6;
  const naira = (Number(raw) / 1_000_000) * _rate;
  return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(
    Number.isFinite(naira) ? Math.round(naira) : 0,
  )}`;
}

/** "5,000" or "5000" (₦) → USDC minor units (6dp). */
export function parseNairaToUsdc6(input: string): bigint {
  const naira = Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(naira) || naira <= 0) return 0n;
  return BigInt(Math.floor((naira / _rate) * 1_000_000));
}

/** USDC minor units (6dp) → "$3.00" */
export function formatUsd(usdc6: bigint | string): string {
  const raw = typeof usdc6 === "string" ? BigInt(usdc6 || "0") : usdc6;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(raw) / 1_000_000,
  );
}
