// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ScoreRecorder
 * @dev A simple contract for recording player scores on the blockchain
 * 
 * Features:
 * - Public score recording function
 * - Event emission for easy indexing
 * - Gas-efficient score storage
 * - Player score history tracking
 */
contract ScoreRecorder {
    
    struct ScoreRecord {
        uint256 score;
        uint256 timestamp;
        uint256 gameNumber;
    }
    
    mapping(address => ScoreRecord[]) public playerScores;
    mapping(address => uint256) public totalGamesPlayed;
    mapping(address => uint256) public highestScore;
    
    uint256 public totalScoresRecorded;
    
    event ScoreRecorded(
        address indexed player,
        string playerName,
        uint256 score,
        uint256 timestamp,
        uint256 gameNumber
    );

    event NewHighScore(address indexed player, string playerName, uint256 score, uint256 previousHigh);

    /**
     * @dev Records a player's game score on-chain
     * @param score The player's final score (percentage coverage)
     * @param playerName The player's display name
     */
    function recordScore(uint256 score, string memory playerName) external {
        require(score <= 100, "Score cannot exceed 100%");
        require(bytes(playerName).length > 0, "Player name is required");

        address player = msg.sender;
        uint256 gameNumber = totalGamesPlayed[player] + 1;
        uint256 timestamp = block.timestamp;
        
        // Create score record
        ScoreRecord memory newRecord = ScoreRecord({
            score: score,
            timestamp: timestamp,
            gameNumber: gameNumber
        });
        
        // Store the score
        playerScores[player].push(newRecord);
        totalGamesPlayed[player] = gameNumber;
        totalScoresRecorded++;
        
        // Check for new high score
        if (score > highestScore[player]) {
            uint256 previousHigh = highestScore[player];
            highestScore[player] = score;
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
        gamesPlayed = totalGamesPlayed[player];
        highScore = highestScore[player];
        
        if (gamesPlayed == 0) {
            return (0, 0, 0, 0);
        }
        
        // Calculate average score
        uint256 totalScore = 0;
        for (uint256 i = 0; i < playerScores[player].length; i++) {
            totalScore += playerScores[player][i].score;
        }
        averageScore = totalScore / gamesPlayed;
        
        // Get last game timestamp
        lastGameTimestamp = playerScores[player][playerScores[player].length - 1].timestamp;
    }
    
    /**
     * @dev Returns global statistics
     */
    function getGlobalStats() external view returns (
        uint256 totalScores,
        uint256 totalPlayers
    ) {
        totalScores = totalScoresRecorded;
        // Note: totalPlayers would require additional tracking to be gas-efficient
        // For now, this can be calculated off-chain from events
        totalPlayers = 0;
    }
}