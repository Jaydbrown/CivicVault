import type { WalletTier } from './txPolicy';

export type { WalletTier };

export type WalletInfo = {
  address: string;
  tier: WalletTier;
  circleWalletId: string;
  state: string;
};

/** Extra material the client needs to complete a Circle challenge (Tier 1 only). */
export type ChallengeEnvelope = {
  challengeId: string;
  userToken: string;
  encryptionKey: string;
};

export type SubmitResult =
  // Tier 1: user must complete the challenge in the browser SDK.
  | { kind: 'challenge'; refId: string; envelope: ChallengeEnvelope }
  // Tier 2: backend executed it directly (USSD PIN already authorised upstream).
  | { kind: 'submitted'; refId: string; circleTxId: string };

export type TxStatus = {
  state: 'CREATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | string;
  txHash?: string;
  error?: string;
};

export type ContractCall = {
  contractAddress: `0x${string}`;
  abiFunctionSignature: string;
  abiParameters: unknown[];
  refId: string;
};

export interface WalletProvider {
  readonly tier: WalletTier;
  /** Provision (idempotently) the caller's wallet. May return a challenge for first-time PIN/passkey setup. */
  ensureWallet(userId: string): Promise<{ wallet?: WalletInfo; setup?: ChallengeEnvelope }>;
  getWallet(userId: string): Promise<WalletInfo | null>;
  submitContractCall(userId: string, call: ContractCall): Promise<SubmitResult>;
  /** Resolve a transaction by our own refId (idempotency key). */
  getTxStatus(userId: string, refId: string): Promise<TxStatus>;
}
