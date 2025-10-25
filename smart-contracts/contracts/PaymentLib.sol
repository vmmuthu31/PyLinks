// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library PaymentLib {
    struct SplitRecipient {
        address recipient;
        uint256 bps;
    }
    
    error TransferFailed();
    
    function distributePayment(
        IERC20 pyusd,
        address treasury,
        address affiliate,
        address merchant,
        uint256 netAmount,
        uint256 platformFee,
        uint256 affiliateRewardBps,
        uint256 maxFeeBps,
        SplitRecipient[] memory splits,  // Changed to memory
        mapping(address => uint256) storage merchantEarnings,
        mapping(address => uint256) storage affiliateEarnings
    ) external {
        uint256 affiliateReward = 0;
        if (affiliate != address(0)) {
            affiliateReward = (platformFee * affiliateRewardBps) / maxFeeBps;
            affiliateEarnings[affiliate] += affiliateReward;
        }
        
        uint256 treasuryFee = platformFee - affiliateReward;
        if (treasuryFee > 0) {
            if (!pyusd.transfer(treasury, treasuryFee)) revert TransferFailed();
        }
        
        if (splits.length > 0) {
            processSplitPayment(pyusd, merchant, netAmount, splits, merchantEarnings, maxFeeBps);
        } else {
            if (!pyusd.transfer(merchant, netAmount)) revert TransferFailed();
            merchantEarnings[merchant] += netAmount;
        }
    }
    
    function processSplitPayment(
        IERC20 pyusd,
        address merchant,
        uint256 netAmount,
        SplitRecipient[] memory splits,  // Changed to memory
        mapping(address => uint256) storage merchantEarnings,
        uint256 maxFeeBps
    ) internal {
        uint256 remainingAmount = netAmount;
        
        for (uint256 i = 0; i < splits.length; i++) {
            uint256 splitAmount = (netAmount * splits[i].bps) / maxFeeBps;
            
            if (splitAmount > 0 && splitAmount <= remainingAmount) {
                if (!pyusd.transfer(splits[i].recipient, splitAmount)) revert TransferFailed();
                remainingAmount -= splitAmount;
            }
        }
        
        if (remainingAmount > 0) {
            if (!pyusd.transfer(merchant, remainingAmount)) revert TransferFailed();
            merchantEarnings[merchant] += remainingAmount;
        }
    }
}
