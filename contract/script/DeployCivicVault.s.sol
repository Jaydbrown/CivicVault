// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {CivicVault} from "../src/CivicVault.sol";
import {CivicVaultFactory} from "../src/CivicVaultFactory.sol";
import {CivicVaultView} from "../src/CivicVaultView.sol";

contract DeployCivicVault is Script {
    // Arc Testnet: USDC native gas token exposed via ERC-20 interface (6 decimals)
    address constant STABLE_TOKEN = 0x3600000000000000000000000000000000000000;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        CivicVault implementation = new CivicVault();
        CivicVaultFactory factory = new CivicVaultFactory(deployer, address(implementation));
        CivicVaultView viewContract = new CivicVaultView();

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

        console2.log("Implementation:", address(implementation));
        console2.log("Factory:       ", address(factory));
        console2.log("View:          ", address(viewContract));
        console2.log("First DAO:     ", daoAddress);
    }
}