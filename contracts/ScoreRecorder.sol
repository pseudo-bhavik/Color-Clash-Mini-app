// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ScoreRecorder
 * @dev A simple contract for recording player scores on the blockchain
 *
 * Features:
 * - Public score recording function with optional fee
 * - Event emission for easy indexing
 * - Gas-efficient score storage
 * - Player score history tracking (last 10 games only)
 * - Leaderboard tracking functions
 * - Owner can withdraw accumulated fees
 * - Pausable for emergency situations
 */
contract ScoreRecorder is Ownable, ReentrancyGuard, Pausable {

    struct ScoreRecord {
        uint256 score;
        uint256 timestamp;
        uint256 gameNumber;
    }

    struct PlayerStats {
        uint256 totalGames;
        uint256 highestScore;
        uint256 totalScore;
        uint256 lastGameTimestamp;
    }

    uint256 public constant MAX_HISTORY_LENGTH = 10;

    mapping(address => ScoreRecord[]) public playerScores;
    mapping(address => PlayerStats) public playerStats;
    mapping(address => uint256) public totalGamesPlayed;
    mapping(address => uint256) public highestScore;

    uint256 public totalScoresRecorded;
    uint256 public uniquePlayers;
    uint256 public recordingFee;

    event ScoreRecorded(
        address indexed player,
        string playerName,
        uint256 score,
        uint256 timestamp,
        uint256 gameNumber
    );

    event NewHighScore(address indexed player, string playerName, uint256 score, uint256 previousHigh);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {
        recordingFee = 0.001 ether;
    }

    /**
     * @dev Records a player's game score on-chain
     * @param score The player's final score (percentage coverage)
     * @param playerName The player's display name
     */
    function recordScore(uint256 score, string memory playerName) external payable nonReentrant whenNotPaused {
        require(score <= 100, "Score cannot exceed 100%");
        require(bytes(playerName).length > 0, "Player name is required");
        require(msg.value >= recordingFee, "Insufficient fee");

        address player = msg.sender;
        bool isNewPlayer = totalGamesPlayed[player] == 0;
        uint256 gameNumber = totalGamesPlayed[player] + 1;
        uint256 timestamp = block.timestamp;

        // Create score record
        ScoreRecord memory newRecord = ScoreRecord({
            score: score,
            timestamp: timestamp,
            gameNumber: gameNumber
        });

        // Keep only last 10 games to save gas
        if (playerScores[player].length >= MAX_HISTORY_LENGTH) {
            for (uint256 i = 0; i < playerScores[player].length - 1; i++) {
                playerScores[player][i] = playerScores[player][i + 1];
            }
            playerScores[player][playerScores[player].length - 1] = newRecord;
        } else {
            playerScores[player].push(newRecord);
        }

        // Update player stats
        PlayerStats storage stats = playerStats[player];
        stats.totalGames = gameNumber;
        stats.totalScore += score;
        stats.lastGameTimestamp = timestamp;

        totalGamesPlayed[player] = gameNumber;
        totalScoresRecorded++;

        if (isNewPlayer) {
            uniquePlayers++;
        }

        // Check for new high score
        if (score > highestScore[player]) {
            uint256 previousHigh = highestScore[player];
            highestScore[player] = score;
            stats.highestScore = score;
            emit NewHighScore(player, playerName, score, previousHigh);
        }

        emit ScoreRecorded(player, playerName, score, timestamp, gameNumber);
    }
    
    /**
     * @dev Returns a player's complete score history
     * @param player The player's address
     */
    function getPlayerScores(address player) external view returns (ScoreRecord[] memory) {
        return playerScores[player];
    }
    
    /**
     * @dev Returns a player's most recent score
     * @param player The player's address
     */
    function getLatestScore(address player) external view returns (ScoreRecord memory) {
        require(playerScores[player].length > 0, "No scores recorded for this player");
        return playerScores[player][playerScores[player].length - 1];
    }
    
    /**
     * @dev Returns player statistics
     * @param player The player's address
     */
    function getPlayerStats(address player) external view returns (
        uint256 gamesPlayed,
        uint256 highScore,
        uint256 averageScore,
        uint256 lastGameTimestamp
    ) {
        PlayerStats memory stats = playerStats[player];
        gamesPlayed = stats.totalGames;
        highScore = stats.highestScore;
        lastGameTimestamp = stats.lastGameTimestamp;

        if (gamesPlayed == 0) {
            return (0, 0, 0, 0);
        }

        averageScore = stats.totalScore / gamesPlayed;
    }
    
    /**
     * @dev Returns global statistics
     */
    function getGlobalStats() external view returns (
        uint256 totalScores,
        uint256 totalPlayers
    ) {
        totalScores = totalScoresRecorded;
        totalPlayers = uniquePlayers;
    }

    /**
     * @dev Returns detailed player stats
     * @param player The player's address
     */
    function getDetailedPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    /**
     * @dev Updates the recording fee (owner only)
     * @param newFee The new fee amount in wei
     */
    function setRecordingFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = recordingFee;
        recordingFee = newFee;
        emit FeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Allows owner to withdraw accumulated fees
     */
    function withdrawFunds() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Allows owner to withdraw a specific amount
     * @param amount Amount to withdraw in wei
     */
    function withdrawAmount(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance");

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(owner(), amount);
    }

    /**
     * @dev Returns the contract's current balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Returns the current recording fee
     */
    function getRecordingFee() external view returns (uint256) {
        return recordingFee;
    }

    /**
     * @dev Pauses score recording (emergency only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Resumes score recording
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Fallback function to receive ETH
     */
    receive() external payable {}
}