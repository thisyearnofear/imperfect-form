// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./interfaces/IVerifiedFitness.sol";
import "./libraries/VerificationHelper.sol";

/**
 * @title VerifiedFitnessLeaderboard
 * @notice Self Protocol integrated fitness leaderboard with STANDARDIZED struct format
 * @dev Maintains compatibility with existing frontend while adding Self Protocol verification
 * 
 * Key Design Decisions:
 * - Uses the SAME struct format as existing standardized contracts
 * - Integrates Self Protocol verification seamlessly
 * - Maintains frontend compatibility
 * - Provides verification bonuses for enhanced scores
 */
contract VerifiedFitnessLeaderboard {
    
    // =============================================================================
    // STRUCTS - STANDARDIZED FORMAT (matches existing contracts)
    // =============================================================================
    
    /**
     * @notice Standardized Score struct - matches existing contracts exactly
     * @dev This ensures frontend compatibility across all networks
     */
    struct Score {
        address user;
        uint256 pushups;    // Pushup score (0 if this entry is for squats)
        uint256 squats;     // Squat score (0 if this entry is for pushups)
        uint256 timestamp;
    }
    
    /**
     * @notice Enhanced user statistics with Self Protocol verification
     */
    struct UserStats {
        uint256 totalSubmissions;
        uint256 bestPushups;
        uint256 bestSquats;
        bool isVerified;        // Self Protocol verification status
        uint256 verifiedAt;     // When user was verified
        uint256 totalBonusEarned; // Total bonus points from verification
    }
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    // Core leaderboard data - standardized format
    Score[] public leaderboard;
    mapping(address => uint256) public userIndex; // Maps user to their index in leaderboard
    mapping(address => UserStats) public userStats;
    
    // Self Protocol integration
    address public verificationContract;
    uint256 public verificationBonusPercentage = 10; // 10% bonus for verified humans
    
    // Contract configuration
    address public owner;
    uint256 public constant SUBMISSION_COOLDOWN = 1 minutes;
    uint256 public constant MAX_SCORE_PER_SUBMISSION = 100;
    uint256 public constant MINIMUM_AGE = 16;
    string public constant SCOPE_NAME = "imperfect-form-fitness";
    
    // Cooldown tracking
    mapping(address => uint256) public lastSubmissionTime;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event ScoreSubmitted(
        address indexed user,
        uint256 baseScore,
        uint256 finalScore,
        string exerciseType,
        bool isVerified,
        uint256 bonusEarned
    );
    
    event VerificationContractUpdated(
        address indexed oldContract,
        address indexed newContract,
        address updatedBy
    );
    
    event VerificationBonusUpdated(
        uint256 oldBonus,
        uint256 newBonus,
        address updatedBy
    );
    
    // =============================================================================
    // ERRORS
    // =============================================================================
    
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error InvalidExerciseType(string exerciseType);
    error Unauthorized();
    error InvalidInput();
    error InvalidVerificationContract();
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(address _verificationContract) {
        owner = msg.sender;
        verificationContract = _verificationContract;
        
        emit VerificationContractUpdated(address(0), _verificationContract, msg.sender);
    }
    
    // =============================================================================
    // CORE FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Submit a fitness score with Self Protocol verification bonus
     * @param baseScore The base score achieved (number of reps)
     * @param exerciseType Type of exercise ("pushups" or "squats")
     */
    function submitScore(uint256 baseScore, string memory exerciseType) external {
        // Input validation
        if (baseScore == 0) revert InvalidInput();
        if (baseScore > MAX_SCORE_PER_SUBMISSION) {
            revert ScoreExceedsMaximum(baseScore, MAX_SCORE_PER_SUBMISSION);
        }
        
        // Validate exercise type
        bool isPushups = keccak256(bytes(exerciseType)) == keccak256(bytes("pushups"));
        bool isSquats = keccak256(bytes(exerciseType)) == keccak256(bytes("squats"));
        if (!isPushups && !isSquats) {
            revert InvalidExerciseType(exerciseType);
        }
        
        // Check cooldown
        uint256 timeSinceLastSubmission = block.timestamp - lastSubmissionTime[msg.sender];
        if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
            revert CooldownNotExpired(SUBMISSION_COOLDOWN - timeSinceLastSubmission);
        }
        
        // Use VerificationHelper to check verification and calculate enhanced score
        (uint256 finalScore, bool isVerified) = VerificationHelper.submitEnhancedScore(
            verificationContract,
            msg.sender,
            baseScore,
            exerciseType,
            verificationBonusPercentage
        );
        
        uint256 bonusEarned = finalScore - baseScore;
        
        // Update or create user entry in standardized format
        uint256 userIdx = userIndex[msg.sender];
        
        if (userIdx == 0 && (leaderboard.length == 0 || leaderboard[0].user != msg.sender)) {
            // New user - add to leaderboard
            Score memory newScore = Score({
                user: msg.sender,
                pushups: isPushups ? finalScore : 0,
                squats: isSquats ? finalScore : 0,
                timestamp: block.timestamp
            });
            
            leaderboard.push(newScore);
            userIndex[msg.sender] = leaderboard.length - 1;
        } else {
            // Existing user - update their best scores
            Score storage existingScore = leaderboard[userIdx];
            
            if (isPushups && finalScore > existingScore.pushups) {
                existingScore.pushups = finalScore;
                existingScore.timestamp = block.timestamp;
            } else if (isSquats && finalScore > existingScore.squats) {
                existingScore.squats = finalScore;
                existingScore.timestamp = block.timestamp;
            }
        }
        
        // Update user stats
        UserStats storage stats = userStats[msg.sender];
        stats.totalSubmissions++;
        stats.isVerified = isVerified;
        stats.totalBonusEarned += bonusEarned;
        
        if (isPushups && finalScore > stats.bestPushups) {
            stats.bestPushups = finalScore;
        } else if (isSquats && finalScore > stats.bestSquats) {
            stats.bestSquats = finalScore;
        }
        
        // Update verification timestamp if newly verified
        if (isVerified && stats.verifiedAt == 0) {
            stats.verifiedAt = block.timestamp;
        }
        
        // Update cooldown
        lastSubmissionTime[msg.sender] = block.timestamp;
        
        emit ScoreSubmitted(msg.sender, baseScore, finalScore, exerciseType, isVerified, bonusEarned);
    }
    
    // =============================================================================
    // VIEW FUNCTIONS - STANDARDIZED INTERFACE
    // =============================================================================
    
    /**
     * @notice Get leaderboard data in standardized format
     * @dev This function signature matches existing contracts exactly
     * @return Array of scores in standardized format
     */
    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }
    
    /**
     * @notice Get user statistics including verification status
     */
    function getUserStats(address user) external view returns (UserStats memory) {
        return userStats[user];
    }
    
    /**
     * @notice Check if a user is verified through Self Protocol
     */
    function isUserVerified(address user) external view returns (bool) {
        return VerificationHelper.isVerifiedHuman(verificationContract, user);
    }
    
    /**
     * @notice Get verification timestamp for a user
     */
    function getUserVerificationTimestamp(address user) external view returns (uint256) {
        return VerificationHelper.getVerificationTimestamp(verificationContract, user);
    }
    
    /**
     * @notice Get verification statistics from the Self Protocol contract
     */
    function getVerificationStats() external view returns (
        uint256 totalVerifiedUsers,
        address lastVerifiedUser,
        uint256 lastVerificationTimestamp
    ) {
        return VerificationHelper.getVerificationStats(verificationContract);
    }
    
    /**
     * @notice Get total number of users on leaderboard
     */
    function getTotalUsers() external view returns (uint256) {
        return leaderboard.length;
    }
    
    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update the verification contract address
     * @param newVerificationContract The new verification contract address
     */
    function setVerificationContract(address newVerificationContract) external {
        if (msg.sender != owner) revert Unauthorized();
        if (!VerificationHelper.isValidVerificationContract(newVerificationContract)) {
            revert InvalidVerificationContract();
        }
        
        address oldContract = verificationContract;
        verificationContract = newVerificationContract;
        
        emit VerificationContractUpdated(oldContract, newVerificationContract, msg.sender);
    }
    
    /**
     * @notice Update the verification bonus percentage
     * @param newBonusPercentage The new bonus percentage (e.g., 10 for 10%)
     */
    function setVerificationBonus(uint256 newBonusPercentage) external {
        if (msg.sender != owner) revert Unauthorized();
        if (newBonusPercentage > 100) revert InvalidInput();
        
        uint256 oldBonus = verificationBonusPercentage;
        verificationBonusPercentage = newBonusPercentage;
        
        emit VerificationBonusUpdated(oldBonus, newBonusPercentage, msg.sender);
    }
    
    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert Unauthorized();
        if (newOwner == address(0)) revert InvalidInput();
        
        owner = newOwner;
    }
}