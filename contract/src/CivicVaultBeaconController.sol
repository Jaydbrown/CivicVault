// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

interface IFactoryLike {
    function getAllDAOs() external view returns (address[] memory);
    function isDAO(address) external view returns (bool);
}

interface IVaultLike {
    function creator() external view returns (address);
    function isAdmin(address account) external view returns (bool);
    function totalValueLocked() external view returns (uint256);
}

/**
 * @title CivicVaultBeaconController
 * @notice Owns the CivicVaultFactory beacon and gates every implementation
 *         upgrade behind a timelock and a DAO veto.
 *
 * Why: a beacon `upgradeTo` rewrites the logic of *every* DAO at once. Left as a
 * bare owner call that is a single point of control over all member funds. Here:
 *
 *   1. `proposeUpgrade` snapshots total value-locked and starts a 2-day timer —
 *      nothing changes yet, and everyone can see the pending implementation;
 *   2. during the window, the creator or any admin of a DAO can `vetoUpgrade`
 *      for that DAO (and `withdrawVeto` to undo it). If vetoing DAOs together
 *      hold >= VETO_BPS of the snapshot TVL, the upgrade cannot execute;
 *   3. `executeUpgrade` after the timer applies it, unless vetoed.
 *
 * Veto weight is accumulated as vetoes arrive, and total is snapshotted once at
 * propose time — so `executeUpgrade` is O(1) and can never be gas-bricked by a
 * growing DAO count.
 *
 * The controller's own owner should become a multisig, and later the meta-DAO.
 * There is deliberately no path to hand the beacon back to an EOA.
 */
contract CivicVaultBeaconController is Ownable {
    UpgradeableBeacon public immutable beacon;
    IFactoryLike public immutable factory;

    /// @notice Timelock on every upgrade. Kept >= CivicVaultGovernor.VOTING_WINDOW
    ///         (3 days) so members always have time to open and pass a proposal
    ///         (freeze, clawback, evict) before an implementation change lands.
    uint256 public constant UPGRADE_DELAY = 4 days;
    /// @notice Veto threshold: DAOs holding >= 30% of the snapshot TVL block the upgrade.
    uint256 public constant VETO_BPS = 3000;

    address public pendingImplementation;
    uint64 public upgradeEta;
    uint64 public upgradeId; // increments each proposal; namespaces the veto maps

    uint256 public totalTvlSnapshot; // total value-locked captured at propose time
    mapping(uint256 => uint256) public vetoWeight; // upgradeId => sum of vetoing DAOs' TVL
    mapping(uint256 => mapping(address => bool)) public vetoed; // upgradeId => dao => vetoed
    mapping(uint256 => mapping(address => uint256)) public vetoWeightOf; // upgradeId => dao => weight counted

    error NoPendingUpgrade();
    error UpgradePending();
    error TimelockNotElapsed();
    error NotADao();
    error NotDaoAdmin();
    error AlreadyVetoed();
    error NotVetoed();
    error VetoThresholdMet();
    error NotAContract();

    event UpgradeProposed(uint256 indexed upgradeId, address indexed newImplementation, uint64 eta, uint256 totalTvl);
    event UpgradeVetoed(uint256 indexed upgradeId, address indexed dao, uint256 weight);
    event VetoWithdrawn(uint256 indexed upgradeId, address indexed dao);
    event UpgradeExecuted(uint256 indexed upgradeId, address indexed newImplementation);
    event UpgradeCancelled(uint256 indexed upgradeId);

    constructor(address _beacon, address _factory, address _owner) Ownable(_owner) {
        beacon = UpgradeableBeacon(_beacon);
        factory = IFactoryLike(_factory);
    }

    /// @notice True once `factory.transferBeaconOwnership(this)` has been done —
    ///         i.e. the controller can actually apply an upgrade.
    function isArmed() external view returns (bool) {
        return beacon.owner() == address(this);
    }

    /// @notice Start the timelock on moving every DAO to `newImplementation`.
    function proposeUpgrade(address newImplementation) external onlyOwner {
        if (pendingImplementation != address(0)) revert UpgradePending();
        if (newImplementation.code.length == 0) revert NotAContract();

        upgradeId += 1;
        pendingImplementation = newImplementation;
        upgradeEta = uint64(block.timestamp + UPGRADE_DELAY);

        // One loop, owner-only, infrequent. Everything after this is O(1).
        uint256 total;
        address[] memory daos = factory.getAllDAOs();
        for (uint256 i = 0; i < daos.length; i++) {
            total += IVaultLike(daos[i]).totalValueLocked();
        }
        totalTvlSnapshot = total;

        emit UpgradeProposed(upgradeId, newImplementation, upgradeEta, total);
    }

    /// @notice Register `dao`'s objection to the pending upgrade. Callable by the
    ///         DAO creator or any of its admins. Fail-safe: easy to block a bad
    ///         upgrade; a legitimate fix only stalls if 30% of TVL actively objects.
    function vetoUpgrade(address dao) external {
        if (pendingImplementation == address(0)) revert NoPendingUpgrade();
        if (!factory.isDAO(dao)) revert NotADao();
        IVaultLike v = IVaultLike(dao);
        if (msg.sender != v.creator() && !v.isAdmin(msg.sender)) revert NotDaoAdmin();

        uint256 id = upgradeId;
        if (vetoed[id][dao]) revert AlreadyVetoed();

        uint256 weight = v.totalValueLocked();
        vetoed[id][dao] = true;
        vetoWeightOf[id][dao] = weight;
        vetoWeight[id] += weight;

        emit UpgradeVetoed(id, dao, weight);
    }

    /// @notice Undo a DAO's veto — e.g. after its members evict an admin who
    ///         vetoed a legitimate fix against the DAO's wishes.
    function withdrawVeto(address dao) external {
        if (pendingImplementation == address(0)) revert NoPendingUpgrade();
        IVaultLike v = IVaultLike(dao);
        if (msg.sender != v.creator() && !v.isAdmin(msg.sender)) revert NotDaoAdmin();

        uint256 id = upgradeId;
        if (!vetoed[id][dao]) revert NotVetoed();

        vetoWeight[id] -= vetoWeightOf[id][dao];
        vetoWeightOf[id][dao] = 0;
        vetoed[id][dao] = false;

        emit VetoWithdrawn(id, dao);
    }

    /// @notice Apply the pending upgrade after the timelock, unless vetoed. O(1).
    function executeUpgrade() external {
        if (pendingImplementation == address(0)) revert NoPendingUpgrade();
        if (block.timestamp < upgradeEta) revert TimelockNotElapsed();
        if (_vetoMet(upgradeId)) revert VetoThresholdMet();

        address impl = pendingImplementation;
        uint256 id = upgradeId;
        pendingImplementation = address(0);
        upgradeEta = 0;
        totalTvlSnapshot = 0;

        beacon.upgradeTo(impl);
        emit UpgradeExecuted(id, impl);
    }

    /// @notice Drop the pending upgrade.
    function cancelUpgrade() external onlyOwner {
        if (pendingImplementation == address(0)) revert NoPendingUpgrade();
        emit UpgradeCancelled(upgradeId);
        pendingImplementation = address(0);
        upgradeEta = 0;
        totalTvlSnapshot = 0;
    }

    // ===== VIEWS =====

    function _vetoMet(uint256 id) internal view returns (bool) {
        return totalTvlSnapshot > 0 && vetoWeight[id] * 10_000 >= totalTvlSnapshot * VETO_BPS;
    }

    function currentImplementation() external view returns (address) {
        return beacon.implementation();
    }

    function pendingUpgrade()
        external
        view
        returns (address impl, uint64 eta, uint64 id, uint256 vetoTvl, uint256 totalTvl, bool executable)
    {
        impl = pendingImplementation;
        eta = upgradeEta;
        id = upgradeId;
        vetoTvl = vetoWeight[id];
        totalTvl = totalTvlSnapshot;
        executable = impl != address(0) && block.timestamp >= eta && !_vetoMet(id);
    }
}
