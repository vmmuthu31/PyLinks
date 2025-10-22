// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

interface IPYUSD {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PaymentEscrow
 * @notice Escrow payment processing with dynamic PYUSD pricing using Pyth Network oracles
 * @dev Integrates Pyth price feeds for USD-denominated payments with buyer protection and dispute resolution
 */
contract PaymentEscrow {
    IPyth public immutable pyth;
    IPYUSD public immutable pyusd;
    
    bytes32 public constant PYUSD_USD_PRICE_ID = 0x8b820e7f3c3dc16bf617c6929945a48d3b6ea9e8b9e6fc2e1e1f3f3b3e3c3e3d;
    
    // Escrow periods
    uint256 public constant ESCROW_PERIOD = 7 days;
    uint256 public constant DISPUTE_PERIOD = 14 days;
    
    enum PaymentStatus { Pending, Completed, Disputed, Refunded, Cancelled }
    
    struct PaymentRequest {
        address merchant;
        address customer;
        uint256 usdAmount; // Amount in USD (8 decimals)
        uint256 pyusdAmount; // Calculated PYUSD amount (6 decimals)
        string sessionId; // Backend session identifier
        uint256 timestamp;
        PaymentStatus status;
        bool useEscrow; // Whether this payment uses escrow
        uint256 releaseTime; // Time when escrow auto-releases
        bool autoRelease; // Whether to auto-release after escrow period
        bytes32 priceUpdateId;
        int64 priceAtCreation; // Price when payment was created
    }
    
    mapping(bytes32 => PaymentRequest) public payments;
    mapping(address => bytes32[]) public merchantPayments;
    mapping(address => uint256) public merchantBalances; // Escrow balances
    
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed customer,
        uint256 usdAmount,
        uint256 pyusdAmount,
        string sessionId,
        int64 price,
        bool useEscrow
    );
    
    event PaymentProcessed(
        bytes32 indexed paymentId,
        uint256 pyusdAmount,
        int64 finalPrice
    );
    
    event PaymentReleased(bytes32 indexed paymentId, address indexed merchant);
    event PaymentRefunded(bytes32 indexed paymentId, address indexed customer);
    event PaymentDisputed(bytes32 indexed paymentId);
    event PaymentCancelled(bytes32 indexed paymentId, address indexed by);
    
    event PriceUpdated(int64 price, uint64 timestamp);
    
    constructor(address _pyth, address _pyusd) {
        pyth = IPyth(_pyth);
        pyusd = IPYUSD(_pyusd);
    }
    
    /**
     * @notice Create a new payment request with dynamic PYUSD pricing
     * @param _merchant Merchant receiving the payment
     * @param _customer Customer making the payment
     * @param _usdAmount Payment amount in USD (8 decimals)
     * @param _sessionId Backend session identifier for tracking
     * @param _useEscrow Whether to use escrow protection
     * @param _autoRelease Whether to auto-release escrow after 7 days
     * @param priceUpdateData Price update data from Pyth Hermes API
     * @return paymentId Unique identifier for the payment
     */
    function createPayment(
        address _merchant,
        address _customer,
        uint256 _usdAmount,
        string memory _sessionId,
        bool _useEscrow,
        bool _autoRelease,
        bytes[] calldata priceUpdateData
    ) external payable returns (bytes32 paymentId) {
        require(_merchant != address(0), "Invalid merchant address");
        require(_customer != address(0), "Invalid customer address");
        require(_usdAmount > 0, "Amount must be greater than 0");
        require(bytes(_sessionId).length > 0, "Session ID required");
        
        // Update price feeds with fresh data from Hermes
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee for price update");
        
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        // Get current PYUSD/USD price
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        require(price.price > 0, "Invalid price");
        
        // Calculate PYUSD amount (convert from 8 decimals USD to 6 decimals PYUSD)
        // Formula: pyusdAmount = (usdAmount * 10^8) / price
        uint256 pyusdAmount = (_usdAmount * 1e8) / uint256(int256(price.price));
        
        // Generate payment ID
        paymentId = keccak256(abi.encodePacked(_merchant, _customer, _usdAmount, _sessionId, block.timestamp));
        
        require(payments[paymentId].merchant == address(0), "Payment already exists");
        
        // If using escrow, transfer PYUSD to contract
        if (_useEscrow) {
            require(
                pyusd.transferFrom(_customer, address(this), pyusdAmount),
                "Transfer to escrow failed"
            );
        }
        
        // Store payment request
        payments[paymentId] = PaymentRequest({
            merchant: _merchant,
            customer: _customer,
            usdAmount: _usdAmount,
            pyusdAmount: pyusdAmount,
            sessionId: _sessionId,
            timestamp: block.timestamp,
            status: PaymentStatus.Pending,
            useEscrow: _useEscrow,
            releaseTime: _useEscrow ? block.timestamp + ESCROW_PERIOD : 0,
            autoRelease: _useEscrow && _autoRelease,
            priceUpdateId: bytes32(0),
            priceAtCreation: price.price
        });
        
        merchantPayments[_merchant].push(paymentId);
        
        emit PaymentCreated(paymentId, _merchant, _customer, _usdAmount, pyusdAmount, _sessionId, price.price, _useEscrow);
        
        return paymentId;
    }    /**
     * @notice Process a payment after customer sends PYUSD (for non-escrow payments)
     * @param paymentId The payment request ID
     * @param priceUpdateData Fresh price data from Pyth Hermes
     */
    function processPayment(
        bytes32 paymentId,
        bytes[] calldata priceUpdateData
    ) external payable {
        PaymentRequest storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(payment.merchant != address(0), "Payment not found");
        require(!payment.useEscrow, "Use releasePayment for escrow payments");
        
        // Update price with fresh data
        uint256 updateFee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= updateFee, "Insufficient fee");
        
        pyth.updatePriceFeeds{value: updateFee}(priceUpdateData);
        
        // Get latest price and recalculate PYUSD amount
        PythStructs.Price memory price = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        require(price.price > 0, "Invalid price");
        
        uint256 finalPyusdAmount = (payment.usdAmount * 1e8) / uint256(int256(price.price));
        
        // Transfer PYUSD from customer to merchant
        require(
            pyusd.transferFrom(payment.customer, payment.merchant, finalPyusdAmount),
            "Transfer failed"
        );
        
        payment.status = PaymentStatus.Completed;
        payment.pyusdAmount = finalPyusdAmount;
        
        emit PaymentProcessed(paymentId, finalPyusdAmount, price.price);
    }
    
    /**
     * @notice Release escrowed payment to merchant
     * @param paymentId The payment request ID
     */
    function releasePayment(bytes32 paymentId) external {
        PaymentRequest storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(payment.useEscrow, "Not an escrow payment");
        require(
            msg.sender == payment.customer || 
            (payment.autoRelease && block.timestamp >= payment.releaseTime),
            "Not authorized to release"
        );
        
        payment.status = PaymentStatus.Completed;
        merchantBalances[payment.merchant] += payment.pyusdAmount;
        
        emit PaymentReleased(paymentId, payment.merchant);
    }
    
    /**
     * @notice Merchant withdraws released escrow payments
     */
    function withdraw() external {
        uint256 balance = merchantBalances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        merchantBalances[msg.sender] = 0;
        require(pyusd.transfer(msg.sender, balance), "Transfer failed");
    }
    
    /**
     * @notice Dispute an escrowed payment
     * @param paymentId The payment request ID
     */
    function disputePayment(bytes32 paymentId) external {
        PaymentRequest storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(payment.useEscrow, "Not an escrow payment");
        require(msg.sender == payment.customer, "Only customer can dispute");
        require(
            block.timestamp < payment.timestamp + DISPUTE_PERIOD,
            "Dispute period expired"
        );
        
        payment.status = PaymentStatus.Disputed;
        emit PaymentDisputed(paymentId);
    }
    
    /**
     * @notice Refund an escrowed payment to customer
     * @param paymentId The payment request ID
     */
    function refundPayment(bytes32 paymentId) external {
        PaymentRequest storage payment = payments[paymentId];
        
        require(
            payment.status == PaymentStatus.Pending || 
            payment.status == PaymentStatus.Disputed,
            "Cannot refund"
        );
        require(payment.useEscrow, "Not an escrow payment");
        require(msg.sender == payment.merchant, "Only merchant can refund");
        
        payment.status = PaymentStatus.Refunded;
        require(pyusd.transfer(payment.customer, payment.pyusdAmount), "Refund failed");
        
        emit PaymentRefunded(paymentId, payment.customer);
    }
    
    /**
     * @notice Cancel a pending payment
     * @param paymentId The payment request ID
     */
    function cancelPayment(bytes32 paymentId) external {
        PaymentRequest storage payment = payments[paymentId];
        require(payment.merchant != address(0), "Payment not found");
        require(payment.status == PaymentStatus.Pending, "Payment not pending");
        require(
            msg.sender == payment.merchant || msg.sender == payment.customer,
            "Not authorized"
        );
        
        // If escrow was used, refund to customer
        if (payment.useEscrow) {
            require(pyusd.transfer(payment.customer, payment.pyusdAmount), "Refund failed");
        }
        
        payment.status = PaymentStatus.Cancelled;
        emit PaymentCancelled(paymentId, msg.sender);
    }
    
    /**
     * @notice Get the current PYUSD/USD price from Pyth oracle
     * @return price The current price (scaled by 10^8)
     * @return publishTime The timestamp when the price was published
     */
    function getCurrentPrice() public view returns (int64 price, uint256 publishTime) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        return (pythPrice.price, pythPrice.publishTime);
    }    /**
     * @notice Calculate PYUSD amount for USD value
     * @param usdAmount Amount in USD (8 decimals)
     * @return PYUSD amount (6 decimals)
     */
    function calculatePyusdAmount(uint256 usdAmount) external view returns (uint256) {
        PythStructs.Price memory pythPrice = pyth.getPriceUnsafe(PYUSD_USD_PRICE_ID);
        require(pythPrice.price > 0, "Invalid price");
        return (usdAmount * 1e6) / uint256(uint64(pythPrice.price));
    }
    
    /**
     * @notice Get merchant's payment requests
     */
    function getMerchantPayments(address merchant) external view returns (bytes32[] memory) {
        return merchantPayments[merchant];
    }
    
    /**
     * @notice Get detailed payment information
     */
    function getPaymentDetails(bytes32 paymentId) external view returns (
        address merchant,
        address customer,
        uint256 usdAmount,
        uint256 pyusdAmount,
        string memory sessionId,
        PaymentStatus status,
        bool useEscrow,
        uint256 releaseTime,
        int64 priceAtCreation
    ) {
        PaymentRequest memory payment = payments[paymentId];
        return (
            payment.merchant,
            payment.customer,
            payment.usdAmount,
            payment.pyusdAmount,
            payment.sessionId,
            payment.status,
            payment.useEscrow,
            payment.releaseTime,
            payment.priceAtCreation
        );
    }
}
