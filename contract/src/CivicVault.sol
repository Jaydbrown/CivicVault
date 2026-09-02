// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {YieldCalculator} from "./libraries/YieldCalculator.sol";
import {InvestmentManager} from "./libraries/InvestmentManager.sol";
import {ICivicVault} from "./interfaces/ICivicVault.sol";

contract CivicVault is ICivicVault, Pausable, ReentrancyGuard, Initializable {
    using SafeERC20 for IERC20;

    // ===== CUSTOM ERRORS =====
    error NotCreator();
    error Unauthorized();
    error NotActiveMember();
    error KYCNotVerified();
    error NoStake();
    error OnlyUpvoters();
    error ZeroAddress();
    error AlreadyMember();
    error MembershipFull();
    error NotMember();
    error KYCAlreadyVerified();
    error InvalidInvestment();
    error NotPending();
    error DeadlinePassed();
    error InvalidVoteValue();
    error UpvoteRequiresStake();
    error InsufficientBalance();
    error InsufficientAllowance();
    error CannotChangeDownToUp();
    error AlreadyVoted();
    error DownvoteNoStake();
    error InvalidParams();
    error EmptyName();
    error CannotExtend();
    error InvalidExtensionDays();
    error AllPhasesReleased();
    error NoEscrowedFunds();
    error ExceedsStake();
    error ZeroAmount();
    error NotIncomplete();
    error NoStakeToWithdraw();
    error NotEnoughAdmins();
    error InvalidProposal();
    error AlreadyExecuted();
    error AlreadyApproved();
    error NotEnoughApprovals();
    error InsufficientProposerBalance();
    error InsufficientProposerAllowance();
    error InvestmentNotActive();
    error YieldAlreadyClaimed();
    error NoYieldAvailable();
    error YieldExceedsTotal();
    error CannotClose();
    error NoActiveInvestments();
    error AlreadyAdmin();
    error NotAnAdmin();
    error AlreadyFinanceManager();
    error NotAFinanceManager();
    error EmptyDescription();
    /// @notice Only the yield proposer or an admin/creator may execute after approvals (prevents third-party griefing).
    error UnauthorizedYieldExec();
    error ArrayLengthMismatch();
    error NotAMember();
    error FeeTooHigh();
    error ReleaseIsFrozen();
    error NotClawedBack();
    error AdminBanned();
    error StakeLocked();
    error NotGovernor();

    // ===== DAO IDENTITY =====
    string public name;
    string public description;
    string public location;
    string public coordinates;
    string public postalCode;
    string public logoURI;
    uint256 public maxMembership;

    // ===== ROLES =====
    address public creator;
    address[] public admins;
    mapping(address => bool) public isAdmin;
    mapping(address => bool) public isFinanceManager;

    // ===== MEMBERS =====
    // Structs are defined in ICivicVault; inherited via `is ICivicVault`
    mapping(address => User) public members;
    address[] public memberAddresses;
    uint256 public memberCount;

    // ===== INVESTMENTS =====
    mapping(uint256 => Investment) public investments;
    uint256 public investmentCount;
    uint256 public activeInvestmentCount;

    // ===== VOTING =====
    mapping(uint256 => mapping(address => Vote)) public votes;

    // ===== YIELD TRACKING =====
    mapping(uint256 => YieldDistribution) public yieldDistributions;

    // ===== YIELD PROPOSALS (MULTI-SIG) =====
    uint256 public constant REQUIRED_YIELD_APPROVALS = 3;
    uint256 public constant REQUIRED_ADMIN_COUNT = 5;

    uint256 public yieldProposalCount;
    mapping(uint256 => YieldProposal) public yieldProposals;
    mapping(uint256 => mapping(address => bool)) public yieldProposalApprovals;

    // Activity timeline removed — events indexed by The Graph subgraph instead.

    // ===== TREASURY =====
    address public usdcAddress;
    uint256 public totalValueLocked;

    // ===== ESCROW =====
    mapping(uint256 => uint256) public escrowedAmount;
    mapping(uint256 => uint256) public escrowTotal;
    mapping(uint256 => uint8) public releasePhaseCompleted;

    uint256 public constant PHASE1_PERCENT = 30;
    uint256 public constant PHASE2_PERCENT = 40;
    uint256 public constant PHASE3_PERCENT = 30;
    uint256 public constant MAX_EXTENSIONS = 3;

    // ===== PROTOCOL FEE =====
    // Skimmed from realised yield only, at executeYieldDeposit. Never touches
    // staked principal or escrowed tranches. Set once in initialize.
    uint16 public constant MAX_YIELD_FEE_BPS = 500; // 5%
    uint16 internal constant MAX_DISBURSEMENT_FEE_BPS = 100; // 1%
    // No public getter — the recipient is disclosed on every YieldFeeSkimmed
    // event and configured on the factory. Saves vault bytecode.
    address internal _protocolTreasury;
    uint16 public yieldFeeBps;
    // Fee in bps taken from each escrow tranche as it is disbursed to a project.
    // Comes out of the disbursement, not the staked principal. Set once in
    // initialize; disclosed on every DisbursementFeeSkimmed event and on the factory.
    uint16 internal _disbursementFeeBps;

    // ===== MEMBER GOVERNANCE =====
    // The proposal / voting / threshold machinery lives in a separate singleton
    // CivicVaultGovernor (like CivicVaultView). This contract keeps only the
    // stake-weight accounting and the effect state, and exposes gov* setters the
    // governor may call once a member vote has passed.
    address public governor;

    // A member's USDC still committed to this DAO's investments. Incremented on
    // upvote; decremented only when the member personally gets USDC back
    // (withdrawStake, reclaimClawback). Not reduced by releaseNextPhase — the
    // DAO spending money you backed does not erase your standing.
    mapping(address => uint256) public committedStake;
    uint256 public totalCommittedStake;

    // Set on a passed RemoveAdmin vote; blocks addAdmin re-appointment until a
    // passed ReinstateAdmin vote clears it. Without this the creator just re-adds.
    mapping(address => bool) public bannedAdmin;
    // A member who voted on a live proposal cannot pull stake before that
    // proposal's deadline — otherwise "vote then withdraw" keeps the weight.
    mapping(address => uint256) internal stakeLockedUntil;

    mapping(uint256 => bool) public releaseFrozen;
    mapping(uint256 => uint256) internal freezeExpiry;
    mapping(uint256 => uint256) public clawbackPool; // escrowedAmount snapshot at clawback execute
    mapping(uint256 => mapping(address => bool)) public clawbackClaimed;

    // ===== MODIFIERS =====
    modifier onlyGovernor() {
        if (msg.sender != governor || governor == address(0)) revert NotGovernor();
        _;
    }

    modifier onlyCreator() {
        if (msg.sender != creator) revert NotCreator();
        _;
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender] && msg.sender != creator) revert Unauthorized();
        _;
    }

    modifier onlyFinanceManager() {
        if (!isFinanceManager[msg.sender] && !isAdmin[msg.sender] && msg.sender != creator) revert Unauthorized();
        _;
    }

    modifier onlyVerifiedMember() {
        if (!members[msg.sender].isActive) revert NotActiveMember();
        if (!members[msg.sender].kycVerified) revert KYCNotVerified();
        _;
    }

    modifier hasStakeInInvestment(uint256 investmentId) {
        Vote storage userVote = votes[investmentId][msg.sender];
        if (userVote.numberOfVotes == 0) revert NoStake();
        if (userVote.voteValue != 1) revert OnlyUpvoters();
        _;
    }

    modifier investmentExists(uint256 investmentId) {
        if (investmentId == 0 || investmentId > investmentCount) revert InvalidInvestment();
        _;
    }

    // ===== CONSTRUCTOR / INITIALIZER =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _creator,
        string memory _name,
        string memory _description,
        string memory _location,
        string memory _coordinates,
        string memory _postalCode,
        uint256 _maxMembership,
        address _usdcAddress,
        address _protocolTreasury_,
        uint16 _protocolYieldFeeBps,
        address _governor,
        uint16 _disburseFeeBps
    ) external initializer {
        if (_creator == address(0)) revert ZeroAddress();
        if (_usdcAddress == address(0)) revert ZeroAddress();
        if (_protocolYieldFeeBps > MAX_YIELD_FEE_BPS || _disburseFeeBps > MAX_DISBURSEMENT_FEE_BPS) {
            revert FeeTooHigh();
        }
        if (_protocolTreasury_ == address(0) && (_protocolYieldFeeBps != 0 || _disburseFeeBps != 0)) {
            revert ZeroAddress();
        }

        creator = _creator;
        governor = _governor;
        name = _name;
        description = _description;
        location = _location;
        coordinates = _coordinates;
        postalCode = _postalCode;
        maxMembership = _maxMembership;
        usdcAddress = _usdcAddress;
        _protocolTreasury = _protocolTreasury_;
        yieldFeeBps = _protocolYieldFeeBps;
        _disbursementFeeBps = _disburseFeeBps;
    }

    /// @dev Skims `bps` of `gross` to the protocol treasury; returns the fee taken.
    function _skimFee(uint256 gross, uint16 bps) internal returns (uint256 fee) {
        fee = (gross * bps) / 10_000;
        if (fee > 0) IERC20(usdcAddress).safeTransfer(_protocolTreasury, fee);
    }

    // ===== MEMBER MANAGEMENT =====
    function addMember(address wallet, bytes32 kycProofHash) external onlyAdmin whenNotPaused {
        if (wallet == address(0)) revert ZeroAddress();
        if (members[wallet].isActive) revert AlreadyMember();
        if (memberCount >= maxMembership) revert MembershipFull();

        // Roster onboarding: admins finalize compliance with verifyMemberKYC before voting.
        members[wallet] = User({
            wallet: wallet, kycVerified: false, kycProofHash: kycProofHash, joinedAt: block.timestamp, isActive: true
        });
        memberAddresses.push(wallet);
        memberCount++;

        emit MemberAdded(wallet, block.timestamp);
    }

    function verifyMemberKYC(address wallet) external onlyAdmin whenNotPaused {
        if (!members[wallet].isActive) revert NotMember();
        if (members[wallet].kycVerified) revert KYCAlreadyVerified();

        members[wallet].kycVerified = true;
        emit MemberKYCVerified(wallet, block.timestamp);
    }

    function removeMember(address wallet) external onlyAdmin whenNotPaused {
        if (!members[wallet].isActive) revert NotMember();

        members[wallet].isActive = false;
        memberCount--;

        emit MemberRemoved(wallet, block.timestamp);
    }

    function exitDAO() external {
        if (!members[msg.sender].isActive) revert NotMember();

        members[msg.sender].isActive = false;
        memberCount--;

        emit MemberExited(msg.sender, block.timestamp);
    }

    function getAllMembers() external view returns (address[] memory) {
        return memberAddresses;
    }

    function isVerifiedMember(address wallet) external view returns (bool) {
        return members[wallet].isActive && members[wallet].kycVerified;
    }

    // ===== INVESTMENT CREATION =====
    function createInvestment(
        string memory _name,
        ICivicVault.Category category,
        uint256 fundNeeded,
        uint256 expectedYield,
        ICivicVault.Grade grade,
        uint256 deadline,
        string[] memory documentCIDs
    ) external onlyAdmin whenNotPaused returns (uint256 investmentId) {
        if (!InvestmentManager.validateInvestmentParams(fundNeeded, expectedYield, deadline)) revert InvalidParams();
        if (bytes(_name).length == 0) revert EmptyName();

        investmentCount++;
        investmentId = investmentCount;

        investments[investmentId] = Investment({
            id: investmentId,
            name: _name,
            status: ICivicVault.Status.PENDING,
            category: category,
            deadline: block.timestamp + (deadline * 1 days),
            upvotes: 0,
            downvotes: 0,
            fundNeeded: fundNeeded,
            expectedYield: expectedYield,
            grade: grade,
            documentCIDs: documentCIDs,
            totalYieldGenerated: 0,
            totalYieldDistributed: 0,
            extensionCount: 0,
            createdAt: block.timestamp,
            createdBy: msg.sender
        });

        emit InvestmentCreated(investmentId, _name, fundNeeded, grade, investments[investmentId].deadline);

        return investmentId;
    }

    function getInvestment(uint256 investmentId)
        external
        view
        investmentExists(investmentId)
        returns (Investment memory)
    {
        return investments[investmentId];
    }

    // ===== VOTING =====
    function vote(uint256 investmentId, uint256 numberOfVotes, uint8 voteValue)
        external
        onlyVerifiedMember
        investmentExists(investmentId)
        nonReentrant
        whenNotPaused
    {
        Investment storage inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.PENDING) revert NotPending();
        if (block.timestamp > inv.deadline) revert DeadlinePassed();
        if (voteValue > 1) revert InvalidVoteValue();

        Vote storage userVote = votes[investmentId][msg.sender];

        if (voteValue == 1) {
            if (numberOfVotes == 0) revert UpvoteRequiresStake();
            if (IERC20(usdcAddress).balanceOf(msg.sender) < numberOfVotes) revert InsufficientBalance();
            if (IERC20(usdcAddress).allowance(msg.sender, address(this)) < numberOfVotes) {
                revert InsufficientAllowance();
            }
            if (userVote.numberOfVotes != 0 && userVote.voteValue != 1) revert CannotChangeDownToUp();

            // CEI: update state before external transfer (ERC-20 UX best practice).
            userVote.voter = msg.sender;
            userVote.investmentId = investmentId;
            userVote.numberOfVotes += numberOfVotes;
            userVote.voteValue = 1;
            userVote.timestamp = block.timestamp;

            inv.upvotes += numberOfVotes;
            totalValueLocked += numberOfVotes;
            committedStake[msg.sender] += numberOfVotes;
            totalCommittedStake += numberOfVotes;

            IERC20(usdcAddress).safeTransferFrom(msg.sender, address(this), numberOfVotes);
        } else {
            if (userVote.numberOfVotes != 0) revert AlreadyVoted();
            if (numberOfVotes != 0) revert DownvoteNoStake();

            userVote.voter = msg.sender;
            userVote.investmentId = investmentId;
            userVote.numberOfVotes = 0;
            userVote.voteValue = 0;
            userVote.timestamp = block.timestamp;
            userVote.hasClaimedYield = false;
            userVote.yieldClaimed = 0;

            inv.downvotes++;
        }

        emit VoteCast(investmentId, msg.sender, numberOfVotes, voteValue, block.timestamp);
    }

    function getVote(uint256 investmentId, address voter) external view returns (Vote memory) {
        return votes[investmentId][voter];
    }

    // ===== INVESTMENT ACTIVATION =====
    function activateInvestment(uint256 investmentId) external onlyAdmin investmentExists(investmentId) whenNotPaused {
        Investment storage inv = investments[investmentId];

        if (!InvestmentManager.canActivate(inv.upvotes, inv.fundNeeded, inv.deadline, block.timestamp)) {
            revert InvalidParams();
        }
        if (inv.status != ICivicVault.Status.PENDING) revert NotPending();

        inv.status = ICivicVault.Status.ACTIVE;
        activeInvestmentCount++;

        uint256 lockAmount = inv.upvotes < inv.fundNeeded ? inv.upvotes : inv.fundNeeded;
        escrowedAmount[investmentId] = lockAmount;
        escrowTotal[investmentId] = lockAmount;

        emit FundsLocked(investmentId, lockAmount);
        emit InvestmentActivated(investmentId, block.timestamp);
    }

    function markInvestmentIncomplete(uint256 investmentId)
        external
        onlyAdmin
        investmentExists(investmentId)
        whenNotPaused
    {
        Investment storage inv = investments[investmentId];

        if (!InvestmentManager.shouldMarkIncomplete(inv.upvotes, inv.fundNeeded, inv.deadline, block.timestamp)) {
            revert InvalidParams();
        }
        if (inv.status != ICivicVault.Status.PENDING) revert NotPending();

        inv.status = ICivicVault.Status.INCOMPLETE;

        emit InvestmentIncomplete(investmentId, block.timestamp);
    }

    function extendDeadline(uint256 investmentId, uint256 additionalDays)
        external
        onlyFinanceManager
        investmentExists(investmentId)
        whenNotPaused
    {
        Investment storage inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.PENDING) revert NotPending();

        if (!InvestmentManager.canExtendDeadline(
                InvestmentManager.Grade(uint8(inv.grade)), inv.extensionCount, MAX_EXTENSIONS
            )) revert CannotExtend();
        if (additionalDays == 0 || additionalDays > 90) revert InvalidExtensionDays();

        inv.deadline = InvestmentManager.calculateNewDeadline(inv.deadline, additionalDays);
        inv.extensionCount++;

        emit DeadlineExtended(investmentId, inv.deadline, inv.extensionCount);
    }

    function releaseNextPhase(uint256 investmentId, address recipient)
        external
        onlyAdmin
        investmentExists(investmentId)
        nonReentrant
        whenNotPaused
    {
        Investment storage inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.ACTIVE && inv.status != ICivicVault.Status.ENDED) revert InvalidParams();

        // Member-voted freeze (auto-expires after FREEZE_DURATION — the < check
        // is the expiry, no explicit unfreeze needed). Admins/creator have no
        // path to lift this; only time or a member UnfreezeRelease vote does.
        if (releaseFrozen[investmentId] && block.timestamp < freezeExpiry[investmentId]) revert ReleaseIsFrozen();

        uint8 completed = releasePhaseCompleted[investmentId];
        if (completed >= 3) revert AllPhasesReleased();

        uint256 escrow = escrowedAmount[investmentId];
        if (escrow == 0) revert NoEscrowedFunds();

        uint8 nextPhase = completed + 1;
        uint256 total = escrowTotal[investmentId];
        uint256 amount;

        if (nextPhase == 1) {
            amount = (total * PHASE1_PERCENT) / 100;
        } else if (nextPhase == 2) {
            amount = (total * PHASE2_PERCENT) / 100;
        } else {
            uint256 sentSoFar;
            if (completed >= 1) sentSoFar += (total * PHASE1_PERCENT) / 100;
            if (completed >= 2) sentSoFar += (total * PHASE2_PERCENT) / 100;
            amount = total > sentSoFar ? total - sentSoFar : 0;
        }

        uint256 releasedSoFar = total - escrow;
        if (releasedSoFar + amount > inv.upvotes) revert ExceedsStake();
        if (amount == 0) revert ZeroAmount();

        address to = recipient == address(0) ? inv.createdBy : recipient;

        // Protocol disbursement fee — comes out of the tranche, not the staked
        // principal. The full `amount` still leaves escrow / TVL; the recipient
        // receives the remainder.
        uint256 fee = _skimFee(amount, _disbursementFeeBps);
        IERC20(usdcAddress).safeTransfer(to, amount - fee);
        escrowedAmount[investmentId] -= amount;
        releasePhaseCompleted[investmentId] = nextPhase;
        totalValueLocked -= amount;

        emit FundsReleased(investmentId, nextPhase, amount, to, fee);
    }

    // ===== REFUNDS =====
    function withdrawStake(uint256 investmentId) external investmentExists(investmentId) nonReentrant {
        Investment storage inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.INCOMPLETE) revert NotIncomplete();
        if (block.timestamp < stakeLockedUntil[msg.sender]) revert StakeLocked();

        Vote storage userVote = votes[investmentId][msg.sender];
        if (userVote.numberOfVotes == 0) revert NoStakeToWithdraw();

        uint256 amount = userVote.numberOfVotes;
        userVote.numberOfVotes = 0;
        totalValueLocked -= amount;
        _reduceCommittedStake(msg.sender, amount);

        IERC20(usdcAddress).safeTransfer(msg.sender, amount);

        emit StakeWithdrawn(investmentId, msg.sender, amount);
    }

    function getWithdrawableAmount(uint256 investmentId, address voter)
        external
        view
        investmentExists(investmentId)
        returns (uint256)
    {
        if (investments[investmentId].status != ICivicVault.Status.INCOMPLETE) return 0;
        return votes[investmentId][voter].numberOfVotes;
    }

    // ===== MULTI-SIG YIELD FLOW =====
    function proposeYieldDeposit(uint256 investmentId, uint256 yieldAmount, string memory expenseReportCID)
        public
        onlyFinanceManager
        investmentExists(investmentId)
        whenNotPaused
        returns (uint256)
    {
        if (investments[investmentId].status != ICivicVault.Status.ACTIVE) revert InvestmentNotActive();
        if (yieldAmount == 0) revert ZeroAmount();
        if (admins.length < REQUIRED_ADMIN_COUNT) revert NotEnoughAdmins();

        yieldProposalCount++;
        uint256 pid = yieldProposalCount;

        yieldProposals[pid] = YieldProposal({
            id: pid,
            investmentId: investmentId,
            amount: yieldAmount,
            expenseReportCID: expenseReportCID,
            proposer: msg.sender,
            approvals: 0,
            executed: false,
            createdAt: block.timestamp
        });

        emit YieldDepositProposed(pid, investmentId, yieldAmount, msg.sender, block.timestamp);
        return pid;
    }

    function approveYieldDeposit(uint256 proposalId) external onlyAdmin whenNotPaused {
        YieldProposal storage p = yieldProposals[proposalId];
        if (p.id == 0) revert InvalidProposal();
        if (p.executed) revert AlreadyExecuted();
        if (yieldProposalApprovals[proposalId][msg.sender]) revert AlreadyApproved();

        yieldProposalApprovals[proposalId][msg.sender] = true;
        p.approvals++;

        emit YieldDepositApproved(proposalId, msg.sender, p.approvals);
    }

    function executeYieldDeposit(uint256 proposalId) external nonReentrant whenNotPaused {
        YieldProposal storage p = yieldProposals[proposalId];
        if (p.id == 0) revert InvalidProposal();
        if (p.executed) revert AlreadyExecuted();
        if (p.approvals < REQUIRED_YIELD_APPROVALS) revert NotEnoughApprovals();
        if (msg.sender != p.proposer && !isAdmin[msg.sender] && msg.sender != creator) {
            revert UnauthorizedYieldExec();
        }

        Investment storage inv = investments[p.investmentId];
        if (!InvestmentManager.canDepositYield(InvestmentManager.Status(uint8(inv.status)))) {
            revert InvestmentNotActive();
        }

        if (IERC20(usdcAddress).balanceOf(p.proposer) < p.amount) revert InsufficientProposerBalance();
        if (IERC20(usdcAddress).allowance(p.proposer, address(this)) < p.amount) {
            revert InsufficientProposerAllowance();
        }

        IERC20(usdcAddress).safeTransferFrom(p.proposer, address(this), p.amount);

        // Protocol fee — realised yield only. Never touches staked principal or
        // escrowed tranches. `net` is what members are entitled to.
        uint256 fee = _skimFee(p.amount, yieldFeeBps);
        uint256 net = p.amount - fee;
        if (fee > 0) emit YieldFeeSkimmed(p.investmentId, proposalId, fee, _protocolTreasury);

        inv.totalYieldGenerated += net;

        YieldDistribution storage dist = yieldDistributions[p.investmentId];
        dist.investmentId = p.investmentId;
        dist.totalAmount += net;
        dist.remainingAmount += net;
        dist.expenseReportCID = p.expenseReportCID;
        dist.timestamp = block.timestamp;

        p.executed = true;

        emit YieldDepositExecuted(proposalId, p.investmentId, net, p.expenseReportCID, block.timestamp);
        emit YieldDeposited(p.investmentId, net, p.expenseReportCID, block.timestamp);
    }

    // ===== YIELD CLAIMING =====
    function claimYield(uint256 investmentId)
        external
        investmentExists(investmentId)
        hasStakeInInvestment(investmentId)
        nonReentrant
    {
        Investment storage inv = investments[investmentId];
        // Allow claiming on ACTIVE and ENDED (members retain rights during the
        // grace period), and on CLAWED_BACK — yield deposited before a clawback
        // still belongs to the stakers.
        if (
            inv.status != ICivicVault.Status.ACTIVE && inv.status != ICivicVault.Status.ENDED
                && inv.status != ICivicVault.Status.CLAWED_BACK
        ) {
            revert InvestmentNotActive();
        }

        Vote storage userVote = votes[investmentId][msg.sender];

        // Incremental claim: totalEntitled grows as more yield is deposited.
        // yieldClaimed tracks how much of that entitlement the member has already received.
        uint256 totalEntitled =
            YieldCalculator.calculateUserYield(userVote.numberOfVotes, inv.upvotes, inv.totalYieldGenerated);
        uint256 claimable = totalEntitled - userVote.yieldClaimed;

        if (claimable == 0) revert NoYieldAvailable();
        if (!YieldCalculator.validateDistribution(inv.totalYieldDistributed, claimable, inv.totalYieldGenerated)) {
            revert YieldExceedsTotal();
        }

        userVote.yieldClaimed += claimable;
        userVote.hasClaimedYield = true;
        inv.totalYieldDistributed += claimable;

        YieldDistribution storage dist = yieldDistributions[investmentId];
        dist.distributedAmount += claimable;
        dist.remainingAmount -= claimable;

        IERC20(usdcAddress).safeTransfer(msg.sender, claimable);

        emit YieldClaimed(investmentId, msg.sender, claimable, block.timestamp);
    }

    function getYieldDistribution(uint256 investmentId)
        external
        view
        investmentExists(investmentId)
        returns (YieldDistribution memory)
    {
        return yieldDistributions[investmentId];
    }

    // ===== INVESTMENT CLOSURE =====
    function closeInvestment(uint256 investmentId) external onlyAdmin investmentExists(investmentId) whenNotPaused {
        Investment storage inv = investments[investmentId];

        // Wind-down path for a clawed-back investment: principal was already
        // returned to stakers, activeInvestmentCount was decremented at
        // clawback time. Moving it to ENDED lets any yield deposited before the
        // clawback be claimed and, after the grace period, swept.
        if (inv.status == ICivicVault.Status.CLAWED_BACK) {
            inv.status = ICivicVault.Status.ENDED;
            emit InvestmentClosed(investmentId, block.timestamp);
            return;
        }

        if (!InvestmentManager.canCloseInvestment(
                InvestmentManager.Status(uint8(inv.status)), inv.totalYieldGenerated, inv.totalYieldDistributed
            )) revert CannotClose();
        if (activeInvestmentCount == 0) revert NoActiveInvestments();

        inv.status = ICivicVault.Status.ENDED;
        activeInvestmentCount--;

        emit InvestmentClosed(investmentId, block.timestamp);
    }

    // ===== ADMIN FUNCTIONS =====
    function addAdmin(address admin) external onlyCreator {
        if (admin == address(0)) revert ZeroAddress();
        if (isAdmin[admin]) revert AlreadyAdmin();
        // A member vote removed this address; the creator can't just re-appoint
        // them. Only a ReinstateAdmin vote clears the ban.
        if (bannedAdmin[admin]) revert AdminBanned();

        isAdmin[admin] = true;
        admins.push(admin);

        emit AdminAdded(admin);
    }

    function removeAdmin(address admin) external onlyCreator {
        if (!isAdmin[admin]) revert NotAnAdmin();
        _removeAdminInternal(admin);
    }

    /// @dev Shared by the creator path and the member-vote path (executeProposal).
    function _removeAdminInternal(address admin) internal {
        isAdmin[admin] = false;

        uint256 len = admins.length;
        for (uint256 i = 0; i < len; i++) {
            if (admins[i] == admin) {
                admins[i] = admins[len - 1];
                admins.pop();
                break;
            }
        }

        emit AdminRemoved(admin);
    }

    function addFinanceManager(address manager) external onlyCreator {
        if (manager == address(0)) revert ZeroAddress();
        if (isFinanceManager[manager]) revert AlreadyFinanceManager();

        isFinanceManager[manager] = true;
        emit FinanceManagerAdded(manager);
    }

    function removeFinanceManager(address manager) external onlyCreator {
        if (!isFinanceManager[manager]) revert NotAFinanceManager();

        isFinanceManager[manager] = false;
        emit FinanceManagerRemoved(manager);
    }

    function updateDAOInfo(string memory newDescription, string memory newLogoURI) external onlyAdmin whenNotPaused {
        if (bytes(newDescription).length == 0) revert EmptyDescription();
        description = newDescription;
        logoURI = newLogoURI;
        emit DAOInfoUpdated(newDescription, newLogoURI, block.timestamp);
    }

    function pause() external onlyCreator {
        _pause();
        emit DAOPaused(block.timestamp);
    }

    function unpause() external onlyCreator {
        _unpause();
        emit DAOUnpaused(block.timestamp);
    }

    // ===== NEW ADMIN UTILITIES =====

    function updateMemberKYCHash(address wallet, bytes32 newHash) external onlyAdmin whenNotPaused {
        if (!members[wallet].isActive) revert NotAMember();
        members[wallet].kycProofHash = newHash;
        emit MemberKYCHashUpdated(wallet, newHash, block.timestamp);
    }

    function batchAddMembers(address[] memory wallets, bytes32[] memory kycProofHashes)
        external
        onlyAdmin
        whenNotPaused
    {
        if (wallets.length != kycProofHashes.length) revert ArrayLengthMismatch();
        if (memberCount + wallets.length > maxMembership) revert MembershipFull();

        for (uint256 i = 0; i < wallets.length; i++) {
            address wallet = wallets[i];
            if (wallet == address(0)) revert ZeroAddress();
            if (members[wallet].isActive) revert AlreadyMember();

            members[wallet] = User({
                wallet: wallet,
                kycVerified: false,
                kycProofHash: kycProofHashes[i],
                joinedAt: block.timestamp,
                isActive: true
            });
            memberAddresses.push(wallet);
            memberCount++;

            emit MemberAdded(wallet, block.timestamp);
        }
    }

    function updateInvestmentDocuments(uint256 investmentId, string[] memory newDocumentCIDs)
        external
        onlyAdmin
        investmentExists(investmentId)
        whenNotPaused
    {
        investments[investmentId].documentCIDs = newDocumentCIDs;
        emit InvestmentDocumentsUpdated(investmentId, block.timestamp);
    }

    // ===== NEW VIEW HELPERS =====

    function getClaimableYield(uint256 investmentId, address voter)
        external
        view
        investmentExists(investmentId)
        returns (uint256)
    {
        Investment memory inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.ACTIVE && inv.status != ICivicVault.Status.ENDED) return 0;
        Vote memory userVote = votes[investmentId][voter];
        if (userVote.numberOfVotes == 0 || userVote.voteValue != 1) return 0;
        if (inv.upvotes == 0 || inv.totalYieldGenerated == 0) return 0;
        uint256 totalEntitled = (userVote.numberOfVotes * inv.totalYieldGenerated) / inv.upvotes;
        return totalEntitled > userVote.yieldClaimed ? totalEntitled - userVote.yieldClaimed : 0;
    }

    function getYieldProposal(uint256 proposalId) external view returns (YieldProposal memory) {
        if (proposalId == 0 || proposalId > yieldProposalCount) revert InvalidProposal();
        return yieldProposals[proposalId];
    }

    function hasApprovedProposal(uint256 proposalId, address admin) external view returns (bool) {
        return yieldProposalApprovals[proposalId][admin];
    }

    function getAdmins() external view returns (address[] memory) {
        return admins;
    }

    // ===== MEMBER-INITIATED GOVERNANCE (governor-gated effects) =====
    // getInvestmentsByStatus removed from the vault to save bytecode; use
    // CivicVaultView.getInvestmentsByStatus(dao, status).

    /// @dev Underflow-safe decrement used by withdrawStake and reclaimClawback.
    function _reduceCommittedStake(address member, uint256 amount) internal {
        uint256 c = committedStake[member];
        uint256 dec = amount > c ? c : amount;
        committedStake[member] = c - dec;
        totalCommittedStake -= dec;
    }

    /// @notice Single entry point for CivicVaultGovernor to apply a passed vote.
    /// @param kind 0 lockStake, 1 banAdmin, 2 reinstateAdmin, 3 freeze, 4 unfreeze, 5 clawback.
    /// @param addr member (kind 0) / admin (kind 1,2); zero otherwise.
    /// @param id investment id (kind 3,4,5); `until` timestamp (kind 0).
    /// @param expiry freeze expiry timestamp (kind 3).
    /// @return pool the clawed-back escrow amount (kind 5) else 0.
    function govApply(uint8 kind, address addr, uint256 id, uint256 expiry)
        external
        onlyGovernor
        returns (uint256 pool)
    {
        if (kind == 0) {
            if (id > stakeLockedUntil[addr]) stakeLockedUntil[addr] = id;
        } else if (kind == 1) {
            if (isAdmin[addr]) _removeAdminInternal(addr);
            bannedAdmin[addr] = true;
        } else if (kind == 2) {
            // Member vote lifts the ban; the creator can then re-appoint normally.
            bannedAdmin[addr] = false;
        } else if (kind == 3) {
            releaseFrozen[id] = true;
            freezeExpiry[id] = expiry;
            emit ReleaseFrozen(id, expiry);
        } else if (kind == 4) {
            releaseFrozen[id] = false;
            freezeExpiry[id] = 0;
            emit ReleaseUnfrozen(id);
        } else {
            Investment storage inv = investments[id];
            if (inv.status == ICivicVault.Status.ACTIVE && activeInvestmentCount > 0) activeInvestmentCount--;
            pool = escrowedAmount[id];
            clawbackPool[id] = pool;
            escrowedAmount[id] = 0;
            // Earmark the whole pool as leaving TVL now; integer-division dust
            // (< #upvoters wei) stays in the contract as a harmless surplus.
            totalValueLocked -= pool;
            inv.status = ICivicVault.Status.CLAWED_BACK;
            emit InvestmentClawedBack(id, pool, block.timestamp);
        }
    }

    /// @notice After a clawback, each upvoter reclaims their pro-rata slice of the unreleased escrow.
    function reclaimClawback(uint256 investmentId) external investmentExists(investmentId) nonReentrant {
        Investment storage inv = investments[investmentId];
        if (inv.status != ICivicVault.Status.CLAWED_BACK) revert NotClawedBack();
        if (block.timestamp < stakeLockedUntil[msg.sender]) revert StakeLocked();
        if (clawbackClaimed[investmentId][msg.sender]) revert AlreadyExecuted();

        Vote storage v = votes[investmentId][msg.sender];
        if (v.numberOfVotes == 0 || v.voteValue != 1) revert NoStakeToWithdraw();

        uint256 stake = v.numberOfVotes;
        uint256 payout = (stake * clawbackPool[investmentId]) / inv.upvotes;

        clawbackClaimed[investmentId][msg.sender] = true;
        // Full stake leaves the committed set — an already-released tranche is a
        // realised loss shared by all upvoters, not recoverable here.
        _reduceCommittedStake(msg.sender, stake);
        if (payout > 0) IERC20(usdcAddress).safeTransfer(msg.sender, payout);

        emit ClawbackReclaimed(investmentId, msg.sender, payout);
    }
}
