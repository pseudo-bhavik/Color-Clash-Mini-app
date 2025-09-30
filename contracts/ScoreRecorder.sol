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
 * - Player score history tracking (last 10 games only)
 * - Leaderboard tracking functions
 */
contract ScoreRecorder {

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
}