// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultView} from "../src/CivicVaultView.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {ICivicVault} from "../src/interfaces/ICivicVault.sol";
import {MockUSDC} from "./MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CivicVaultTest is Test {
    CivicVault public dao;
    CivicVaultView public daoView;
    CivicVaultFactory public factory;
    MockUSDC public usdc;
    
    address public creator;
    address public admin;
    address public admin2;
    address public admin3;
    address public admin4;
    address public admin5;
    address public financeManager;
    address public member1;
    address public member2;
    address public member3;
    address public nonMember;

    uint256 constant INITIAL_USDC = 1000000 * 1e6; // 1M USDC with 6 decimals

    function setUp() public {
        creator = address(0x1);
        admin = address(0x2);
        financeManager = address(0x3);
        member1 = address(0x4);
        member2 = address(0x5);
        member3 = address(0x6);
        nonMember = address(0x7);

        // Deploy USDC
        usdc = new MockUSDC();

        // Deploy read-only lens (shared across all DAO instances)
        daoView = new CivicVaultView();

        // Deploy CivicVault implementation and Factory (proxy pattern)
        CivicVault implementation = new CivicVault();
        vm.prank(creator);
        factory = new CivicVaultFactory(creator, address(implementation));

        // Create DAO
        vm.prank(creator);
        address daoAddress = factory.createDAO(
            "Test DAO",
            "Test Description",
            "Test Location",
            "0,0",
            "12345",
            100,
            address(usdc)
        );

        dao = CivicVault(daoAddress);

        // Setup roles
        vm.prank(creator);
        dao.addAdmin(admin);
        vm.prank(creator);
        dao.addAdmin(address(0x9)); // admin2
        vm.prank(creator);
        dao.addAdmin(address(0xA)); // admin3
        vm.prank(creator);
        dao.addAdmin(address(0xB)); // admin4
        vm.prank(creator);
        dao.addAdmin(address(0xC)); // admin5

        admin2 = address(0x9);
        admin3 = address(0xA);
        admin4 = address(0xB);
        admin5 = address(0xC);

        vm.prank(creator);
        dao.addFinanceManager(financeManager);

        // Add members
        vm.prank(admin);
        dao.addMember(member1, keccak256("kyc1"));

        vm.prank(admin);
        dao.addMember(member2, keccak256("kyc2"));

        vm.prank(admin);
        dao.addMember(member3, keccak256("kyc3"));

        vm.startPrank(admin);
        dao.verifyMemberKYC(member1);
        dao.verifyMemberKYC(member2);
        dao.verifyMemberKYC(member3);
        vm.stopPrank();

        // Mint USDC to members
        usdc.mint(member1, INITIAL_USDC);
        usdc.mint(member2, INITIAL_USDC);
        usdc.mint(member3, INITIAL_USDC);
        usdc.mint(financeManager, INITIAL_USDC);
    }

    // ===== MEMBER MANAGEMENT TESTS =====
    function test_AddMember() public {
        address newMember = address(0x8);
        bytes32 kycHash = keccak256("kyc4");

        vm.prank(admin);
        dao.addMember(newMember, kycHash);

        (, bool kycVerified, , , bool isActive) = dao.members(newMember);
        assertTrue(isActive);
        assertFalse(kycVerified);
        assertEq(dao.memberCount(), 4);

        vm.prank(admin);
        dao.verifyMemberKYC(newMember);
        (, kycVerified, , , isActive) = dao.members(newMember);
        assertTrue(kycVerified);
        assertTrue(isActive);
    }

    function test_VerifyMemberKYC_OnlyAdmin() public {
        vm.prank(nonMember);
        vm.expectRevert(CivicVault.Unauthorized.selector);
        dao.verifyMemberKYC(member1);
    }

    function test_AddMember_OnlyAdmin() public {
        vm.prank(nonMember);
        vm.expectRevert(CivicVault.Unauthorized.selector);
        dao.addMember(address(0x8), keccak256("kyc"));
    }

    function test_AddMember_MaxMembership() public {
        // We already have 3 members, so fill up to max membership (100)
        // Start from a higher address to avoid conflicts
        vm.startPrank(admin);
        for (uint256 i = 10; i <= 106; i++) {
            address newMember = address(uint160(i));
            dao.addMember(newMember, keccak256(abi.encodePacked("kyc", i)));
            if (dao.memberCount() >= 100) break; // Stop when we reach max
        }
        vm.stopPrank();

        // Verify we're at max
        assertEq(dao.memberCount(), 100);

        // Try to add one more
        vm.prank(admin);
        vm.expectRevert(CivicVault.MembershipFull.selector);
        dao.addMember(address(0x999), keccak256("kyc"));
    }

    function test_RemoveMember() public {
        vm.prank(admin);
        dao.removeMember(member1);

        (, , , , bool isActive) = dao.members(member1);
        assertFalse(isActive);
        assertEq(dao.memberCount(), 2);
    }

    function test_ExitDAO() public {
        vm.prank(member1);
        dao.exitDAO();

        (, , , , bool isActive) = dao.members(member1);
        assertFalse(isActive);
        assertEq(dao.memberCount(), 2);
    }

    // ===== INVESTMENT CREATION TESTS =====
    function test_CreateInvestment() public {
        string[] memory docs = new string[](1);
        docs[0] = "QmHash1";

        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6, // 10k USDC
            5, // 5% yield
            ICivicVault.Grade.A,
            30, // 30 days
            docs
        );

        assertEq(investmentId, 1);
        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(inv.name, "Test Investment");
        assertEq(uint8(inv.status), uint8(ICivicVault.Status.PENDING));
        assertEq(inv.fundNeeded, 10000 * 1e6);
    }

    function test_CreateInvestment_OnlyAdmin() public {
        vm.prank(member1);
        vm.expectRevert(CivicVault.Unauthorized.selector);
        dao.createInvestment(
            "Test",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );
    }

    function test_CreateInvestment_InvalidParams() public {
        vm.prank(admin);
        vm.expectRevert(CivicVault.InvalidParams.selector);
        dao.createInvestment(
            "Test",
            ICivicVault.Category.HEALTH,
            0, // Invalid: fundNeeded = 0
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );
    }

    // ===== VOTING TESTS =====
    function test_Vote_Upvote() public {
        // Create investment
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Approve and vote
        vm.startPrank(member1);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1); // Upvote with 5k USDC
        vm.stopPrank();

        CivicVault.Vote memory vote = dao.getVote(investmentId, member1);
        assertEq(vote.numberOfVotes, 5000 * 1e6);
        assertEq(vote.voteValue, 1);
        assertEq(usdc.balanceOf(address(dao)), 5000 * 1e6);
    }

    function test_Vote_Upvote_Accumulation() public {
        // User can add multiple votes (e.g. 10 USDC = 10 votes for grade A projects)
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Hospital Project",
            ICivicVault.Category.HEALTH,
            100000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 3000 * 1e6, 1); // First vote: 3k USDC
        dao.vote(investmentId, 7000 * 1e6, 1); // Add 7k more = 10k total
        vm.stopPrank();

        CivicVault.Vote memory vote = dao.getVote(investmentId, member1);
        assertEq(vote.numberOfVotes, 10000 * 1e6);
        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(inv.upvotes, 10000 * 1e6);
    }

    function test_Vote_Downvote() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(member1);
        dao.vote(investmentId, 0, 0); // Downvote

        CivicVault.Vote memory vote = dao.getVote(investmentId, member1);
        assertEq(vote.numberOfVotes, 0);
        assertEq(vote.voteValue, 0);
        
        CivicVault.Investment memory invD = dao.getInvestment(investmentId);
        assertEq(invD.upvotes, 0);
        assertEq(invD.downvotes, 1);
    }

    function test_Vote_OnlyVerifiedMember() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(nonMember);
        vm.expectRevert(CivicVault.NotActiveMember.selector);
        dao.vote(investmentId, 1000 * 1e6, 1);
    }

    function test_Vote_DeadlinePassed() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            1, // 1 day deadline
            new string[](0)
        );

        // Fast forward time
        vm.warp(block.timestamp + 2 days);

        vm.startPrank(member1);
        usdc.approve(address(dao), 1000 * 1e6);
        vm.expectRevert(CivicVault.DeadlinePassed.selector);
        dao.vote(investmentId, 1000 * 1e6, 1);
        vm.stopPrank();
    }

    // ===== INVESTMENT ACTIVATION TESTS =====
    function test_ActivateInvestment() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Members vote to reach funding goal
        vm.startPrank(member1);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        vm.startPrank(member2);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        // Activate
        vm.prank(admin);
        dao.activateInvestment(investmentId);

        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(uint8(inv.status), uint8(ICivicVault.Status.ACTIVE));
        assertEq(dao.activeInvestmentCount(), 1);
    }

    function test_ActivateInvestment_InsufficientFunds() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Only vote with 5k (less than needed 10k)
        vm.startPrank(member1);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        vm.expectRevert(CivicVault.InvalidParams.selector);
        dao.activateInvestment(investmentId);
    }

    function test_MarkInvestmentIncomplete() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            1, // 1 day deadline
            new string[](0)
        );

        // Vote with less than needed
        vm.startPrank(member1);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        // Fast forward past deadline
        vm.warp(block.timestamp + 2 days);

        vm.prank(admin);
        dao.markInvestmentIncomplete(investmentId);

        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(uint8(inv.status), uint8(ICivicVault.Status.INCOMPLETE));
    }

    // ===== REFUND TESTS =====
    function test_WithdrawStake() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            1,
            new string[](0)
        );

        uint256 stakeAmount = 5000 * 1e6;
        vm.startPrank(member1);
        usdc.approve(address(dao), stakeAmount);
        dao.vote(investmentId, stakeAmount, 1);
        vm.stopPrank();

        // Fast forward and mark incomplete
        vm.warp(block.timestamp + 2 days);
        vm.prank(admin);
        dao.markInvestmentIncomplete(investmentId);

        // Withdraw stake
        uint256 balanceBefore = usdc.balanceOf(member1);
        vm.prank(member1);
        dao.withdrawStake(investmentId);
        uint256 balanceAfter = usdc.balanceOf(member1);

        assertEq(balanceAfter - balanceBefore, stakeAmount);
    }

    // ===== YIELD MANAGEMENT TESTS =====
    function test_DepositYield() public {
        // Create and activate investment
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Fund it
        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 10000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        // Deposit yield
        uint256 yieldAmount = 500 * 1e6; // 5% of 10k
        // Propose deposit
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "expenseReportCID");
        vm.stopPrank();

        // Approvals from 3 admins
        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        // Execute (must be proposer, admin, or creator — not arbitrary EOAs)
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(inv.totalYieldGenerated, yieldAmount);
    }

    function test_ExecuteYieldDeposit_RevertIfUnauthorized() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 10000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        uint256 yieldAmount = 500 * 1e6;
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "cid");
        vm.stopPrank();

        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        vm.prank(nonMember);
        vm.expectRevert(CivicVault.UnauthorizedYieldExec.selector);
        dao.executeYieldDeposit(pid);
    }

    function test_ClaimYield() public {
        // Setup investment
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Member1 stakes 10k
        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 10000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        // Deposit yield
        uint256 yieldAmount = 500 * 1e6;
        // Propose deposit
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "expenseReportCID");
        vm.stopPrank();

        // Approvals
        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        // Claim yield
        uint256 balanceBefore = usdc.balanceOf(member1);
        vm.prank(member1);
        dao.claimYield(investmentId);
        uint256 balanceAfter = usdc.balanceOf(member1);

        assertEq(balanceAfter - balanceBefore, yieldAmount); // Should get 100% since only one staker
    }

    function test_CalculateClaimableYield() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        vm.startPrank(member2);
        usdc.approve(address(dao), 5000 * 1e6);
        dao.vote(investmentId, 5000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        uint256 yieldAmount = 500 * 1e6;
        // Propose deposit
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "expenseReportCID");
        vm.stopPrank();

        // Approvals
        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        uint256 claimable1 = daoView.calculateClaimableYield(address(dao), investmentId, member1);
        uint256 claimable2 = daoView.calculateClaimableYield(address(dao), investmentId, member2);

        assertEq(claimable1, 250 * 1e6); // 50% of yield
        assertEq(claimable2, 250 * 1e6); // 50% of yield
    }

    function test_GetInvestmentAnalytics() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Analytics Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 10000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        uint256 yieldAmount = 500 * 1e6;
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "expenseReportCID");
        vm.stopPrank();

        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        (
            uint256 principal,
            uint256 totalStaked,
            uint256 expectedYieldAmount,
            uint256 totalYieldGenerated,
            uint256 totalYieldDistributed,
            uint256 remainingYield,
            uint256 realizedRoiBps,
            uint256 expectedRoiBps,
            uint256 stakingUtilizationBps
        ) = daoView.getInvestmentAnalytics(address(dao), investmentId);

        assertEq(principal, 10000 * 1e6);
        assertEq(totalStaked, 10000 * 1e6);
        assertEq(expectedYieldAmount, 500 * 1e6);
        assertEq(totalYieldGenerated, 500 * 1e6);
        assertEq(totalYieldDistributed, 0);
        assertEq(remainingYield, 500 * 1e6);
        assertEq(realizedRoiBps, 500);
        assertEq(expectedRoiBps, 500);
        assertEq(stakingUtilizationBps, 10000);
    }

    function test_GetUserAnalytics() public {
        vm.prank(admin);
        uint256 investmentId1 = dao.createInvestment(
            "User Analytics 1",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(admin);
        uint256 investmentId2 = dao.createInvestment(
            "User Analytics 2",
            ICivicVault.Category.HEALTH,
            5000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 15000 * 1e6);
        dao.vote(investmentId1, 10000 * 1e6, 1);
        dao.vote(investmentId2, 5000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId1);
        vm.prank(admin);
        dao.activateInvestment(investmentId2);

        uint256 yieldAmount1 = 500 * 1e6;
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount1 + (250 * 1e6));
        uint256 pid1 = dao.proposeYieldDeposit(investmentId1, yieldAmount1, "expenseReportCID-1");
        uint256 pid2 = dao.proposeYieldDeposit(investmentId2, 250 * 1e6, "expenseReportCID-2");
        vm.stopPrank();

        vm.prank(admin);
        dao.approveYieldDeposit(pid1);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid1);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid1);
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid1);

        vm.prank(admin);
        dao.approveYieldDeposit(pid2);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid2);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid2);
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid2);

        (
            uint256 totalStaked,
            uint256 totalClaimedYield,
            uint256 totalClaimableYield,
            uint256 realizedRoiBps
        ) = daoView.getUserAnalytics(address(dao), member1);

        assertEq(totalStaked, 15000 * 1e6);
        assertEq(totalClaimedYield, 0);
        assertEq(totalClaimableYield, 750 * 1e6);
        assertEq(realizedRoiBps, 0);

        vm.prank(member1);
        dao.claimYield(investmentId1);
        vm.prank(member1);
        dao.claimYield(investmentId2);

        (
            totalStaked,
            totalClaimedYield,
            totalClaimableYield,
            realizedRoiBps
        ) = daoView.getUserAnalytics(address(dao), member1);

        assertEq(totalStaked, 15000 * 1e6);
        assertEq(totalClaimedYield, 750 * 1e6);
        assertEq(totalClaimableYield, 0);
        assertEq(realizedRoiBps, 500);
    }

    // ===== DEADLINE EXTENSION TESTS =====
    function test_ExtendDeadline() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A, // Grade A can extend
            30,
            new string[](0)
        );

        ICivicVault.Investment memory invBefore = dao.getInvestment(investmentId);
        uint256 originalDeadline = invBefore.deadline;

        vm.prank(financeManager);
        dao.extendDeadline(investmentId, 15); // Extend by 15 days

        ICivicVault.Investment memory invAfter = dao.getInvestment(investmentId);
        assertEq(invAfter.deadline, originalDeadline + 15 days);
        assertEq(invAfter.extensionCount, 1);
    }

    function test_ExtendDeadline_OnlyGradeAB() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.C, // Grade C cannot extend
            30,
            new string[](0)
        );

        vm.prank(financeManager);
        vm.expectRevert(); // Any revert is fine, we just want to ensure it fails
        dao.extendDeadline(investmentId, 15);
    }

    // ===== ADMIN FUNCTIONS TESTS =====
    function test_AddAdmin() public {
        address newAdmin = address(0x8);
        vm.prank(creator);
        dao.addAdmin(newAdmin);

        assertTrue(dao.isAdmin(newAdmin));
    }

    function test_AddAdmin_OnlyCreator() public {
        vm.prank(admin);
        vm.expectRevert(CivicVault.NotCreator.selector);
        dao.addAdmin(address(0x8));
    }

    function test_AddFinanceManager() public {
        address newManager = address(0x8);
        vm.prank(creator);
        dao.addFinanceManager(newManager);

        // Check via trying to use finance manager function
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(newManager);
        dao.extendDeadline(investmentId, 10); // Should work
    }

    function test_PauseUnpause() public {
        // Create investment before pausing
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(creator);
        dao.pause();

        // Try to vote while paused
        vm.startPrank(member1);
        usdc.approve(address(dao), 1000 * 1e6);
        vm.expectRevert();
        dao.vote(investmentId, 1000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(creator);
        dao.unpause();

        // Should work now
        vm.startPrank(member1);
        dao.vote(investmentId, 1000 * 1e6, 1);
        vm.stopPrank();
    }

    // ===== CLOSE INVESTMENT TESTS =====
    function test_CloseInvestment() public {
        // Setup and activate investment
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Test Investment",
            ICivicVault.Category.HEALTH,
            10000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.startPrank(member1);
        usdc.approve(address(dao), 10000 * 1e6);
        dao.vote(investmentId, 10000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        // Deposit and claim all yield (multisig)
        uint256 yieldAmount = 500 * 1e6;
        vm.startPrank(financeManager);
        usdc.approve(address(dao), yieldAmount);
        uint256 pid = dao.proposeYieldDeposit(investmentId, yieldAmount, "expenseReportCID");
        vm.stopPrank();

        // Approvals from 3 admins
        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        vm.prank(member1);
        dao.claimYield(investmentId);

        // Close investment
        vm.prank(admin);
        dao.closeInvestment(investmentId);

        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertEq(uint8(inv.status), uint8(ICivicVault.Status.ENDED));
        assertEq(dao.activeInvestmentCount(), 0);
    }

    // ===== HELPER FUNCTION TESTS =====
    function test_GetAllMembers() public view {
        address[] memory members = dao.getAllMembers();
        assertEq(members.length, 3);
    }

    function test_IsVerifiedMember() public view {
        assertTrue(dao.isVerifiedMember(member1));
        assertFalse(dao.isVerifiedMember(nonMember));
    }

    function test_GetInvestmentsByStatus() public {
        vm.prank(admin);
        dao.createInvestment(
            "Investment 1",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(admin);
        dao.createInvestment(
            "Investment 2",
            ICivicVault.Category.EDUCATION,
            2000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        ICivicVault.Investment[] memory pending = daoView.getInvestmentsByStatus(address(dao), ICivicVault.Status.PENDING);
        assertEq(pending.length, 2);
    }

    // ===== ESCROW / RELEASE EDGE CASE TESTS =====
    function test_EscrowRoundingAndFullRelease() public {
        // Create investment with amount that causes integer rounding
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Rounding Test",
            ICivicVault.Category.HEALTH,
            101 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Member stakes full amount
        vm.startPrank(member1);
        usdc.approve(address(dao), 101 * 1e6);
        dao.vote(investmentId, 101 * 1e6, 1);
        vm.stopPrank();

        // Activate
        vm.prank(admin);
        dao.activateInvestment(investmentId);

        uint256 escrow = dao.escrowedAmount(investmentId);
        assertEq(escrow, 101 * 1e6);

        // Release phase 1 (30%)
        vm.prank(admin);
        dao.releaseNextPhase(investmentId, address(0));
        assertEq(dao.releasePhaseCompleted(investmentId), 1);

        // Release phase 2 (40%)
        vm.prank(admin);
        dao.releaseNextPhase(investmentId, address(0));
        assertEq(dao.releasePhaseCompleted(investmentId), 2);

        // Release phase 3 (remaining)
        vm.prank(admin);
        dao.releaseNextPhase(investmentId, address(0));
        assertEq(dao.releasePhaseCompleted(investmentId), 3);

        // All escrow should be released
        assertEq(dao.escrowedAmount(investmentId), 0);
    }

    function test_InsufficientEscrowReverts() public {
        // Create investment but do not activate => no escrow locked
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "No Escrow",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        vm.prank(admin);
        vm.expectRevert(CivicVault.InvalidParams.selector);
        dao.releaseNextPhase(investmentId, address(0));
    }

    function test_ReleaseUnauthorizedReverts() public {
        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Auth Test",
            ICivicVault.Category.HEALTH,
            1000 * 1e6,
            5,
            ICivicVault.Grade.A,
            30,
            new string[](0)
        );

        // Member stakes and activate to create escrow
        vm.startPrank(member1);
        usdc.approve(address(dao), 1000 * 1e6);
        dao.vote(investmentId, 1000 * 1e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        // Non-admin tries to release
        vm.prank(nonMember);
        vm.expectRevert(CivicVault.Unauthorized.selector);
        dao.releaseNextPhase(investmentId, nonMember);
    }
}
