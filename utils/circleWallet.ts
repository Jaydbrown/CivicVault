import { apiFetch } from "./apiFetch";

/**
 * Tier 1 (smartphone / web): Circle *user-controlled* wallet. The MPC key is
 * split between the user (passkey / PIN, entered in the Circle web SDK) and
 * Circle. This frontend and the CivicVault backend hold NO signing share — the
 * backend only produces challenges the user approves here. Gas is sponsored by
 * a Circle Gas Station policy on the wallet set.
 */

export type CircleWalletInfo = {
  address: string;
  tier: "USER_CONTROLLED" | "CUSTODIAL";
  state: string;
  usdcBalance: string; // minor units, 6dp
  nairaBalance: number;
  nairaRate: number;
};

export type ChallengeEnvelope = {
  challengeId: string;
  userToken: string;
  encryptionKey: string;
};

const CIRCLE_APP_ID = (import.meta.env.VITE_CIRCLE_APP_ID as string | undefined)?.trim() ?? "";

let _sdk: unknown = null;

async function getSdk(): Promise<{
  setAppSettings: (s: { appId: string }) => void;
  setAuthentication: (a: { userToken: string; encryptionKey: string }) => void;
  execute: (challengeId: string, cb: (err: unknown, res: unknown) => void) => void;
}> {
  if (_sdk) return _sdk as never;
  if (!CIRCLE_APP_ID) throw new Error("VITE_CIRCLE_APP_ID is not set");
  const mod = await import("@circle-fin/w3s-pw-web-sdk");
  const W3SSdk = (mod as { W3SSdk: new () => unknown }).W3SSdk;
  const sdk = new W3SSdk() as never;
  (sdk as { setAppSettings: (s: { appId: string }) => void }).setAppSettings({ appId: CIRCLE_APP_ID });
  _sdk = sdk;
  return sdk;
}

/** Opens the Circle passkey/PIN UI and resolves when the challenge completes. */
export async function runChallenge(env: ChallengeEnvelope): Promise<void> {
  const sdk = await getSdk();
  sdk.setAuthentication({ userToken: env.userToken, encryptionKey: env.encryptionKey });
  await new Promise<void>((resolve, reject) => {
    sdk.execute(env.challengeId, (err: unknown, res: unknown) => {
      if (err) return reject(err instanceof Error ? err : new Error(String(err)));
      const status = (res as { status?: string } | null)?.status;
      if (status && status !== "COMPLETE") return reject(new Error(`Challenge ${status}`));
      resolve();
    });
  });
}

type EnsureResp = { wallet?: Omit<CircleWalletInfo, "usdcBalance" | "nairaBalance" | "nairaRate"> & { address: string }; setup?: ChallengeEnvelope };

/** Provision (idempotently) the caller's wallet, running the one-time setup challenge if needed. */
export async function ensureCircleWallet(): Promise<CircleWalletInfo> {
  const first = await apiFetch<EnsureResp>("/api/wallet/ensure", { method: "POST" });
  if (first.setup) {
    await runChallenge(first.setup);
    // Wallet now exists on Circle's side; a second ensure resolves + persists it.
    await apiFetch<EnsureResp>("/api/wallet/ensure", { method: "POST" });
  }
  return getCircleWallet();
}

export async function getCircleWallet(): Promise<CircleWalletInfo> {
  return apiFetch<CircleWalletInfo>("/api/wallet");
}

export async function tryGetCircleWallet(): Promise<CircleWalletInfo | null> {
  try {
    return await getCircleWallet();
  } catch {
    return null;
  }
}

export function circleAppIdConfigured(): boolean {
  return CIRCLE_APP_ID.length > 0;
}
