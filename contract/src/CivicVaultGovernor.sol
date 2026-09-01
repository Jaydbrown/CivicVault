// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICivicVault} from "./interfaces/ICivicVault.sol";

/**
 * @title CivicVaultGovernor
 * @notice Member-initiated, stake-weighted governance for every CivicVault DAO.
 *
 * A single deployment serves all DAOs (like CivicVaultView): proposal state is
 * keyed by DAO address. The DAO points back here via `CivicVault.governor()`;
 * this contract calls the DAO's `gov*` hooks to apply an effect only after a
 * member vote has passed.
 *
 * Why this exists: the vault `creator` alone appoints admins, and admins alone
 * gate membership. Left there, the creator controls every downstream vote. Here
 * members can, without the creator:
 *   - RemoveAdmin  — evict an admin, and ban re-appointment until a member vote reinstates them
 *   - ReinstateAdmin — lift that ban
 *   - FreezeRelease / UnfreezeRelease — pause a suspicious phased escrow release
 *   - Clawback — pull an investment's unreleased tranches back to its backers
 *
 * Capture resistance:
 *   - weight is USDC actually committed to the DAO (`committedStake`) — sybil
 *     addresses are free, but a vote costs real at-risk capital;
 *   - the pass rule (denominator + thresholds) is snapshotted at `openProposal`
 *     so it cannot be inflated after a vote succeeds;
 *   - power decisions use a *participation* quorum (majority of turnout + a
 *     turnout floor), never an absolute quorum against all stake ever committed
 *     — that becomes unreachable as completed-investment stake accumulates;
 *   - a voter's stake is locked until the proposal closes, so "vote then
 *     withdraw" cannot keep the weight;
 *   - repeat freezes of one investment escalate the bar and carry a cooldown.
 */
interface IVaultGov {
    function creator() external view returns (address);
    function governor() external view returns (address);
    function isAdmin(address account) external view returns (bool);
    function bannedAdmin(address account) external view returns (bool);
    function isVerifiedMember(address account) external view returns (bool);
    function committedStake(address member) external view returns (uint256);
    function totalCommittedStake() external view returns (uint256);
    function investmentCount() external view returns (uint256);
    function releaseFrozen(uint256 investmentId) external view returns (bool);
    function getInvestment(uint256 id) external view returns (ICivicVault.Investment memory);
    function getVote(uint256 investmentId, address voter) external view returns (ICivicVault.Vote memory);

    // 0 lockStake, 1 banAdmin, 2 reinstateAdmin, 3 freeze, 4 unfreeze, 5 clawback
    function govApply(uint8 kind, address addr, uint256 id, uint256 expiry) external returns (uint256 pool);
}

contract CivicVaultGovernor {
    // 0 RemoveAdmin, 1 FreezeRelease, 2 UnfreezeRelease, 3 Clawback, 4 ReinstateAdmin
    enum ProposalType {
        RemoveAdmin,
        FreezeRelease,
        UnfreezeRelease,
        Clawback,
        ReinstateAdmin
    }

    struct Proposal {
        ProposalType pType;
        address proposer;
        address targetAdmin;
        uint256 investmentId;
        uint256 createdAt;
        uint256 votingDeadline;
        uint256 snapshotDenominator;
        uint16 thresholdBps;
        uint16 quorumFloorBps;
        uint256 yesWeight;
        uint256 noWeight;
        bool executed;
    }

    struct DaoGov {
        uint256 proposalCount;
        mapping(uint256 => Proposal) proposals;
        mapping(uint256 => mapping(address => bool)) hasVoted;
        mapping(bytes32 => uint256) activeProposalOf; // dedupe key => proposalId
        mapping(address => uint256) lastProposalAt; // per-proposer rate limit
        mapping(uint256 => uint256) freezeCount; // per investment
        mapping(uint256 => uint256) freezeCooldownUntil; // per investment
    }

    mapping(address => DaoGov) private _dao;

    // ===== TUNING =====
    uint256 public constant VOTING_WINDOW = 3 days;
    uint256 public constant FREEZE_DURATION = 30 days;
    uint256 public constant FREEZE_COOLDOWN = 7 days;
    uint256 public constant PROPOSAL_COOLDOWN = 1 days;

    uint16 public constant POWER_MAJORITY_BPS = 5000; // > 50% of weight cast
    uint16 public constant ADMIN_TURNOUT_FLOOR_BPS = 2000; // turnout >= 20% of committed-stake snapshot
    uint16 public constant CLAWBACK_TURNOUT_FLOOR_BPS = 3000; // turnout >= 30% of investment-stake snapshot
    uint16 public constant FREEZE_BASE_BPS = 3300;
    uint16 public constant FREEZE_STEP_BPS = 1700;
    uint16 public constant FREEZE_MAX_BPS = 8000;
    uint16 public constant UNFREEZE_BPS = 3300;

    // ===== ERRORS =====
    error NotThisDaosGovernor();
    error BadProposalType();
    error NotVerifiedMember();
    error NoGovernanceStake();
    error BadTarget();
    error AdminNotBanned();
    error InvalidInvestment();
    error InvestmentNotActive();
    error InvestmentNotFrozen();
    error DuplicateProposal();
    error ProposalCooldownActive();
    error FreezeCooldownActive();
    error ProposalNotFound();
    error VotingClosed();
    error VotingStillOpen();
    error AlreadyVoted();
    error AlreadyExecuted();

    // ===== EVENTS =====
    event ProposalCreated(
        address indexed dao,
        uint256 indexed proposalId,
        uint8 pType,
        address indexed proposer,
        address targetAdmin,
        uint256 investmentId,
        uint256 votingDeadline
    );
    event ProposalVoteCast(
        address indexed dao, uint256 indexed proposalId, address indexed voter, bool support, uint256 weight
    );
    event ProposalExecuted(address indexed dao, uint256 indexed proposalId, bool passed);

    // ===== OPEN =====
    function openProposal(address dao, uint8 pType, address targetAdmin, uint256 investmentId)
        external
        returns (uint256 proposalId)
    {
        if (IVaultGov(dao).governor() != address(this)) revert NotThisDaosGovernor();
        if (pType > uint8(ProposalType.ReinstateAdmin)) revert BadProposalType();
        if (!IVaultGov(dao).isVerifiedMember(msg.sender)) revert NotVerifiedMember();

        DaoGov storage g = _dao[dao];
        uint256 last = g.lastProposalAt[msg.sender];
        if (last != 0 && block.timestamp < last + PROPOSAL_COOLDOWN) revert ProposalCooldownActive();

        ProposalType t = ProposalType(pType);
        (uint256 denom, uint16 thresholdBps, uint16 quorumFloorBps) =
            _validateAndRule(dao, g, t, targetAdmin, investmentId);

        if (t == ProposalType.RemoveAdmin || t == ProposalType.ReinstateAdmin) {
            investmentId = 0;
        } else {
            targetAdmin = address(0);
        }

        bytes32 key = keccak256(abi.encode(pType, targetAdmin, investmentId));
        uint256 existing = g.activeProposalOf[key];
        if (existing != 0) {
            Proposal storage ep = g.proposals[existing];
            if (!ep.executed) {
                // An *open* proposal blocks a duplicate.
                if (block.timestamp <= ep.votingDeadline) revert DuplicateProposal();
                // One that ended without execution (failed quorum, or nobody
                // called executeProposal) must not hold the slot forever — that
                // lets a cheap failing proposal DoS the real one. Tombstone it
                // so it can never be executed later and apply a stale effect.
                ep.executed = true;
                emit ProposalExecuted(dao, existing, false);
            }
        }

        g.proposalCount += 1;
        proposalId = g.proposalCount;
        Proposal storage p = g.proposals[proposalId];
        p.pType = t;
        p.proposer = msg.sender;
        p.targetAdmin = targetAdmin;
        p.investmentId = investmentId;
        p.createdAt = block.timestamp;
        p.votingDeadline = block.timestamp + VOTING_WINDOW;
        p.snapshotDenominator = denom;
        p.thresholdBps = thresholdBps;
        p.quorumFloorBps = quorumFloorBps;

        g.activeProposalOf[key] = proposalId;
        g.lastProposalAt[msg.sender] = block.timestamp;

        emit ProposalCreated(dao, proposalId, pType, msg.sender, targetAdmin, investmentId, p.votingDeadline);
    }

    function _validateAndRule(address dao, DaoGov storage g, ProposalType t, address targetAdmin, uint256 investmentId)
        internal
        view
        returns (uint256 denom, uint16 thresholdBps, uint16 quorumFloorBps)
    {
        IVaultGov v = IVaultGov(dao);

        if (t == ProposalType.RemoveAdmin || t == ProposalType.ReinstateAdmin) {
            if (v.committedStake(msg.sender) == 0) revert NoGovernanceStake();
            if (targetAdmin == address(0) || targetAdmin == v.creator()) revert BadTarget();
            if (t == ProposalType.RemoveAdmin) {
                if (!v.isAdmin(targetAdmin)) revert BadTarget();
            } else if (!v.bannedAdmin(targetAdmin)) {
                revert AdminNotBanned();
            }
            return (v.totalCommittedStake(), POWER_MAJORITY_BPS, ADMIN_TURNOUT_FLOOR_BPS);
        }

        if (investmentId == 0 || investmentId > v.investmentCount()) revert InvalidInvestment();
        ICivicVault.Vote memory uv = v.getVote(investmentId, msg.sender);
        if (uv.numberOfVotes == 0 || uv.voteValue != 1) revert NoGovernanceStake();
        ICivicVault.Investment memory inv = v.getInvestment(investmentId);
        denom = inv.upvotes; // fixed once ACTIVE; snapshot anyway

        if (t == ProposalType.UnfreezeRelease) {
            if (!v.releaseFrozen(investmentId)) revert InvestmentNotFrozen();
            return (denom, UNFREEZE_BPS, 0);
        }
        if (t == ProposalType.FreezeRelease) {
            if (inv.status != ICivicVault.Status.ACTIVE) revert InvestmentNotActive();
            if (block.timestamp < g.freezeCooldownUntil[investmentId]) revert FreezeCooldownActive();
            uint256 esc = FREEZE_BASE_BPS + FREEZE_STEP_BPS * g.freezeCount[investmentId];
            return (denom, esc > FREEZE_MAX_BPS ? FREEZE_MAX_BPS : uint16(esc), 0);
        }
        // Clawback
        if (inv.status != ICivicVault.Status.ACTIVE) revert InvestmentNotActive();
        return (denom, POWER_MAJORITY_BPS, CLAWBACK_TURNOUT_FLOOR_BPS);
    }

    // ===== VOTE =====
    function voteOnProposal(address dao, uint256 proposalId, bool support) external {
        if (IVaultGov(dao).governor() != address(this)) revert NotThisDaosGovernor();
        DaoGov storage g = _dao[dao];
        Proposal storage p = g.proposals[proposalId];
        if (p.votingDeadline == 0) revert ProposalNotFound();
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp > p.votingDeadline) revert VotingClosed();
        if (g.hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        if (!IVaultGov(dao).isVerifiedMember(msg.sender)) revert NotVerifiedMember();

        uint256 weight;
        if (p.pType == ProposalType.RemoveAdmin || p.pType == ProposalType.ReinstateAdmin) {
            weight = IVaultGov(dao).committedStake(msg.sender);
        } else {
            ICivicVault.Vote memory uv = IVaultGov(dao).getVote(p.investmentId, msg.sender);
            weight = uv.voteValue == 1 ? uv.numberOfVotes : 0;
        }
        if (weight == 0) revert NoGovernanceStake();

        g.hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.yesWeight += weight;
        } else {
            p.noWeight += weight;
        }

        // Lock the voter's stake in the DAO until this proposal closes.
        IVaultGov(dao).govApply(0, msg.sender, p.votingDeadline, 0);

        emit ProposalVoteCast(dao, proposalId, msg.sender, support, weight);
    }

    // ===== EXECUTE =====
    function executeProposal(address dao, uint256 proposalId) external {
        IVaultGov v = IVaultGov(dao);
        if (v.governor() != address(this)) revert NotThisDaosGovernor();
        DaoGov storage g = _dao[dao];
        Proposal storage p = g.proposals[proposalId];
        if (p.votingDeadline == 0) revert ProposalNotFound();
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp <= p.votingDeadline) revert VotingStillOpen();

        p.executed = true;
        bool passed = _passed(p.yesWeight, p.noWeight, p.snapshotDenominator, p.thresholdBps, p.quorumFloorBps);

        // Clear the dedupe slot only if it still points at this proposal — a
        // later proposal for the same key may already hold it (see openProposal).
        bytes32 key = keccak256(abi.encode(uint8(p.pType), p.targetAdmin, p.investmentId));
        if (g.activeProposalOf[key] == proposalId) delete g.activeProposalOf[key];
        emit ProposalExecuted(dao, proposalId, passed);
        if (!passed) return;

        if (p.pType == ProposalType.RemoveAdmin) {
            v.govApply(1, p.targetAdmin, 0, 0);
        } else if (p.pType == ProposalType.ReinstateAdmin) {
            v.govApply(2, p.targetAdmin, 0, 0);
        } else if (p.pType == ProposalType.FreezeRelease) {
            // Freeze only bites an investment still releasing funds. If it wound
            // down during the voting window the vote passed but there is nothing
            // to freeze — stop without touching the escalation ladder.
            if (v.getInvestment(p.investmentId).status != ICivicVault.Status.ACTIVE) return;
            uint256 expiry = block.timestamp + FREEZE_DURATION;
            g.freezeCount[p.investmentId] += 1;
            g.freezeCooldownUntil[p.investmentId] = expiry + FREEZE_COOLDOWN;
            v.govApply(3, address(0), p.investmentId, expiry);
        } else if (p.pType == ProposalType.UnfreezeRelease) {
            v.govApply(4, address(0), p.investmentId, 0);
        } else {
            // Clawback is meaningless once the investment left ACTIVE (wound down
            // to ENDED, or already clawed back). Re-applying govApply(5) here
            // would zero clawbackPool and strand the escrow — guard against it.
            if (v.getInvestment(p.investmentId).status != ICivicVault.Status.ACTIVE) return;
            v.govApply(5, address(0), p.investmentId, 0);
        }
    }

    function _passed(uint256 yes, uint256 no, uint256 denom, uint16 thresholdBps, uint16 quorumFloorBps)
        internal
        pure
        returns (bool)
    {
        if (quorumFloorBps == 0) {
            // Absolute mode (circuit-breaker freeze/unfreeze) vs the fixed snapshot.
            return yes * 10_000 > denom * thresholdBps;
        }
        uint256 cast = yes + no;
        bool turnoutOk = cast * 10_000 >= denom * quorumFloorBps;
        bool majorityOk = yes * 10_000 > cast * thresholdBps;
        return turnoutOk && majorityOk;
    }

    // ===== VIEWS =====
    function proposalCount(address dao) external view returns (uint256) {
        return _dao[dao].proposalCount;
    }

    function getProposal(address dao, uint256 proposalId)
        external
        view
        returns (
            uint8 pType,
            address proposer,
            address targetAdmin,
            uint256 investmentId,
            uint256 votingDeadline,
            uint256 yesWeight,
            uint256 noWeight,
            bool executed,
            uint256 snapshotDenominator,
            uint16 thresholdBps,
            uint16 quorumFloorBps
        )
    {
        Proposal storage p = _dao[dao].proposals[proposalId];
        return (
            uint8(p.pType),
            p.proposer,
            p.targetAdmin,
            p.investmentId,
            p.votingDeadline,
            p.yesWeight,
            p.noWeight,
            p.executed,
            p.snapshotDenominator,
            p.thresholdBps,
            p.quorumFloorBps
        );
    }

    function hasVoted(address dao, uint256 proposalId, address voter) external view returns (bool) {
        return _dao[dao].hasVoted[proposalId][voter];
    }

    function proposalStatus(address dao, uint256 proposalId)
        external
        view
        returns (bool open, bool executed, bool passing)
    {
        Proposal storage p = _dao[dao].proposals[proposalId];
        open = p.votingDeadline != 0 && !p.executed && block.timestamp <= p.votingDeadline;
        executed = p.executed;
        passing = _passed(p.yesWeight, p.noWeight, p.snapshotDenominator, p.thresholdBps, p.quorumFloorBps);
    }
}
