import { getAddress } from 'viem';

import { prisma } from '../../db/prisma';
import { CIRCLE_BLOCKCHAIN, usdcBalanceOf } from '../../chain/arc';
import { circle, newIdempotencyKey } from './circleApi';
import { entitySecretCiphertext } from './entitySecret';
import type { ChallengeEnvelope, ContractCall, SubmitResult, TxStatus, WalletInfo, WalletProvider } from './types';

/**
 * Feature-phone / USSD tier. A `*123#` session can't hold a key, so these
 * wallets are developer-controlled (custodial): the backend signs, authorised
 * upstream by the member's USSD PIN. Blast radius is bounded three ways:
 *   1. txPolicy (services/wallet/txPolicy.ts) — vote / claim / capped-approve
 *      only, never a transfer-out
 *   2. per-wallet USDC balance cap (CUSTODIAL_WALLET_CAP_USDC)
 *   3. every call written to CircleTxLog + anomaly alerts (services/wallet/index.ts)
 *
 * Uses the Circle W3S REST API directly (same as the user-controlled tier) with
 * a per-request entity-secret ciphertext — no SDK dependency.
 */

const WALLET_CAP = BigInt(process.env.CUSTODIAL_WALLET_CAP_USDC ?? '50') * 1_000_000n;

type WalletsResp = { wallets: Array<{ id: string; address: string; blockchain: string; state: string }> };
type TxCreateResp = { id: string; state: string };
type TxResp = { transaction: { id: string; state: string; txHash?: string; errorReason?: string } };

function requireConfig(): void {
  if (
    !process.env.CIRCLE_API_KEY?.trim() ||
    !process.env.CIRCLE_ENTITY_SECRET?.trim() ||
    !process.env.CIRCLE_WALLET_SET_ID?.trim()
  ) {
    throw new Error('Custodial (USSD) wallets need CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET + CIRCLE_WALLET_SET_ID');
  }
}

function mapState(s: string): TxStatus['state'] {
  const up = s.toUpperCase();
  if (['CONFIRMED', 'COMPLETE'].includes(up)) return 'CONFIRMED';
  if (['FAILED', 'CANCELLED', 'DENIED'].includes(up)) return 'FAILED';
  return 'PENDING';
}

export class CustodialCircleProvider implements WalletProvider {
  readonly tier = 'CUSTODIAL' as const;

  async ensureWallet(userId: string): Promise<{ wallet?: WalletInfo; setup?: ChallengeEnvelope }> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.circleWalletId && user.circleWalletAddress) {
      return {
        wallet: {
          address: getAddress(user.circleWalletAddress),
          tier: this.tier,
          circleWalletId: user.circleWalletId,
          state: 'LIVE',
        },
      };
    }
    requireConfig();

    const { wallets } = await circle<WalletsResp>('/developer/wallets', {
      method: 'POST',
      body: {
        idempotencyKey: newIdempotencyKey(),
        entitySecretCiphertext: await entitySecretCiphertext(),
        walletSetId: process.env.CIRCLE_WALLET_SET_ID,
        accountType: 'SCA',
        blockchains: [CIRCLE_BLOCKCHAIN],
        count: 1,
      },
    });
    const w = wallets[0];
    if (!w) throw new Error('Circle returned no wallet');

    await prisma.user.update({
      where: { id: userId },
      data: { circleWalletId: w.id, circleWalletAddress: getAddress(w.address), walletTier: 'CUSTODIAL' },
    });
    return { wallet: { address: getAddress(w.address), tier: this.tier, circleWalletId: w.id, state: w.state } };
  }

  async getWallet(userId: string): Promise<WalletInfo | null> {
    const { wallet } = await this.ensureWallet(userId);
    return wallet ?? null;
  }

  async submitContractCall(userId: string, call: ContractCall): Promise<SubmitResult> {
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('No custodial wallet');
    requireConfig();

    // Balance cap is a tier invariant, re-checked at call time.
    if ((await usdcBalanceOf(wallet.address)) > WALLET_CAP) {
      throw new Error('Custodial wallet is over the balance cap — sweep before transacting');
    }

    const res = await circle<TxCreateResp>('/developer/transactions/contractExecution', {
      method: 'POST',
      body: {
        idempotencyKey: call.refId,
        entitySecretCiphertext: await entitySecretCiphertext(),
        walletId: wallet.circleWalletId,
        contractAddress: call.contractAddress,
        abiFunctionSignature: call.abiFunctionSignature,
        abiParameters: call.abiParameters,
        feeLevel: 'MEDIUM',
        refId: call.refId,
      },
    });
    if (!res.id) throw new Error('Circle did not return a transaction id');
    return { kind: 'submitted', refId: call.refId, circleTxId: res.id };
  }

  async getTxStatus(userId: string, refId: string): Promise<TxStatus> {
    const log = await prisma.circleTxLog.findUnique({ where: { refId } });
    if (!log?.circleTxId || log.userId !== userId) return { state: 'CREATED' };

    const { transaction } = await circle<TxResp>(`/transactions/${log.circleTxId}`);
    if (!transaction) return { state: 'PENDING' };
    return { state: mapState(transaction.state), txHash: transaction.txHash, error: transaction.errorReason };
  }
}
