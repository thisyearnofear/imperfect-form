// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IVerifiedFitness
 * @notice Interface for the Self Protocol verified fitness contract
 * @dev This interface allows other contracts to check human verification status
 * 
 * Architecture Benefits:
 * - Clean separation of concerns
 * - Modular integration with existing fitness contracts
 * - DRY principle: single source of truth for verification
 * - Future-proof: interface remains stable even if implementation changes
 */
interface IVerifiedFitness {
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    /// @notice Emitted when a user successfully completes verification
    event UserVerified(
        address indexed user,
        uint256 timestamp,
        bytes32 userIdentifier,
        string platform
    );
    
    /// @notice Emitted when verification configuration is updated
    event ConfigurationUpdated(
        bytes32 oldConfigId,
        bytes32 newConfigId,
        address updatedBy
    );
    
    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Check if a user is verified as a human
     * @param user The user address to check
     * @return True if the user has completed Self Protocol verification
     */
    function isVerifiedHuman(address user) external view returns (bool);
    
    /**
     * @notice Get the timestamp when a user was verified
     * @param user The user address
     * @return The block timestamp when verification was completed (0 if not verified)
     */
    function getVerificationTimestamp(address user) external view returns (uint256);
    
    /**
     * @notice Get overall verification statistics
     * @return totalUsers Total number of verified users
     * @return lastUser Address of the most recently verified user
     * @return lastTimestamp Timestamp of the most recent verification
     */
    function getVerificationStats() external view returns (
        uint256 totalUsers,
        address lastUser,
        uint256 lastTimestamp
    );
    
    /**
     * @notice Get the minimum age requirement for verification
     * @return The minimum age in years
     */
    function MINIMUM_AGE() external view returns (uint256);
    
    /**
     * @notice Get the application scope name
     * @return The scope identifier string
     */
    function SCOPE_NAME() external view returns (string memory);
    
    /**
     * @notice Get the verification configuration ID
     * @return The configuration ID used for Self Protocol verification
     */
    function VERIFICATION_CONFIG_ID() external view returns (bytes32);
}
