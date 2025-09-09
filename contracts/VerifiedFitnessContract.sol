// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * @title VerifiedFitnessContract
 * @notice Self Protocol integration for Imperfect Form fitness verification
 * @dev Extends SelfVerificationRoot to provide human verification for fitness leaderboards
 * 
 * Architecture:
 * - Modular design that integrates with existing fitness contracts
 * - Clean separation of verification logic and fitness scoring
 * - DRY principle: reusable verification state across multiple fitness contracts
 * - Event-driven architecture for frontend integration
 */
contract VerifiedFitnessContract is SelfVerificationRoot {
    
    // =============================================================================
    // CONSTANTS & IMMUTABLES
    // =============================================================================
    
    /// @notice Minimum age requirement for fitness verification (16+ for safety)
    uint256 public constant MINIMUM_AGE = 16;
    
    /// @notice Application scope identifier
    string public constant SCOPE_NAME = "imperfect-form-fitness";
    
    /// @notice Configuration ID for verification requirements
    bytes32 public immutable VERIFICATION_CONFIG_ID;
    
    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    /// @notice Mapping of verified users
    mapping(address => bool) public verifiedHumans;
    
    /// @notice Mapping of user verification timestamps
    mapping(address => uint256) public verificationTimestamps;
    
    /// @notice Total count of verified users
    uint256 public totalVerifiedUsers;
    
    /// @notice Contract owner for administrative functions
    address public owner;
    
    /// @notice Last verified user address (for debugging/monitoring)
    address public lastVerifiedUser;
    
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
    
    /// @notice Emitted when verification fails (for monitoring)
    event VerificationFailed(
        address indexed user,
        string reason,
        uint256 timestamp
    );
    
    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "VerifiedFitness: Only owner");
        _;
    }
    
    modifier onlyVerifiedHuman(address user) {
        require(verifiedHumans[user], "VerifiedFitness: User not verified");
        _;
    }
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    /**
     * @notice Initialize the verified fitness contract
     * @param _identityVerificationHubV2Address The Self Protocol V2 hub address
     * @param _scope The scope for this contract (calculated from contract address)
     * @param _verificationConfigId The configuration ID for verification requirements
     */
    constructor(
        address _identityVerificationHubV2Address,
        uint256 _scope,
        bytes32 _verificationConfigId
    ) SelfVerificationRoot(_identityVerificationHubV2Address, _scope) {
        owner = msg.sender;
        VERIFICATION_CONFIG_ID = _verificationConfigId;
        
        // Emit initial configuration
        emit ConfigurationUpdated(bytes32(0), _verificationConfigId, msg.sender);
    }
    
    // =============================================================================
    // SELF PROTOCOL IMPLEMENTATION
    // =============================================================================
    
    /**
     * @notice Returns the configuration ID for verification
     * @dev Required by SelfVerificationRoot - determines verification requirements
     * @param _destinationChainId The destination chain ID
     * @param _userIdentifier The user identifier
     * @param _userDefinedData Custom data from frontend (contains platform info)
     * @return The configuration ID for this verification
     */
    function getConfigId(
        bytes32 _destinationChainId,
        bytes32 _userIdentifier,
        bytes memory _userDefinedData
    ) public view override returns (bytes32) {
        // For now, return the same config for all users
        // Future enhancement: could return different configs based on _userDefinedData
        return VERIFICATION_CONFIG_ID;
    }
    
    /**
     * @notice Custom verification hook called after successful verification
     * @dev This is where we implement our fitness-specific verification logic
     * @param _output The verification output from Self Protocol
     * @param _userData The user data containing context and custom data
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory _output,
        bytes memory _userData
    ) internal override {
        // Extract user address from the verification output
        address userAddress = address(uint160(_output.userIdentifier));
        
        // Prevent re-verification (users can only verify once)
        if (verifiedHumans[userAddress]) {
            emit VerificationFailed(
                userAddress,
                "User already verified",
                block.timestamp
            );
            return;
        }
        
        // Mark user as verified
        verifiedHumans[userAddress] = true;
        verificationTimestamps[userAddress] = block.timestamp;
        totalVerifiedUsers++;
        lastVerifiedUser = userAddress;
        
        // Parse platform information from user data
        string memory platform = _parsePlatformFromUserData(_userData);
        
        // Emit verification success event
        emit UserVerified(
            userAddress,
            block.timestamp,
            bytes32(uint256(uint160(userAddress))), // Convert address back to bytes32
            platform
        );
    }
    
    // =============================================================================
    // PUBLIC VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Check if a user is verified
     * @param user The user address to check
     * @return True if the user is verified
     */
    function isVerifiedHuman(address user) external view returns (bool) {
        return verifiedHumans[user];
    }
    
    /**
     * @notice Get verification timestamp for a user
     * @param user The user address
     * @return The timestamp when the user was verified (0 if not verified)
     */
    function getVerificationTimestamp(address user) external view returns (uint256) {
        return verificationTimestamps[user];
    }
    
    /**
     * @notice Get verification statistics
     * @return totalUsers Total number of verified users
     * @return lastUser Address of the most recently verified user
     * @return lastTimestamp Timestamp of the most recent verification
     */
    function getVerificationStats() external view returns (
        uint256 totalUsers,
        address lastUser,
        uint256 lastTimestamp
    ) {
        return (
            totalVerifiedUsers,
            lastVerifiedUser,
            lastVerifiedUser != address(0) ? verificationTimestamps[lastVerifiedUser] : 0
        );
    }
    
    // =============================================================================
    // INTERNAL HELPER FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Parse platform information from user data
     * @dev Extracts platform info from the userDefinedData sent by frontend
     * @param _userData The user data bytes
     * @return platform The platform string (e.g., "web", "mobile", "farcaster")
     */
    function _parsePlatformFromUserData(bytes memory _userData) internal pure returns (string memory platform) {
        // User data format: first 64 bytes are destChainId+userIdentifier, rest is userDefinedData
        if (_userData.length <= 64) {
            return "unknown";
        }
        
        // Extract userDefinedData portion
        bytes memory userDefinedData = new bytes(_userData.length - 64);
        for (uint256 i = 64; i < _userData.length; i++) {
            userDefinedData[i - 64] = _userData[i];
        }
        
        // Try to parse as JSON string to extract platform
        // For now, return a default value - could be enhanced with JSON parsing
        return "web";
    }
    
    // =============================================================================
    // ADMINISTRATIVE FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Transfer ownership of the contract
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "VerifiedFitness: Zero address");
        owner = newOwner;
    }
    
    /**
     * @notice Emergency function to manually verify a user (for testing/recovery)
     * @param user The user address to verify
     * @dev Should only be used in exceptional circumstances
     */
    function emergencyVerifyUser(address user) external onlyOwner {
        require(!verifiedHumans[user], "VerifiedFitness: Already verified");
        
        verifiedHumans[user] = true;
        verificationTimestamps[user] = block.timestamp;
        totalVerifiedUsers++;
        lastVerifiedUser = user;
        
        emit UserVerified(user, block.timestamp, bytes32(uint256(uint160(user))), "manual");
    }
}
