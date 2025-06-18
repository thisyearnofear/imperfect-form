// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FitnessLeaderboardBase
 * @dev A leaderboard contract for tracking fitness scores on Base Mainnet
 * Based on the proven Celo contract template for maximum reliability
 * Optimized for Base's fast block times and low gas costs
 */
contract FitnessLeaderboardBase is Ownable {
    // Custom errors for gas efficiency and better error reporting
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error UserNotFound();
    error Unauthorized();
    error InvalidInput();
    error SubmissionsDisabled();
    error InvalidCooldown();
    error InvalidMaxScore();

    // Standardized struct layout - same across all networks
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
    }

    // State variables
    Score[] public leaderboard;
    mapping(address => uint256) public userIndex;
    mapping(address => uint256) public lastSubmissionTime;

    // Configuration variables (modifiable by owner)
    uint256 public submissionCooldown = 1 minutes; // Standard cooldown
    uint256 public maxScorePerSubmission = 100;

    // Network identification
    uint256 public immutable deployedChainId;

    // Base mainnet chain ID constant
    uint256 public constant BASE_MAINNET_CHAINID = 8453;

    // Flags for emergency controls
    bool public submissionsEnabled = true;

    // For testing environments
    bool public immutable testMode;

    // Events for indexing and monitoring
    event ScoreAdded(
        address indexed user,
        uint256 pushups,
        uint256 squats,
        uint256 timestamp,
        uint256 totalPushups,
        uint256 totalSquats
    );
    event SubmissionsToggled(bool enabled);
    event CooldownUpdated(uint256 newCooldown);
    event MaxScoreUpdated(uint256 newMaxScore);
    event UserRemoved(address indexed user);

    // Modifiers
    modifier whenSubmissionsEnabled() {
        if (!submissionsEnabled) revert SubmissionsDisabled();
        _;
    }

    /**
     * @dev Constructor sets the deploying address as owner and records chain ID
     * @param _testMode Set to true for testing environments to bypass chain ID check
     */
    constructor(bool _testMode) Ownable(msg.sender) {
        deployedChainId = block.chainid;
        testMode = _testMode;

        // Verify we're on Base Mainnet (unless in test mode)
        if (!_testMode) {
            require(
                block.chainid == BASE_MAINNET_CHAINID,
                "Contract must be deployed on Base Mainnet"
            );
        }
    }

    /**
     * @dev Add a new score to the leaderboard with enhanced error handling and gas optimization
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     * 
     * This function uses the same proven pattern as the Celo contract for maximum reliability
     */
    function addScore(uint256 _pushups, uint256 _squats) external whenSubmissionsEnabled {
        // Validate submission parameters
        _validateSubmission(_pushups, _squats);

        // Check cooldown period
        _checkCooldown(msg.sender);

        // Update user's score
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            // New user
            _addNewUserScore(_pushups, _squats);
        } else {
            // Existing user
            _updateUserScore(index - 1, _pushups, _squats);
        }

        // Update last submission time
        lastSubmissionTime[msg.sender] = block.timestamp;

        // Get user score for event (gas optimized)
        Score storage userScore = leaderboard[userIndex[msg.sender] - 1];
        emit ScoreAdded(
            msg.sender,
            _pushups,
            _squats,
            block.timestamp,
            userScore.pushups,
            userScore.squats
        );
    }

    /**
     * @dev Validate submission parameters
     */
    function _validateSubmission(uint256 _pushups, uint256 _squats) internal view {
        if (_pushups > maxScorePerSubmission)
            revert ScoreExceedsMaximum(_pushups, maxScorePerSubmission);
        if (_squats > maxScorePerSubmission)
            revert ScoreExceedsMaximum(_squats, maxScorePerSubmission);
        if (_pushups == 0 && _squats == 0)
            revert InvalidInput();
    }

    /**
     * @dev Check if user is within cooldown period
     */
    function _checkCooldown(address user) internal view {
        uint256 timeRemaining = getTimeUntilNextSubmission(user);
        if (timeRemaining > 0) revert CooldownNotExpired(timeRemaining);
    }

    /**
     * @dev Add score for new user
     */
    function _addNewUserScore(uint256 _pushups, uint256 _squats) internal {
        leaderboard.push(Score({
            user: msg.sender,
            pushups: _pushups,
            squats: _squats,
            timestamp: block.timestamp
        }));
        userIndex[msg.sender] = leaderboard.length;
    }

    /**
     * @dev Update score for existing user
     */
    function _updateUserScore(uint256 index, uint256 _pushups, uint256 _squats) internal {
        Score storage userScore = leaderboard[index];
        
        // Check for potential overflow (additional safety)
        require(
            userScore.pushups + _pushups >= userScore.pushups &&
            userScore.squats + _squats >= userScore.squats,
            "Score overflow"
        );
        
        userScore.pushups += _pushups;
        userScore.squats += _squats;
        userScore.timestamp = block.timestamp;
    }

    /**
     * @dev Get the full leaderboard
     * @return Array of all scores
     */
    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }

    /**
     * @dev Get a specific user's score
     * @param user Address of the user
     * @return User's score data
     */
    function getUserScore(address user) external view returns (Score memory) {
        uint256 index = userIndex[user];
        if (index == 0) revert UserNotFound();
        return leaderboard[index - 1];
    }

    /**
     * @dev Get time until user can submit next score
     * @param user Address of the user
     * @return Time remaining in seconds (0 if can submit now)
     */
    function getTimeUntilNextSubmission(address user) public view returns (uint256) {
        uint256 lastSubmission = lastSubmissionTime[user];
        if (lastSubmission == 0) return 0; // First submission
        
        uint256 timeSinceLastSubmission = block.timestamp - lastSubmission;
        if (timeSinceLastSubmission >= submissionCooldown) return 0;
        
        return submissionCooldown - timeSinceLastSubmission;
    }

    /**
     * @dev Get total number of users
     */
    function getTotalUsers() external view returns (uint256) {
        return leaderboard.length;
    }

    /**
     * @dev Check if user exists in leaderboard
     */
    function userExists(address user) external view returns (bool) {
        return userIndex[user] > 0;
    }

    /**
     * @dev Get network information
     */
    function isBaseMainnet() external view returns (bool) {
        return block.chainid == BASE_MAINNET_CHAINID;
    }

    function getDeployedChainId() external view returns (uint256) {
        return deployedChainId;
    }

    function isTestMode() external view returns (bool) {
        return testMode;
    }

    // Owner-only functions for contract management
    
    /**
     * @dev Toggle submissions on/off (emergency control)
     */
    function toggleSubmissions() external onlyOwner {
        submissionsEnabled = !submissionsEnabled;
        emit SubmissionsToggled(submissionsEnabled);
    }

    /**
     * @dev Update submission cooldown period
     */
    function updateCooldown(uint256 newCooldown) external onlyOwner {
        if (newCooldown > 24 hours) revert InvalidCooldown();
        submissionCooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    /**
     * @dev Update maximum score per submission
     */
    function updateMaxScore(uint256 newMaxScore) external onlyOwner {
        if (newMaxScore == 0 || newMaxScore > 1000) revert InvalidMaxScore();
        maxScorePerSubmission = newMaxScore;
        emit MaxScoreUpdated(newMaxScore);
    }

    /**
     * @dev Emergency function to remove a user (only in case of abuse)
     */
    function removeUser(address user) external onlyOwner {
        uint256 index = userIndex[user];
        if (index == 0) revert UserNotFound();
        
        uint256 arrayIndex = index - 1;
        uint256 lastIndex = leaderboard.length - 1;
        
        // Move last element to deleted spot to avoid gaps
        if (arrayIndex != lastIndex) {
            Score storage lastScore = leaderboard[lastIndex];
            leaderboard[arrayIndex] = lastScore;
            userIndex[lastScore.user] = index; // Keep the 1-based indexing
        }
        
        leaderboard.pop();
        delete userIndex[user];
        delete lastSubmissionTime[user];
        
        emit UserRemoved(user);
    }

    /**
     * @dev Get leaderboard sorted by total pushups (view function)
     * @param limit Maximum number of entries to return (0 for all)
     * @return Sorted array of scores
     */
    function getLeaderboardByPushups(uint256 limit) external view returns (Score[] memory) {
        uint256 length = leaderboard.length;
        if (limit > 0 && limit < length) {
            length = limit;
        }
        
        Score[] memory sortedScores = new Score[](length);
        
        // Copy first 'length' entries
        for (uint256 i = 0; i < length; i++) {
            sortedScores[i] = leaderboard[i];
        }
        
        // Simple bubble sort for small arrays (consider more efficient sorting for larger datasets)
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (sortedScores[j].pushups < sortedScores[j + 1].pushups) {
                    Score memory temp = sortedScores[j];
                    sortedScores[j] = sortedScores[j + 1];
                    sortedScores[j + 1] = temp;
                }
            }
        }
        
        return sortedScores;
    }

    /**
     * @dev Get leaderboard sorted by total squats (view function)
     * @param limit Maximum number of entries to return (0 for all)
     * @return Sorted array of scores
     */
    function getLeaderboardBySquats(uint256 limit) external view returns (Score[] memory) {
        uint256 length = leaderboard.length;
        if (limit > 0 && limit < length) {
            length = limit;
        }
        
        Score[] memory sortedScores = new Score[](length);
        
        // Copy first 'length' entries
        for (uint256 i = 0; i < length; i++) {
            sortedScores[i] = leaderboard[i];
        }
        
        // Simple bubble sort for small arrays
        for (uint256 i = 0; i < length - 1; i++) {
            for (uint256 j = 0; j < length - i - 1; j++) {
                if (sortedScores[j].squats < sortedScores[j + 1].squats) {
                    Score memory temp = sortedScores[j];
                    sortedScores[j] = sortedScores[j + 1];
                    sortedScores[j + 1] = temp;
                }
            }
        }
        
        return sortedScores;
    }
}