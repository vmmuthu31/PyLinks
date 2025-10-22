// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

interface IPYUSD {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

/**
 * @title RecurringPayments
 * @notice Manage subscription-based PYUSD payments with USD pricing via Pyth oracles
 * @dev Allows merchants to charge customers in USD, converted to PYUSD at current rates
 */
contract RecurringPayments {
    IPYUSD public immutable pyusd;
    IPyth public immutable pyth;
    
    bytes32 public constant PYUSD_USD_PRICE_ID = 0x8b820e7f3c3dc16bf617c6929945a48d3b6ea9e8b9e6fc2e1e1f3f3b3e3c3e3d;
    
    enum SubscriptionStatus { Active, Paused, Cancelled }
    
    struct Subscription {
        address subscriber;
        address merchant;
        uint256 usdAmount; // Amount in USD (8 decimals)
        uint256 interval; // in seconds
        uint256 nextPaymentDue;
        uint256 startedAt;
        SubscriptionStatus status;
        string planId;
        bool useUsdPricing; // Whether to use dynamic USD pricing
    }
    
    mapping(bytes32 => Subscription) public subscriptions;
    mapping(address => bytes32[]) public merchantSubscriptions;
    mapping(address => bytes32[]) public userSubscriptions;
    
    event SubscriptionCreated(
        bytes32 indexed subscriptionId,
        address indexed subscriber,
        address indexed merchant,
        uint256 usdAmount,
        uint256 interval,
        string planId,
        bool useUsdPricing
    );
    
    event PaymentProcessed(
        bytes32 indexed subscriptionId,
        uint256 pyusdAmount,
        uint256 nextPaymentDue,
        int64 price
    );
    
    event SubscriptionCancelled(bytes32 indexed subscriptionId);
    event SubscriptionPaused(bytes32 indexed subscriptionId);
    event SubscriptionResumed(bytes32 indexed subscriptionId);
    
    constructor(address _pyusd, address _pyth) {
        require(_pyusd != address(0), "Invalid PYUSD address");
        require(_pyth != address(0), "Invalid Pyth address");
        pyusd = IPYUSD(_pyusd);
        pyth = IPyth(_pyth);
    }
    
    /**
     * @notice Create a new subscription with USD pricing
     * @param merchant Merchant address
     * @param usdAmount Payment amount in USD (8 decimals)
     * @param interval Payment interval in seconds
     * @param planId Plan identifier
     * @param useUsdPricing Whether to use dynamic USD pricing via Pyth
     */
    function createSubscription(
        address merchant,
        uint256 usdAmount,
        uint256 interval,
        string memory planId,
        bool useUsdPricing
    ) external returns (bytes32) {
        require(merchant != address(0), "Invalid merchant");
        require(usdAmount > 0, "Amount must be > 0");
        require(interval > 0, "Interval must be > 0");
        
        bytes32 subscriptionId = keccak256(abi.encodePacked(
            msg.sender,
            merchant,
            usdAmount,
            interval,
            planId,
            block.timestamp
        ));
        
        require(subscriptions[subscriptionId].subscriber == address(0), "Subscription exists");
        
        subscriptions[subscriptionId] = Subscription({
            subscriber: msg.sender,
            merchant: merchant,
            usdAmount: usdAmount,
            interval: interval,
            nextPaymentDue: block.timestamp + interval,
            startedAt: block.timestamp,
            status: SubscriptionStatus.Active,
            planId: planId,
            useUsdPricing: useUsdPricing
        });
        
        merchantSubscriptions[merchant].push(subscriptionId);
        userSubscriptions[msg.sender].push(subscriptionId);
        
        emit SubscriptionCreated(
            subscriptionId,
            msg.sender,
            merchant,
            usdAmount,
            interval,
            planId,
            useUsdPricing
        );
        
        return subscriptionId;
    }
    
    /**
     * @notice Process a subscription payment with dynamic pricing
     * @param subscriptionId Subscription identifier
     * @param priceUpdateData Price update data from Pyth (only needed if useUsdPricing is true)
     */
    function processPayment(
        bytes32 subscriptionId,
        bytes[] calldata priceUpdateData
    ) external payable {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.status == SubscriptionStatus.Active, "Subscription not active");
        require(block.timestamp >= sub.nextPaymentDue, "Payment not due");
        require(
            msg.sender == sub.merchant || msg.sender == address(this),
            "Not authorized"
        );
        
        uint256 pyusdAmount;
        int64 currentPrice = 0;
        
        if (sub.useUsdPricing) {
            // Update price feeds with fresh data
            uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
            require(msg.value >= updateFee, "Insufficient fee for price update");
            
            pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
            
            // Get current PYUSD/USD price
            PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
            require(price.price > 0, "Invalid price");
            currentPrice = price.price;
            
            // Calculate PYUSD amount from USD
            pyusdAmount = (sub.usdAmount * 1e8) / uint256(int256(price.price));
        } else {
            // Fixed PYUSD amount (no dynamic pricing)
            pyusdAmount = sub.usdAmount; // In this case, usdAmount is actually PYUSD amount
        }
        
        // Check allowance
        uint256 allowance = pyusd.allowance(sub.subscriber, address(this));
        require(allowance >= pyusdAmount, "Insufficient allowance");
        
        // Process payment
        require(
            pyusd.transferFrom(sub.subscriber, sub.merchant, pyusdAmount),
            "Transfer failed"
        );
        
        // Update next payment due
        sub.nextPaymentDue = block.timestamp + sub.interval;
        
        emit PaymentProcessed(subscriptionId, pyusdAmount, sub.nextPaymentDue, currentPrice);
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
