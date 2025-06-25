import { prisma } from '../db/prisma';
import { GmailService } from './gmail.service';

const gmail = new GmailService();

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUsdc(raw: bigint | string | number): string {
  const n = BigInt(raw);
  const whole = n / 1_000_000n;
  const frac = n % 1_000_000n;
  return frac === 0n
    ? `${whole.toLocaleString()} USDC`
    : `${whole.toLocaleString()}.${frac.toString().padStart(6, '0').replace(/0+$/, '')} USDC`;
}

const BASE_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

function emailShell(title: string, body: string): string {
  return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <h2 style="margin:0;font-size:18px">🏛️ CivicVault — ${escapeHtml(title)}</h2>
  </div>
  <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    ${body}
    <div style="margin-top:20px">
      <a href="${BASE_URL}/dashboard"
         style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;text-decoration:none;border-radius:8px;font-size:14px">
        Open Dashboard →
      </a>
    </div>
  </div>
  <div style="text-align:center;padding:16px;font-size:11px;color:#94a3b8">
    You are receiving this because you are subscribed to notifications for this DAO.
    <br><a href="${BASE_URL}/profile" style="color:#059669">Manage preferences</a>
  </div>
</div>`;
}

/** Send email to every subscribed user in a DAO who has the given preference enabled. */
async function notifySubscribers(
  daoAddress: string,
  preferenceKey: 'notifyNewInvestment' | 'notifyVoteCast' | 'notifyYieldAvailable' | 'notifyInvestmentActive',
  subject: string,
  html: string,
) {
  const subscriptions = await prisma.chatSubscription.findMany({
    where: { daoAddress: daoAddress.toLowerCase(), receiveNotifications: true },
    include: { user: { include: { preferences: true } } },
  });

  for (const sub of subscriptions) {
    const user = sub.user;
    if (!user.email) continue;
    // Respect per-preference opt-out (default is true when no row exists)
    if (user.preferences && user.preferences[preferenceKey] === false) continue;

    try {
      await gmail.sendOutboundNotification(user.email, subject, html);
      console.log(`📧 Email sent to ${user.email} [${preferenceKey}]`);
    } catch (err: any) {
      console.error(`Failed to send email to ${user.email}:`, err.message);
    }
  }
}

export class NotificationService {
  async notifyNewDAO(data: {
    daoAddress: string;
    name: string;
    location: string;
    creator: string;
    timestamp: bigint | number;
  }) {
    console.log(`🏛️ New DAO Created: ${data.name} in ${data.location}`);
  }

  async notifyNewInvestment(data: {
    daoAddress: string;
    daoName: string;
    investmentId: bigint | number;
    name: string;
    fundNeeded: bigint | number;
    grade: number;
    deadline: bigint | number;
  }) {
    const grades = ['A', 'B', 'C', 'D'];
    const gradeLabel = grades[Number(data.grade)] ?? '?';
    const deadlineDate = new Date(Number(data.deadline) * 1000).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

    console.log(`💰 New Investment: ${data.name} needs ${data.fundNeeded} USDC`);

    const html = emailShell(
      `New Investment Proposal in ${data.daoName}`,
      `<p style="color:#1e293b">A new investment proposal has been submitted to <strong>${escapeHtml(data.daoName)}</strong>.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
         <tr><td style="padding:8px 0;color:#64748b;width:40%">Proposal</td>
             <td style="padding:8px 0;font-weight:600">${escapeHtml(data.name)}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Fund needed</td>
             <td style="padding:8px 0;font-weight:600">${formatUsdc(data.fundNeeded)}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Grade</td>
             <td style="padding:8px 0"><span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:99px;font-weight:600">${gradeLabel}</span></td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Voting deadline</td>
             <td style="padding:8px 0">${deadlineDate}</td></tr>
       </table>
       <p style="color:#64748b;font-size:13px">Vote on this proposal to stake USDC and earn yield when it succeeds.</p>`,
    );

    await notifySubscribers(
      data.daoAddress,
      'notifyNewInvestment',
      `New investment in ${data.daoName}: ${data.name}`,
      html,
    );
  }

  async notifyYieldDeposited(data: {
    daoAddress: string;
    daoName: string;
    investmentId: bigint | number;
    amount: bigint | number;
    expenseReportCID: string;
    timestamp: bigint | number;
  }) {
    console.log(`💵 Yield Deposited: ${data.amount} USDC for investment #${data.investmentId}`);

    const html = emailShell(
      `Yield Available in ${data.daoName}`,
      `<p style="color:#1e293b">Yield has been deposited for an investment in <strong>${escapeHtml(data.daoName)}</strong>. Your share is now claimable.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
         <tr><td style="padding:8px 0;color:#64748b;width:40%">Investment #</td>
             <td style="padding:8px 0;font-weight:600">${data.investmentId}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b">Total yield deposited</td>
             <td style="padding:8px 0;font-weight:600;color:#059669">${formatUsdc(data.amount)}</td></tr>
       </table>
       <p style="color:#64748b;font-size:13px">Open the Yields page to claim your proportional share based on your stake.</p>`,
    );

    await notifySubscribers(
      data.daoAddress,
      'notifyYieldAvailable',
      `Yield available in ${data.daoName} — claim your share`,
      html,
    );
  }

  async notifyVoteCast(data: {
    daoAddress: string;
    daoName: string;
    investmentId: bigint | number;
    voter: string;
    numberOfVotes: bigint | number;
    voteValue: number;
  }) {
    const voteType = data.voteValue === 1 ? 'upvote' : 'downvote';
    console.log(`🗳️ ${voteType}: ${data.numberOfVotes} votes on investment #${data.investmentId} in ${data.daoName}`);
    // Vote notifications are high-frequency — only log, no email by default.
  }

  async notifyInvestmentActivated(data: {
    daoAddress: string;
    daoName: string;
    investmentId: bigint | number;
  }) {
    console.log(`✅ Investment #${data.investmentId} ACTIVATED in ${data.daoName}`);

    const html = emailShell(
      `Investment Activated in ${data.daoName}`,
      `<p style="color:#1e293b">Investment #<strong>${data.investmentId}</strong> in <strong>${escapeHtml(data.daoName)}</strong> has reached its funding target and is now <span style="color:#059669;font-weight:600">ACTIVE</span>.</p>
       <p style="color:#64748b;font-size:13px">Funds have been moved to the phased escrow. Finance managers will release them in three phases as milestones are completed.</p>`,
    );

    await notifySubscribers(
      data.daoAddress,
      'notifyInvestmentActive',
      `Investment #${data.investmentId} is now active in ${data.daoName}`,
      html,
    );
  }
}
