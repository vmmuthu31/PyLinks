// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NFTReceipt
 * @notice Mints NFT receipts for completed payments
 * @dev Creates on-chain metadata with payment details
 */
contract NFTReceipt is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    
    Counters.Counter private _tokenIds;
    
    struct Receipt {
        uint256 paymentId;
        address merchant;
        address customer;
        uint256 amount;
        string description;
        uint256 timestamp;
        bytes32 txHash;
        string merchantName;
    }
    
    mapping(uint256 => Receipt) public receipts;
    mapping(uint256 => uint256) public paymentToToken; // paymentId => tokenId
    mapping(address => bool) public authorizedMinters;
    
    event ReceiptMinted(
        uint256 indexed tokenId,
        uint256 indexed paymentId,
        address indexed customer,
        address merchant,
        uint256 amount
    );
    
    modifier onlyAuthorized() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    constructor() ERC721("PyLinks Receipt", "PYLR") {}
    
    /**
     * @notice Mint a receipt NFT for a payment
     */
    function mintReceipt(
        address customer,
        uint256 paymentId,
        address merchant,
        uint256 amount,
        string memory description,
        bytes32 txHash,
        string memory merchantName
    ) external onlyAuthorized returns (uint256 tokenId) {
        require(customer != address(0), "Invalid customer");
        require(merchant != address(0), "Invalid merchant");
        require(paymentToToken[paymentId] == 0, "Receipt already exists");
        
        _tokenIds.increment();
        tokenId = _tokenIds.current();
        
        receipts[tokenId] = Receipt({
            paymentId: paymentId,
            merchant: merchant,
            customer: customer,
            amount: amount,
            description: description,
            timestamp: block.timestamp,
            txHash: txHash,
            merchantName: merchantName
        });
        
        paymentToToken[paymentId] = tokenId;
        
        _safeMint(customer, tokenId);
        
        // Generate and set metadata
        string memory metadata = _generateMetadata(tokenId);
        _setTokenURI(tokenId, metadata);
        
        emit ReceiptMinted(tokenId, paymentId, customer, merchant, amount);
        
        return tokenId;
    }
    
    /**
     * @notice Generate on-chain metadata for receipt
     */
    function _generateMetadata(uint256 tokenId) internal view returns (string memory) {
        Receipt memory receipt = receipts[tokenId];
        
        string memory name = string(abi.encodePacked(
            "PyLinks Receipt #",
            tokenId.toString()
        ));
        
        string memory description = string(abi.encodePacked(
            "Payment receipt for $",
            _formatAmount(receipt.amount),
            " PYUSD to ",
            receipt.merchantName,
            " on PyLinks"
        ));
        
        string memory image = _generateSVG(tokenId);
        
        string memory attributes = string(abi.encodePacked(
            '[',
            '{"trait_type": "Merchant", "value": "', receipt.merchantName, '"},',
            '{"trait_type": "Amount", "value": "', _formatAmount(receipt.amount), ' PYUSD"},',
            '{"trait_type": "Date", "value": "', _formatTimestamp(receipt.timestamp), '"},',
            '{"trait_type": "Payment ID", "value": "', receipt.paymentId.toString(), '"}',
            ']'
        ));
        
        string memory json = string(abi.encodePacked(
            '{',
            '"name": "', name, '",',
            '"description": "', description, '",',
            '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(image)), '",',
            '"attributes": ', attributes,
            '}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }
    
    /**
     * @notice Generate SVG image for receipt
     */
    function _generateSVG(uint256 tokenId) internal view returns (string memory) {
        Receipt memory receipt = receipts[tokenId];
        
        return string(abi.encodePacked(
            '<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">',
            '<defs>',
            '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />',
            '<stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />',
            '</linearGradient>',
            '</defs>',
            '<rect width="400" height="600" fill="url(#bg)"/>',
            '<rect x="20" y="20" width="360" height="560" fill="white" rx="10"/>',
            
            // Header
            '<text x="200" y="60" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="#333">',
            'PyLinks Receipt',
            '</text>',
            
            '<text x="200" y="85" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">',
            'Payment Confirmation',
            '</text>',
            
            // Receipt details
            '<text x="40" y="130" font-family="Arial" font-size="16" font-weight="bold" fill="#333">',
            'Receipt #', tokenId.toString(),
            '</text>',
            
            '<text x="40" y="160" font-family="Arial" font-size="14" fill="#666">',
            'Merchant: ', receipt.merchantName,
            '</text>',
            
            '<text x="40" y="185" font-family="Arial" font-size="14" fill="#666">',
            'Amount: $', _formatAmount(receipt.amount), ' PYUSD',
            '</text>',
            
            '<text x="40" y="210" font-family="Arial" font-size="14" fill="#666">',
            'Date: ', _formatTimestamp(receipt.timestamp),
            '</text>',
            
            '<text x="40" y="235" font-family="Arial" font-size="14" fill="#666">',
            'Description: ', receipt.description,
            '</text>',
            
            // Payment ID (truncated)
            '<text x="40" y="280" font-family="Arial" font-size="12" fill="#999">',
            'Payment ID: ', receipt.paymentId.toString(),
            '</text>',
            
            // Transaction hash (truncated)
            '<text x="40" y="305" font-family="Arial" font-size="12" fill="#999">',
            'Tx Hash: ', _truncateHash(receipt.txHash),
            '</text>',
            
            // Footer
            '<text x="200" y="550" text-anchor="middle" font-family="Arial" font-size="12" fill="#999">',
            'Verified on Ethereum Blockchain',
            '</text>',
            
            '</svg>'
        ));
    }
    
    /**
     * @notice Format amount for display (convert from 6 decimals)
     */
    function _formatAmount(uint256 amount) internal pure returns (string memory) {
        uint256 dollars = amount / 1e6;
        uint256 cents = (amount % 1e6) / 1e4; // Get 2 decimal places
        
        return string(abi.encodePacked(
            dollars.toString(),
            ".",
            cents < 10 ? "0" : "",
            cents.toString()
        ));
    }
    
    /**
     * @notice Format timestamp for display
     */
    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        // Simple date formatting - in production, you'd want more sophisticated formatting
        uint256 day = (timestamp / 86400) % 365; // Rough approximation
        return string(abi.encodePacked("Day ", day.toString(), " of 2024"));
    }
    
    /**
     * @notice Truncate hash for display
     */
    function _truncateHash(bytes32 hash) internal pure returns (string memory) {
        string memory hashStr = uint256(hash).toHexString();
        bytes memory hashBytes = bytes(hashStr);
        
        if (hashBytes.length > 10) {
            return string(abi.encodePacked(
                _substring(hashStr, 0, 6),
                "...",
                _substring(hashStr, hashBytes.length - 4, hashBytes.length)
            ));
        }
        
        return hashStr;
    }
    
    /**
     * @notice Get substring
     */
    function _substring(string memory str, uint256 startIndex, uint256 endIndex) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(endIndex - startIndex);
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = strBytes[i];
        }
        
        return string(result);
    }
    
    /**
     * @notice Get receipt details
     */
    function getReceipt(uint256 tokenId) external view returns (
        uint256 paymentId,
        address merchant,
        address customer,
        uint256 amount,
        string memory description,
        uint256 timestamp,
        bytes32 txHash,
        string memory merchantName
    ) {
        require(_exists(tokenId), "Receipt does not exist");
        Receipt memory receipt = receipts[tokenId];
        
        return (
            receipt.paymentId,
            receipt.merchant,
            receipt.customer,
            receipt.amount,
            receipt.description,
            receipt.timestamp,
            receipt.txHash,
            receipt.merchantName
        );
    }
    
    /**
     * @notice Get token ID by payment ID
     */
    function getTokenByPayment(uint256 paymentId) external view returns (uint256) {
        return paymentToToken[paymentId];
    }
    
    /**
     * @notice Add authorized minter
     */
    function addAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
    }
    
    /**
     * @notice Remove authorized minter
     */
    function removeAuthorizedMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
    }
    
    /**
     * @notice Override required by Solidity
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    /**
     * @notice Override required by Solidity
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice Override required by Solidity
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
