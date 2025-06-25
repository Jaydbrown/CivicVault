// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICivicVault} from "./interfaces/ICivicVault.sol";
import {YieldCalculator} from "./libraries/YieldCalculator.sol";
import {InvestmentManager} from "./libraries/InvestmentManager.sol";

/**
 * @title CivicVaultView
 * @notice Read-only lens contract for CivicVault analytics and bulk queries.
 * @dev Deploy once; pass any CivicVault clone address to each function.
 */
contract CivicVaultView {
    function getAllInvestments(address dao)
        external
        view
        returns (ICivicVault.Investment[] memory)
    {
        uint256 count = ICivicVault(dao).investmentCount();
        ICivicVault.Investment[] memory all = new ICivicVault.Investment[](count);
        for (uint256 i = 1; i <= count; i++) {
            all[i - 1] = ICivicVault(dao).getInvestment(i);
        }
        return all;
    }

    function getInvestmentsByStatus(address dao, ICivicVault.Status status)
        external
        view
        returns (ICivicVault.Investment[] memory)
    {
        uint256 total = ICivicVault(dao).investmentCount();
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (ICivicVault(dao).getInvestment(i).status == status) count++;
        }

        ICivicVault.Investment[] memory result = new ICivicVault.Investment[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            ICivicVault.Investment memory inv = ICivicVault(dao).getInvestment(i);
            if (inv.status == status) {
                result[index] = inv;
                index++;
            }
        }
        return result;
    }

    function getInvestmentAnalytics(address dao, uint256 investmentId)
        external
        view
        returns (
            uint256 principal,
            uint256 totalStaked,
            uint256 expectedYieldAmount,
            uint256 totalYieldGenerated,
            uint256 totalYieldDistributed,
            uint256 remainingYield,
            uint256 realizedRoiBps,
            uint256 expectedRoiBps,
            uint256 stakingUtilizationBps
        )
    {
        ICivicVault.Investment memory inv = ICivicVault(dao).getInvestment(investmentId);
        ICivicVault.YieldDistribution memory dist = ICivicVault(dao).getYieldDistribution(investmentId);

        principal = inv.fundNeeded;
        totalStaked = inv.upvotes;
        expectedYieldAmount = YieldCalculator.calculateExpectedYield(inv.fundNeeded, inv.expectedYield);
        totalYieldGenerated = inv.totalYieldGenerated;
        totalYieldDistributed = inv.totalYieldDistributed;
        remainingYield = dist.remainingAmount;

        realizedRoiBps = principal == 0 ? 0 : YieldCalculator.calculateYieldPercentage(totalYieldGenerated, principal);
        expectedRoiBps = principal == 0 ? 0 : YieldCalculator.calculateYieldPercentage(expectedYieldAmount, principal);
        stakingUtilizationBps = principal == 0 ? 0 : (totalStaked * 10000) / principal;
    }

    function getUserAnalytics(address dao, address user)
        external
        view
        returns (
            uint256 totalStaked,
            uint256 totalClaimedYield,
            uint256 totalClaimableYield,
            uint256 realizedRoiBps
        )
    {
        uint256 count = ICivicVault(dao).investmentCount();
        for (uint256 i = 1; i <= count; i++) {
            ICivicVault.Vote memory userVote = ICivicVault(dao).getVote(i, user);
            if (userVote.numberOfVotes == 0 || userVote.voteValue != 1) continue;

            totalStaked += userVote.numberOfVotes;
            totalClaimedYield += userVote.yieldClaimed;

            if (!userVote.hasClaimedYield) {
                ICivicVault.Investment memory inv = ICivicVault(dao).getInvestment(i);
                if (inv.status == ICivicVault.Status.ACTIVE) {
                    totalClaimableYield += YieldCalculator.calculateUserYield(
                        userVote.numberOfVotes,
                        inv.upvotes,
                        inv.totalYieldGenerated
                    );
                }
            }
        }

        realizedRoiBps = totalStaked == 0
            ? 0
            : YieldCalculator.calculateYieldPercentage(totalClaimedYield, totalStaked);
    }

    function calculateClaimableYield(address dao, uint256 investmentId, address voter)
        external
        view
        returns (uint256)
    {
        ICivicVault.Investment memory inv = ICivicVault(dao).getInvestment(investmentId);
        if (inv.status != ICivicVault.Status.ACTIVE && inv.status != ICivicVault.Status.ENDED) return 0;

        ICivicVault.Vote memory userVote = ICivicVault(dao).getVote(investmentId, voter);
        if (userVote.numberOfVotes == 0 || userVote.voteValue != 1) return 0;
        if (inv.upvotes == 0 || inv.totalYieldGenerated == 0) return 0;

        uint256 totalEntitled = YieldCalculator.calculateUserYield(
            userVote.numberOfVotes,
            inv.upvotes,
            inv.totalYieldGenerated
        );
        return totalEntitled > userVote.yieldClaimed ? totalEntitled - userVote.yieldClaimed : 0;
    }

    function canActivateInvestment(address dao, uint256 investmentId) external view returns (bool) {
        ICivicVault.Investment memory inv = ICivicVault(dao).getInvestment(investmentId);
        return InvestmentManager.canActivate(inv.upvotes, inv.fundNeeded, inv.deadline, block.timestamp);
    }
}
