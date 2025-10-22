// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPYUSD {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/**
 * @title PaymentSplitter
 * @notice Automatically split PYUSD payments among multiple recipients
 * @dev Useful for revenue sharing, team payments, etc.
 */
contract PaymentSplitter {
    IPYUSD public immutable pyusd;
    
    struct Split {
        address[] recipients;
        uint256[] shares; // Basis points (10000 = 100%)
        bool active;
    }
    
    mapping(bytes32 => Split) public splits;
    mapping(address => bytes32[]) public merchantSplits;
    
    event SplitCreated(bytes32 indexed splitId, address indexed creator);
    event PaymentSplit(
        bytes32 indexed splitId,
        address indexed payer,
        uint256 totalAmount,
        address[] recipients,
        uint256[] amounts
    );
    
    constructor(address _pyusd) {
        require(_pyusd != address(0), "Invalid PYUSD address");
        pyusd = IPYUSD(_pyusd);
    }
    
    /**
     * @notice Create a payment split configuration
     * @param recipients Array of recipient addresses
     * @param shares Array of shares in basis points (must sum to 10000)
     */
    function createSplit(
        address[] memory recipients,
        uint256[] memory shares
    ) external returns (bytes32) {
        require(recipients.length > 0, "No recipients");
        require(recipients.length == shares.length, "Length mismatch");
        
        uint256 totalShares = 0;
        for (uint256 i = 0; i < shares.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(shares[i] > 0, "Share must be > 0");
            totalShares += shares[i];
        }
        require(totalShares == 10000, "Shares must sum to 10000");
        
        bytes32 splitId = keccak256(abi.encodePacked(
            msg.sender,
            recipients,
            shares,
            block.timestamp
        ));
        
        splits[splitId] = Split({
            recipients: recipients,
            shares: shares,
            active: true
        });
        
        merchantSplits[msg.sender].push(splitId);
        
        emit SplitCreated(splitId, msg.sender);
        return splitId;
    }
    
    /**
     * @notice Execute a split payment
     * @param splitId Split configuration ID
     * @param amount Total amount to split
     */
    function executeSplit(bytes32 splitId, uint256 amount) external {
        Split storage split = splits[splitId];
        require(split.active, "Split not active");
        require(amount > 0, "Amount must be > 0");
        
        uint256[] memory amounts = new uint256[](split.recipients.length);
        
        // Calculate and transfer to each recipient
        for (uint256 i = 0; i < split.recipients.length; i++) {
            amounts[i] = (amount * split.shares[i]) / 10000;
            require(
                pyusd.transferFrom(msg.sender, split.recipients[i], amounts[i]),
                "Transfer failed"
            );
        }
        
        emit PaymentSplit(splitId, msg.sender, amount, split.recipients, amounts);
    }
    
    /**
     * @notice Deactivate a split
     */
    function deactivateSplit(bytes32 splitId) external {
        Split storage split = splits[splitId];
        
        // Only allow deactivation by creator (first recipient or any recipient)
        bool isRecipient = false;
        for (uint256 i = 0; i < split.recipients.length; i++) {
            if (split.recipients[i] == msg.sender) {
                isRecipient = true;
                break;
            }
        }
        require(isRecipient, "Not authorized");
        
        split.active = false;
    }
    
    /**
     * @notice Get split details
     */
    function getSplit(bytes32 splitId) external view returns (
        address[] memory recipients,
        uint256[] memory shares,
        bool active
    ) {
        Split memory split = splits[splitId];
        return (split.recipients, split.shares, split.active);
    }
}
