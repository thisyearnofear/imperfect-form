// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../interfaces/IVerifiedFitness.sol";

/**
 * @title VerificationHelper
 * @notice Helper library for integrating Self Protocol verification with fitness contracts
 * @dev Provides modular, reusable functions for verification checks and enhanced scoring
 * 
 * Architecture Benefits:
 * - DRY principle: reusable verification logic across all fitness contracts
 * - Clean separation: verification logic separated from business logic
 * - Modular design: easy to integrate with existing contracts
 * - Gas efficient: optimized for minimal gas usage
 */
library VerificationHelper {
    
    // =============================================================================
    // CUSTOM ERRORS
    // =============================================================================
    
    error VerificationContractNotSet();
    error UserNotVerified(address user);
    error VerificationContractCallFailed();
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    /// @notice Emitted when a verified user submits a score
    event VerifiedScoreSubmitted(
        address indexed user,
        uint256 score,
        string exerciseType,
        uint256 verificationTimestamp
    );
    
    /// @notice Emitted when verification status is checked
    event VerificationChecked(
        address indexed user,
        bool isVerified,
        uint256 timestamp
    );
    
    // =============================================================================
    // VERIFICATION FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Check if a user is verified and revert if not
     * @param verificationContract The address of the verification contract
     * @param user The user address to check
     * @dev Reverts with UserNotVerified if user is not verified
     */
    function requireVerifiedHuman(
        address verificationContract,
        address user
    ) internal view {
        if (verificationContract == address(0)) {
            revert VerificationContractNotSet();
        }
        
        try IVerifiedFitness(verificationContract).isVerifiedHuman(user) returns (bool isVerified) {
            if (!isVerified) {
                revert UserNotVerified(user);
            }
        } catch {
            revert VerificationContractCallFailed();
        }
    }
    
    /**
     * @notice Check if a user is verified (non-reverting)
     * @param verificationContract The address of the verification contract
     * @param user The user address to check
     * @return isVerified True if user is verified, false otherwise
     */
    function isVerifiedHuman(
        address verificationContract,
        address user
    ) internal view returns (bool isVerified) {
        if (verificationContract == address(0)) {
            return false;
        }
        
        try IVerifiedFitness(verificationContract).isVerifiedHuman(user) returns (bool verified) {
            return verified;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Get verification timestamp for a user
     * @param verificationContract The address of the verification contract
     * @param user The user address
     * @return timestamp The verification timestamp (0 if not verified or error)
     */
    function getVerificationTimestamp(
        address verificationContract,
        address user
    ) internal view returns (uint256 timestamp) {
        if (verificationContract == address(0)) {
            return 0;
        }
        
        try IVerifiedFitness(verificationContract).getVerificationTimestamp(user) returns (uint256 ts) {
            return ts;
        } catch {
            return 0;
        }
    }
    
    // =============================================================================
    // ENHANCED SCORING FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Calculate enhanced score with verification bonus
     * @param baseScore The base score from the exercise
     * @param isVerified Whether the user is verified
     * @param bonusPercentage The bonus percentage for verified users (e.g., 10 for 10%)
     * @return enhancedScore The score with verification bonus applied
     */
    function calculateEnhancedScore(
        uint256 baseScore,
        bool isVerified,
        uint256 bonusPercentage
    ) internal pure returns (uint256 enhancedScore) {
        if (!isVerified || bonusPercentage == 0) {
            return baseScore;
        }
        
        // Calculate bonus: baseScore * bonusPercentage / 100
        uint256 bonus = (baseScore * bonusPercentage) / 100;
        return baseScore + bonus;
    }
    
    /**
     * @notice Submit score with verification check and enhancement
     * @param verificationContract The address of the verification contract
     * @param user The user submitting the score
     * @param baseScore The base score
     * @param exerciseType The type of exercise
     * @param bonusPercentage Bonus percentage for verified users
     * @return finalScore The final score (with bonus if verified)
     * @return isVerified Whether the user is verified
     */
    function submitEnhancedScore(
        address verificationContract,
        address user,
        uint256 baseScore,
        string memory exerciseType,
        uint256 bonusPercentage
    ) internal returns (uint256 finalScore, bool isVerified) {
        // Check verification status
        isVerified = isVerifiedHuman(verificationContract, user);
        
        // Calculate enhanced score
        finalScore = calculateEnhancedScore(baseScore, isVerified, bonusPercentage);
        
        // Emit events
        emit VerificationChecked(user, isVerified, block.timestamp);
        
        if (isVerified) {
            uint256 verificationTimestamp = getVerificationTimestamp(verificationContract, user);
            emit VerifiedScoreSubmitted(user, finalScore, exerciseType, verificationTimestamp);
        }
        
        return (finalScore, isVerified);
    }
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get verification statistics from the verification contract
     * @param verificationContract The address of the verification contract
     * @return totalUsers Total verified users
     * @return lastUser Last verified user
     * @return lastTimestamp Last verification timestamp
     */
    function getVerificationStats(
        address verificationContract
    ) internal view returns (
        uint256 totalUsers,
        address lastUser,
        uint256 lastTimestamp
    ) {
        if (verificationContract == address(0)) {
            return (0, address(0), 0);
        }
        
        try IVerifiedFitness(verificationContract).getVerificationStats() returns (
            uint256 total,
            address last,
            uint256 timestamp
        ) {
            return (total, last, timestamp);
        } catch {
            return (0, address(0), 0);
        }
    }
    
    /**
     * @notice Check if verification contract is properly configured
     * @param verificationContract The address to check
     * @return isValid True if the contract appears to be a valid verification contract
     */
    function isValidVerificationContract(
        address verificationContract
    ) internal view returns (bool isValid) {
        if (verificationContract == address(0)) {
            return false;
        }
        
        try IVerifiedFitness(verificationContract).MINIMUM_AGE() returns (uint256) {
            return true;
        } catch {
            return false;
        }
    }
    
    // =============================================================================
    // BATCH OPERATIONS
    // =============================================================================
    
    /**
     * @notice Check verification status for multiple users
     * @param verificationContract The address of the verification contract
     * @param users Array of user addresses to check
     * @return verificationStatuses Array of verification statuses
     */
    function batchCheckVerification(
        address verificationContract,
        address[] memory users
    ) internal view returns (bool[] memory verificationStatuses) {
        verificationStatuses = new bool[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            verificationStatuses[i] = isVerifiedHuman(verificationContract, users[i]);
        }
        
        return verificationStatuses;
    }
}
