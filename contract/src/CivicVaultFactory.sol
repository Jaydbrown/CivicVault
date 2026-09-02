// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {CivicVault} from "./CivicVault.sol";

/**
 * @title CivicVaultFactory
 * @notice Deploys CivicVault instances as beacon proxies.
 * @dev Every DAO is a `BeaconProxy` pointing at one `UpgradeableBeacon` this
 *      factory deploys. A single `beacon.upgradeTo(newImpl)` moves every DAO to
 *      new logic at once — no per-DAO migration, no orphaning on a bug fix. The
 *      beacon is meant to be owned by `CivicVaultBeaconController` (timelock +
 *      DAO veto); the deployer wires that with `transferBeaconOwnership`.
 */
contract CivicVaultFactory is Ownable {
    // ===== STATE VARIABLES =====
    /// @notice The shared UpgradeableBeacon all DAO proxies read their implementation from.
    address public immutable beacon;
    address[] public allDAOs;
    mapping(address => bool) public isDAO;

    struct DAOMetadata {
        string name;
        string location;
        address creator;
        uint256 createdAt;
        bool isActive;
    }

    mapping(address => DAOMetadata) public daoInfo;

    // ===== PROTOCOL FEE =====
    /// @notice Max protocol fee on realised yield: 5%.
    uint16 public constant MAX_PROTOCOL_YIELD_FEE_BPS = 500;
    /// @notice Max protocol fee on each disbursed escrow tranche: 1%.
    uint16 public constant MAX_PROTOCOL_DISBURSEMENT_FEE_BPS = 100;
    /// @notice Recipient of the yield fee. Recommend a multisig from day one — a
    ///         compromised key here cannot be rotated for already-deployed DAOs
    ///         (the value is baked into each clone at initialize).
    address public protocolTreasury;
    /// @notice Fee in bps of realised yield, applied to DAOs created from now on.
    uint16 public protocolYieldFeeBps;
    /// @notice Fee in bps taken from each disbursed escrow tranche, applied to
    ///         DAOs created from now on. This is the primary protocol revenue
    ///         line — it does not depend on a treasury generating a return.
    uint16 public protocolDisbursementFeeBps;

    /// @notice Shared CivicVaultGovernor for member-initiated governance. DAOs
    ///         created before this is set have no on-chain governance (legacy).
    address public governor;

    event ProtocolTreasuryUpdated(address indexed newTreasury);
    event ProtocolYieldFeeUpdated(uint16 newFeeBps);
    event ProtocolDisbursementFeeUpdated(uint16 newFeeBps);
    event GovernorUpdated(address indexed newGovernor);
    event BeaconOwnershipTransferred(address indexed newOwner);

    // ===== CONSTRUCTOR =====
    /// @param _owner Factory owner
    /// @param _implementation The initial CivicVault implementation (deploy separately first).
    ///        The factory deploys its own beacon around it, owned by `_owner` until
    ///        `transferBeaconOwnership` hands it to the timelock controller.
    constructor(address _owner, address _implementation) Ownable(_owner) {
        require(_implementation != address(0), "Invalid implementation");
        // Factory owns the beacon until `transferBeaconOwnership` hands it off.
        beacon = address(new UpgradeableBeacon(_implementation, address(this)));
        // Default: no fee, treasury unset. Owner wires these with the setters
        // before the first fee-bearing DAO. Existing 2-arg construction and every
        // createDAO(...) call site stay unchanged.
        protocolTreasury = _owner;
    }

    /// @notice The implementation every DAO proxy currently delegates to.
    function implementation() external view returns (address) {
        return UpgradeableBeacon(beacon).implementation();
    }

    /// @notice Hand the beacon (upgrade authority) to `newOwner` — the
    ///         CivicVaultBeaconController. One-way in practice: the controller
    ///         has no function to hand it back to an EOA.
    function transferBeaconOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        UpgradeableBeacon(beacon).transferOwnership(newOwner);
        emit BeaconOwnershipTransferred(newOwner);
    }

    /// @notice Set the yield-fee recipient. Only affects DAOs created afterwards.
    function setProtocolTreasury(address t) external onlyOwner {
        require(t != address(0), "Zero treasury");
        protocolTreasury = t;
        emit ProtocolTreasuryUpdated(t);
    }

    /// @notice Set the yield fee (bps of realised yield). Only affects DAOs created afterwards.
    function setProtocolYieldFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_PROTOCOL_YIELD_FEE_BPS, "Fee too high");
        protocolYieldFeeBps = bps;
        emit ProtocolYieldFeeUpdated(bps);
    }

    /// @notice Set the disbursement fee (bps of each released tranche). Only affects DAOs created afterwards.
    function setProtocolDisbursementFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_PROTOCOL_DISBURSEMENT_FEE_BPS, "Fee too high");
        protocolDisbursementFeeBps = bps;
        emit ProtocolDisbursementFeeUpdated(bps);
    }

    /// @notice Set the shared governor. Only affects DAOs created afterwards.
    function setGovernor(address g) external onlyOwner {
        governor = g;
        emit GovernorUpdated(g);
    }

    // ===== CORE FUNCTIONS =====
    /**
     * @notice Deploy a new Local DAO
     * @param name DAO name (e.g., "Essien Town Local DAO")
     * @param description DAO mission statement
     * @param location Geographic location
     * @param coordinates GPS coordinates
     * @param postalCode Postal/ZIP code
     * @param maxMembership Maximum members allowed
     * @param usdcAddress USDC token address on this chain
     * @return daoAddress Address of newly deployed DAO
     */
    function createDAO(
        string memory name,
        string memory description,
        string memory location,
        string memory coordinates,
        string memory postalCode,
        uint256 maxMembership,
        address usdcAddress
    ) external returns (address daoAddress) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(location).length > 0, "Location required");
        require(maxMembership > 0, "Invalid max membership");
        require(usdcAddress != address(0), "Invalid USDC address");
        require(
            (protocolYieldFeeBps == 0 && protocolDisbursementFeeBps == 0) || protocolTreasury != address(0),
            "Treasury unset"
        );

        // Deploy a beacon proxy and initialize it atomically in the constructor.
        daoAddress = address(
            new BeaconProxy(
                beacon,
                abi.encodeCall(
                    CivicVault.initialize,
                    (
                        msg.sender,
                        name,
                        description,
                        location,
                        coordinates,
                        postalCode,
                        maxMembership,
                        usdcAddress,
                        protocolTreasury,
                        protocolYieldFeeBps,
                        governor,
                        protocolDisbursementFeeBps
                    )
                )
            )
        );

        allDAOs.push(daoAddress);
        isDAO[daoAddress] = true;
        daoInfo[daoAddress] = DAOMetadata({
            name: name, location: location, creator: msg.sender, createdAt: block.timestamp, isActive: true
        });

        emit DAOCreated(daoAddress, name, location, msg.sender, block.timestamp);

        return daoAddress;
    }

    /**
     * @notice Get all deployed DAOs
     * @return Array of DAO contract addresses
     */
    function getAllDAOs() external view returns (address[] memory) {
        return allDAOs;
    }

    /**
     * @notice Get active DAOs only
     * @return Array of active DAO addresses
     */
    function getActiveDAOs() external view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allDAOs.length; i++) {
            if (daoInfo[allDAOs[i]].isActive) {
                activeCount++;
            }
        }

        address[] memory activeDAOs = new address[](activeCount);

        uint256 index = 0;
        for (uint256 i = 0; i < allDAOs.length; i++) {
            if (daoInfo[allDAOs[i]].isActive) {
                activeDAOs[index] = allDAOs[i];
                index++;
            }
        }
        return activeDAOs;
    }

    /**
     * @notice Verify if address is a valid DAO
     * @param daoAddress Address to check
     * @return bool True if valid DAO
     */
    function isValidDAO(address daoAddress) external view returns (bool) {
        return isDAO[daoAddress] && daoInfo[daoAddress].isActive;
    }

    /**
     * @notice Get DAO metadata
     * @param daoAddress DAO contract address
     * @return DAOMetadata struct
     */
    function getDAOMetadata(address daoAddress) external view returns (DAOMetadata memory) {
        require(isDAO[daoAddress], "Invalid DAO address");
        return daoInfo[daoAddress];
    }

    /**
     * @notice Emergency function to mark DAO inactive
     * @dev Only factory owner can call
     * @param daoAddress DAO to deactivate
     */
    function deactivateDAO(address daoAddress) external onlyOwner {
        require(isDAO[daoAddress], "Invalid DAO address");
        require(daoInfo[daoAddress].isActive, "DAO already inactive");

        daoInfo[daoAddress].isActive = false;

        emit DAODeactivated(daoAddress, block.timestamp);
    }

    /**
     * @notice Reactivate a previously deactivated DAO
     * @dev Only factory owner can call
     * @param daoAddress DAO to reactivate
     */
    function reactivateDAO(address daoAddress) external onlyOwner {
        require(isDAO[daoAddress], "Invalid DAO address");
        require(!daoInfo[daoAddress].isActive, "DAO already active");

        daoInfo[daoAddress].isActive = true;

        emit DAOReactivated(daoAddress, block.timestamp);
    }

    /**
     * @notice Returns the total number of DAOs ever deployed
     */
    function totalDAOCount() external view returns (uint256) {
        return allDAOs.length;
    }

    // ===== EVENTS =====
    event DAOCreated(
        address indexed daoAddress, string name, string location, address indexed creator, uint256 timestamp
    );

    event DAODeactivated(address indexed daoAddress, uint256 timestamp);

    event DAOReactivated(address indexed daoAddress, uint256 timestamp);
}
