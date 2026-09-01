// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {CivicVaultGovernor} from "../src/CivicVaultGovernor.sol";
import {CivicVaultView} from "../src/CivicVaultView.sol";
import {ICivicVault} from "../src/interfaces/ICivicVault.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract CivicVaultGovernanceTest is Test {
    CivicVault dao;
    CivicVaultFactory factory;
    CivicVaultGovernor gov;
    CivicVaultView lens;
    MockUSDC usdc;

    address creator = address(0x1);
    address admin1 = address(0xA1);
    address admin2 = address(0xA2);
    address admin3 = address(0xA3);
    address admin4 = address(0xA4);
    address admin5 = address(0xA5);
    address fm = address(0xF1);
    address treasury = address(0x7EE);

    // real, funded members
    address whaleA = address(0xB1);
    address whaleB = address(0xB2);
    address minnow = address(0xB3);
    // sybils the creator adds with no stake
    address[] sybils;

    uint256 constant M = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        lens = new CivicVaultView();
        gov = new CivicVaultGovernor();

        CivicVault impl = new CivicVault();
        vm.prank(creator);
        factory = new CivicVaultFactory(creator, address(impl));
        vm.startPrank(creator);
        factory.setProtocolTreasury(treasury);
        factory.setProtocolYieldFeeBps(300); // 3%
        factory.setGovernor(address(gov));
        dao = CivicVault(factory.createDAO("G", "d", "loc", "0,0", "0", 500, address(usdc)));

        dao.addAdmin(admin1);
        dao.addAdmin(admin2);
        dao.addAdmin(admin3);
        dao.addAdmin(admin4);
        dao.addAdmin(admin5);
        dao.addFinanceManager(fm);
        vm.stopPrank();

        _join(whaleA);
        _join(whaleB);
        _join(minnow);
        for (uint256 i = 0; i < 6; i++) {
            address s = address(uint160(0x5000 + i));
            sybils.push(s);
            _join(s);
        }

        usdc.mint(whaleA, 1_000_000 * M);
        usdc.mint(whaleB, 1_000_000 * M);
        usdc.mint(minnow, 1_000_000 * M);
        usdc.mint(fm, 1_000_000 * M);
    }

    function _join(address who) internal {
        vm.prank(admin1);
        dao.addMember(who, keccak256(abi.encode(who)));
        vm.prank(admin1);
        dao.verifyMemberKYC(who);
    }

    /// Create a PENDING investment, fund it to goal with the given upvoters, activate it.
    function _fundedActive(address[] memory voters, uint256[] memory amounts, uint256 goal)
        internal
        returns (uint256 id)
    {
        vm.prank(admin1);
        id = dao.createInvestment(
            "proj", ICivicVault.Category.OTHER, goal, 10, ICivicVault.Grade.A, 30, new string[](0)
        );
        for (uint256 i = 0; i < voters.length; i++) {
            vm.startPrank(voters[i]);
            usdc.approve(address(dao), amounts[i]);
            dao.vote(id, amounts[i], 1);
            vm.stopPrank();
        }
        vm.prank(admin1);
        dao.activateInvestment(id);
    }

    function _one(address a) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = a;
    }

    function _amt(uint256 a) internal pure returns (uint256[] memory r) {
        r = new uint256[](1);
        r[0] = a;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1 + 3 + 6: sybil-packed membership cannot stop a stake-backed admin removal
    // ─────────────────────────────────────────────────────────────────────────
    function test_RemoveAdmin_sybilsCannotBlock_realStakersWin() public {
        // whales commit real stake; sybils have none
        address[] memory vs = new address[](3);
        uint256[] memory as_ = new uint256[](3);
        vs[0] = whaleA;
        vs[1] = whaleB;
        vs[2] = minnow;
        as_[0] = 600 * M;
        as_[1] = 300 * M;
        as_[2] = 100 * M;
        _fundedActive(vs, as_, 1000 * M);

        assertEq(dao.totalCommittedStake(), 1000 * M);

        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 0, admin3, 0);

        // sybils try to vote — zero weight, rejected
        vm.prank(sybils[0]);
        vm.expectRevert(CivicVaultGovernor.NoGovernanceStake.selector);
        gov.voteOnProposal(address(dao), pid, false);

        // whaleA (600) + minnow (100) yes ; whaleB (300) no  → turnout 1000 (100% of snapshot), yes 700 > 500
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(minnow);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, false);

        // 3: creator inflating stake now must NOT move the bar (snapshot frozen)
        vm.prank(minnow);
        usdc.transfer(creator, 500_000 * M);
        _join(creator == creator ? address(0xDEAD) : address(0)); // noop guard; creator can't self-join anyway

        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);

        assertFalse(dao.isAdmin(admin3), "admin3 should be removed by member vote");
        assertTrue(dao.bannedAdmin(admin3), "admin3 should be banned");
    }

    function test_RemoveAdmin_turnoutFloorNotMet_fails() public {
        address[] memory vs = new address[](2);
        uint256[] memory as_ = new uint256[](2);
        vs[0] = whaleA;
        vs[1] = whaleB;
        as_[0] = 900 * M;
        as_[1] = 100 * M;
        _fundedActive(vs, as_, 1000 * M);

        vm.prank(whaleB);
        uint256 pid = gov.openProposal(address(dao), 0, admin3, 0);
        // only minnow-sized turnout: whaleB (100) yes = 10% turnout < 20% floor
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);

        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);
        assertTrue(dao.isAdmin(admin3), "should survive: turnout floor not met");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1: creator cannot re-add a removed admin; ReinstateAdmin vote lifts the ban
    // ─────────────────────────────────────────────────────────────────────────
    function test_bannedAdmin_cannotBeReAdded_untilReinstateVote() public {
        _passRemoveAdmin(admin3);

        vm.prank(creator);
        vm.expectRevert(CivicVault.AdminBanned.selector);
        dao.addAdmin(admin3);

        // members reinstate
        vm.warp(vm.getBlockTimestamp() + 1 days + 1);
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 4, admin3, 0);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);

        assertFalse(dao.bannedAdmin(admin3), "ban lifted");
        vm.prank(creator);
        dao.addAdmin(admin3); // now allowed
        assertTrue(dao.isAdmin(admin3));
    }

    function _passRemoveAdmin(address target) internal {
        address[] memory vs = new address[](2);
        uint256[] memory as_ = new uint256[](2);
        vs[0] = whaleA;
        vs[1] = whaleB;
        as_[0] = 700 * M;
        as_[1] = 300 * M;
        _fundedActive(vs, as_, 1000 * M);
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 0, target, 0);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);
        assertFalse(dao.isAdmin(target));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6: vote then withdraw is blocked until the proposal closes
    // ─────────────────────────────────────────────────────────────────────────
    function test_stakeLocked_blocksWithdraw_untilProposalCloses() public {
        // whaleA + whaleB back a PENDING investment that will lapse to INCOMPLETE.
        vm.prank(admin1);
        uint256 id = dao.createInvestment(
            "p", ICivicVault.Category.OTHER, 10_000 * M, 10, ICivicVault.Grade.A, 1, new string[](0)
        );
        vm.startPrank(whaleA);
        usdc.approve(address(dao), 1000 * M);
        dao.vote(id, 1000 * M, 1);
        vm.stopPrank();

        // A funded ACTIVE investment so there is something to freeze.
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(400 * M);
        uint256 activeId = _fundedActive(vs, as_, 400 * M);

        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 3, address(0), activeId); // freeze; whaleA has stake in activeId
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true); // -> stakeLockedUntil[whaleA] = deadline

        vm.warp(vm.getBlockTimestamp() + 2 days); // past investment deadline, still inside 3-day proposal window
        vm.prank(admin1);
        dao.markInvestmentIncomplete(id);

        vm.prank(whaleA);
        vm.expectRevert(CivicVault.StakeLocked.selector);
        dao.withdrawStake(id);

        vm.warp(vm.getBlockTimestamp() + 2 days); // proposal window closed
        vm.prank(whaleA);
        dao.withdrawStake(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4: freeze blocks release, auto-expires, escalates, cools down
    // ─────────────────────────────────────────────────────────────────────────
    function test_freeze_blocksRelease_thenAutoExpires() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true); // 1000/1000 = 100% > 33%
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);

        assertTrue(dao.releaseFrozen(id));
        vm.prank(admin1);
        vm.expectRevert(CivicVault.ReleaseIsFrozen.selector);
        dao.releaseNextPhase(id, address(0));

        // auto-expire
        vm.warp(vm.getBlockTimestamp() + 30 days + 1);
        vm.prank(admin1);
        dao.releaseNextPhase(id, address(0));
    }

    function test_freeze_repeat_escalatesThreshold_andCooldown() public {
        address[] memory vs = new address[](2);
        uint256[] memory as_ = new uint256[](2);
        vs[0] = whaleA;
        vs[1] = whaleB;
        as_[0] = 400 * M;
        as_[1] = 600 * M;
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        // freeze #1: base 33%; whaleA alone (400 = 40%) passes
        vm.prank(whaleA);
        uint256 p1 = gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), p1, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), p1);
        assertTrue(dao.releaseFrozen(id));

        // cannot open another freeze during freeze + cooldown
        vm.warp(vm.getBlockTimestamp() + 5 days);
        vm.prank(whaleB);
        vm.expectRevert(CivicVaultGovernor.FreezeCooldownActive.selector);
        gov.openProposal(address(dao), 1, address(0), id);

        // after freeze(30d) + cooldown(7d): freeze #2 needs 33+17 = 50%; whaleA (40%) alone now fails
        vm.warp(vm.getBlockTimestamp() + 40 days);
        vm.prank(whaleA);
        uint256 p2 = gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), p2, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        (,, bool passing) = gov.proposalStatus(address(dao), p2);
        assertFalse(passing, "40% must not clear the escalated 50% bar");
        gov.executeProposal(address(dao), p2);

        // freeze #1 long expired, freeze #2 did not pass -> release works again
        vm.prank(admin1);
        dao.releaseNextPhase(id, address(0xDEAD));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5: clawback returns unreleased escrow pro-rata; dust bounded; no double claim
    // ─────────────────────────────────────────────────────────────────────────
    function test_clawback_afterPhase1_prorata() public {
        address[] memory vs = new address[](3);
        uint256[] memory as_ = new uint256[](3);
        vs[0] = whaleA;
        vs[1] = whaleB;
        vs[2] = minnow;
        as_[0] = 500 * M;
        as_[1] = 300 * M;
        as_[2] = 200 * M;
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        // release phase 1 (30%) to the project
        vm.prank(admin1);
        dao.releaseNextPhase(id, address(0xDEAD));

        uint256 escrowBefore = dao.escrowedAmount(id); // 700 M
        assertEq(escrowBefore, 700 * M);

        // clawback: whaleA + whaleB yes (800 = 80% > 50%), minnow no
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 3, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(minnow);
        gov.voteOnProposal(address(dao), pid, false);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);

        assertEq(uint8(dao.getInvestment(id).status), uint8(ICivicVault.Status.CLAWED_BACK));
        assertEq(dao.clawbackPool(id), escrowBefore);
        assertEq(dao.escrowedAmount(id), 0);

        uint256 paidOut;
        for (uint256 i = 0; i < vs.length; i++) {
            uint256 before = usdc.balanceOf(vs[i]);
            vm.prank(vs[i]);
            dao.reclaimClawback(id);
            paidOut += usdc.balanceOf(vs[i]) - before;
        }
        // pro-rata of 700M by 500/300/200 of 1000
        assertApproxEqAbs(paidOut, escrowBefore, vs.length); // dust < #upvoters
        assertLe(paidOut, escrowBefore);

        // committed stake fully removed for each
        assertEq(dao.totalCommittedStake(), 0);

        // no double claim
        vm.prank(whaleA);
        vm.expectRevert(CivicVault.AlreadyExecuted.selector);
        dao.reclaimClawback(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Part B: protocol fee routes to treasury, never touches principal/escrow
    // ─────────────────────────────────────────────────────────────────────────
    function test_yieldFee_skimmedToTreasury_principalUntouched() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        uint256 tBefore = usdc.balanceOf(treasury);

        vm.startPrank(fm);
        usdc.approve(address(dao), 100 * M);
        uint256 yp = dao.proposeYieldDeposit(id, 100 * M, "cid");
        vm.stopPrank();
        vm.prank(admin1);
        dao.approveYieldDeposit(yp);
        vm.prank(admin2);
        dao.approveYieldDeposit(yp);
        vm.prank(admin3);
        dao.approveYieldDeposit(yp);
        vm.prank(fm);
        dao.executeYieldDeposit(yp);

        assertEq(usdc.balanceOf(treasury) - tBefore, 3 * M, "3% of 100");
        assertEq(dao.getInvestment(id).totalYieldGenerated, 97 * M, "net 97 to members");

        // escrow untouched by the fee
        assertEq(dao.escrowedAmount(id), 1000 * M);
    }

    function test_factory_feeCap_enforced() public {
        vm.prank(creator);
        vm.expectRevert(bytes("Fee too high"));
        factory.setProtocolYieldFeeBps(501);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // guards
    // ─────────────────────────────────────────────────────────────────────────
    function test_openProposal_perProposerCooldown() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        vm.prank(whaleA);
        gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        vm.expectRevert(CivicVaultGovernor.ProposalCooldownActive.selector);
        gov.openProposal(address(dao), 2, address(0), id);
    }

    function test_execute_beforeWindow_reverts() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 1, address(0), id);
        vm.expectRevert(CivicVaultGovernor.VotingStillOpen.selector);
        gov.executeProposal(address(dao), pid);
    }

    function test_doubleVote_reverts() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleA);
        vm.expectRevert(CivicVaultGovernor.AlreadyVoted.selector);
        gov.voteOnProposal(address(dao), pid, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // proposal lifecycle: a failed/ignored proposal must not lock out the real one
    // ─────────────────────────────────────────────────────────────────────────
    function test_failedProposal_doesNotLockFutureProposals() public {
        address[] memory vs = new address[](2);
        uint256[] memory as_ = new uint256[](2);
        vs[0] = whaleA;
        vs[1] = whaleB;
        as_[0] = 700 * M;
        as_[1] = 300 * M;
        _fundedActive(vs, as_, 1000 * M);

        // Proposal 1: opened, nobody votes, nobody executes — it just lapses.
        vm.prank(whaleA);
        uint256 dead = gov.openProposal(address(dao), 0, admin3, 0);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);

        // Proposal 2: same (type, target). Must be allowed now that #1 is closed.
        vm.prank(whaleB);
        uint256 live = gov.openProposal(address(dao), 0, admin3, 0);

        // Opening #2 tombstoned #1 — it can never apply a stale effect later.
        vm.expectRevert(CivicVaultGovernor.AlreadyExecuted.selector);
        gov.executeProposal(address(dao), dead);

        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), live, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), live, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), live);

        assertFalse(dao.isAdmin(admin3), "the real proposal still removes the admin");
    }

    /// A proposal that passed but was never executed is neutralised once a newer
    /// proposal for the same key opens — no double application of the effect.
    function test_stalePassedProposal_cannotDoubleApply() public {
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        vm.prank(whaleA);
        uint256 first = gov.openProposal(address(dao), 1, address(0), id); // FreezeRelease
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), first, true); // passes, but left un-executed
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);

        vm.prank(whaleA);
        uint256 second = gov.openProposal(address(dao), 1, address(0), id);

        vm.expectRevert(CivicVaultGovernor.AlreadyExecuted.selector);
        gov.executeProposal(address(dao), first);

        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), second, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), second);

        (,,,,,,, bool executed,,,) = gov.getProposal(address(dao), second);
        assertTrue(executed);
        assertTrue(dao.releaseFrozen(id), "freeze applied exactly once, by the live proposal");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // invariants
    // ─────────────────────────────────────────────────────────────────────────

    /// totalCommittedStake == Σ committedStake, through vote / withdraw / clawback.
    function testFuzz_committedStake_accounting(uint96 a, uint96 b, uint96 c) public {
        uint256 sA = bound(a, 1e6, 500_000e6);
        uint256 sB = bound(b, 1e6, 500_000e6);
        uint256 sC = bound(c, 1e6, 500_000e6);

        address[] memory vs = new address[](3);
        uint256[] memory as_ = new uint256[](3);
        vs[0] = whaleA;
        vs[1] = whaleB;
        vs[2] = minnow;
        as_[0] = sA;
        as_[1] = sB;
        as_[2] = sC;
        uint256 id = _fundedActive(vs, as_, sA + sB + sC);

        assertEq(
            dao.committedStake(whaleA) + dao.committedStake(whaleB) + dao.committedStake(minnow),
            dao.totalCommittedStake()
        );
        assertEq(dao.totalCommittedStake(), sA + sB + sC);

        // clawback and reclaim -> committed stake unwinds to zero (all 3 vote yes → full turnout)
        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 3, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(minnow);
        gov.voteOnProposal(address(dao), pid, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);
        assertEq(uint8(dao.getInvestment(id).status), uint8(ICivicVault.Status.CLAWED_BACK));

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(vs[i]);
            dao.reclaimClawback(id);
        }
        assertEq(dao.totalCommittedStake(), 0);
        assertEq(dao.committedStake(whaleA) + dao.committedStake(whaleB) + dao.committedStake(minnow), 0);
    }

    /// A frozen investment can never release while the freeze is live.
    function testFuzz_frozenNeverReleases(uint32 skipSecs) public {
        uint256 s = bound(skipSecs, 0, 29 days); // still inside the 30-day freeze
        address[] memory vs = _one(whaleA);
        uint256[] memory as_ = _amt(1000 * M);
        uint256 id = _fundedActive(vs, as_, 1000 * M);

        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 1, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);

        vm.warp(vm.getBlockTimestamp() + s);
        vm.prank(admin1);
        vm.expectRevert(CivicVault.ReleaseIsFrozen.selector);
        dao.releaseNextPhase(id, address(0xDEAD));
    }

    /// Sum of clawback payouts never exceeds the pool (dust stays in the contract).
    function testFuzz_clawbackPayouts_boundedByPool(uint96 a, uint96 b) public {
        uint256 sA = bound(a, 1e6, 400_000e6);
        uint256 sB = bound(b, 1e6, 400_000e6);
        address[] memory vs = new address[](2);
        uint256[] memory as_ = new uint256[](2);
        vs[0] = whaleA;
        vs[1] = whaleB;
        as_[0] = sA;
        as_[1] = sB;
        uint256 id = _fundedActive(vs, as_, sA + sB);

        vm.prank(whaleA);
        uint256 pid = gov.openProposal(address(dao), 3, address(0), id);
        vm.prank(whaleA);
        gov.voteOnProposal(address(dao), pid, true);
        vm.prank(whaleB);
        gov.voteOnProposal(address(dao), pid, true);
        vm.warp(vm.getBlockTimestamp() + 3 days + 1);
        gov.executeProposal(address(dao), pid);
        assertEq(uint8(dao.getInvestment(id).status), uint8(ICivicVault.Status.CLAWED_BACK));

        uint256 pool = dao.clawbackPool(id);
        uint256 paid;
        for (uint256 i = 0; i < 2; i++) {
            uint256 before = usdc.balanceOf(vs[i]);
            vm.prank(vs[i]);
            dao.reclaimClawback(id);
            paid += usdc.balanceOf(vs[i]) - before;
        }
        assertLe(paid, pool);
        assertApproxEqAbs(paid, pool, 2);
    }
}
