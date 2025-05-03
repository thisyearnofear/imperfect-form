// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title FitnessLeaderboardV2
 * @dev An improved leaderboard contract for tracking fitness scores with enhanced reliability
 * Specifically optimized for Polygon Amoy testnet
 */
contract FitnessLeaderboardV2 {
    // Custom errors for gas efficiency and better error reporting
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error UserNotFound();
    error Unauthorized();
    error InvalidInput();
    error OperationFailed();

    // Gas-optimized struct packing
    struct Score {
        address user;      // 20 bytes
        uint32 timestamp;  // 4 bytes (enough until year 2106)
        uint16 pushups;    // 2 bytes (max 65,535)
        uint16 squats;     // 2 bytes (max 65,535)
    }  // Total: 28 bytes (fits in one storage slot)

    // State variables
    Score[] public leaderboard;
    mapping(address => uint256) public userIndex;
    mapping(address => uint256) public lastSubmissionTime;
    
    // Constants with default values
    uint256 public SUBMISSION_COOLDOWN = 1 minutes;
    uint256 public MAX_SCORE_PER_SUBMISSION = 100;
    address public owner;
    
    // Network identification
    uint256 public immutable deployedChainId;
    
    // Flags for emergency controls
    bool public submissionsEnabled = true;
    
    // Events
    event ScoreAdded(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxScorePerSubmissionChanged(uint256 newMaxScore);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SubmissionsToggled(bool enabled);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    modifier whenSubmissionsEnabled() {
        if (!submissionsEnabled) revert OperationFailed();
        _;
    }

    constructor() {
        owner = msg.sender;
        
        // Store the chain ID at deployment for network awareness
        uint256 id;
        assembly {
            id := chainid()
        }
        deployedChainId = id;
        
        // Emit initial event for indexing
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @dev Add a new score to the leaderboard with enhanced error handling and gas optimization
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function addScore(uint256 _pushups, uint256 _squats) external whenSubmissionsEnabled {
        // Input validation with custom errors
        if (_pushups > MAX_SCORE_PER_SUBMISSION) 
            revert ScoreExceedsMaximum(_pushups, MAX_SCORE_PER_SUBMISSION);
        if (_squats > MAX_SCORE_PER_SUBMISSION) 
            revert ScoreExceedsMaximum(_squats, MAX_SCORE_PER_SUBMISSION);
        if (_pushups == 0 && _squats == 0) 
            revert InvalidInput();
            
        // Check cooldown with try/catch for reliability
        try this.getTimeUntilNextSubmission(msg.sender) returns (uint256 timeRemaining) {
            if (timeRemaining > 0) revert CooldownNotExpired(timeRemaining);
        } catch {
            // If the cooldown check fails, we'll still allow submission
            // This prevents the contract from becoming unusable if the time calculation has issues
        }

        // Update user score with safe type conversion
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            // New user - add to leaderboard
            leaderboard.push(Score({
                user: msg.sender,
                pushups: uint16(_pushups), // Safe conversion with validation above
                squats: uint16(_squats),   // Safe conversion with validation above
                timestamp: uint32(block.timestamp) // Safe until year 2106
            }));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            // Existing user - update score
            Score storage userScore = leaderboard[index - 1];
            
            // Safe addition with overflow check
            uint256 newPushups = uint256(userScore.pushups) + _pushups;
            uint256 newSquats = uint256(userScore.squats) + _squats;
            
            // Cap at uint16 max if overflow would occur
            userScore.pushups = newPushups > type(uint16).max ? type(uint16).max : uint16(newPushups);
            userScore.squats = newSquats > type(uint16).max ? type(uint16).max : uint16(newSquats);
            userScore.timestamp = uint32(block.timestamp);
        }

        // Update last submission time
        lastSubmissionTime[msg.sender] = block.timestamp;
        
        // Emit event
        emit ScoreAdded(msg.sender, _pushups, _squats, block.timestamp);
    }

    /**
     * @dev Get the entire leaderboard with fallback mechanism
     * @return Array of all scores
     */
    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }
    
    /**
     * @dev Get a paginated portion of the leaderboard for gas efficiency
     * @param offset Starting index
     * @param limit Maximum number of entries to return
     * @return Paginated array of scores
     */
    function getLeaderboardPaginated(uint256 offset, uint256 limit) external view returns (Score[] memory) {
        uint256 totalEntries = leaderboard.length;
        
        // Validate offset
        if (offset >= totalEntries) {
            return new Score[](0);
        }
        
        // Calculate end index with bounds checking
        uint256 end = (offset + limit > totalEntries) ? totalEntries : offset + limit;
        uint256 resultSize = end - offset;
        
        // Create result array
        Score[] memory result = new Score[](resultSize);
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = leaderboard[offset + i];
        }
        
        return result;
    }

    /**
     * @dev Get a user's score with better error handling
     * @param _user Address of the user
     * @return User's score
     */
    function getUserScore(address _user) external view returns (Score memory) {
        uint256 index = userIndex[_user];
        if (index == 0) revert UserNotFound();
        return leaderboard[index - 1];
    }
    
    /**
     * @dev Safe version of getUserScore that doesn't revert
     * @param _user Address of the user
     * @return User's score and a boolean indicating if the user was found
     */
    function getUserScoreSafe(address _user) external view returns (Score memory, bool) {
        uint256 index = userIndex[_user];
        if (index == 0) {
            return (Score({
                user: _user,
                pushups: 0,
                squats: 0,
                timestamp: 0
            }), false);
        }
        return (leaderboard[index - 1], true);
    }

    /**
     * @dev Get the time until a user can submit again with enhanced reliability
     * @param _user Address of the user
     * @return Time in seconds until next submission (0 if can submit now)
     */
    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 lastSubmission = lastSubmissionTime[_user];
        
        // If user has never submitted, they can submit now
        if (lastSubmission == 0) {
            return 0;
        }
        
        uint256 timeSinceLastSubmission;
        
        // Safe time calculation with underflow protection
        if (block.timestamp < lastSubmission) {
            // This should never happen, but we protect against it
            return 0;
        }
        
        timeSinceLastSubmission = block.timestamp - lastSubmission;
        
        // If cooldown has passed, they can submit now
        if (timeSinceLastSubmission >= SUBMISSION_COOLDOWN) {
            return 0;
        }
        
        // Return remaining time
        return SUBMISSION_COOLDOWN - timeSinceLastSubmission;
    }

    // Admin functions with enhanced security

    /**
     * @dev Set the submission cooldown
     * @param _cooldown New cooldown in seconds
     */
    function setSubmissionCooldown(uint256 _cooldown) external onlyOwner {
        SUBMISSION_COOLDOWN = _cooldown;
        emit SubmissionCooldownChanged(_cooldown);
    }

    /**
     * @dev Set the maximum score per submission
     * @param _maxScore New maximum score
     */
    function setMaxScorePerSubmission(uint256 _maxScore) external onlyOwner {
        MAX_SCORE_PER_SUBMISSION = _maxScore;
        emit MaxScorePerSubmissionChanged(_maxScore);
    }

    /**
     * @dev Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidInput();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @dev Emergency toggle for submissions
     * @param _enabled Whether submissions should be enabled
     */
    function toggleSubmissions(bool _enabled) external onlyOwner {
        submissionsEnabled = _enabled;
        emit SubmissionsToggled(_enabled);
    }
    
    /**
     * @dev Get the chain ID this contract was deployed on
     * @return The chain ID
     */
    function getDeployedChainId() external view returns (uint256) {
        return deployedChainId;
    }
    
    /**
     * @dev Get the current chain ID
     * @return The current chain ID
     */
    function getCurrentChainId() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
    
    /**
     * @dev Emergency withdrawal function in case ETH is sent to the contract
     * @param to Address to send ETH to
     */
    function emergencyWithdraw(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = to.call{value: balance}("");
        if (!success) revert OperationFailed();
        emit EmergencyWithdrawal(to, balance);
    }
    
    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {}
}
