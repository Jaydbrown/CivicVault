/** Small display helpers shared across views. Pure, no deps. */

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** USDC minor units (6dp) → "$1,240" or "$1.2M" for large values. */
export function compactUsd(usdc6: bigint | string): string {
  const raw = typeof usdc6 === "string" ? BigInt(usdc6 || "0") : usdc6;
  const n = Number(raw) / 1_000_000;
  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 10_000) return `$${(n / 1_000).toFixed(0)}K`;
  return USD.format(n).replace(/\.00$/, "");
}

/** Unix seconds → "just now" / "5m ago" / "3h ago" / "2d ago" / "Apr 3". */
export function timeAgo(unixSeconds: number | bigint): string {
  const s = Number(unixSeconds);
  if (!s) return "";
  const diff = Math.floor(Date.now() / 1000) - s;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)}d ago`;
  return new Date(s * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Seconds remaining → "2d 4h left" / "6h 12m left" / "Ended". */
export function countdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "Ended";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

/** "0x1234…abcd" */
export function shortHash(hash: string, lead = 6, tail = 4): string {
  if (!hash || hash.length <= lead + tail + 2) return hash;
  return `${hash.slice(0, lead + 2)}…${hash.slice(-tail)}`;
}
