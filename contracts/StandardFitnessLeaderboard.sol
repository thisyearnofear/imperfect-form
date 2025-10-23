// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * STANDARD FITNESS LEADERBOARD CONTRACT
 * 
 * Clean, verification-free fitness scoring for Monad, Polygon, and Base
 * Follows Core Principles:
 * - PREVENT BLOAT: Minimal, focused functionality
 * - DRY: Single implementation for all non-verification chains
 * - CLEAN: Clear separation of concerns
 * - NO VERIFICATION: Pure fitness scoring without identity verification
 */

contract StandardFitnessLeaderboard {
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
        uint256 totalScore; // Combined score for easy sorting
    }
    
    // Storage
    mapping(address => Score) public userScores;
    Score[] public leaderboard;
    
    // Configuration
    uint256 public constant MAX_SCORE_PER_SUBMISSION = 1000;
    uint256 public constant SUBMISSION_COOLDOWN = 1 hours; // Prevent spam
    
    // Owner for admin functions
    address public owner;
    
    // Statistics
    uint256 public totalSubmissions;
    uint256 public totalUsers;

    // Events
    event ScoreSubmitted(
        address indexed user, 
        uint256 pushups, 
        uint256 squats, 
        uint256 totalScore,
        uint256 timestamp
    );
    event ScoreUpdated(
        address indexed user, 
        uint256 pushups, 
        uint256 squats, 
        uint256 totalScore
    );
    event NewUserJoined(address indexed user, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }
    
    /**
     * Submit scores - unified interface matching Celo contract
     * @param pushups Number of pushups completed
     * @param squats Number of squats completed
     */
    function addScore(uint256 pushups, uint256 squats) external {
        _addScore(pushups, squats);
    }
    
    /**
     * Internal function for adding scores
     */
    function _addScore(uint256 pushups, uint256 squats) internal {
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
        
        // Track if this is a new user
        bool isNewUser = userScores[msg.sender].user == address(0);
        
        // Calculate total score (simple addition for now)
        uint256 totalScore = pushups + squats;
        
        // Create new score entry
        Score memory newScore = Score({
            user: msg.sender,
            pushups: pushups,
            squats: squats,
            timestamp: block.timestamp,
            totalScore: totalScore
        });
        
        userScores[msg.sender] = newScore;
        
        // Update leaderboard
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
        
        // Update statistics
        totalSubmissions++;
        if (isNewUser) {
            totalUsers++;
            emit NewUserJoined(msg.sender, block.timestamp);
        }
        
        emit ScoreSubmitted(msg.sender, pushups, squats, totalScore, block.timestamp);
    }
    
    /**
     * Alternative submission method for single exercise type
     * @param baseScore Score for the exercise
     * @param exerciseType Type of exercise ("pushups" or "squats")
     */
    function submitScore(uint256 baseScore, string memory exerciseType) external {
        _submitScore(baseScore, exerciseType);
    }
    
    /**
     * Internal function for submitting single exercise scores
     */
    function _submitScore(uint256 baseScore, string memory exerciseType) internal {
        require(baseScore <= MAX_SCORE_PER_SUBMISSION, "Score exceeds max");
        require(baseScore > 0, "Score must be > 0");
        require(bytes(exerciseType).length > 0, "Exercise type required");
        
        // Check cooldown
        if (userScores[msg.sender].timestamp != 0) {
            require(
                block.timestamp >= userScores[msg.sender].timestamp + SUBMISSION_COOLDOWN,
                "Cooldown not met"
            );
        }
        
        // Track if this is a new user
        bool isNewUser = userScores[msg.sender].user == address(0);
        
        // Get existing scores or initialize to 0
        uint256 currentPushups = userScores[msg.sender].pushups;
        uint256 currentSquats = userScores[msg.sender].squats;
        
        // Update the appropriate exercise type
        if (keccak256(bytes(exerciseType)) == keccak256("pushups")) {
            currentPushups = baseScore;
        } else if (keccak256(bytes(exerciseType)) == keccak256("squats")) {
            currentSquats = baseScore;
        } else {
            revert("Invalid exercise type");
        }
        
        // Calculate total score
        uint256 totalScore = currentPushups + currentSquats;
        
        // Create new score entry
        Score memory newScore = Score({
            user: msg.sender,
            pushups: currentPushups,
            squats: currentSquats,
            timestamp: block.timestamp,
            totalScore: totalScore
        });
        
        userScores[msg.sender] = newScore;
        
        // Update leaderboard
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
        
        // Update statistics
        totalSubmissions++;
        if (isNewUser) {
            totalUsers++;
            emit NewUserJoined(msg.sender, block.timestamp);
        }
        
        emit ScoreSubmitted(msg.sender, currentPushups, currentSquats, totalScore, block.timestamp);
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
    
    /**
     * Get top N users from leaderboard (sorted by total score)
     * @param limit Maximum number of users to return
     */
    function getTopUsers(uint256 limit) external view returns (Score[] memory) {
        uint256 length = leaderboard.length;
        if (length == 0) {
            return new Score[](0);
        }
        
        uint256 returnLength = length > limit ? limit : length;
        Score[] memory sortedScores = new Score[](returnLength);
        
        // Simple selection sort for top N (efficient for small N)
        for (uint256 i = 0; i < returnLength; i++) {
            uint256 maxIndex = 0;
            uint256 maxScore = 0;
            
            for (uint256 j = 0; j < length; j++) {
                if (leaderboard[j].totalScore > maxScore) {
                    bool alreadySelected = false;
                    for (uint256 k = 0; k < i; k++) {
                        if (sortedScores[k].user == leaderboard[j].user) {
                            alreadySelected = true;
                            break;
                        }
                    }
                    
                    if (!alreadySelected) {
                        maxScore = leaderboard[j].totalScore;
                        maxIndex = j;
                    }
                }
            }
            
            sortedScores[i] = leaderboard[maxIndex];
        }
        
        return sortedScores;
    }
    
    /**
     * Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalUsers,
        uint256 _totalSubmissions,
        uint256 _leaderboardLength,
        uint256 _timestamp
    ) {
        return (totalUsers, totalSubmissions, leaderboard.length, block.timestamp);
    }
    
    /**
     * Check if user has submitted any scores
     */
    function hasUserSubmitted(address user) external view returns (bool) {
        return userScores[user].user != address(0);
    }
    
    /**
     * Get user's rank on leaderboard (1-indexed, 0 if not found)
     */
    function getUserRank(address user) external view returns (uint256) {
        if (userScores[user].user == address(0)) {
            return 0; // User not found
        }
        
        uint256 userTotalScore = userScores[user].totalScore;
        uint256 rank = 1;
        
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].user != user && leaderboard[i].totalScore > userTotalScore) {
                rank++;
            }
        }
        
        return rank;
    }
    
    /**
     * Admin function to transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
    
    /**
     * Emergency function to pause submissions (in case of issues)
     */
    bool public paused = false;
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // Add whenNotPaused modifier to submission functions
    function addScoreWhenNotPaused(uint256 pushups, uint256 squats) external whenNotPaused {
        _addScore(pushups, squats);
    }
    
    function submitScoreWhenNotPaused(uint256 baseScore, string memory exerciseType) external whenNotPaused {
        _submitScore(baseScore, exerciseType);
    }
}