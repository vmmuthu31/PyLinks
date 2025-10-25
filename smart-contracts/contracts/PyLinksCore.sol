// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

interface INFTReceipt {
    function mintReceipt(
        address customer,
        uint256 paymentId,
        address merchant,
        uint256 amount,
        string memory description,
        bytes32 txHash,
        string memory merchantName
    ) external returns (uint256);
}

/**
 * @title PyLinksCore
 * @notice Unified payment processing contract with all features integrated
 * @dev Main contract that handles:
 * - Regular payments (10min expiry, one-time use, 0.1% fees)
 * - Escrow payments with Pyth dynamic pricing
 * - Subscription/recurring payments
 * - Payment splits and affiliate rewards
 * - Gamification (spin credits)
 * - NFT receipt minting
 */
contract PyLinksCore is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    // Core contracts
    IERC20 public immutable pyusd;
    IPyth public immutable pyth;
    INFTReceipt public nftReceipt;
    
    // Counters
    Counters.Counter private _paymentIds;
    Counters.Counter private _subscriptionIds;
    Counters.Counter private _affiliateIds;
    
    // Constants
    bytes32 public constant PYUSD_USD_PRICE_ID = 0xc1da1b73d7f01e7ddd54b3766cf7fcd644395ad14f70aa706ec5384c59e76692;
    uint256 public constant PLATFORM_FEE_BPS = 10; // 0.1%
    uint256 public constant MAX_FEE_BPS = 10000;
    uint256 public constant PAYMENT_EXPIRY = 10 minutes;
    uint256 public constant AFFILIATE_REWARD_BPS = 2000; // 20% of fee
    uint256 public constant ESCROW_PERIOD = 7 days;
    
    address public treasury;
    
    // Enums
    enum PaymentStatus { Created, Paid, Expired, Refunded, Cancelled, Escrowed, Disputed }
    enum PaymentType { Regular, Escrow, Subscription }
    enum SubscriptionStatus { Active, Paused, Cancelled, Expired }
    
    // Structs
    struct SplitRecipient {
        address recipient;
        uint256 bps; // Basis points
    }
    
    struct Payment {
        uint256 id;
        address merchant;
        address customer;
        uint256 amount; // PYUSD amount (6 decimals)
        uint256 usdAmount; // USD amount (8 decimals) - for escrow
        uint256 platformFee;
        uint256 netAmount;
        string sessionId;
        string description;
        PaymentStatus status;
        PaymentType paymentType;
        uint256 createdAt;
        uint256 expiresAt;
        bytes32 referralCode;
        address affiliate;
        SplitRecipient[] splits;
        bool isOneTime;
        uint256 paidAt;
        bytes32 txHash;
        // Escrow specific
        uint256 releaseTime;
        bool autoRelease;
        int64 priceAtCreation;
    }
    
    struct Subscription {
        uint256 id;
        address merchant;
        address customer;
        uint256 usdAmount; // Amount in USD (8 decimals)
        uint256 interval; // Payment interval in seconds
        uint256 nextPayment;
        uint256 totalPayments;
        uint256 maxPayments; // 0 = unlimited
        SubscriptionStatus status;
        string description;
        bool autoRenew;
        uint256 createdAt;
    }
    
    struct Affiliate {
        uint256 id;
        address wallet;
        string name;
        bytes32 referralCode;
        uint256 totalReferrals;
        uint256 totalVolume;
        uint256 totalEarnings;
        uint256 tier; // 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
        bool isActive;
        uint256 createdAt;
    }
    
    // Storage
    mapping(uint256 => Payment) public payments;
    mapping(string => uint256) public sessionToPayment;
    mapping(address => uint256[]) public merchantPayments;
    mapping(address => uint256[]) public customerPayments;
    mapping(address => uint256) public merchantEarnings;
    mapping(address => uint256) public affiliateEarnings;
    mapping(address => uint256) public escrowBalances;
    
    // Subscriptions
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) public merchantSubscriptions;
    mapping(address => uint256[]) public customerSubscriptions;
    
    // Affiliates
    mapping(uint256 => Affiliate) public affiliates;
    mapping(address => uint256) public walletToAffiliate;
    mapping(bytes32 => address) public codeToWallet;
    mapping(address => address) public customerToAffiliate;
    
    // Gamification
    mapping(address => uint256) public spinCredits;
    mapping(address => uint256) public loyaltyPoints;
    
    // Events
    event PaymentCreated(uint256 indexed paymentId, address indexed merchant, string sessionId, uint256 amount, PaymentType paymentType);
    event PaymentProcessed(uint256 indexed paymentId, address indexed customer, uint256 amount, uint256 platformFee);
    event PaymentExpired(uint256 indexed paymentId);
    event PaymentRefunded(uint256 indexed paymentId, uint256 amount);
    event EscrowReleased(uint256 indexed paymentId, address indexed merchant);
    event PaymentDisputed(uint256 indexed paymentId);
    
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed merchant, address indexed customer);
    event SubscriptionPayment(uint256 indexed subscriptionId, uint256 pyusdAmount, uint256 nextPayment);
    
    event AffiliateRegistered(uint256 indexed affiliateId, address indexed wallet, bytes32 referralCode);
    event ReferralRecorded(address indexed affiliate, address indexed customer, uint256 amount);
    
    event SpinCreditsAdded(address indexed user, uint256 credits);
    event NFTReceiptMinted(uint256 indexed paymentId, uint256 indexed tokenId, address indexed customer);
    
    constructor(
        address _pyusd,
        address _pyth,
        address _treasury,
        address _nftReceipt
    ) Ownable(msg.sender) { 
        pyusd = IERC20(_pyusd);
        pyth = IPyth(_pyth);
        treasury = _treasury;
        nftReceipt = INFTReceipt(_nftReceipt);
    }
    
    // ============ MAIN PAYMENT FUNCTIONS ============
    
    /**
     * @notice Create a regular payment (10min expiry, one-time use)
     */
    function createPayment(
        address merchant,
        uint256 amount,
        string memory sessionId,
        string memory description,
        bytes32 referralCode,
        SplitRecipient[] memory splits,
        bool isOneTime
    ) external returns (uint256 paymentId) {
        require(merchant != address(0), "Invalid merchant");
        require(amount > 0, "Amount must be > 0");
        require(bytes(sessionId).length > 0, "Session ID required");
        require(sessionToPayment[sessionId] == 0, "Session already exists");
        
        return _createPayment(
            merchant,
            amount,
            0, // No USD amount for regular payments
            sessionId,
            description,
            referralCode,
            splits,
            isOneTime,
            PaymentType.Regular,
            false, // No auto release
            0 // No price
        );
    }
    
    /**
     * @notice Create an escrow payment with USD pricing via Pyth
     */
    function createEscrowPayment(
        address merchant,
        address customer,
        uint256 usdAmount,
        string memory sessionId,
        string memory description,
        bool autoRelease,
        bytes[] calldata priceUpdateData
    ) external payable returns (uint256 paymentId) {
        require(merchant != address(0), "Invalid merchant");
        require(customer != address(0), "Invalid customer");
        require(usdAmount > 0, "Amount must be > 0");
        
        // Update price feeds
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee");
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        // Get current price and calculate PYUSD amount
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        require(price.price > 0, "Invalid price");
        
        uint256 pyusdAmount = (usdAmount * 1e8) / uint256(int256(price.price));
        
        SplitRecipient[] memory emptySplits;
        return _createPayment(
            merchant,
            pyusdAmount,
            usdAmount,
            sessionId,
            description,
            bytes32(0), // No referral for escrow
            emptySplits,
            true, // One time
            PaymentType.Escrow,
            autoRelease,
            price.price
        );
    }
    
    /**
     * @notice Internal function to create payments
     */
    function _createPayment(
        address merchant,
        uint256 amount,
        uint256 usdAmount,
        string memory sessionId,
        string memory description,
        bytes32 referralCode,
        SplitRecipient[] memory splits,
        bool isOneTime,
        PaymentType paymentType,
        bool autoRelease,
        int64 priceAtCreation
    ) internal returns (uint256 paymentId) {
        _paymentIds.increment();
        paymentId = _paymentIds.current();
        
        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
        uint256 netAmount = amount - platformFee;
        
        address affiliate = address(0);
        if (referralCode != bytes32(0)) {
            affiliate = codeToWallet[referralCode];
        }
        
        Payment storage payment = payments[paymentId];
        payment.id = paymentId;
        payment.merchant = merchant;
        payment.amount = amount;
        payment.usdAmount = usdAmount;
        payment.platformFee = platformFee;
        payment.netAmount = netAmount;
        payment.sessionId = sessionId;
        payment.description = description;
        payment.status = PaymentStatus.Created;
        payment.paymentType = paymentType;
        payment.createdAt = block.timestamp;
        payment.expiresAt = block.timestamp + PAYMENT_EXPIRY;
        payment.referralCode = referralCode;
        payment.affiliate = affiliate;
        payment.isOneTime = isOneTime;
        payment.autoRelease = autoRelease;
        payment.priceAtCreation = priceAtCreation;
        
        if (paymentType == PaymentType.Escrow) {
            payment.releaseTime = block.timestamp + ESCROW_PERIOD;
        }
        
        // Store splits
        for (uint256 i = 0; i < splits.length; i++) {
            payment.splits.push(splits[i]);
        }
        
        sessionToPayment[sessionId] = paymentId;
        merchantPayments[merchant].push(paymentId);
        
        emit PaymentCreated(paymentId, merchant, sessionId, amount, paymentType);
        
        return paymentId;
    }
    
    /**
     * @notice Process a payment
     */
    function processPayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        
        require(payment.id != 0, "Payment not found");
        require(payment.status == PaymentStatus.Created, "Payment not available");
        require(block.timestamp <= payment.expiresAt, "Payment expired");
        require(!payment.isOneTime || payment.customer == address(0), "One-time payment already used");
        
        payment.customer = msg.sender;
        payment.paidAt = block.timestamp;
        customerPayments[msg.sender].push(paymentId);
        
        // Transfer PYUSD from customer
        require(pyusd.transferFrom(msg.sender, address(this), payment.amount), "Transfer failed");
        
        if (payment.paymentType == PaymentType.Escrow) {
            payment.status = PaymentStatus.Escrowed;
            escrowBalances[payment.merchant] += payment.netAmount;
        } else {
            payment.status = PaymentStatus.Paid;
            _distributePayment(paymentId, payment);
        }
        
        // Handle affiliate rewards
        _processAffiliate(payment);
        
        // Add spin credits (1 credit per $1 paid)
        uint256 credits = payment.amount / 1e6;
        if (credits > 0) {
            spinCredits[msg.sender] += credits;
            loyaltyPoints[msg.sender] += credits;
            emit SpinCreditsAdded(msg.sender, credits);
        }
        
        // Mint NFT receipt
        _mintNFTReceipt(paymentId, payment);
        
        emit PaymentProcessed(paymentId, msg.sender, payment.amount, payment.platformFee);
    }
    
    /**
     * @notice Distribute payment to merchant/splits
     */
    function _distributePayment(uint256 paymentId, Payment storage payment) internal {
        // Platform fee to treasury (minus affiliate reward)
        uint256 affiliateReward = 0;
        if (payment.affiliate != address(0)) {
            affiliateReward = (payment.platformFee * AFFILIATE_REWARD_BPS) / MAX_FEE_BPS;
            affiliateEarnings[payment.affiliate] += affiliateReward;
        }
        
        uint256 treasuryFee = payment.platformFee - affiliateReward;
        if (treasuryFee > 0) {
            require(pyusd.transfer(treasury, treasuryFee), "Treasury transfer failed");
        }
        
        // Process splits or direct payment
        if (payment.splits.length > 0) {
            _processSplitPayment(paymentId, payment);
        } else {
            require(pyusd.transfer(payment.merchant, payment.netAmount), "Merchant transfer failed");
            merchantEarnings[payment.merchant] += payment.netAmount;
        }
    }
    

  /**
    * @notice Process split payments
    */
    function _processSplitPayment(uint256 paymentId, Payment storage payment) internal {
        // Explicitly mark as used to silence warning
        paymentId;

        uint256 remainingAmount = payment.netAmount;
        
        for (uint256 i = 0; i < payment.splits.length; i++) {
            uint256 splitAmount = (payment.netAmount * payment.splits[i].bps) / MAX_FEE_BPS;
            
            if (splitAmount > 0 && splitAmount <= remainingAmount) {
                require(pyusd.transfer(payment.splits[i].recipient, splitAmount), "Split transfer failed");
                remainingAmount -= splitAmount;
            }
        }
        
        // Send remaining to merchant
        if (remainingAmount > 0) {
            require(pyusd.transfer(payment.merchant, remainingAmount), "Merchant transfer failed");
            merchantEarnings[payment.merchant] += remainingAmount;
        }
    }

    
    /**
     * @notice Process affiliate rewards
     */
    function _processAffiliate(Payment storage payment) internal {
        if (payment.affiliate != address(0)) {
            uint256 affiliateId = walletToAffiliate[payment.affiliate];
            if (affiliateId != 0) {
                Affiliate storage aff = affiliates[affiliateId];
                aff.totalReferrals++;
                aff.totalVolume += payment.amount;
                
                // Set customer's affiliate (first referral wins)
                if (customerToAffiliate[payment.customer] == address(0)) {
                    customerToAffiliate[payment.customer] = payment.affiliate;
                }
                
                emit ReferralRecorded(payment.affiliate, payment.customer, payment.amount);
            }
        }
    }
    
    /**
     * @notice Mint NFT receipt for payment
     */
    function _mintNFTReceipt(uint256 paymentId, Payment storage payment) internal {
        if (address(nftReceipt) != address(0)) {
            try nftReceipt.mintReceipt(
                payment.customer,
                paymentId,
                payment.merchant,
                payment.amount,
                payment.description,
                payment.txHash,
                "PyLinks Merchant" // Default merchant name
            ) returns (uint256 tokenId) {
                emit NFTReceiptMinted(paymentId, tokenId, payment.customer);
            } catch {
                // NFT minting failed, continue without it
            }
        }
    }
    
    // ============ ESCROW FUNCTIONS ============
    
    /**
     * @notice Release escrowed payment to merchant
     */
    function releaseEscrowPayment(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.Escrowed, "Payment not escrowed");
        require(
            msg.sender == payment.customer || 
            (payment.autoRelease && block.timestamp >= payment.releaseTime),
            "Not authorized to release"
        );
        
        payment.status = PaymentStatus.Paid;
        escrowBalances[payment.merchant] -= payment.netAmount;
        
        _distributePayment(paymentId, payment);
        
        emit EscrowReleased(paymentId, payment.merchant);
    }
    
    /**
     * @notice Dispute an escrowed payment
     */
    function disputeEscrowPayment(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.Escrowed, "Payment not escrowed");
        require(msg.sender == payment.customer, "Only customer can dispute");
        
        payment.status = PaymentStatus.Disputed;
        emit PaymentDisputed(paymentId);
    }
    
    // ============ SUBSCRIPTION FUNCTIONS ============
    
    /**
     * @notice Create a subscription
     */
    function createSubscription(
        address merchant,
        uint256 usdAmount,
        uint256 interval,
        uint256 maxPayments,
        string memory description,
        bool autoRenew
    ) external returns (uint256 subscriptionId) {
        require(merchant != address(0), "Invalid merchant");
        require(usdAmount > 0, "Amount must be > 0");
        require(interval > 0, "Invalid interval");
        
        _subscriptionIds.increment();
        subscriptionId = _subscriptionIds.current();
        
        subscriptions[subscriptionId] = Subscription({
            id: subscriptionId,
            merchant: merchant,
            customer: msg.sender,
            usdAmount: usdAmount,
            interval: interval,
            nextPayment: block.timestamp + interval,
            totalPayments: 0,
            maxPayments: maxPayments,
            status: SubscriptionStatus.Active,
            description: description,
            autoRenew: autoRenew,
            createdAt: block.timestamp
        });
        
        merchantSubscriptions[merchant].push(subscriptionId);
        customerSubscriptions[msg.sender].push(subscriptionId);
        
        emit SubscriptionCreated(subscriptionId, merchant, msg.sender);
        
        return subscriptionId;
    }
    
    /**
     * @notice Process subscription payment
     */
    function processSubscriptionPayment(
        uint256 subscriptionId,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        require(sub.status == SubscriptionStatus.Active, "Subscription not active");
        require(block.timestamp >= sub.nextPayment, "Payment not due");
        require(sub.maxPayments == 0 || sub.totalPayments < sub.maxPayments, "Subscription completed");
        
        // Update price feeds
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee");
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        // Get current price and calculate PYUSD amount
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        require(price.price > 0, "Invalid price");
        
        uint256 pyusdAmount = (sub.usdAmount * 1e8) / uint256(int256(price.price));
        
        // Calculate fees
        uint256 platformFee = (pyusdAmount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
        uint256 merchantAmount = pyusdAmount - platformFee;
        
        // Transfer PYUSD from customer
        require(pyusd.transferFrom(sub.customer, address(this), pyusdAmount), "Transfer failed");
        
        // Distribute payments
        if (platformFee > 0) {
            require(pyusd.transfer(treasury, platformFee), "Fee transfer failed");
        }
        require(pyusd.transfer(sub.merchant, merchantAmount), "Merchant transfer failed");
        
        // Update subscription
        sub.totalPayments++;
        sub.nextPayment = block.timestamp + sub.interval;
        
        if (sub.maxPayments > 0 && sub.totalPayments >= sub.maxPayments) {
            sub.status = SubscriptionStatus.Expired;
        }
        
        merchantEarnings[sub.merchant] += merchantAmount;
        
        emit SubscriptionPayment(subscriptionId, pyusdAmount, sub.nextPayment);
    }
    
    // ============ AFFILIATE FUNCTIONS ============
    
    /**
     * @notice Register as an affiliate
     */
    function registerAffiliate(
        string memory name,
        string memory preferredCode
    ) external returns (uint256 affiliateId) {
        require(walletToAffiliate[msg.sender] == 0, "Already registered");
        require(bytes(name).length > 0, "Name required");
        
        bytes32 referralCode = keccak256(abi.encodePacked(preferredCode, msg.sender));
        require(codeToWallet[referralCode] == address(0), "Code already exists");
        
        _affiliateIds.increment();
        affiliateId = _affiliateIds.current();
        
        affiliates[affiliateId] = Affiliate({
            id: affiliateId,
            wallet: msg.sender,
            name: name,
            referralCode: referralCode,
            totalReferrals: 0,
            totalVolume: 0,
            totalEarnings: 0,
            tier: 1, // Bronze
            isActive: true,
            createdAt: block.timestamp
        });
        
        walletToAffiliate[msg.sender] = affiliateId;
        codeToWallet[referralCode] = msg.sender;
        
        emit AffiliateRegistered(affiliateId, msg.sender, referralCode);
        
        return affiliateId;
    }
    
    /**
     * @notice Withdraw affiliate earnings
     */
    function withdrawAffiliateEarnings() external nonReentrant {
        uint256 earnings = affiliateEarnings[msg.sender];
        require(earnings > 0, "No earnings to withdraw");
        
        affiliateEarnings[msg.sender] = 0;
        require(pyusd.transfer(msg.sender, earnings), "Transfer failed");
    }
    
    // ============ VIEW FUNCTIONS ============
    
    function getPayment(uint256 paymentId) external view returns (
        address merchant,
        address customer,
        uint256 amount,
        string memory sessionId,
        PaymentStatus status,
        PaymentType paymentType,
        uint256 createdAt,
        uint256 expiresAt
    ) {
        Payment storage payment = payments[paymentId];
        return (
            payment.merchant,
            payment.customer,
            payment.amount,
            payment.sessionId,
            payment.status,
            payment.paymentType,
            payment.createdAt,
            payment.expiresAt
        );
    }
    
    function getSubscription(uint256 subscriptionId) external view returns (
        address merchant,
        address customer,
        uint256 usdAmount,
        uint256 interval,
        uint256 nextPayment,
        SubscriptionStatus status
    ) {
        Subscription storage sub = subscriptions[subscriptionId];
        return (
            sub.merchant,
            sub.customer,
            sub.usdAmount,
            sub.interval,
            sub.nextPayment,
            sub.status
        );
    }
    
    function getAffiliate(address wallet) external view returns (
        uint256 id,
        string memory name,
        bytes32 referralCode,
        uint256 totalReferrals,
        uint256 totalVolume,
        uint256 tier
    ) {
        uint256 affiliateId = walletToAffiliate[wallet];
        if (affiliateId == 0) return (0, "", bytes32(0), 0, 0, 0);
        
        Affiliate storage aff = affiliates[affiliateId];
        return (
            aff.id,
            aff.name,
            aff.referralCode,
            aff.totalReferrals,
            aff.totalVolume,
            aff.tier
        );
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
    }
    
    function updateNFTReceipt(address newNFTReceipt) external onlyOwner {
        nftReceipt = INFTReceipt(newNFTReceipt);
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = pyusd.balanceOf(address(this));
        require(pyusd.transfer(owner(), balance), "Transfer failed");
    }
}
