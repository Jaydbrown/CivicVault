// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {CivicVaultView} from "../src/CivicVaultView.sol";
import {CivicVaultGovernor} from "../src/CivicVaultGovernor.sol";
import {CivicVaultBeaconController} from "../src/CivicVaultBeaconController.sol";

contract DeployCivicVault is Script {
    // Arc Testnet: USDC native gas token exposed via ERC-20 interface (6 decimals)
    address constant STABLE_TOKEN = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        // Protocol yield fee: recipient + rate. Recommend a multisig for
        // PROTOCOL_TREASURY (it cannot be rotated for DAOs created before a
        // change). Both optional — default is treasury = deployer, fee = 300 bps.
        address treasury = vm.envOr("PROTOCOL_TREASURY", deployer);
        uint256 feeBps = vm.envOr("PROTOCOL_YIELD_FEE_BPS", uint256(300));
        // Owner of the beacon controller (upgrade authority behind the timelock).
        // Use a multisig; defaults to the deployer.
        address beaconOwner = vm.envOr("BEACON_CONTROLLER_OWNER", deployer);

        vm.startBroadcast(pk);

        CivicVault implementation = new CivicVault();
        CivicVaultFactory factory = new CivicVaultFactory(deployer, address(implementation));
        CivicVaultView viewContract = new CivicVaultView();
        CivicVaultGovernor governor = new CivicVaultGovernor();

        // Move upgrade authority off the deployer EOA: the beacon is now owned
        // by a controller that timelocks upgrades and lets DAOs veto them.
        CivicVaultBeaconController controller =
            new CivicVaultBeaconController(factory.beacon(), address(factory), beaconOwner);
        factory.transferBeaconOwnership(address(controller));

        factory.setProtocolTreasury(treasury);
        factory.setProtocolYieldFeeBps(uint16(feeBps));
        factory.setGovernor(address(governor));

        address daoAddress = factory.createDAO(
            "Essien Town Local DAO",
            "Empowering Essien Town through community investment",
            "Essien Town, Cross River, Nigeria",
            "4.9757,8.3417",
            "540001",
            100,
            STABLE_TOKEN
        );

        vm.stopBroadcast();

        console2.log("Implementation:  ", address(implementation));
        console2.log("Factory:         ", address(factory));
        console2.log("Beacon:          ", factory.beacon());
        console2.log("BeaconController:", address(controller));
        console2.log("View:            ", address(viewContract));
        console2.log("Governor:        ", address(governor));
        console2.log("First DAO:       ", daoAddress);
    }
}
