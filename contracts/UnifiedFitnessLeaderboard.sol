// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * UNIFIED FITNESS LEADERBOARD CONTRACT
 * 
 * Single contract interface for all chains - follows Core Principles:
 * - PREVENT BLOAT: Minimal, focused functionality
 * - DRY: Single implementation
 * - CLEAN: Clear separation of concerns
 */

contract UnifiedFitnessLeaderboard {
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
    }
    
    // Storage
    mapping(address => Score) public userScores;
    Score[] public leaderboard;
    
    // Configuration
    uint256 public constant MAX_SCORE_PER_SUBMISSION = 1000;
    uint256 public constant SUBMISSION_COOLDOWN = 1 hours; // Prevent spam
    
    // Events
    event ScoreSubmitted(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event ScoreUpdated(address indexed user, uint256 pushups, uint256 squats);

    /**
     * Submit scores with minimal validation
     */
    function addScore(uint256 pushups, uint256 squats) external {
        require(pushups <= MAX_SCORE_PER_SUBMISSION, "Pushups exceed max");
        require(squats <= MAX_SCORE_PER_SUBMISSION, "Squats exceed max");
        require(pushups > 0 || squats > 0, "At least one exercise must be > 0");
        
        // Check cooldown
        if (userScores[msg.sender].timestamp != 0) {
            require(
                block.timestamp >= userScores[msg.sender].timestamp + SUBMISSION_COOLDOWN,
                "Cooldown not met"
            );
        }
        
        // Update or create user score
        Score memory newScore = Score({
            user: msg.sender,
            pushups: pushups,
            squats: squats,
            timestamp: block.timestamp
        });
        
        userScores[msg.sender] = newScore;
        
        // Add to or update leaderboard
        bool userExists = false;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].user == msg.sender) {
                leaderboard[i] = newScore;
                userExists = true;
                break;
            }
        }
        
        if (!userExists) {
            leaderboard.push(newScore);
        }
        
        emit ScoreSubmitted(msg.sender, pushups, squats, block.timestamp);
    }
    
    /**
     * Get user's current score
     */
    function getUserScore(address user) external view returns (Score memory) {
        return userScores[user];
    }
    
    /**
     * Get full leaderboard
     */
    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }
    
    /**
     * Get leaderboard size
     */
    function getLeaderboardLength() external view returns (uint256) {
        return leaderboard.length;
    }
}