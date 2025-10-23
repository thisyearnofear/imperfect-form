// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * UNIFIED VERIFIED FITNESS LEADERBOARD CONTRACT
 * 
 * Single contract interface for verified fitness scoring - follows Core Principles:
 * - PREVENT BLOAT: Minimal, focused functionality
 * - DRY: Single implementation
 * - CLEAN: Clear separation of concerns
 * - AGGRESSIVE CONSOLIDATION: Merges verification and scoring in one interface
 */

contract UnifiedVerifiedFitnessLeaderboard is SelfVerificationRoot {
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
        bool isVerified;
    }
    
    // Storage
    mapping(address => Score) public userScores;
    Score[] public leaderboard;
    
    // Verification state (inherited from SelfVerificationRoot)
    mapping(address => bool) public verifiedHumans;
    mapping(address => uint256) public verificationTimestamps;
    uint256 public totalVerifiedUsers;
    
    // Configuration
    uint256 public constant MAX_SCORE_PER_SUBMISSION = 1000;
    uint256 public constant SUBMISSION_COOLDOWN = 1 hours; // Prevent spam
    uint256 public verificationBonusPercentage = 10; // 10% bonus for verified users
    
    // Owner for admin functions
    address public owner;
    
    // Constants
    uint256 public constant MINIMUM_AGE = 16;
    string public constant SCOPE_NAME = "imperfect-form-fitness";
    bytes32 public immutable VERIFICATION_CONFIG_ID;

    // Events
    event ScoreSubmitted(address indexed user, uint256 pushups, uint256 squats, bool isVerified, uint256 timestamp);
    event ScoreUpdated(address indexed user, uint256 pushups, uint256 squats, bool isVerified);
    event UserVerified(address indexed user, uint256 timestamp);
    event VerificationBonusUpdated(uint256 oldBonus, uint256 newBonus, address updatedBy);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(
        address _identityVerificationHubV2Address,
        uint256 _scope,
        bytes32 _verificationConfigId
    ) SelfVerificationRoot(_identityVerificationHubV2Address, _scope) {
        owner = msg.sender;
        VERIFICATION_CONFIG_ID = _verificationConfigId;
    }
    
    /**
     * Submit scores with verification check - unified interface
     */
    function submitScore(uint256 baseScore, string memory exerciseType) external {
        require(baseScore <= MAX_SCORE_PER_SUBMISSION, "Score exceeds max");
        require(bytes(exerciseType).length > 0, "Exercise type required");
        
        // Check cooldown for this user
        if (userScores[msg.sender].timestamp != 0) {
            require(
                block.timestamp >= userScores[msg.sender].timestamp + SUBMISSION_COOLDOWN,
                "Cooldown not met"
            );
        }
        
        bool isVerified = verifiedHumans[msg.sender];
        
        // Calculate final score with verification bonus
        uint256 finalScore = baseScore;
        if (isVerified) {
            finalScore = baseScore + (baseScore * verificationBonusPercentage / 100);
        }
        
        // Update or create user score based on exercise type
        if (keccak256(bytes(exerciseType)) == keccak256("pushups")) {
            Score memory newScore = Score({
                user: msg.sender,
                pushups: finalScore,
                squats: userScores[msg.sender].squats, // Keep existing squats
                timestamp: block.timestamp,
                isVerified: isVerified
            });
            userScores[msg.sender] = newScore;
        } else if (keccak256(bytes(exerciseType)) == keccak256("squats")) {
            Score memory newScore = Score({
                user: msg.sender,
                pushups: userScores[msg.sender].pushups, // Keep existing pushups
                squats: finalScore,
                timestamp: block.timestamp,
                isVerified: isVerified
            });
            userScores[msg.sender] = newScore;
        } else {
            revert("Invalid exercise type");
        }
        
        // Add to or update leaderboard
        bool userExists = false;
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].user == msg.sender) {
                leaderboard[i] = userScores[msg.sender];
                userExists = true;
                break;
            }
        }
        
        if (!userExists) {
            leaderboard.push(userScores[msg.sender]);
        }
        
        emit ScoreSubmitted(msg.sender, userScores[msg.sender].pushups, userScores[msg.sender].squats, isVerified, block.timestamp);
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
     * Self Protocol verification hook - simplified
     */
    function getConfigId(
        bytes32 _destinationChainId,
        bytes32 _userIdentifier,
        bytes memory _userDefinedData
    ) public view override returns (bytes32) {
        return VERIFICATION_CONFIG_ID;
    }
    
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory _output,
        bytes memory _userData
    ) internal override {
        address userAddress = address(uint160(_output.userIdentifier));
        
        if (!verifiedHumans[userAddress]) {
            verifiedHumans[userAddress] = true;
            verificationTimestamps[userAddress] = block.timestamp;
            totalVerifiedUsers++;
            
            // Update user's score to mark as verified if they already submitted
            if (userScores[userAddress].user != address(0)) {
                userScores[userAddress].isVerified = true;
            }
            
            emit UserVerified(userAddress, block.timestamp);
        }
    }
    
    /**
     * Admin function to update verification bonus
     */
    function setVerificationBonus(uint256 newBonusPercentage) external onlyOwner {
        uint256 oldBonus = verificationBonusPercentage;
        verificationBonusPercentage = newBonusPercentage;
        emit VerificationBonusUpdated(oldBonus, newBonusPercentage, msg.sender);
    }
    
    /**
     * Check if user is verified
     */
    function isUserVerified(address user) external view returns (bool) {
        return verifiedHumans[user];
    }
    
    /**
     * Get verification stats
     */
    function getVerificationStats() external view returns (
        uint256 totalVerified,
        address lastVerifiedUser,
        uint256 lastVerificationTime
    ) {
        // Find the most recently verified user by scanning leaderboard
        address latestUser = address(0);
        uint256 latestTime = 0;
        
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].timestamp > latestTime && verifiedHumans[leaderboard[i].user]) {
                latestTime = leaderboard[i].timestamp;
                latestUser = leaderboard[i].user;
            }
        }
        
        return (totalVerifiedUsers, latestUser, latestTime);
    }
}