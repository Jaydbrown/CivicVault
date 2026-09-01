import { USDC_ADDRESS, usdcAllowance } from '../chain/arc';
import { governorAddress } from '../chain/reads';
import { usdc6ToNaira } from '../services/fiatRate.service';
import { getWallet, submitCall, txStatus } from '../services/wallet';
import { sendSms } from './sms';

const POLL_MS = 3_000;
const POLL_TRIES = 30; // ~90s

async function waitForTx(userId: string, refId: string): Promise<'CONFIRMED' | 'FAILED' | 'TIMEOUT'> {
  for (let i = 0; i < POLL_TRIES; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    try {
      const s = await txStatus(userId, refId);
      if (s.state === 'CONFIRMED') return 'CONFIRMED';
      if (s.state === 'FAILED') return 'FAILED';
    } catch {
      /* keep polling */
    }
  }
  return 'TIMEOUT';
}

/**
 * Feature-phone vote: approve USDC (if needed) then vote, each an async Circle
 * transaction. Run in the background after the USSD session ends; the member
 * gets the outcome by SMS.
 */
export async function processVote(
  userId: string,
  phone: string,
  dao: `0x${string}`,
  investmentId: number,
  usdc6: bigint,
): Promise<void> {
  try {
    const wallet = await getWallet(userId);
    if (!wallet) throw new Error('no wallet');
    const naira = await usdc6ToNaira(usdc6);

    const allowance = await usdcAllowance(wallet.address, dao);
    if (allowance < usdc6) {
      const appr = await submitCall(userId, {
        daoAddress: USDC_ADDRESS,
        functionName: 'approve',
        args: [dao, usdc6.toString()],
      });
      const ok = await waitForTx(userId, appr.refId);
      if (ok !== 'CONFIRMED') {
        await sendSms(phone, `CivicVault: could not approve your ₦${naira} stake (${ok.toLowerCase()}). Nothing was charged.`);
        return;
      }
    }

    const vote = await submitCall(userId, {
      daoAddress: dao,
      functionName: 'vote',
      args: [investmentId.toString(), usdc6.toString(), 1],
    });
    const res = await waitForTx(userId, vote.refId);
    await sendSms(
      phone,
      res === 'CONFIRMED'
        ? `CivicVault: your ₦${naira} vote on proposal #${investmentId} is confirmed.`
        : `CivicVault: your vote on #${investmentId} ${res === 'FAILED' ? 'failed' : 'is still pending'}.`,
    );
  } catch (err) {
    await sendSms(phone, `CivicVault: your vote could not be processed. ${err instanceof Error ? err.message : ''}`.trim());
  }
}

/** Feature-phone governance vote (yes/no on an open proposal). */
export async function processGovVote(
  userId: string,
  phone: string,
  dao: `0x${string}`,
  proposalId: number,
  support: boolean,
): Promise<void> {
  const governor = governorAddress();
  if (!governor) {
    await sendSms(phone, 'CivicVault: governance is not available yet.');
    return;
  }
  try {
    const call = await submitCall(userId, {
      daoAddress: governor,
      functionName: 'voteOnProposal',
      args: [dao, proposalId.toString(), support],
    });
    const res = await waitForTx(userId, call.refId);
    await sendSms(
      phone,
      res === 'CONFIRMED'
        ? `CivicVault: your ${support ? 'YES' : 'NO'} vote on governance proposal #${proposalId} is confirmed.`
        : `CivicVault: your governance vote on #${proposalId} ${res === 'FAILED' ? 'failed' : 'is still pending'}.`,
    );
  } catch (err) {
    await sendSms(phone, `CivicVault: your governance vote could not be processed. ${err instanceof Error ? err.message : ''}`.trim());
  }
}
