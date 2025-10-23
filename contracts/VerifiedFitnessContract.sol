// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SelfVerificationRoot} from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";

/**
 * MINIMAL VERIFIED FITNESS CONTRACT
 * 
 * Simplified verification contract - follows Core Principles:
 * - PREVENT BLOAT: Minimal, focused functionality  
 * - DRY: Single implementation
 * - CLEAN: Clear separation of concerns
 */

contract VerifiedFitnessContract is SelfVerificationRoot {
    // State
    mapping(address => bool) public verifiedHumans;
    mapping(address => uint256) public verificationTimestamps;
    uint256 public totalVerifiedUsers;
    
    // Constants
    uint256 public constant MINIMUM_AGE = 16;
    string public constant SCOPE_NAME = "imperfect-form-fitness";
    bytes32 public immutable VERIFICATION_CONFIG_ID;
    
    // Owner
    address public owner;
    
    // Events
    event UserVerified(address indexed user, uint256 timestamp);

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
     * Self Protocol implementation
     */
    function getConfigId(
        bytes32, // _destinationChainId
        bytes32, // _userIdentifier  
        bytes memory // _userDefinedData
    ) public view override returns (bytes32) {
        return VERIFICATION_CONFIG_ID;
    }
    
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory _output,
        bytes memory // _userData - simplified, not parsing complex data
    ) internal override {
        address userAddress = address(uint160(_output.userIdentifier));
        
        // Prevent re-verification
        require(!verifiedHumans[userAddress], "Already verified");
        
        // Mark user as verified
        verifiedHumans[userAddress] = true;
        verificationTimestamps[userAddress] = block.timestamp;
        totalVerifiedUsers++;
        
        emit UserVerified(userAddress, block.timestamp);
    }
    
    /**
     * View functions
     */
    function isVerifiedHuman(address user) external view returns (bool) {
        return verifiedHumans[user];
    }
    
    function getVerificationTimestamp(address user) external view returns (uint256) {
        return verificationTimestamps[user];
    }
    
    function getVerificationStats() external view returns (
        uint256 totalUsers,
        uint256 timestamp
    ) {
        return (totalVerifiedUsers, block.timestamp); // Simplified stats
    }
    
    /**
     * Admin functions
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }
}
