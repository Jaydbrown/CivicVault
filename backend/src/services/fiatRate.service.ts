/**
 * Naira ⇄ USDC rate. The USSD/feature-phone tier lets people think in ₦ while
 * the chain only ever holds USDC — this is the display/estimate layer for that.
 *
 * The actual conversion at deposit/withdraw time is done by a licensed on/off-
 * ramp partner (TBD) and settled at their quoted rate. This service is for
 * display and pre-trade estimates only.
 *
 * Source is pluggable. For now: a fixed env rate (`FIAT_USD_NGN_RATE`). Later:
 * a P2P aggregator or the partner's live quote, cached with a short TTL.
 */

const FALLBACK_RATE = 1600; // ₦ per 1 USD, only if env is unset

let _cache: { rate: number; at: number } | null = null;
const TTL_MS = 5 * 60_000;

export async function getUsdNgnRate(): Promise<number> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.rate;

  const envRate = Number(process.env.FIAT_USD_NGN_RATE);
  const rate = Number.isFinite(envRate) && envRate > 0 ? envRate : FALLBACK_RATE;

  _cache = { rate, at: Date.now() };
  return rate;
}

/** USDC (6dp, as bigint) → whole Naira, rounded. */
export async function usdc6ToNaira(usdc6: bigint): Promise<number> {
  const rate = await getUsdNgnRate();
  return Math.round((Number(usdc6) / 1_000_000) * rate);
}

/** Whole Naira → USDC (6dp, as bigint), floored. */
export async function nairaToUsdc6(naira: number): Promise<bigint> {
  const rate = await getUsdNgnRate();
  return BigInt(Math.floor((naira / rate) * 1_000_000));
}
