import { BigInt } from "@graphprotocol/graph-ts";

import {
  ProposalCreated,
  ProposalVoteCast,
  ProposalExecuted,
} from "../generated/CivicVaultGovernor/CivicVaultGovernor";
import { GovernanceProposal, GovernanceVote } from "../generated/schema";

function proposalId(dao: string, id: BigInt): string {
  return dao + "-" + id.toString();
}

export function handleProposalCreated(event: ProposalCreated): void {
  const dao = event.params.dao.toHexString();
  const p = new GovernanceProposal(proposalId(dao, event.params.proposalId));
  p.dao = dao;
  p.proposalId = event.params.proposalId;
  p.pType = event.params.pType;
  p.proposer = event.params.proposer;
  p.targetAdmin = event.params.targetAdmin;
  p.investmentId = event.params.investmentId;
  p.votingDeadline = event.params.votingDeadline;
  p.createdAt = event.block.timestamp;
  p.yesWeight = BigInt.fromI32(0);
  p.noWeight = BigInt.fromI32(0);
  p.executed = false;
  p.passed = false;
  p.save();
}

export function handleProposalVoteCast(event: ProposalVoteCast): void {
  const dao = event.params.dao.toHexString();
  const pid = proposalId(dao, event.params.proposalId);

  const p = GovernanceProposal.load(pid);
  if (p) {
    if (event.params.support) {
      p.yesWeight = p.yesWeight.plus(event.params.weight);
    } else {
      p.noWeight = p.noWeight.plus(event.params.weight);
    }
    p.save();
  }

  const v = new GovernanceVote(pid + "-" + event.params.voter.toHexString());
  v.proposal = pid;
  v.dao = dao;
  v.voter = event.params.voter;
  v.support = event.params.support;
  v.weight = event.params.weight;
  v.timestamp = event.block.timestamp;
  v.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  const dao = event.params.dao.toHexString();
  const p = GovernanceProposal.load(proposalId(dao, event.params.proposalId));
  if (!p) return;
  p.executed = true;
  p.passed = event.params.passed;
  p.save();
}
