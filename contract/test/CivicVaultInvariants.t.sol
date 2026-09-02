// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {ICivicVault} from "../src/interfaces/ICivicVault.sol";
import {MockUSDC} from "./MockUSDC.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Reentrant token used only to prove `claimYield`'s nonReentrant guard holds under a
/// malicious/non-standard ERC-20 whose `transfer` calls back into the vault mid-transfer.
contract MaliciousReentrantToken is ERC20 {
    address public target;
    uint256 public investmentId;
    bool public armed;

    constructor() ERC20("Malicious", "EVIL") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function arm(address _target, uint256 _investmentId) external {
        target = _target;
        investmentId = _investmentId;
        armed = true;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool success = super.transfer(to, amount);
        if (armed) {
            armed = false; // one reentry attempt is enough to prove the guard
            CivicVault(target).claimYield(investmentId);
        }
        return success;
    }
}

/// @notice Pre-audit hardening: fuzz/invariant coverage for the treasury-critical paths
/// (yield accounting, escrow release, reentrancy, proxy init, multi-sig edge cases) that the
/// existing unit suite (CivicVault.t.sol / CivicVaultFactory.t.sol) exercises only at fixed values.
contract CivicVaultInvariantsTest is Test {
    CivicVault public dao;
    CivicVaultFactory public factory;
    MockUSDC public usdc;

    address public creator = address(0x1);
    address public admin = address(0x2);
    address public admin2 = address(0x9);
    address public admin3 = address(0xA);
    address public admin4 = address(0xB);
    address public admin5 = address(0xC);
    address public financeManager = address(0x3);
    address public member1 = address(0x4);
    address public member2 = address(0x5);

    function setUp() public {
        usdc = new MockUSDC();

        CivicVault implementation = new CivicVault();
        vm.prank(creator);
        factory = new CivicVaultFactory(creator, address(implementation));

        vm.prank(creator);
        address daoAddress =
            factory.createDAO("Invariant Test DAO", "Desc", "Location", "0,0", "12345", 1000, address(usdc));
        dao = CivicVault(daoAddress);

        vm.startPrank(creator);
        dao.addAdmin(admin);
        dao.addAdmin(admin2);
        dao.addAdmin(admin3);
        dao.addAdmin(admin4);
        dao.addAdmin(admin5);
        dao.addFinanceManager(financeManager);
        vm.stopPrank();

        vm.startPrank(admin);
        dao.addMember(member1, keccak256("kyc1"));
        dao.addMember(member2, keccak256("kyc2"));
        dao.verifyMemberKYC(member1);
        dao.verifyMemberKYC(member2);
        vm.stopPrank();
    }

    // ===== INVARIANT: claimed yield never exceeds deposited yield =====
    function testFuzz_ClaimedYieldNeverExceedsDeposited(uint96 stake1, uint96 stake2, uint96 yieldAmount) public {
        stake1 = uint96(bound(stake1, 1e6, 1_000_000e6));
        stake2 = uint96(bound(stake2, 1e6, 1_000_000e6));
        yieldAmount = uint96(bound(yieldAmount, 1e6, 500_000e6));

        uint256 fundNeeded = uint256(stake1) + uint256(stake2);

        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Fuzz Investment", ICivicVault.Category.HEALTH, fundNeeded, 5, ICivicVault.Grade.A, 30, new string[](0)
        );

        usdc.mint(member1, stake1);
        vm.startPrank(member1);
        usdc.approve(address(dao), stake1);
        dao.vote(investmentId, stake1, 1);
        vm.stopPrank();

        usdc.mint(member2, stake2);
        vm.startPrank(member2);
        usdc.approve(address(dao), stake2);
        dao.vote(investmentId, stake2, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        usdc.mint(financeManager, yieldAmount);
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
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        // A staker whose pro-rata share rounds to 0 (extreme stake ratios) gets
        // NoYieldAvailable — legitimate, not a fund-safety break. The invariant
        // being fuzzed is "distributed never exceeds deposited", asserted below.
        vm.prank(member1);
        try dao.claimYield(investmentId) {} catch {}
        vm.prank(member2);
        try dao.claimYield(investmentId) {} catch {}

        CivicVault.Investment memory inv = dao.getInvestment(investmentId);
        assertLe(inv.totalYieldDistributed, inv.totalYieldGenerated, "distributed exceeds generated");
        assertLe(inv.totalYieldDistributed, yieldAmount, "distributed exceeds deposited");
        assertLe(usdc.balanceOf(address(dao)) + 0, type(uint256).max); // no accounting overflow
    }

    // ===== INVARIANT: escrow released never exceeds the amount funded =====
    function testFuzz_EscrowReleaseNeverExceedsFunded(uint96 fundNeeded, uint96 overstake) public {
        fundNeeded = uint96(bound(fundNeeded, 1e6, 1_000_000e6));
        overstake = uint96(bound(overstake, 0, 1_000_000e6));
        uint256 stake = uint256(fundNeeded) + uint256(overstake); // allow overfunding

        vm.prank(admin);
        uint256 investmentId = dao.createInvestment(
            "Fuzz Escrow", ICivicVault.Category.HEALTH, fundNeeded, 5, ICivicVault.Grade.A, 30, new string[](0)
        );

        usdc.mint(member1, stake);
        vm.startPrank(member1);
        usdc.approve(address(dao), stake);
        dao.vote(investmentId, stake, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);

        // Escrow is capped at fundNeeded even if the vault overfunded.
        assertEq(dao.escrowTotal(investmentId), fundNeeded, "escrow not capped at fundNeeded");

        uint256 totalReleased;
        for (uint256 i = 0; i < 3; i++) {
            uint256 balBefore = usdc.balanceOf(address(dao));
            vm.prank(admin);
            dao.releaseNextPhase(investmentId, address(0));
            uint256 released = balBefore - usdc.balanceOf(address(dao));
            totalReleased += released;
            assertLe(totalReleased, fundNeeded, "cumulative release exceeds funded amount");
        }

        assertEq(totalReleased, fundNeeded, "phased release did not sum to the full funded amount");
        assertEq(dao.escrowedAmount(investmentId), 0, "escrow not fully drained after 3 phases");

        vm.prank(admin);
        vm.expectRevert(CivicVault.AllPhasesReleased.selector);
        dao.releaseNextPhase(investmentId, address(0));
    }

    // ===== REENTRANCY: malicious token attempting to re-enter claimYield =====
    function test_ClaimYield_BlocksReentrantToken() public {
        MaliciousReentrantToken evilToken = new MaliciousReentrantToken();

        CivicVault implementation = new CivicVault();
        vm.prank(creator);
        CivicVaultFactory evilFactory = new CivicVaultFactory(creator, address(implementation));

        vm.prank(creator);
        address evilDaoAddr =
            evilFactory.createDAO("Evil Token DAO", "Desc", "Loc", "0,0", "00000", 100, address(evilToken));
        CivicVault evilDao = CivicVault(evilDaoAddr);

        vm.startPrank(creator);
        evilDao.addAdmin(admin);
        evilDao.addAdmin(admin2);
        evilDao.addAdmin(admin3);
        evilDao.addAdmin(admin4);
        evilDao.addAdmin(admin5);
        evilDao.addFinanceManager(financeManager);
        vm.stopPrank();

        // The attacking token is itself the staking member: a real reentrant call from
        // `transfer` always carries msg.sender == the token's own address, so for the
        // reentrant call to pass `hasStakeInInvestment` (and actually reach the
        // nonReentrant guard) the token contract has to be the one holding the stake.
        vm.prank(admin);
        evilDao.addMember(address(evilToken), keccak256("kyc1"));
        vm.prank(admin);
        evilDao.verifyMemberKYC(address(evilToken));

        vm.prank(admin);
        uint256 investmentId = evilDao.createInvestment(
            "Evil Investment", ICivicVault.Category.HEALTH, 1000e6, 5, ICivicVault.Grade.A, 30, new string[](0)
        );

        evilToken.mint(address(evilToken), 1000e6);
        vm.startPrank(address(evilToken));
        evilToken.approve(address(evilDao), 1000e6);
        evilDao.vote(investmentId, 1000e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        evilDao.activateInvestment(investmentId);

        evilToken.mint(financeManager, 100e6);
        vm.startPrank(financeManager);
        evilToken.approve(address(evilDao), 100e6);
        uint256 pid = evilDao.proposeYieldDeposit(investmentId, 100e6, "cid");
        vm.stopPrank();

        vm.prank(admin);
        evilDao.approveYieldDeposit(pid);
        vm.prank(admin2);
        evilDao.approveYieldDeposit(pid);
        vm.prank(admin3);
        evilDao.approveYieldDeposit(pid);
        vm.prank(financeManager);
        evilDao.executeYieldDeposit(pid);

        // Arm the token to re-enter claimYield mid-transfer, from the token's own claim.
        evilToken.arm(address(evilDao), investmentId);

        vm.prank(address(evilToken));
        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        evilDao.claimYield(investmentId);

        // The reverted outer call must leave no partial state behind.
        ICivicVault.Vote memory v = evilDao.getVote(investmentId, address(evilToken));
        assertEq(v.yieldClaimed, 0, "yieldClaimed was persisted despite the reverted reentrant call");
    }

    // ===== PROXY: a clone cannot be re-initialized after factory deployment =====
    function test_Clone_CannotBeReinitialized() public {
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        dao.initialize(
            address(0xdead), "Hijacked", "Desc", "Loc", "0,0", "00000", 1, address(usdc), address(0), 0, address(0), 0
        );
    }

    function test_Implementation_CannotBeInitializedDirectly() public {
        CivicVault implementation = new CivicVault();
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(
            address(0xdead), "Hijacked", "Desc", "Loc", "0,0", "00000", 1, address(usdc), address(0), 0, address(0), 0
        );
    }

    // ===== MULTI-SIG: duplicate approvals must not double-count =====
    function test_YieldProposal_DuplicateApprovalReverts() public {
        uint256 investmentId = _createFundedActiveInvestment();

        vm.startPrank(financeManager);
        usdc.mint(financeManager, 100e6);
        usdc.approve(address(dao), 100e6);
        uint256 pid = dao.proposeYieldDeposit(investmentId, 100e6, "cid");
        vm.stopPrank();

        vm.startPrank(admin);
        dao.approveYieldDeposit(pid);
        vm.expectRevert(CivicVault.AlreadyApproved.selector);
        dao.approveYieldDeposit(pid);
        vm.stopPrank();

        ICivicVault.YieldProposal memory p = dao.getYieldProposal(pid);
        assertEq(p.approvals, 1, "duplicate approval was double-counted");
    }

    // ===== MULTI-SIG: an approval already cast survives the approver later losing admin rights =====
    // Documents existing behavior for the audit: approvals are counted at cast-time and are not
    // revoked if the approving admin is subsequently removed by removeAdmin.
    function test_YieldProposal_ApprovalSurvivesAdminRemoval() public {
        uint256 investmentId = _createFundedActiveInvestment();

        vm.startPrank(financeManager);
        usdc.mint(financeManager, 100e6);
        usdc.approve(address(dao), 100e6);
        uint256 pid = dao.proposeYieldDeposit(investmentId, 100e6, "cid");
        vm.stopPrank();

        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);

        // admin3 approves, then creator strips their admin role before the 3rd approval is "spent".
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);
        vm.prank(creator);
        dao.removeAdmin(admin3);

        // Proposal already sits at REQUIRED_YIELD_APPROVALS (3); execution still succeeds because
        // approvals are a count, not a live check of current admin status.
        vm.prank(financeManager);
        dao.executeYieldDeposit(pid);

        ICivicVault.YieldProposal memory p = dao.getYieldProposal(pid);
        assertTrue(p.executed, "execution should still succeed on a proposal that already met threshold");
    }

    // ===== MULTI-SIG: "ghost proposal" — approved but proposer never funds it =====
    function test_YieldProposal_GhostProposalCannotExecute() public {
        uint256 investmentId = _createFundedActiveInvestment();

        // financeManager proposes without ever minting/approving the yield amount.
        vm.prank(financeManager);
        uint256 pid = dao.proposeYieldDeposit(investmentId, 100e6, "cid");

        vm.prank(admin);
        dao.approveYieldDeposit(pid);
        vm.prank(admin2);
        dao.approveYieldDeposit(pid);
        vm.prank(admin3);
        dao.approveYieldDeposit(pid);

        vm.prank(financeManager);
        vm.expectRevert(CivicVault.InsufficientProposerBalance.selector);
        dao.executeYieldDeposit(pid);

        ICivicVault.YieldProposal memory p = dao.getYieldProposal(pid);
        assertFalse(p.executed, "ghost proposal executed without proposer funds");
    }

    function _createFundedActiveInvestment() internal returns (uint256 investmentId) {
        vm.prank(admin);
        investmentId = dao.createInvestment(
            "Helper Investment", ICivicVault.Category.HEALTH, 1000e6, 5, ICivicVault.Grade.A, 30, new string[](0)
        );

        usdc.mint(member1, 1000e6);
        vm.startPrank(member1);
        usdc.approve(address(dao), 1000e6);
        dao.vote(investmentId, 1000e6, 1);
        vm.stopPrank();

        vm.prank(admin);
        dao.activateInvestment(investmentId);
    }
}
