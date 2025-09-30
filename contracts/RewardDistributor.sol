// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title RewardDistributor
 * @dev Handles the distribution of an existing ERC20 token ($CC) as rewards
 *
 * Features:
 * - Distributes rewards from existing $CC token contract
 * - Owner-only reward distribution (for admin purposes)
 * - Batch reward distribution for gas efficiency
 * - User-paid gas fees with signature-based claiming
 * - Nonce-based replay attack prevention
 * - Pausable for emergency situations
 * - Emergency withdrawal functionality
 * - Token address update capability
 */
contract RewardDistributor is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    IERC20 public ccToken;

    // Mapping to track used nonces to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;

    event RewardDistributed(address indexed recipient, string playerName, uint256 amount);
    event BatchRewardDistributed(uint256 totalRecipients, uint256 totalAmount);
    event RewardClaimed(address indexed recipient, uint256 amount, uint256 nonce);
    event TokenAddressUpdated(address indexed oldToken, address indexed newToken);
    event EmergencyWithdrawal(address indexed owner, uint256 amount);

    constructor(address _ccTokenAddress) {
        require(_ccTokenAddress != address(0), "Invalid token address");
        ccToken = IERC20(_ccTokenAddress);
    }

    /**
     * @dev Allows users to claim rewards with a signature from the contract owner
     * @param recipient Address to receive the tokens
     * @param amount Amount of tokens to claim
     * @param nonce Unique nonce to prevent replay attacks
     * @param signature Signature from the contract owner authorizing this claim
     */
    function claimRewardWithSignature(
        address recipient,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) external nonReentrant whenNotPaused {
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        // Create the message hash that should have been signed
        bytes32 messageHash = keccak256(abi.encodePacked(recipient, amount, nonce));
        
        // Check if this nonce has already been used
        require(!usedNonces[messageHash], "Nonce already used");
        
        // Verify the signature
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner(), "Invalid signature");
        
        // Mark nonce as used
        usedNonces[messageHash] = true;
        
        // Transfer tokens
        bool success = ccToken.transfer(recipient, amount);
        require(success, "Token transfer failed");

        emit RewardClaimed(recipient, amount, nonce);
    }

    /**
     * @dev Distributes $CC tokens to a recipient (admin only)
     * @param recipient Address to receive the tokens
     * @param playerName The player's display name
     * @param amount Amount of tokens to distribute
     */
    function distributeReward(address recipient, string memory playerName, uint256 amount) external onlyOwner nonReentrant whenNotPaused {
        require(recipient != address(0), "Invalid recipient address");
        require(bytes(playerName).length > 0, "Player name is required");
        require(amount > 0, "Amount must be greater than 0");
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        bool success = ccToken.transfer(recipient, amount);
        require(success, "Token transfer failed");

        emit RewardDistributed(recipient, playerName, amount);
    }

    /**
     * @dev Distributes $CC tokens to multiple recipients (admin only, gas efficient)
     * @param recipients Array of addresses to receive tokens
     * @param amounts Array of token amounts (must match recipients length)
     */
    function batchDistributeReward(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner nonReentrant whenNotPaused {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= 100, "Too many recipients");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        require(ccToken.balanceOf(address(this)) >= totalAmount, "Insufficient contract balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient address");
            require(amounts[i] > 0, "Amount must be greater than 0");

            bool success = ccToken.transfer(recipients[i], amounts[i]);
            require(success, "Token transfer failed");
        }

        emit BatchRewardDistributed(recipients.length, totalAmount);
    }
    
    /**
     * @dev Allows owner to withdraw remaining tokens from contract
     * @param amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        bool success = ccToken.transfer(owner(), amount);
        require(success, "Token transfer failed");
        
        emit EmergencyWithdrawal(owner(), amount);
    }
    
    /**
     * @dev Updates the $CC token contract address
     * @param _newTokenAddress New token contract address
     */
    function updateTokenAddress(address _newTokenAddress) external onlyOwner {
        require(_newTokenAddress != address(0), "Invalid token address");
        require(_newTokenAddress != address(ccToken), "Same token address");
        
        address oldToken = address(ccToken);
        ccToken = IERC20(_newTokenAddress);
        
        emit TokenAddressUpdated(oldToken, _newTokenAddress);
    }
    
    /**
     * @dev Returns the current $CC token balance of this contract
     */
    function getContractBalance() external view returns (uint256) {
        return ccToken.balanceOf(address(this));
    }
    
    /**
     * @dev Returns the current $CC token address
     */
    function getTokenAddress() external view returns (address) {
        return address(ccToken);
    }
    
    /**
     * @dev Check if a nonce has been used
     * @param recipient The recipient address
     * @param amount The amount
     * @param nonce The nonce to check
     */
    function isNonceUsed(address recipient, uint256 amount, uint256 nonce) external view returns (bool) {
        bytes32 messageHash = keccak256(abi.encodePacked(recipient, amount, nonce));
        return usedNonces[messageHash];
    }

    /**
     * @dev Pauses all reward distribution and claiming (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes reward distribution and claiming
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}