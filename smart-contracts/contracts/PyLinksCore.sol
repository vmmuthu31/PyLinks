// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "./PaymentLib.sol";

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
 * @notice Unified payment processing contract with bulk payment features
 * @dev Includes regular, escrow, subscription, and bulk payment processing
 */
contract PyLinksCore is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    using PaymentLib for *;
    
    // Custom Errors (saves significant bytecode)
    error InvalidMerchant();
    error InvalidAmount();
    error InvalidCount();
    error LengthMismatch();
    error TransferFailed();
    error PaymentNotFound();
    error PaymentNotAvailable();
    error PaymentExpired();
    error InvalidSession();
    error SessionExists();
    error InvalidCustomer();
    error InsufficientFee();
    error InvalidPrice();
    error OneTimeUsed();
    error NotEscrowed();
    error NotAuthorized();
    error NotActive();
    error PaymentNotDue();
    error SubscriptionCompleted();
    error AlreadyRegistered();
    error NameRequired();
    error CodeExists();
    error NoEarnings();
    error InvalidTreasury();
    error InvalidInterval();
    error BatchNotFound();
    error BatchProcessed();
    
    // Core contracts
    IERC20 public immutable pyusd;
    IPyth public immutable pyth;
    INFTReceipt public nftReceipt;
    
    // Counters
    Counters.Counter private _paymentIds;
    Counters.Counter private _subscriptionIds;
    Counters.Counter private _affiliateIds;
    Counters.Counter private _bulkBatchIds;
    
    // Constants
    bytes32 public constant PYUSD_USD_PRICE_ID = 0xc1da1b73d7f01e7ddd54b3766cf7fcd644395ad14f70aa706ec5384c59e76692;
    uint256 public constant PLATFORM_FEE_BPS = 10;
    uint256 public constant MAX_FEE_BPS = 10000;
    uint256 public constant PAYMENT_EXPIRY = 10 minutes;
    uint256 public constant AFFILIATE_REWARD_BPS = 2000;
    uint256 public constant ESCROW_PERIOD = 7 days;
    uint256 public constant MAX_BULK_PAYMENTS = 100;
    
    address public treasury;
    
    // Enums
    enum PaymentStatus { Created, Paid, Expired, Refunded, Cancelled, Escrowed, Disputed }
    enum PaymentType { Regular, Escrow, Subscription, Bulk }
    enum SubscriptionStatus { Active, Paused, Cancelled, Expired }
    
    // Structs
    struct SplitRecipient {
        address recipient;
        uint256 bps;
    }
    
    struct MerchantTotal {
        address merchant;
        uint256 amount;
    }
    
    struct Payment {
        uint256 id;
        address merchant;
        address customer;
        uint256 amount;
        uint256 usdAmount;
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
        uint256 releaseTime;
        bool autoRelease;
        int64 priceAtCreation;
        uint256 bulkBatchId;
    }
    
    struct Subscription {
        uint256 id;
        address merchant;
        address customer;
        uint256 usdAmount;
        uint256 interval;
        uint256 nextPayment;
        uint256 totalPayments;
        uint256 maxPayments;
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
        uint256 tier;
        bool isActive;
        uint256 createdAt;
    }
    
    struct BulkPaymentRequest {
        address merchant;
        uint256 amount;
        string description;
    }
    
    struct BulkBatch {
        uint256 id;
        address customer;
        uint256 totalAmount;
        uint256 totalFees;
        uint256[] paymentIds;
        uint256 createdAt;
        bool processed;
    }
    
    // Storage
    mapping(uint256 => Payment) public payments;
    mapping(string => uint256) public sessionToPayment;
    mapping(address => uint256[]) public merchantPayments;
    mapping(address => uint256[]) public customerPayments;
    mapping(address => uint256) public merchantEarnings;
    mapping(address => uint256) public affiliateEarnings;
    mapping(address => uint256) public escrowBalances;
    
    mapping(uint256 => Subscription) public subscriptions;
    mapping(address => uint256[]) public merchantSubscriptions;
    mapping(address => uint256[]) public customerSubscriptions;
    
    mapping(uint256 => Affiliate) public affiliates;
    mapping(address => uint256) public walletToAffiliate;
    mapping(bytes32 => address) public codeToWallet;
    mapping(address => address) public customerToAffiliate;
    
    mapping(uint256 => BulkBatch) public bulkBatches;
    mapping(address => uint256[]) public customerBulkBatches;
    
    mapping(address => uint256) public spinCredits;
    mapping(address => uint256) public loyaltyPoints;
    
    // Events
    event PaymentCreated(uint256 indexed paymentId, address indexed merchant, string sessionId, uint256 amount, PaymentType paymentType);
    event PaymentProcessed(uint256 indexed paymentId, address indexed customer, uint256 amount, uint256 platformFee);
    event PaymentExpiredEvent(uint256 indexed paymentId);
    event PaymentRefunded(uint256 indexed paymentId, uint256 amount);
    event EscrowReleased(uint256 indexed paymentId, address indexed merchant);
    event PaymentDisputed(uint256 indexed paymentId);
    
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed merchant, address indexed customer);
    event SubscriptionPayment(uint256 indexed subscriptionId, uint256 pyusdAmount, uint256 nextPayment);
    
    event AffiliateRegistered(uint256 indexed affiliateId, address indexed wallet, bytes32 referralCode);
    event ReferralRecorded(address indexed affiliate, address indexed customer, uint256 amount);
    
    event SpinCreditsAdded(address indexed user, uint256 credits);
    event NFTReceiptMinted(uint256 indexed paymentId, uint256 indexed tokenId, address indexed customer);
    
    event BulkBatchCreated(uint256 indexed batchId, address indexed customer, uint256 paymentCount, uint256 totalAmount);
    event BulkBatchProcessed(uint256 indexed batchId, uint256 successCount, uint256 failureCount);
    event BulkPaymentFailed(uint256 indexed batchId, uint256 indexed paymentId, string reason);
    
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
    
    // ============ BULK PAYMENT FUNCTIONS ============
    
    function bulkPaySingleMerchant(
        address merchant,
        uint256[] calldata amounts,
        string[] calldata descriptions
    ) external nonReentrant returns (uint256 batchId, uint256[] memory paymentIds) {
        if (merchant == address(0)) revert InvalidMerchant();
        if (amounts.length == 0 || amounts.length > MAX_BULK_PAYMENTS) revert InvalidCount();
        if (amounts.length != descriptions.length) revert LengthMismatch();
        
        uint256 totalAmount = 0;
        uint256 totalFees = 0;
        
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert InvalidAmount();
            totalAmount += amounts[i];
            totalFees += (amounts[i] * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
        }
        
        if (!pyusd.transferFrom(msg.sender, address(this), totalAmount)) revert TransferFailed();
        
        _bulkBatchIds.increment();
        batchId = _bulkBatchIds.current();
        
        paymentIds = new uint256[](amounts.length);
        
        for (uint256 i = 0; i < amounts.length; i++) {
            _paymentIds.increment();
            uint256 paymentId = _paymentIds.current();
            paymentIds[i] = paymentId;
            
            uint256 platformFee = (amounts[i] * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
            uint256 netAmount = amounts[i] - platformFee;
            
            string memory sessionId = string(abi.encodePacked("bulk-", batchId, "-", i));
            
            Payment storage payment = payments[paymentId];
            payment.id = paymentId;
            payment.merchant = merchant;
            payment.customer = msg.sender;
            payment.amount = amounts[i];
            payment.platformFee = platformFee;
            payment.netAmount = netAmount;
            payment.sessionId = sessionId;
            payment.description = descriptions[i];
            payment.status = PaymentStatus.Paid;
            payment.paymentType = PaymentType.Bulk;
            payment.createdAt = block.timestamp;
            payment.paidAt = block.timestamp;
            payment.expiresAt = block.timestamp + PAYMENT_EXPIRY;
            payment.bulkBatchId = batchId;
            payment.isOneTime = true;
            
            sessionToPayment[sessionId] = paymentId;
            merchantPayments[merchant].push(paymentId);
            customerPayments[msg.sender].push(paymentId);
            
            emit PaymentCreated(paymentId, merchant, sessionId, amounts[i], PaymentType.Bulk);
            emit PaymentProcessed(paymentId, msg.sender, amounts[i], platformFee);
        }
        
        bulkBatches[batchId] = BulkBatch({
            id: batchId,
            customer: msg.sender,
            totalAmount: totalAmount,
            totalFees: totalFees,
            paymentIds: paymentIds,
            createdAt: block.timestamp,
            processed: true
        });
        
        customerBulkBatches[msg.sender].push(batchId);
        
        uint256 merchantTotal = totalAmount - totalFees;
        if (!pyusd.transfer(merchant, merchantTotal)) revert TransferFailed();
        merchantEarnings[merchant] += merchantTotal;
        
        if (totalFees > 0) {
            if (!pyusd.transfer(treasury, totalFees)) revert TransferFailed();
        }
        
        uint256 credits = totalAmount / 1e6;
        if (credits > 0) {
            spinCredits[msg.sender] += credits;
            loyaltyPoints[msg.sender] += credits;
            emit SpinCreditsAdded(msg.sender, credits);
        }
        
        emit BulkBatchCreated(batchId, msg.sender, amounts.length, totalAmount);
        emit BulkBatchProcessed(batchId, amounts.length, 0);
        
        return (batchId, paymentIds);
    }
    
    function bulkPayMultipleMerchants(
        BulkPaymentRequest[] calldata requests
    ) external nonReentrant returns (uint256 batchId, uint256[] memory paymentIds) {
        if (requests.length == 0 || requests.length > MAX_BULK_PAYMENTS) revert InvalidCount();
        
        uint256 totalAmount = 0;
        uint256 totalFees = 0;

        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].merchant == address(0)) revert InvalidMerchant();
            if (requests[i].amount == 0) revert InvalidAmount();

            totalAmount += requests[i].amount;
            totalFees += (requests[i].amount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
        }

        if (!pyusd.transferFrom(msg.sender, address(this), totalAmount)) revert TransferFailed();

        _bulkBatchIds.increment();
        batchId = _bulkBatchIds.current();

        paymentIds = new uint256[](requests.length);
        MerchantTotal[] memory merchantTotals = new MerchantTotal[](requests.length);
        uint256 merchantCount = 0;

        for (uint256 i = 0; i < requests.length; i++) {
            _paymentIds.increment();
            uint256 paymentId = _paymentIds.current();
            paymentIds[i] = paymentId;

            uint256 platformFee = (requests[i].amount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
            uint256 netAmount = requests[i].amount - platformFee;

            string memory sessionId = string(abi.encodePacked("bulk-multi-", batchId, "-", i));

            Payment storage payment = payments[paymentId];
            payment.id = paymentId;
            payment.merchant = requests[i].merchant;
            payment.customer = msg.sender;
            payment.amount = requests[i].amount;
            payment.platformFee = platformFee;
            payment.netAmount = netAmount;
            payment.sessionId = sessionId;
            payment.description = requests[i].description;
            payment.status = PaymentStatus.Paid;
            payment.paymentType = PaymentType.Bulk;
            payment.createdAt = block.timestamp;
            payment.paidAt = block.timestamp;
            payment.expiresAt = block.timestamp + PAYMENT_EXPIRY;
            payment.bulkBatchId = batchId;
            payment.isOneTime = true;

            sessionToPayment[sessionId] = paymentId;
            merchantPayments[requests[i].merchant].push(paymentId);
            customerPayments[msg.sender].push(paymentId);

            bool found = false;
            for (uint256 j = 0; j < merchantCount; j++) {
                if (merchantTotals[j].merchant == requests[i].merchant) {
                    merchantTotals[j].amount += netAmount;
                    found = true;
                    break;
                }
            }

            if (!found) {
                merchantTotals[merchantCount] = MerchantTotal({
                    merchant: requests[i].merchant,
                    amount: netAmount
                });
                merchantCount++;
            }

            emit PaymentCreated(paymentId, requests[i].merchant, sessionId, requests[i].amount, PaymentType.Bulk);
            emit PaymentProcessed(paymentId, msg.sender, requests[i].amount, platformFee);
        }

        for (uint256 i = 0; i < merchantCount; i++) {
            if (merchantTotals[i].amount > 0) {
                if (!pyusd.transfer(merchantTotals[i].merchant, merchantTotals[i].amount)) revert TransferFailed();
                merchantEarnings[merchantTotals[i].merchant] += merchantTotals[i].amount;
            }
        }

        if (totalFees > 0) {
            if (!pyusd.transfer(treasury, totalFees)) revert TransferFailed();
        }

        uint256 credits = totalAmount / 1e6;
        if (credits > 0) {
            spinCredits[msg.sender] += credits;
            loyaltyPoints[msg.sender] += credits;
            emit SpinCreditsAdded(msg.sender, credits);
        }

        bulkBatches[batchId] = BulkBatch({
            id: batchId,
            customer: msg.sender,
            totalAmount: totalAmount,
            totalFees: totalFees,
            paymentIds: paymentIds,
            createdAt: block.timestamp,
            processed: true
        });

        customerBulkBatches[msg.sender].push(batchId);

        emit BulkBatchCreated(batchId, msg.sender, requests.length, totalAmount);
        emit BulkBatchProcessed(batchId, requests.length, 0);

        return (batchId, paymentIds);
    }
    
    function bulkCreateEscrowPayments(
        address[] calldata merchants,
        address[] calldata customers,
        uint256[] calldata usdAmounts,
        string[] calldata descriptions,
        bool autoRelease,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant returns (uint256 batchId, uint256[] memory paymentIds) {
        if (merchants.length == 0 || merchants.length > MAX_BULK_PAYMENTS) revert InvalidCount();
        if (
            merchants.length != customers.length ||
            merchants.length != usdAmounts.length ||
            merchants.length != descriptions.length
        ) revert LengthMismatch();
        
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        if (msg.value < updateFee) revert InsufficientFee();
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        if (price.price <= 0) revert InvalidPrice();
        
        _bulkBatchIds.increment();
        batchId = _bulkBatchIds.current();
        
        paymentIds = new uint256[](merchants.length);
        uint256 totalAmount = 0;
        uint256 totalFees = 0;
        
        for (uint256 i = 0; i < merchants.length; i++) {
            if (merchants[i] == address(0)) revert InvalidMerchant();
            if (customers[i] == address(0)) revert InvalidCustomer();
            if (usdAmounts[i] == 0) revert InvalidAmount();
            
            uint256 pyusdAmount = (usdAmounts[i] * 1e8) / uint256(int256(price.price));
            uint256 platformFee = (pyusdAmount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
            uint256 netAmount = pyusdAmount - platformFee;
            
            _paymentIds.increment();
            uint256 paymentId = _paymentIds.current();
            paymentIds[i] = paymentId;
            
            string memory sessionId = string(abi.encodePacked("bulk-escrow-", batchId, "-", i));
            
            Payment storage payment = payments[paymentId];
            payment.id = paymentId;
            payment.merchant = merchants[i];
            payment.customer = customers[i];
            payment.amount = pyusdAmount;
            payment.usdAmount = usdAmounts[i];
            payment.platformFee = platformFee;
            payment.netAmount = netAmount;
            payment.sessionId = sessionId;
            payment.description = descriptions[i];
            payment.status = PaymentStatus.Created;
            payment.paymentType = PaymentType.Escrow;
            payment.createdAt = block.timestamp;
            payment.expiresAt = block.timestamp + PAYMENT_EXPIRY;
            payment.releaseTime = block.timestamp + ESCROW_PERIOD;
            payment.autoRelease = autoRelease;
            payment.priceAtCreation = price.price;
            payment.bulkBatchId = batchId;
            payment.isOneTime = true;
            
            sessionToPayment[sessionId] = paymentId;
            merchantPayments[merchants[i]].push(paymentId);
            
            totalAmount += pyusdAmount;
            totalFees += platformFee;
            
            emit PaymentCreated(paymentId, merchants[i], sessionId, pyusdAmount, PaymentType.Escrow);
        }
        
        bulkBatches[batchId] = BulkBatch({
            id: batchId,
            customer: msg.sender,
            totalAmount: totalAmount,
            totalFees: totalFees,
            paymentIds: paymentIds,
            createdAt: block.timestamp,
            processed: false
        });
        
        customerBulkBatches[msg.sender].push(batchId);
        
        emit BulkBatchCreated(batchId, msg.sender, merchants.length, totalAmount);
        
        return (batchId, paymentIds);
    }
    
    function processBulkEscrowBatch(uint256 batchId) external nonReentrant {
        BulkBatch storage batch = bulkBatches[batchId];
        if (batch.id == 0) revert BatchNotFound();
        if (batch.processed) revert BatchProcessed();
        
        uint256 successCount = 0;
        uint256 failureCount = 0;
        
        for (uint256 i = 0; i < batch.paymentIds.length; i++) {
            uint256 paymentId = batch.paymentIds[i];
            Payment storage payment = payments[paymentId];
            
            if (payment.status != PaymentStatus.Created) {
                continue;
            }
            
            if (block.timestamp > payment.expiresAt) {
                payment.status = PaymentStatus.Expired;
                failureCount++;
                emit BulkPaymentFailed(batchId, paymentId, "Expired");
                continue;
            }
            
            try pyusd.transferFrom(payment.customer, address(this), payment.amount) returns (bool success) {
                if (success) {
                    payment.status = PaymentStatus.Escrowed;
                    payment.paidAt = block.timestamp;
                    escrowBalances[payment.merchant] += payment.netAmount;
                    customerPayments[payment.customer].push(paymentId);
                    
                    successCount++;
                    emit PaymentProcessed(paymentId, payment.customer, payment.amount, payment.platformFee);
                } else {
                    failureCount++;
                    emit BulkPaymentFailed(batchId, paymentId, "Failed");
                }
            } catch {
                failureCount++;
                emit BulkPaymentFailed(batchId, paymentId, "Failed");
            }
        }
        
        batch.processed = true;
        emit BulkBatchProcessed(batchId, successCount, failureCount);
    }
    
    function getBulkBatch(uint256 batchId) external view returns (
        address customer,
        uint256 totalAmount,
        uint256 totalFees,
        uint256 paymentCount,
        bool processed
    ) {
        BulkBatch storage batch = bulkBatches[batchId];
        return (
            batch.customer,
            batch.totalAmount,
            batch.totalFees,
            batch.paymentIds.length,
            batch.processed
        );
    }
    
    function getBulkBatchPayments(uint256 batchId) external view returns (uint256[] memory) {
        return bulkBatches[batchId].paymentIds;
    }
    
    function createPayment(
        address merchant,
        uint256 amount,
        string memory sessionId,
        string memory description,
        bytes32 referralCode,
        SplitRecipient[] memory splits,
        bool isOneTime
    ) external returns (uint256 paymentId) {
        if (merchant == address(0)) revert InvalidMerchant();
        if (amount == 0) revert InvalidAmount();
        if (bytes(sessionId).length == 0) revert InvalidSession();
        if (sessionToPayment[sessionId] != 0) revert SessionExists();
        
        return _createPayment(
            merchant,
            amount,
            0,
            sessionId,
            description,
            referralCode,
            splits,
            isOneTime,
            PaymentType.Regular,
            false,
            0
        );
    }
    
    function createEscrowPayment(
        address merchant,
        address customer,
        uint256 usdAmount,
        string memory sessionId,
        string memory description,
        bool autoRelease,
        bytes[] calldata priceUpdateData
    ) external payable returns (uint256 paymentId) {
        if (merchant == address(0)) revert InvalidMerchant();
        if (customer == address(0)) revert InvalidCustomer();
        if (usdAmount == 0) revert InvalidAmount();
        
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        if (msg.value < updateFee) revert InsufficientFee();
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        if (price.price <= 0) revert InvalidPrice();
        
        uint256 pyusdAmount = (usdAmount * 1e8) / uint256(int256(price.price));
        
        SplitRecipient[] memory emptySplits;
        return _createPayment(
            merchant,
            pyusdAmount,
            usdAmount,
            sessionId,
            description,
            bytes32(0),
            emptySplits,
            true,
            PaymentType.Escrow,
            autoRelease,
            price.price
        );
    }
    
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
        
        for (uint256 i = 0; i < splits.length; i++) {
            payment.splits.push(splits[i]);
        }
        
        sessionToPayment[sessionId] = paymentId;
        merchantPayments[merchant].push(paymentId);
        
        emit PaymentCreated(paymentId, merchant, sessionId, amount, paymentType);
        
        return paymentId;
    }
    
    function processPayment(uint256 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];
        
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.status != PaymentStatus.Created) revert PaymentNotAvailable();
        if (block.timestamp > payment.expiresAt) revert PaymentExpired();
        if (payment.isOneTime && payment.customer != address(0)) revert OneTimeUsed();
        
        payment.customer = msg.sender;
        payment.paidAt = block.timestamp;
        customerPayments[msg.sender].push(paymentId);
        
        if (!pyusd.transferFrom(msg.sender, address(this), payment.amount)) revert TransferFailed();
        
        if (payment.paymentType == PaymentType.Escrow) {
            payment.status = PaymentStatus.Escrowed;
            escrowBalances[payment.merchant] += payment.netAmount;
        } else {
            payment.status = PaymentStatus.Paid;
            _distributePayment(payment);
        }
        
        _processAffiliate(payment);
        
        uint256 credits = payment.amount / 1e6;
        if (credits > 0) {
            spinCredits[msg.sender] += credits;
            loyaltyPoints[msg.sender] += credits;
            emit SpinCreditsAdded(msg.sender, credits);
        }
        
        _mintNFTReceipt(paymentId, payment);
        
        emit PaymentProcessed(paymentId, msg.sender, payment.amount, payment.platformFee);
    }
    
    function _distributePayment(Payment storage payment) internal {
        // Convert splits to PaymentLib format
        PaymentLib.SplitRecipient[] memory libSplits = new PaymentLib.SplitRecipient[](payment.splits.length);
        for (uint256 i = 0; i < payment.splits.length; i++) {
            libSplits[i] = PaymentLib.SplitRecipient({
                recipient: payment.splits[i].recipient,
                bps: payment.splits[i].bps
            });
        }

        // Distribute funds using PaymentLib
        PaymentLib.distributePayment(
            pyusd,
            treasury,
            payment.affiliate,
            payment.merchant,
            payment.netAmount,
            payment.platformFee,
            AFFILIATE_REWARD_BPS,
            MAX_FEE_BPS,
            libSplits,
            merchantEarnings,
            affiliateEarnings
        );

        // Update merchant earnings (already handled in PaymentLib, but just in case)
        merchantEarnings[payment.merchant] += payment.netAmount;
    }
    
    function _processAffiliate(Payment storage payment) internal {
        if (payment.affiliate != address(0)) {
            uint256 affiliateId = walletToAffiliate[payment.affiliate];
            if (affiliateId != 0) {
                Affiliate storage aff = affiliates[affiliateId];
                aff.totalReferrals++;
                aff.totalVolume += payment.amount;
                
                if (customerToAffiliate[payment.customer] == address(0)) {
                    customerToAffiliate[payment.customer] = payment.affiliate;
                }
                
                emit ReferralRecorded(payment.affiliate, payment.customer, payment.amount);
            }
        }
    }
    
    function _mintNFTReceipt(uint256 paymentId, Payment storage payment) internal {
        if (address(nftReceipt) != address(0)) {
            try nftReceipt.mintReceipt(
                payment.customer,
                paymentId,
                payment.merchant,
                payment.amount,
                payment.description,
                payment.txHash,
                "PyLinks Merchant"
            ) returns (uint256 tokenId) {
                emit NFTReceiptMinted(paymentId, tokenId, payment.customer);
            } catch {}
        }
    }
    
    function releaseEscrowPayment(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        
        if (payment.status != PaymentStatus.Escrowed) revert NotEscrowed();
        if (
            msg.sender != payment.customer && 
            !(payment.autoRelease && block.timestamp >= payment.releaseTime)
        ) revert NotAuthorized();
        
        payment.status = PaymentStatus.Paid;
        escrowBalances[payment.merchant] -= payment.netAmount;
        
        _distributePayment(payment);
        
        emit EscrowReleased(paymentId, payment.merchant);
    }
    
    function disputeEscrowPayment(uint256 paymentId) external {
        Payment storage payment = payments[paymentId];
        
        if (payment.status != PaymentStatus.Escrowed) revert NotEscrowed();
        if (msg.sender != payment.customer) revert NotAuthorized();
        
        payment.status = PaymentStatus.Disputed;
        emit PaymentDisputed(paymentId);
    }
    
    function createSubscription(
        address merchant,
        uint256 usdAmount,
        uint256 interval,
        uint256 maxPayments,
        string memory description,
        bool autoRenew
    ) external returns (uint256 subscriptionId) {
        if (merchant == address(0)) revert InvalidMerchant();
        if (usdAmount == 0) revert InvalidAmount();
        if (interval == 0) revert InvalidInterval();
        
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
    
    function processSubscriptionPayment(
        uint256 subscriptionId,
        bytes[] calldata priceUpdateData
    ) external payable nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        
        if (sub.status != SubscriptionStatus.Active) revert NotActive();
        if (block.timestamp < sub.nextPayment) revert PaymentNotDue();
        if (sub.maxPayments > 0 && sub.totalPayments >= sub.maxPayments) revert SubscriptionCompleted();
        
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        if (msg.value < updateFee) revert InsufficientFee();
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        if (price.price <= 0) revert InvalidPrice();
        
        uint256 pyusdAmount = (sub.usdAmount * 1e8) / uint256(int256(price.price));
        uint256 platformFee = (pyusdAmount * PLATFORM_FEE_BPS) / MAX_FEE_BPS;
        uint256 merchantAmount = pyusdAmount - platformFee;
        
        if (!pyusd.transferFrom(sub.customer, address(this), pyusdAmount)) revert TransferFailed();
        
        if (platformFee > 0) {
            if (!pyusd.transfer(treasury, platformFee)) revert TransferFailed();
        }
        
        if (!pyusd.transfer(sub.merchant, merchantAmount)) revert TransferFailed();
        
        sub.totalPayments++;
        sub.nextPayment = block.timestamp + sub.interval;
        
        if (sub.maxPayments > 0 && sub.totalPayments >= sub.maxPayments) {
            sub.status = SubscriptionStatus.Expired;
        }
        
        merchantEarnings[sub.merchant] += merchantAmount;
        
        emit SubscriptionPayment(subscriptionId, pyusdAmount, sub.nextPayment);
    }
    
    function registerAffiliate(
        string memory name,
        string memory preferredCode
    ) external returns (uint256 affiliateId) {
        if (walletToAffiliate[msg.sender] != 0) revert AlreadyRegistered();
        if (bytes(name).length == 0) revert NameRequired();
        
        bytes32 referralCode = keccak256(abi.encodePacked(preferredCode, msg.sender));
        if (codeToWallet[referralCode] != address(0)) revert CodeExists();
        
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
            tier: 1,
            isActive: true,
            createdAt: block.timestamp
        });
        
        walletToAffiliate[msg.sender] = affiliateId;
        codeToWallet[referralCode] = msg.sender;
        
        emit AffiliateRegistered(affiliateId, msg.sender, referralCode);
        
        return affiliateId;
    }
    
    function withdrawAffiliateEarnings() external nonReentrant {
        uint256 earnings = affiliateEarnings[msg.sender];
        if (earnings == 0) revert NoEarnings();
        
        affiliateEarnings[msg.sender] = 0;
        if (!pyusd.transfer(msg.sender, earnings)) revert TransferFailed();
    }
    
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
    
    function updateTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert InvalidTreasury();
        treasury = newTreasury;
    }
    
    function updateNFTReceipt(address newNFTReceipt) external onlyOwner {
        nftReceipt = INFTReceipt(newNFTReceipt);
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = pyusd.balanceOf(address(this));
        if (!pyusd.transfer(owner(), balance)) revert TransferFailed();
    }
}
