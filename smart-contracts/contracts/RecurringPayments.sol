// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPYUSD {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title RecurringPayments
 * @notice Manage subscription-based PYUSD payments
 * @dev Allows merchants to charge customers on a recurring basis
 */
contract RecurringPayments {
    IPYUSD public immutable pyusd;
    
    enum SubscriptionStatus { Active, Paused, Cancelled }
    
    struct Subscription {
        address subscriber;
        address merchant;
        uint256 amount;
        uint256 interval; // in seconds
        uint256 nextPaymentDue;
        uint256 startedAt;
        SubscriptionStatus status;
        string planId;
    }
    
    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => bytes32[]) public merchantSubscriptions;
    mapping(address => bytes32[]) public userSubscriptions;
    
    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 amount,
        uint256 interval,
        string planId
    );
    
    event PaymentProcessed(
        bytes32 indexed subscriptionId,
        uint256 amount,
        uint256 nextPaymentDue
    );
    
    event SubscriptionCancelled(bytes32 indexed subscriptionId);
    event SubscriptionPaused(bytes32 indexed subscriptionId);
    event SubscriptionResumed(bytes32 indexed subscriptionId);
    
    constructor(address _pyusd) {
        require(_pyusd != address(0), "Invalid PYUSD address");
        pyusd = IPYUSD(_pyusd);
    }
    
    /**
     * @notice Create a new subscription
     * @param merchant Merchant address
     * @param amount Payment amount per interval
     * @param interval Payment interval in seconds
     * @param planId Plan identifier
     */
    function createSubscription(
        address merchant,
        uint256 amount,
        uint256 interval,
        string memory planId
    ) external returns (bytes32) {
        require(merchant != address(0), "Invalid merchant");
        require(amount > 0, "Amount must be > 0");
        require(interval > 0, "Interval must be > 0");
        
        bytes32 subscriptionId = keccak256(abi.encodePacked(
            msg.sender,
            merchant,
            amount,
            interval,
            planId,
            block.timestamp
        ));
        
        require(subscriptions[subscriptionId].subscriber == address(0), "Subscription exists");
        
        subscriptions[subscriptionId] = Subscription({
            subscriber: msg.sender,
            merchant: merchant,
            amount: amount,
            interval: interval,
            nextPaymentDue: block.timestamp + interval,
            startedAt: block.timestamp,
            status: SubscriptionStatus.Active,
            planId: planId
        });
        
        merchantSubscriptions[merchant].push(subscriptionId);
        userSubscriptions[msg.sender].push(subscriptionId);
        
        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            merchant,
            amount,
            interval,
            planId
        );
        
        return subscriptionId;
    }
    
    /**
     * @notice Process a subscription payment
     * @param subscriptionId Subscription identifier
     */
    function processPayment(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.status == SubscriptionStatus.Active, "Subscription not active");
        require(block.timestamp >= sub.nextPaymentDue, "Payment not due");
        require(
            msg.sender == sub.merchant || msg.sender == address(this),
            "Not authorized"
        );
        
        // Check allowance
        uint256 allowance = pyusd.allowance(sub.subscriber, address(this));
        require(allowance >= sub.amount, "Insufficient allowance");
        
        // Process payment
        require(
            pyusd.transferFrom(sub.subscriber, sub.merchant, sub.amount),
            "Transfer failed"
        );
        
        // Update next payment due
        sub.nextPaymentDue = block.timestamp + sub.interval;
        
        emit PaymentProcessed(subscriptionId, sub.amount, sub.nextPaymentDue);
    }
    
    /**
     * @notice Cancel subscription
     */
    function cancelSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(
            msg.sender == sub.subscriber || msg.sender == sub.merchant,
            "Not authorized"
        );
        
        sub.status = SubscriptionStatus.Cancelled;
        emit SubscriptionCancelled(subscriptionId);
    }
    
    /**
     * @notice Pause subscription (subscriber only)
     */
    function pauseSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(msg.sender == sub.subscriber, "Not authorized");
        require(sub.status == SubscriptionStatus.Active, "Not active");
        
        sub.status = SubscriptionStatus.Paused;
        emit SubscriptionPaused(subscriptionId);
    }
    
    /**
     * @notice Resume subscription
     */
    function resumeSubscription(bytes32 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(msg.sender == sub.subscriber, "Not authorized");
        require(sub.status == SubscriptionStatus.Paused, "Not paused");
        
        sub.status = SubscriptionStatus.Active;
        sub.nextPaymentDue = block.timestamp + sub.interval;
        
        emit SubscriptionResumed(subscriptionId);
    }
    
    /**
     * @notice Get user's subscriptions
     */
    function getUserSubscriptions(address user) external view returns (bytes32[] memory) {
        return userSubscriptions[user];
    }
    
    /**
     * @notice Get merchant's subscriptions
     */
    function getMerchantSubscriptions(address merchant) external view returns (bytes32[] memory) {
        return merchantSubscriptions[merchant];
    }
}
