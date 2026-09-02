// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {ICivicVault} from "../src/interfaces/ICivicVault.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// Covers the protocol disbursement fee — the primary revenue line. It is taken
/// from each escrow tranche as it is released to a project, never from staked
/// principal, and the full tranche still leaves escrow / TVL.
contract CivicVaultDisbursementFeeTest is Test {
    CivicVaultFactory factory;
    MockUSDC usdc;

    address owner = address(0x1);
    address treasury = address(0x7EE);
    address creator = address(0xC0);
    address admin = address(0xAD);
    address member = address(0xB1);
    address vendor = address(0xDEAD);

    uint256 constant M = 1e6;

    function setUp() public {
        usdc = new MockUSDC();
        CivicVault impl = new CivicVault();
        factory = new CivicVaultFactory(owner, address(impl));
        vm.startPrank(owner);
        factory.setProtocolTreasury(treasury);
        vm.stopPrank();
        usdc.mint(member, 1_000_000 * M);
    }

    function _dao(uint16 disbursementBps) internal returns (CivicVault dao) {
        vm.prank(owner);
        factory.setProtocolDisbursementFeeBps(disbursementBps);
        vm.prank(creator);
        dao = CivicVault(factory.createDAO("D", "d", "loc", "0,0", "0", 100, address(usdc)));
        vm.startPrank(creator);
        dao.addAdmin(admin);
        vm.stopPrank();
        vm.startPrank(admin);
        dao.addMember(member, keccak256("m"));
        dao.verifyMemberKYC(member);
        vm.stopPrank();
    }

    /// Fund a 1000-USDC investment fully with one member, activate it.
    function _fundedActive(CivicVault dao) internal returns (uint256 id) {
        vm.prank(admin);
        id = dao.createInvestment(
            "p", ICivicVault.Category.OTHER, 1000 * M, 10, ICivicVault.Grade.A, 30, new string[](0)
        );
        vm.startPrank(member);
        usdc.approve(address(dao), 1000 * M);
        dao.vote(id, 1000 * M, 1);
        vm.stopPrank();
        vm.prank(admin);
        dao.activateInvestment(id);
    }

    function test_fee_skimmedFromTranche_notPrincipal() public {
        CivicVault dao = _dao(50); // 0.50%
        uint256 id = _fundedActive(dao);

        uint256 tBefore = usdc.balanceOf(treasury);
        uint256 tvlBefore = dao.totalValueLocked();
        uint256 escrowBefore = dao.escrowedAmount(id); // 1000 M

        // Phase 1 = 30% of 1000 = 300 USDC. Fee = 300 * 50 / 10_000 = 1.5 USDC.
        vm.prank(admin);
        dao.releaseNextPhase(id, vendor);

        assertEq(usdc.balanceOf(treasury) - tBefore, 15 * M / 10, "fee = 1.5 USDC to treasury");
        assertEq(usdc.balanceOf(vendor), 3000 * M / 10 - 15 * M / 10, "vendor gets tranche minus fee = 298.5");
        // the WHOLE tranche leaves escrow / TVL — the fee is not carved out of principal
        assertEq(escrowBefore - dao.escrowedAmount(id), 300 * M, "escrow down by full tranche");
        assertEq(tvlBefore - dao.totalValueLocked(), 300 * M, "TVL down by full tranche");
    }

    function test_fee_zero_vendorGetsFullTranche() public {
        CivicVault dao = _dao(0);
        uint256 id = _fundedActive(dao);

        uint256 tBefore = usdc.balanceOf(treasury);
        vm.prank(admin);
        dao.releaseNextPhase(id, vendor);

        assertEq(usdc.balanceOf(vendor), 300 * M, "no fee, full tranche");
        assertEq(usdc.balanceOf(treasury), tBefore, "treasury untouched");
    }

    function test_fee_appliesEveryPhase_andEventCarriesFee() public {
        CivicVault dao = _dao(100); // 1.00% (the cap)
        uint256 id = _fundedActive(dao);

        uint256 tBefore = usdc.balanceOf(treasury);

        vm.startPrank(admin);
        vm.expectEmit(true, true, false, true, address(dao));
        emit ICivicVault.FundsReleased(id, 1, 300 * M, vendor, 3 * M); // 1% of 300
        dao.releaseNextPhase(id, vendor);

        dao.releaseNextPhase(id, vendor); // phase 2: 40% = 400, fee 4
        dao.releaseNextPhase(id, vendor); // phase 3: 30% = 300, fee 3
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasury) - tBefore, 10 * M, "1% of the full 1000 disbursed");
        assertEq(usdc.balanceOf(vendor), 1000 * M - 10 * M, "vendor got 990 across three phases");
    }

    function test_factory_disbursementFeeCap_enforced() public {
        vm.startPrank(owner);
        vm.expectRevert(bytes("Fee too high"));
        factory.setProtocolDisbursementFeeBps(101);
        factory.setProtocolDisbursementFeeBps(100); // exactly the cap is fine
        vm.stopPrank();
        assertEq(factory.protocolDisbursementFeeBps(), 100);
    }
}
