import {
  MemberAdded,
  MemberKYCVerified,
  MemberRemoved,
  InvestmentCreated,
  InvestmentActivated,
  InvestmentIncomplete,
  InvestmentClosed,
  VoteCast,
  StakeWithdrawn,
  FundsLocked,
  FundsReleased,
  YieldDeposited,
  YieldClaimed,
  YieldDepositProposed,
  YieldDepositApproved,
  YieldDepositExecuted,
} from "../generated/templates/CivicVault/CivicVault";
import {
  DAO,
  Member,
  Investment,
  Vote,
  YieldClaim,
  PhaseRelease,
  YieldProposal,
  InvestmentCreatedEvent,
  VoteCastEvent,
  YieldDepositedEvent,
  StakeWithdrawnEvent,
  FundsLockedEvent,
} from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

// ─── MEMBER HANDLERS ───────────────────────────────────────────────────────────

export function handleMemberAdded(event: MemberAdded): void {
  const dao = DAO.load(event.address.toHexString());
  if (!dao) return;
  dao.memberCount = dao.memberCount.plus(BigInt.fromI32(1));
  dao.save();

  const id = event.address.toHexString() + "-" + event.params.member.toHexString();
  const member = new Member(id);
  member.dao = event.address.toHexString();
  member.wallet = event.params.member;
  member.kycVerified = false;
  member.joinedAt = event.params.timestamp;
  member.isActive = true;
  member.save();
}

export function handleMemberKYCVerified(event: MemberKYCVerified): void {
  const id = event.address.toHexString() + "-" + event.params.member.toHexString();
  const member = Member.load(id);
  if (!member) return;
  member.kycVerified = true;
  member.save();
}

export function handleMemberRemoved(event: MemberRemoved): void {
  const dao = DAO.load(event.address.toHexString());
  if (dao) {
    dao.memberCount = dao.memberCount.minus(BigInt.fromI32(1));
    dao.save();
  }
  const id = event.address.toHexString() + "-" + event.params.member.toHexString();
  const member = Member.load(id);
  if (!member) return;
  member.isActive = false;
  member.save();
}

// ─── INVESTMENT HANDLERS ───────────────────────────────────────────────────────

export function handleInvestmentCreated(event: InvestmentCreated): void {
  const dao = DAO.load(event.address.toHexString());
  if (!dao) return;
  dao.investmentCount = dao.investmentCount.plus(BigInt.fromI32(1));
  dao.save();

  const id = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = new Investment(id);
  inv.dao = event.address.toHexString();
  inv.investmentId = event.params.investmentId;
  inv.name = event.params.name;
  inv.status = 0;
  inv.category = 0;
  inv.fundNeeded = event.params.fundNeeded;
  inv.expectedYield = BigInt.fromI32(0);
  inv.grade = event.params.grade;
  inv.deadline = event.params.deadline;
  inv.upvotes = BigInt.fromI32(0);
  inv.downvotes = BigInt.fromI32(0);
  inv.totalYieldGenerated = BigInt.fromI32(0);
  inv.totalYieldDistributed = BigInt.fromI32(0);
  inv.escrowedAmount = BigInt.fromI32(0);
  inv.createdAt = event.block.timestamp;
  inv.createdBy = event.transaction.from;
  inv.save();

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new InvestmentCreatedEvent(evId);
  ev.dao = event.address.toHexString();
  ev.investment = id;
  ev.fundNeeded = event.params.fundNeeded;
  ev.grade = event.params.grade;
  ev.deadline = event.params.deadline;
  ev.timestamp = event.block.timestamp;
  ev.blockNumber = event.block.number;
  ev.save();
}

export function handleInvestmentActivated(event: InvestmentActivated): void {
  const id = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(id);
  if (!inv) return;
  inv.status = 1;
  inv.save();

  const dao = DAO.load(event.address.toHexString());
  if (dao) {
    dao.activeInvestmentCount = dao.activeInvestmentCount.plus(BigInt.fromI32(1));
    dao.save();
  }
}

export function handleInvestmentIncomplete(event: InvestmentIncomplete): void {
  const id = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(id);
  if (!inv) return;
  inv.status = 3;
  inv.save();
}

export function handleInvestmentClosed(event: InvestmentClosed): void {
  const id = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(id);
  if (!inv) return;
  inv.status = 2;
  inv.save();

  const dao = DAO.load(event.address.toHexString());
  if (dao && dao.activeInvestmentCount.gt(BigInt.fromI32(0))) {
    dao.activeInvestmentCount = dao.activeInvestmentCount.minus(BigInt.fromI32(1));
    dao.save();
  }
}

// ─── VOTE HANDLERS ────────────────────────────────────────────────────────────

export function handleVoteCast(event: VoteCast): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (!inv) return;

  if (event.params.voteValue == 1) {
    inv.upvotes = inv.upvotes.plus(event.params.numberOfVotes);
    const dao = DAO.load(event.address.toHexString());
    if (dao) {
      dao.totalValueLocked = dao.totalValueLocked.plus(event.params.numberOfVotes);
      dao.save();
    }
  } else {
    inv.downvotes = inv.downvotes.plus(BigInt.fromI32(1));
  }
  inv.save();

  const voteId = invId + "-" + event.params.voter.toHexString();
  let vote = Vote.load(voteId);
  if (!vote) {
    vote = new Vote(voteId);
    vote.investment = invId;
    vote.voter = event.params.voter;
    vote.numberOfVotes = BigInt.fromI32(0);
    vote.hasClaimedYield = false;
    vote.yieldClaimed = BigInt.fromI32(0);
    vote.withdrawn = false;
  }
  vote.numberOfVotes = vote.numberOfVotes.plus(event.params.numberOfVotes);
  vote.voteValue = event.params.voteValue;
  vote.timestamp = event.params.timestamp;
  vote.save();

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new VoteCastEvent(evId);
  ev.dao = event.address.toHexString();
  ev.investment = invId;
  ev.voter = event.params.voter;
  ev.numberOfVotes = event.params.numberOfVotes;
  ev.voteValue = event.params.voteValue;
  ev.timestamp = event.params.timestamp;
  ev.blockNumber = event.block.number;
  ev.save();
}

export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (inv) {
    inv.upvotes = inv.upvotes.minus(event.params.amount);
    inv.save();
  }

  const dao = DAO.load(event.address.toHexString());
  if (dao) {
    dao.totalValueLocked = dao.totalValueLocked.minus(event.params.amount);
    dao.save();
  }

  const voteId = invId + "-" + event.params.voter.toHexString();
  const vote = Vote.load(voteId);
  if (vote) {
    vote.withdrawn = true;
    vote.numberOfVotes = BigInt.fromI32(0);
    vote.save();
  }

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new StakeWithdrawnEvent(evId);
  ev.dao = event.address.toHexString();
  ev.investment = invId;
  ev.voter = event.params.voter;
  ev.amount = event.params.amount;
  ev.timestamp = event.block.timestamp;
  ev.blockNumber = event.block.number;
  ev.save();
}

// ─── ESCROW / PHASE RELEASE ───────────────────────────────────────────────────

export function handleFundsLocked(event: FundsLocked): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (inv) {
    inv.escrowedAmount = event.params.amount;
    inv.save();
  }

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new FundsLockedEvent(evId);
  ev.dao = event.address.toHexString();
  ev.investment = invId;
  ev.amount = event.params.amount;
  ev.blockNumber = event.block.number;
  ev.save();
}

export function handleFundsReleased(event: FundsReleased): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (inv) {
    if (inv.escrowedAmount.ge(event.params.amount)) {
      inv.escrowedAmount = inv.escrowedAmount.minus(event.params.amount);
    }
    inv.save();
  }

  const dao = DAO.load(event.address.toHexString());
  if (dao) {
    dao.totalValueLocked = dao.totalValueLocked.minus(event.params.amount);
    dao.save();
  }

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const release = new PhaseRelease(evId);
  release.dao = event.address.toHexString();
  release.investment = invId;
  release.phase = event.params.phase;
  release.amount = event.params.amount;
  release.recipient = event.params.recipient;
  release.timestamp = event.block.timestamp;
  release.save();
}

// ─── YIELD HANDLERS ───────────────────────────────────────────────────────────

export function handleYieldDeposited(event: YieldDeposited): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (!inv) return;
  inv.totalYieldGenerated = inv.totalYieldGenerated.plus(event.params.amount);
  inv.save();

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new YieldDepositedEvent(evId);
  ev.dao = event.address.toHexString();
  ev.investment = invId;
  ev.amount = event.params.amount;
  ev.expenseReportCID = event.params.expenseReportCID;
  ev.timestamp = event.params.timestamp;
  ev.blockNumber = event.block.number;
  ev.save();
}

export function handleYieldClaimed(event: YieldClaimed): void {
  const invId = event.address.toHexString() + "-" + event.params.investmentId.toString();
  const inv = Investment.load(invId);
  if (!inv) return;
  inv.totalYieldDistributed = inv.totalYieldDistributed.plus(event.params.amount);
  inv.save();

  const voteId = invId + "-" + event.params.voter.toHexString();
  const vote = Vote.load(voteId);
  if (vote) {
    vote.hasClaimedYield = true;
    vote.yieldClaimed = vote.yieldClaimed.plus(event.params.amount);
    vote.save();
  }

  const evId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const claim = new YieldClaim(evId);
  claim.dao = event.address.toHexString();
  claim.investment = invId;
  claim.claimer = event.params.voter;
  claim.amount = event.params.amount;
  claim.timestamp = event.params.timestamp;
  claim.save();
}

// ─── MULTI-SIG YIELD PROPOSAL HANDLERS ────────────────────────────────────────

export function handleYieldDepositProposed(event: YieldDepositProposed): void {
  const id = event.address.toHexString() + "-" + event.params.proposalId.toString();
  const proposal = new YieldProposal(id);
  proposal.dao = event.address.toHexString();
  proposal.proposalId = event.params.proposalId;
  proposal.investmentId = event.params.investmentId;
  proposal.amount = event.params.amount;
  proposal.expenseReportCID = "";
  proposal.proposer = event.params.proposer;
  proposal.approvals = BigInt.fromI32(0);
  proposal.executed = false;
  proposal.createdAt = event.params.timestamp;
  proposal.save();
}

export function handleYieldDepositApproved(event: YieldDepositApproved): void {
  const id = event.address.toHexString() + "-" + event.params.proposalId.toString();
  const proposal = YieldProposal.load(id);
  if (!proposal) return;
  proposal.approvals = event.params.approvals;
  proposal.save();
}

export function handleYieldDepositExecuted(event: YieldDepositExecuted): void {
  const id = event.address.toHexString() + "-" + event.params.proposalId.toString();
  const proposal = YieldProposal.load(id);
  if (!proposal) return;
  proposal.executed = true;
  proposal.expenseReportCID = event.params.expenseReportCID;
  proposal.save();
}
