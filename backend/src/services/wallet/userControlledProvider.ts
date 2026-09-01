import { getAddress } from 'viem';

import { prisma } from '../../db/prisma';
import { CIRCLE_BLOCKCHAIN } from '../../chain/arc';
import { circle, newIdempotencyKey } from './circleApi';
import type {
  ChallengeEnvelope,
  ContractCall,
  SubmitResult,
  TxStatus,
  WalletInfo,
  WalletProvider,
} from './types';

type TokenResp = { userToken: string; encryptionKey: string };
type WalletsResp = { wallets: Array<{ id: string; address: string; blockchain: string; state: string }> };
type ChallengeResp = { challengeId: string };
type TxRow = { id: string; state: string; txHash?: string; errorReason?: string };
type TxListResp = { transactions: TxRow[] };

function mapState(s: string): TxStatus['state'] {
  const up = s.toUpperCase();
  if (['CONFIRMED', 'COMPLETE'].includes(up)) return 'CONFIRMED';
  if (['FAILED', 'CANCELLED', 'DENIED'].includes(up)) return 'FAILED';
  if (up === 'CREATED') return 'CREATED';
  return 'PENDING';
}

/**
 * Smartphone / web tier. The MPC key is split between the user (passkey/PIN via
 * the Circle web SDK) and Circle. This backend holds NO signing share — it only
 * creates challenges the user must approve, and reads status. Gas is sponsored
 * by a Circle Gas Station policy configured for the wallet set on ARC-TESTNET
 * (SCA account type), so there is no fee param here.
 */
export class UserControlledCircleProvider implements WalletProvider {
  readonly tier = 'USER_CONTROLLED' as const;

  private async circleUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.circleUserId) return user.circleUserId;

    const circleUserId = `cv_${user.id}`;
    await circle('/users', { method: 'POST', body: { userId: circleUserId } });
    await prisma.user.update({ where: { id: userId }, data: { circleUserId, walletTier: 'USER_CONTROLLED' } });
    return circleUserId;
  }

  private async token(circleUserId: string): Promise<TokenResp> {
    return circle<TokenResp>('/users/token', { method: 'POST', body: { userId: circleUserId } });
  }

  async ensureWallet(userId: string): Promise<{ wallet?: WalletInfo; setup?: ChallengeEnvelope }> {
    const circleUserId = await this.circleUserId(userId);
    const { userToken, encryptionKey } = await this.token(circleUserId);

    const { wallets } = await circle<WalletsResp>('/wallets', { userToken });
    const live = wallets.find((w) => w.blockchain === CIRCLE_BLOCKCHAIN);
    if (live) {
      await prisma.user.update({
        where: { id: userId },
        data: { circleWalletId: live.id, circleWalletAddress: getAddress(live.address) },
      });
      return {
        wallet: { address: getAddress(live.address), tier: this.tier, circleWalletId: live.id, state: live.state },
      };
    }

    const { challengeId } = await circle<ChallengeResp>('/user/initialize', {
      method: 'POST',
      userToken,
      body: { idempotencyKey: newIdempotencyKey(), accountType: 'SCA', blockchains: [CIRCLE_BLOCKCHAIN] },
    });
    return { setup: { challengeId, userToken, encryptionKey } };
  }

  async getWallet(userId: string): Promise<WalletInfo | null> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.circleWalletId || !user.circleWalletAddress) {
      const r = await this.ensureWallet(userId);
      return r.wallet ?? null;
    }
    return {
      address: getAddress(user.circleWalletAddress),
      tier: 'USER_CONTROLLED',
      circleWalletId: user.circleWalletId,
      state: 'LIVE',
    };
  }

  async submitContractCall(userId: string, call: ContractCall): Promise<SubmitResult> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const circleUserId = user.circleUserId;
    const walletId = user.circleWalletId;
    if (!circleUserId || !walletId) throw new Error('Wallet not provisioned — call /api/wallet/ensure first');

    const { userToken, encryptionKey } = await this.token(circleUserId);
    const { challengeId } = await circle<ChallengeResp>('/user/transactions/contractExecution', {
      method: 'POST',
      userToken,
      body: {
        idempotencyKey: call.refId,
        walletId,
        contractAddress: call.contractAddress,
        abiFunctionSignature: call.abiFunctionSignature,
        abiParameters: call.abiParameters,
        feeLevel: 'MEDIUM',
        refId: call.refId,
      },
    });

    return { kind: 'challenge', refId: call.refId, envelope: { challengeId, userToken, encryptionKey } };
  }

  async getTxStatus(userId: string, refId: string): Promise<TxStatus> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.circleUserId) throw new Error('No Circle user');
    const { userToken } = await this.token(user.circleUserId);
    const { transactions } = await circle<TxListResp>(
      `/transactions?refId=${encodeURIComponent(refId)}`,
      { userToken },
    );
    const tx = transactions[0];
    if (!tx) return { state: 'CREATED' };
    return { state: mapState(tx.state), txHash: tx.txHash, error: tx.errorReason };
  }
}
