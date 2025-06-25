import type { ConnectedWallet } from "@privy-io/react-auth";

/**
 * Returns the canonical Ethereum wallet address for the signed-in user.
 *
 * External wallets (MetaMask, injected) are preferred over Privy-managed
 * embedded wallets so that a user who logs in with Gmail but has linked
 * MetaMask always gets their MetaMask address as their on-chain identity.
 */
export function getCanonicalWalletAddress(
  user: unknown,
  wallets: ConnectedWallet[],
): string {
  // Prefer external (non-Privy embedded) ethereum wallets
  const external = wallets.find(
    (w) => w.type === "ethereum" && w.walletClientType !== "privy",
  );
  if (external?.address) return external.address;

  // Fall back to any connected ethereum wallet (embedded)
  const any = wallets.find((w) => w.type === "ethereum");
  if (any?.address) return any.address;

  // Last resort: scan linkedAccounts on the Privy user object
  if (user && typeof user === "object") {
    const accounts = (user as { linkedAccounts?: unknown[] }).linkedAccounts ?? [];
    for (const a of accounts) {
      if (
        a &&
        typeof a === "object" &&
        (a as Record<string, unknown>).type === "wallet" &&
        typeof (a as Record<string, unknown>).address === "string"
      ) {
        return (a as { address: string }).address;
      }
    }
  }

  return "";
}

/**
 * Returns true when the user's active session only has a Privy embedded
 * wallet and has NOT yet linked an external wallet (MetaMask / injected).
 */
export function isEmbeddedWalletOnly(wallets: ConnectedWallet[]): boolean {
  const hasExternal = wallets.some(
    (w) => w.type === "ethereum" && w.walletClientType !== "privy",
  );
  const hasEmbedded = wallets.some(
    (w) => w.type === "ethereum" && w.walletClientType === "privy",
  );
  return hasEmbedded && !hasExternal;
}

/**
 * Returns the verified email address from the Privy user object.
 * Checks Google linked account first, then direct email account.
 */
export function getLinkedEmail(user: unknown): string {
  if (!user || typeof user !== "object") return "";

  // Google OAuth linked account
  const google = (user as { google?: { email?: string } }).google?.email;
  if (google?.trim()) return google.trim();

  // Direct email account
  const email = (user as { email?: { address?: string } }).email?.address;
  if (email?.trim()) return email.trim();

  return "";
}
