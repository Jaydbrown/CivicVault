// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {CivicVaultBeaconController} from "../src/CivicVaultBeaconController.sol";
import {ICivicVault} from "../src/interfaces/ICivicVault.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// Storage-compatible successor implementation used to prove an upgrade took effect.
contract CivicVaultV2Mock is CivicVault {
    function version() external pure returns (uint256) {
        return 2;
    }
}

interface IVersioned {
    function version() external pure returns (uint256);
}

contract CivicVaultBeaconTest is Test {
    CivicVaultFactory factory;
    CivicVaultBeaconController controller;
    MockUSDC usdc;

    address deployer = address(0xD1);
    address beaconOwner = address(0xB0); // multisig stand-in
    address outsider = address(0xEEEE);

    uint256 constant M = 1e6;

    function setUp() public {
        vm.startPrank(deployer);
        CivicVault impl = new CivicVault();
        factory = new CivicVaultFactory(deployer, address(impl));
        controller = new CivicVaultBeaconController(factory.beacon(), address(factory), beaconOwner);
        factory.transferBeaconOwnership(address(controller));
        usdc = new MockUSDC();
        vm.stopPrank();
    }

    // Create a DAO whose creator+admin is `who`, with `tvl` USDC staked into one investment.
    function _daoWithTvl(address who, uint256 tvl) internal returns (address dao) {
        vm.prank(who);
        dao = factory.createDAO("D", "d", "loc", "0,0", "0", 100, address(usdc));

        vm.startPrank(who);
        CivicVault v = CivicVault(dao);
        v.addMember(who, keccak256(abi.encode(who)));
        v.verifyMemberKYC(who);
        uint256 id =
            v.createInvestment("p", ICivicVault.Category.OTHER, tvl, 10, ICivicVault.Grade.A, 30, new string[](0));
        vm.stopPrank();

        usdc.mint(who, tvl);
        vm.startPrank(who);
        usdc.approve(dao, tvl);
        v.vote(id, tvl, 1);
        vm.stopPrank();

        assertEq(CivicVault(dao).totalValueLocked(), tvl);
    }

    function test_daoIsABeaconProxy_andFactoryCannotUpgrade() public {
        address dao = _daoWithTvl(address(0xA1), 100 * M);
        assertTrue(factory.isDAO(dao));
        // Beacon ownership left the factory.
        assertEq(UpgradeableBeacon(factory.beacon()).owner(), address(controller));
        vm.prank(deployer);
        vm.expectRevert();
        factory.transferBeaconOwnership(deployer); // factory no longer owns the beacon
    }

    function test_upgrade_movesEveryDao_afterTimelock() public {
        address dao1 = _daoWithTvl(address(0xA1), 100 * M);
        address dao2 = _daoWithTvl(address(0xA2), 50 * M);

        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));

        vm.expectRevert(CivicVaultBeaconController.TimelockNotElapsed.selector);
        controller.executeUpgrade();

        vm.warp(block.timestamp + 4 days);
        controller.executeUpgrade();

        assertEq(IVersioned(dao1).version(), 2);
        assertEq(IVersioned(dao2).version(), 2);
        assertEq(controller.currentImplementation(), address(v2));
    }

    function test_veto_byMajorityTvl_blocksUpgrade() public {
        address whaleAdmin = address(0xA1);
        address dao1 = _daoWithTvl(whaleAdmin, 100 * M); // 100 of 130 = 77% > 30%
        _daoWithTvl(address(0xA2), 30 * M);

        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));

        vm.prank(whaleAdmin);
        controller.vetoUpgrade(dao1);

        vm.warp(block.timestamp + 4 days);
        vm.expectRevert(CivicVaultBeaconController.VetoThresholdMet.selector);
        controller.executeUpgrade();
    }

    function test_veto_belowThreshold_upgradeStillExecutes() public {
        _daoWithTvl(address(0xA1), 100 * M);
        address minnowAdmin = address(0xA2);
        address dao2 = _daoWithTvl(minnowAdmin, 20 * M); // 20 of 120 = 16% < 30%

        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));
        vm.prank(minnowAdmin);
        controller.vetoUpgrade(dao2);

        vm.warp(block.timestamp + 4 days);
        controller.executeUpgrade();
        assertEq(controller.currentImplementation(), address(v2));
    }

    function test_veto_onlyDaoAdminOrCreator() public {
        address dao = _daoWithTvl(address(0xA1), 100 * M);
        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));

        vm.prank(outsider);
        vm.expectRevert(CivicVaultBeaconController.NotDaoAdmin.selector);
        controller.vetoUpgrade(dao);
    }

    function test_proposeUpgrade_onlyOwner_andMustBeContract() public {
        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, outsider));
        controller.proposeUpgrade(address(0xdead));

        vm.prank(beaconOwner);
        vm.expectRevert(CivicVaultBeaconController.NotAContract.selector);
        controller.proposeUpgrade(address(0xdead));
    }

    function test_cancelUpgrade_clearsPending() public {
        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.startPrank(beaconOwner);
        controller.proposeUpgrade(address(v2));
        controller.cancelUpgrade();
        vm.stopPrank();

        (address impl,,,,,) = controller.pendingUpgrade();
        assertEq(impl, address(0));

        vm.warp(block.timestamp + 4 days);
        vm.expectRevert(CivicVaultBeaconController.NoPendingUpgrade.selector);
        controller.executeUpgrade();
    }

    function test_onePendingUpgradeAtATime() public {
        CivicVaultV2Mock a = new CivicVaultV2Mock();
        CivicVaultV2Mock b = new CivicVaultV2Mock();
        vm.startPrank(beaconOwner);
        controller.proposeUpgrade(address(a));
        vm.expectRevert(CivicVaultBeaconController.UpgradePending.selector);
        controller.proposeUpgrade(address(b));
        vm.stopPrank();
    }

    function test_doubleVeto_reverts_andWithdrawVeto_unblocks() public {
        address whaleAdmin = address(0xA1);
        address dao1 = _daoWithTvl(whaleAdmin, 100 * M); // 100 of 130 = 77%
        _daoWithTvl(address(0xA2), 30 * M);

        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));

        vm.prank(whaleAdmin);
        controller.vetoUpgrade(dao1);
        vm.prank(whaleAdmin);
        vm.expectRevert(CivicVaultBeaconController.AlreadyVetoed.selector);
        controller.vetoUpgrade(dao1);

        vm.warp(block.timestamp + 4 days);
        vm.expectRevert(CivicVaultBeaconController.VetoThresholdMet.selector);
        controller.executeUpgrade();

        // The DAO reconsiders and withdraws — upgrade now clears.
        vm.prank(whaleAdmin);
        controller.withdrawVeto(dao1);
        controller.executeUpgrade();
        assertEq(controller.currentImplementation(), address(v2));
    }

    function test_isArmed() public view {
        assertTrue(controller.isArmed());
    }

    function test_veto_afterEta_stillCountsIfNotYetExecuted() public {
        address whaleAdmin = address(0xA1);
        address dao1 = _daoWithTvl(whaleAdmin, 100 * M);
        _daoWithTvl(address(0xA2), 30 * M);

        CivicVaultV2Mock v2 = new CivicVaultV2Mock();
        vm.prank(beaconOwner);
        controller.proposeUpgrade(address(v2));

        vm.warp(block.timestamp + 4 days + 1); // window elapsed, nobody executed
        vm.prank(whaleAdmin);
        controller.vetoUpgrade(dao1);

        vm.expectRevert(CivicVaultBeaconController.VetoThresholdMet.selector);
        controller.executeUpgrade();
    }
}
