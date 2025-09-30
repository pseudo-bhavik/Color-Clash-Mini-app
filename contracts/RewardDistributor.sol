// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RewardDistributor
 * @dev Handles the distribution of an existing ERC20 token ($CC) as rewards
 * 
 * Features:
 * - Distributes rewards from existing $CC token contract
 * - Owner-only reward distribution
 * - Emergency withdrawal functionality
 * - Token address update capability
 */
contract RewardDistributor is Ownable, ReentrancyGuard {
    IERC20 public ccToken;
    
    event RewardDistributed(address indexed recipient, string playerName, uint256 amount);
    event TokenAddressUpdated(address indexed oldToken, address indexed newToken);
    event EmergencyWithdrawal(address indexed owner, uint256 amount);

    constructor(address _ccTokenAddress) {
        require(_ccTokenAddress != address(0), "Invalid token address");
        ccToken = IERC20(_ccTokenAddress);
    }

    /**
     * @dev Distributes $CC tokens to a recipient
     * @param recipient Address to receive the tokens
     * @param playerName The player's display name
     * @param amount Amount of tokens to distribute
     */
    function distributeReward(address recipient, string memory playerName, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient address");
        require(bytes(playerName).length > 0, "Player name is required");
        require(amount > 0, "Amount must be greater than 0");
        require(ccToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");

        bool success = ccToken.transfer(recipient, amount);
        require(success, "Token transfer failed");

        emit RewardDistributed(recipient, playerName, amount);
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
}