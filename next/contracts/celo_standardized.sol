// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FitnessLeaderboardCeloStandardized
 * @dev A leaderboard contract for tracking fitness scores optimized for Celo Mainnet
 * Standardized version with consistent struct layout across all networks
 */
contract FitnessLeaderboardCeloStandardized {
    // Custom errors for gas efficiency and better error reporting
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error UserNotFound();
    error Unauthorized();
    error InvalidInput();
    error OperationFailed();

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
    mapping(address => uint256) public lastSubmissionOffset; // Store last submission time

    // Constants with default values - adjusted for Celo's 5-second block time
    uint256 public SUBMISSION_COOLDOWN = 1 minutes; // Standard cooldown works well on Celo too
    uint256 public MAX_SCORE_PER_SUBMISSION = 100;
    address public owner;

    // Network identification
    uint256 public immutable deployedChainId;

    // Celo mainnet chain ID constant
    uint256 public constant CELO_MAINNET_CHAINID = 42220;

    // Flags for emergency controls
    bool public submissionsEnabled = true;

    // Charity fee configuration
    address public charityAddress;
    uint256 public charityFeeAmount = 1e17; // 0.1 CELO in wei (10^17)

    // Events - improved naming for consistency
    event ScoreAdded(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxScorePerSubmissionChanged(uint256 newMaxScore);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SubmissionStatusChanged(bool enabled);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event StablecoinWithdrawal(address indexed to, address token, uint256 amount);
    event CharityDonation(address indexed charity, uint256 amount);
    event CharityDonationERC20(address indexed charity, address token, uint256 amount);
    event CharityAddressChanged(address indexed oldCharity, address indexed newCharity);
    event CharityFeeChanged(uint256 oldFee, uint256 newFee);

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenSubmissionsEnabled() {
        if (!submissionsEnabled) revert OperationFailed();
        _;
    }

    modifier onlyCeloNetwork() {
        uint256 id;
        assembly {
            id := chainid()
        }
        if (id != CELO_MAINNET_CHAINID) revert OperationFailed();
        _;
    }

    constructor() {
        owner = msg.sender;
        charityAddress = 0x0e5DaC01687592597d3e4307cdB7B3B616F2822E; // Set initial charity address

        // Store the chain ID at deployment for network awareness
        uint256 id;
        assembly {
            id := chainid()
        }
        deployedChainId = id;

        // Emit initial events for indexing
        emit OwnershipTransferred(address(0), msg.sender);
        emit CharityAddressChanged(address(0), charityAddress);
    }

    /**
     * @dev Add a new score to the leaderboard with enhanced error handling and gas optimization
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function addScore(uint256 _pushups, uint256 _squats) external whenSubmissionsEnabled {
        // Validate submission parameters
        validateSubmission(_pushups, _squats);

        // Check cooldown period
        checkCooldown(msg.sender);

        // Update user's score
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            // New user
            addNewUserScore(_pushups, _squats);
        } else {
            // Existing user
            updateUserScore(index - 1, _pushups, _squats);
        }

        // Update last submission time
        lastSubmissionOffset[msg.sender] = block.timestamp;

        // Emit event
        emit ScoreAdded(msg.sender, _pushups, _squats, block.timestamp);
    }

    /**
     * @dev Validate submission parameters
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function validateSubmission(uint256 _pushups, uint256 _squats) private view {
        if (_pushups > MAX_SCORE_PER_SUBMISSION)
            revert ScoreExceedsMaximum(_pushups, MAX_SCORE_PER_SUBMISSION);
        if (_squats > MAX_SCORE_PER_SUBMISSION)
            revert ScoreExceedsMaximum(_squats, MAX_SCORE_PER_SUBMISSION);
        if (_pushups == 0 && _squats == 0)
            revert InvalidInput();
    }

    /**
     * @dev Check if user can submit (cooldown period has passed)
     * @param user Address of the user
     */
    function checkCooldown(address user) private view {
        uint256 lastSubmission = lastSubmissionOffset[user];
        if (lastSubmission != 0) {
            uint256 timeSinceLastSubmission = block.timestamp - lastSubmission;
            if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
                revert CooldownNotExpired(SUBMISSION_COOLDOWN - timeSinceLastSubmission);
            }
        }
    }

    /**
     * @dev Add score for a new user
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function addNewUserScore(uint256 _pushups, uint256 _squats) private {
        leaderboard.push(Score({
            user: msg.sender,
            pushups: _pushups,
            squats: _squats,
            timestamp: block.timestamp
        }));
        userIndex[msg.sender] = leaderboard.length;
    }

    /**
     * @dev Update score for an existing user
     * @param index Index of the user in the leaderboard
     * @param _pushups Number of pushups to add
     * @param _squats Number of squats to add
     */
    function updateUserScore(uint256 index, uint256 _pushups, uint256 _squats) private {
        Score storage userScore = leaderboard[index];

        // Safe addition
        userScore.pushups += _pushups;
        userScore.squats += _squats;
        userScore.timestamp = block.timestamp;
    }

    /**
     * @dev Get the entire leaderboard
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
     * @dev Get the time until a user can submit again - optimized for Celo
     * @param _user Address of the user
     * @return Time in seconds until next submission (0 if can submit now)
     */
    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 lastSubmission = lastSubmissionOffset[_user];

        // If user has never submitted, they can submit now
        if (lastSubmission == 0) {
            return 0;
        }

        // If cooldown has passed, they can submit now
        if (block.timestamp >= lastSubmission + SUBMISSION_COOLDOWN) {
            return 0;
        }

        // Return remaining time
        return lastSubmission + SUBMISSION_COOLDOWN - block.timestamp;
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
     * @dev Update the charity address
     * @param newCharityAddress Address of the new charity
     */
    function setCharityAddress(address newCharityAddress) external onlyOwner {
        address oldCharity = charityAddress;
        charityAddress = newCharityAddress;
        emit CharityAddressChanged(oldCharity, newCharityAddress);
    }
    
    /**
     * @dev Update charity fee amount
     * @param newFeeAmount New fee amount in wei
     */
    function setCharityFeeAmount(uint256 newFeeAmount) external onlyOwner {
        uint256 oldFee = charityFeeAmount;
        charityFeeAmount = newFeeAmount;
        emit CharityFeeChanged(oldFee, newFeeAmount);
    }

    /**
     * @dev Emergency toggle for submissions
     * @param _enabled Whether submissions should be enabled
     */
    function toggleSubmissions(bool _enabled) external onlyOwner {
        submissionsEnabled = _enabled;
        emit SubmissionStatusChanged(_enabled); // Updated event name for consistency
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
     * @dev Verify this is running on Celo mainnet
     * @return True if running on Celo mainnet
     */
    function isCeloMainnet() external view returns (bool) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id == CELO_MAINNET_CHAINID;
    }

    /**
     * @dev Emergency withdrawal function in case CELO is sent to the contract
     * @param to Address to send CELO to
     */
    function emergencyWithdraw(address payable to) external onlyOwner {
        uint256 balance = address(this).balance;
        
        // Apply flat charity fee if we have enough balance
        uint256 charityAmount = balance >= charityFeeAmount ? charityFeeAmount : 0;
        uint256 remainingAmount = balance - charityAmount;
        
        // Send to charity if applicable
        if (charityAmount > 0 && charityAddress != address(0)) {
            (bool charitySuccess, ) = payable(charityAddress).call{value: charityAmount}("");
            if (!charitySuccess) revert OperationFailed();
            emit CharityDonation(charityAddress, charityAmount);
        } else {
            // If no charity fee applied, all goes to recipient
            remainingAmount = balance;
        }
        
        // Send remaining to recipient
        (bool success, ) = to.call{value: remainingAmount}("");
        if (!success) revert OperationFailed();
        emit EmergencyWithdrawal(to, remainingAmount);
    }

    /**
     * @dev Emergency withdrawal function for ERC20 tokens (including Celo stablecoins)
     * @param token Address of the ERC20 token
     * @param to Address to send tokens to
     */
    function emergencyWithdrawERC20(address token, address to) external onlyOwner {
        // Simple ERC20 interface
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        
        // For ERC20 withdrawals, we still apply 0.1 CELO equivalent fee
        // but only for the native Celo token (if it's part of withdrawal)
        uint256 charityAmount = 0;
        uint256 remainingAmount = balance;
        
        // Send to charity only if this is a CELO token and we have a valid charity address
        if (token == 0x471EcE3750Da237f93B8E339c536989b8978a438 && // Celo on Mainnet
            charityAddress != address(0)) {
            charityAmount = balance >= charityFeeAmount ? charityFeeAmount : 0;
            remainingAmount = balance - charityAmount;
            
            if (charityAmount > 0) {
                bool charitySuccess = tokenContract.transfer(charityAddress, charityAmount);
                if (!charitySuccess) revert OperationFailed();
                emit CharityDonationERC20(charityAddress, token, charityAmount);
            }
        }
        
        // Send remaining to recipient
        bool success = tokenContract.transfer(to, remainingAmount);
        if (!success) revert OperationFailed();
        
        emit StablecoinWithdrawal(to, token, remainingAmount);
    }

    /**
     * @dev Fallback function to accept CELO
     */
    receive() external payable {}
}

/**
 * @dev Minimal ERC20 interface for token interactions
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}