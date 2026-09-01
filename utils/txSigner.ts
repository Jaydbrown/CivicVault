import { apiFetch } from "./apiFetch";
import { runChallenge, type ChallengeEnvelope } from "./circleWallet";
import type { PrivyEthereumWallet } from "./civicVaultContracts";

/**
 * Member actions (vote, claim, withdraw, governance) can be signed two ways:
 *  - `external` — a linked wallet (MetaMask etc.), the existing viem path
 *  - `circle`   — a Circle user-controlled wallet: POST calldata to the backend,
 *                 complete the passkey/PIN challenge, poll for the tx hash
 *
 * Admin actions stay `external` only — the backend tx-policy allowlist does not
 * include them, by design.
 */
export type MemberSigner =
  | { kind: "external"; wallet: PrivyEthereumWallet }
  | { kind: "circle"; address: string };

export type SubmitCall = {
  daoAddress: string;
  functionName: string;
  args: unknown[];
};

type CallResp =
  | { kind: "challenge"; refId: string; envelope: ChallengeEnvelope }
  | { kind: "submitted"; refId: string; circleTxId: string };

type TxResp = { state: "CREATED" | "PENDING" | "CONFIRMED" | "FAILED"; txHash?: string; error?: string };

function jsonSafe(args: unknown[]): unknown[] {
  return args.map((a) => (typeof a === "bigint" ? a.toString() : a));
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 120_000;

/** Route one contract call through the Circle backend and wait for it to land. */
export async function circleSubmit(call: SubmitCall): Promise<{ txHash: string }> {
  const resp = await apiFetch<CallResp>("/api/wallet/call", {
    method: "POST",
    body: JSON.stringify({
      daoAddress: call.daoAddress,
      functionName: call.functionName,
      args: jsonSafe(call.args),
    }),
  });

  if (resp.kind === "challenge") {
    await runChallenge(resp.envelope);
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await apiFetch<TxResp>(`/api/wallet/tx/${resp.refId}`, { auth: true });
    if (status.state === "CONFIRMED") return { txHash: status.txHash ?? "" };
    if (status.state === "FAILED") throw new Error(status.error || "Transaction failed");
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Timed out waiting for the transaction to confirm");
}
