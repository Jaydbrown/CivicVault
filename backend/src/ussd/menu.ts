import bcrypt from 'bcryptjs';

import { usdcBalanceOf } from '../chain/arc';
import { memberDaos, openGovProposals, pendingInvestments } from '../chain/reads';
import { prisma } from '../db/prisma';
import { nairaToUsdc6, usdc6ToNaira } from '../services/fiatRate.service';
import { ensureWallet, getWallet } from '../services/wallet';
import { processGovVote, processVote } from './actions';
import { endSession, saveSession, type UssdSession } from './session';

const MAX_PIN_TRIES = 5;
const LOCK_MINUTES = 15;

type Reply = { text: string; close: boolean };
const con = (text: string): Reply => ({ text, close: false });
const end = (text: string): Reply => ({ text, close: true });

function isPin(s: string): boolean {
  return /^\d{4}$/.test(s);
}

function menuText(): string {
  return [
    'CivicVault',
    '1. My balance',
    '2. My communities',
    '3. Vote on a proposal',
    '4. Governance',
    '0. Help',
  ].join('\n');
}

function numberedList(title: string, items: string[], extra?: string): string {
  return [title, ...items.map((it, i) => `${i + 1}. ${it}`), extra].filter(Boolean).join('\n');
}

/** Resolves the numeric pick against the list last shown to the user. */
function pick(session: UssdSession, input: string): { label: string; value: string } | null {
  const n = Number(input);
  if (!session.choices || !Number.isInteger(n) || n < 1 || n > session.choices.length) return null;
  return session.choices[n - 1];
}

export async function handleUssd(session: UssdSession, input: string): Promise<Reply> {
  const ussd = await prisma.ussdUser.findUnique({ where: { phoneNumber: session.phone } });

  // First interaction of the session.
  if (session.node === 'WELCOME') {
    if (!ussd) {
      endSession(session.sessionId);
      return end('You are not registered. Ask your community facilitator to add your phone number to CivicVault.');
    }
    if (ussd.lockedUntil && ussd.lockedUntil.getTime() > Date.now()) {
      endSession(session.sessionId);
      return end('Your access is locked after too many wrong PIN attempts. Try again later.');
    }
    session.userId = ussd.userId;
    if (!ussd.pinHash) {
      session.node = 'SET_PIN';
      saveSession(session);
      return con('Welcome to CivicVault.\nCreate a 4-digit PIN:');
    }
    session.node = 'ENTER_PIN';
    saveSession(session);
    return con('Enter your PIN:');
  }

  if (!ussd || !session.userId) {
    endSession(session.sessionId);
    return end('Session error. Please dial again.');
  }

  switch (session.node) {
    case 'SET_PIN': {
      if (!isPin(input)) return con('PIN must be 4 digits.\nCreate a 4-digit PIN:');
      session.pendingPin = input;
      session.node = 'SET_PIN_CONFIRM';
      saveSession(session);
      return con('Re-enter your PIN:');
    }

    case 'SET_PIN_CONFIRM': {
      if (input !== session.pendingPin) {
        session.node = 'SET_PIN';
        session.pendingPin = undefined;
        saveSession(session);
        return con('PINs did not match.\nCreate a 4-digit PIN:');
      }
      await prisma.ussdUser.update({
        where: { id: ussd.id },
        data: { pinHash: await bcrypt.hash(input, 10), failedPinTries: 0, lockedUntil: null },
      });
      session.authed = true;
      session.pendingPin = undefined;
      session.node = 'MENU';
      saveSession(session);
      return con(`PIN set.\n\n${menuText()}`);
    }

    case 'ENTER_PIN': {
      const ok = ussd.pinHash ? await bcrypt.compare(input, ussd.pinHash) : false;
      if (!ok) {
        const tries = ussd.failedPinTries + 1;
        if (tries >= MAX_PIN_TRIES) {
          await prisma.ussdUser.update({
            where: { id: ussd.id },
            data: { failedPinTries: tries, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
          });
          endSession(session.sessionId);
          return end('Too many wrong PIN attempts. Access locked for 15 minutes.');
        }
        await prisma.ussdUser.update({ where: { id: ussd.id }, data: { failedPinTries: tries } });
        return con(`Wrong PIN (${MAX_PIN_TRIES - tries} left).\nEnter your PIN:`);
      }
      await prisma.ussdUser.update({ where: { id: ussd.id }, data: { failedPinTries: 0 } });
      session.authed = true;
      session.node = 'MENU';
      saveSession(session);
      return con(menuText());
    }

    case 'MENU': {
      if (input === '1') {
        const w = await getWallet(session.userId).catch(() => null);
        const bal = w ? await usdcBalanceOf(w.address) : 0n;
        endSession(session.sessionId);
        return end(`Your CivicVault balance:\n₦${await usdc6ToNaira(bal)}  (≈ $${(Number(bal) / 1e6).toFixed(2)})`);
      }
      if (input === '2') {
        const daos = await memberDaos((await ensureWallet(session.userId)).wallet?.address ?? '');
        endSession(session.sessionId);
        return end(daos.length ? numberedList('Your communities:', daos.map((d) => d.name)) : 'You are not a verified member of any community yet.');
      }
      if (input === '3' || input === '4') {
        const daos = await memberDaos((await ensureWallet(session.userId)).wallet?.address ?? '');
        if (!daos.length) {
          endSession(session.sessionId);
          return end('You are not a verified member of any community yet.');
        }
        session.choices = daos.map((d) => ({ label: d.name, value: d.address }));
        session.node = input === '3' ? 'VOTE_PICK_DAO' : 'GOV_PICK_DAO';
        saveSession(session);
        return con(numberedList(input === '3' ? 'Vote — pick a community:' : 'Governance — pick a community:', daos.map((d) => d.name)));
      }
      if (input === '0') {
        endSession(session.sessionId);
        return end('CivicVault lets your community pool money, vote on local investments, and share the returns. Amounts show in Naira; funds are held safely on-chain. Contact your facilitator for help.');
      }
      return con(`Invalid choice.\n\n${menuText()}`);
    }

    case 'VOTE_PICK_DAO': {
      const chosen = pick(session, input);
      if (!chosen) return con('Invalid choice. Reply with the number.');
      const invs = await pendingInvestments(chosen.value);
      if (!invs.length) {
        endSession(session.sessionId);
        return end(`No open proposals in ${chosen.label} right now.`);
      }
      session.data.dao = chosen.value;
      session.choices = invs.map((i) => ({ label: i.name, value: String(i.id) }));
      session.node = 'VOTE_PICK_INV';
      saveSession(session);
      return con(numberedList('Pick a proposal:', invs.map((i) => `${i.name}`)));
    }

    case 'VOTE_PICK_INV': {
      const chosen = pick(session, input);
      if (!chosen) return con('Invalid choice. Reply with the number.');
      session.data.invId = Number(chosen.value);
      session.data.invName = chosen.label;
      session.node = 'VOTE_AMOUNT';
      saveSession(session);
      return con(`Stake on "${chosen.label}".\nEnter amount in Naira:`);
    }

    case 'VOTE_AMOUNT': {
      const naira = Number(String(input).replace(/[^\d]/g, ''));
      if (!Number.isFinite(naira) || naira <= 0) return con('Enter a valid Naira amount:');
      const usdc6 = await nairaToUsdc6(naira);
      if (usdc6 <= 0n) return con('Amount too small. Enter a larger Naira amount:');

      const w = await getWallet(session.userId).catch(() => null);
      const bal = w ? await usdcBalanceOf(w.address) : 0n;
      if (bal < usdc6) {
        endSession(session.sessionId);
        return end(`Not enough balance. You have ₦${await usdc6ToNaira(bal)}. Ask your facilitator to top up.`);
      }
      session.data.naira = naira;
      session.data.usdc6 = usdc6.toString();
      session.node = 'VOTE_CONFIRM';
      saveSession(session);
      return con(`Stake ₦${naira} on "${session.data.invName}"?\n1. Confirm\n2. Cancel`);
    }

    case 'VOTE_CONFIRM': {
      if (input !== '1') {
        endSession(session.sessionId);
        return end('Cancelled. Nothing was charged.');
      }
      const { userId, phone } = session;
      const dao = session.data.dao as `0x${string}`;
      const invId = Number(session.data.invId);
      const usdc6 = BigInt(String(session.data.usdc6));
      const naira = Number(session.data.naira);
      endSession(session.sessionId);
      void processVote(userId!, phone, dao, invId, usdc6);
      return end(`Staking ₦${naira} on "${session.data.invName}". You'll get an SMS when it's confirmed.`);
    }

    case 'GOV_PICK_DAO': {
      const chosen = pick(session, input);
      if (!chosen) return con('Invalid choice. Reply with the number.');
      const props = await openGovProposals(chosen.value);
      if (!props.length) {
        endSession(session.sessionId);
        return end(`No open governance votes in ${chosen.label}.`);
      }
      session.data.dao = chosen.value;
      session.choices = props.map((p) => ({ label: `${p.label}${p.investmentId ? ` #${p.investmentId}` : ''}`, value: String(p.id) }));
      session.node = 'GOV_PICK_PROP';
      saveSession(session);
      return con(numberedList('Open governance votes:', session.choices.map((c) => c.label)));
    }

    case 'GOV_PICK_PROP': {
      const chosen = pick(session, input);
      if (!chosen) return con('Invalid choice. Reply with the number.');
      session.data.propId = Number(chosen.value);
      session.data.propLabel = chosen.label;
      session.node = 'GOV_CONFIRM';
      saveSession(session);
      return con(`"${chosen.label}"\n1. Vote YES\n2. Vote NO`);
    }

    case 'GOV_CONFIRM': {
      if (input !== '1' && input !== '2') return con('Reply 1 for YES or 2 for NO.');
      const support = input === '1';
      const { userId, phone } = session;
      const dao = session.data.dao as `0x${string}`;
      const propId = Number(session.data.propId);
      endSession(session.sessionId);
      void processGovVote(userId!, phone, dao, propId, support);
      return end(`Recording your ${support ? 'YES' : 'NO'} vote on "${session.data.propLabel}". You'll get an SMS shortly.`);
    }

    default:
      endSession(session.sessionId);
      return end('Session ended. Please dial again.');
  }
}
