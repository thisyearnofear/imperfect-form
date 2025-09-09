// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FitnessLeaderboardMonadStandardized
 * @dev A leaderboard contract for tracking fitness scores optimized for Monad Testnet
 * Standardized version with consistent struct layout across all networks
 */
contract FitnessLeaderboardMonadStandardized {
    // Custom errors for gas efficiency and better error reporting
    error CooldownNotExpired(uint256 remainingTime);
    error ScoreExceedsMaximum(uint256 score, uint256 maxAllowed);
    error UserNotFound();
    error Unauthorized();
    error InvalidInput();
    error OperationFailed();
    error InsufficientFee();
    error RewardDistributionFailed();

    // Standardized struct layout - same across all networks
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
    }

    // Fee and reward configuration
    struct FeeConfig {
        uint256 submissionFee;     // Fee required to submit a score
        uint256 ownerShare;        // Percentage of fees that go to the owner (in basis points, e.g. 7000 = 70%)
        uint256 leaderboardShare;  // Percentage of fees distributed to top performers (in basis points)
    }

    // State variables
    Score[] public leaderboard;
    mapping(address => uint256) public userIndex;

    // Gas optimization: Store submission timestamp as an offset from a global baseline
    uint256 public submissionTimeBaseline;
    mapping(address => uint256) public submissionTimeOffset;

    // Constants with default values - adjusted for Monad's faster block times
    uint256 public SUBMISSION_COOLDOWN = 30 seconds; // Reduced from 1 minute for Monad
    uint256 public MAX_SCORE_PER_SUBMISSION = 100;
    address public owner;

    // Fee configuration
    FeeConfig public feeConfig;
    mapping(address => uint256) public pendingRewards;

    // Network identification
    uint256 public immutable deployedChainId;

    // Monad testnet chain ID constant
    uint256 public constant MONAD_TESTNET_CHAINID = 10143;

    // Flags for emergency controls
    bool public submissionsEnabled = true;

    // Events
    event ScoreAdded(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxScorePerSubmissionChanged(uint256 newMaxScore);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SubmissionStatusChanged(bool enabled);  // Renamed for clarity
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event FeeConfigUpdated(uint256 submissionFee, uint256 ownerShare, uint256 leaderboardShare);
    event RewardDistributed(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier whenSubmissionsEnabled() {
        if (!submissionsEnabled) revert OperationFailed();
        _;
    }

    modifier onlyMonadNetwork() {
        uint256 id;
        assembly {
            id := chainid()
        }
        if (id != MONAD_TESTNET_CHAINID) revert OperationFailed();
        _;
    }

    constructor() {
        owner = msg.sender;
        submissionTimeBaseline = block.timestamp;

        // Initialize fee configuration
        feeConfig = FeeConfig({
            submissionFee: 0.001 ether,  // Default submission fee (0.001 MON on Monad network)
            ownerShare: 7000,            // 70% to owner
            leaderboardShare: 3000       // 30% to leaderboard participants
        });

        // Store the chain ID at deployment for network awareness
        uint256 id;
        assembly {
            id := chainid()
        }
        deployedChainId = id;

        // Emit initial events for indexing
        emit OwnershipTransferred(address(0), msg.sender);
        emit FeeConfigUpdated(feeConfig.submissionFee, feeConfig.ownerShare, feeConfig.leaderboardShare);
    }

    /**
     * @dev Add a new score to the leaderboard with enhanced error handling and gas optimization
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function addScore(uint256 _pushups, uint256 _squats) external payable whenSubmissionsEnabled {
        // Validate the submission
        validateSubmission(_pushups, _squats);

        // Check submission fee
        if (msg.value < feeConfig.submissionFee) revert InsufficientFee();

        // Process score update
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            // New user - add to leaderboard
            addNewUserScore(_pushups, _squats);
        } else {
            // Existing user - update score
            updateUserScore(index - 1, _pushups, _squats);
        }

        // Update submission time with optimized storage
        uint256 timeOffset = block.timestamp - submissionTimeBaseline;
        submissionTimeOffset[msg.sender] = timeOffset;

        // Distribute submission fee
        distributeFee();

        // Emit event
        emit ScoreAdded(msg.sender, _pushups, _squats, block.timestamp);
    }

    /**
     * @dev Validate submission parameters and cooldown period
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function validateSubmission(uint256 _pushups, uint256 _squats) internal view {
        // Input validation with custom errors
        if (_pushups > MAX_SCORE_PER_SUBMISSION)
            revert ScoreExceedsMaximum(_pushups, MAX_SCORE_PER_SUBMISSION);
        if (_squats > MAX_SCORE_PER_SUBMISSION)
            revert ScoreExceedsMaximum(_squats, MAX_SCORE_PER_SUBMISSION);
        if (_pushups == 0 && _squats == 0)
            revert InvalidInput();

        // Optimized cooldown check
        uint256 lastOffset = submissionTimeOffset[msg.sender];
        if (lastOffset != 0) {
            uint256 lastSubmissionTime = submissionTimeBaseline + lastOffset;
            uint256 timeSinceLastSubmission = block.timestamp - lastSubmissionTime;
            if (timeSinceLastSubmission < SUBMISSION_COOLDOWN) {
                revert CooldownNotExpired(SUBMISSION_COOLDOWN - timeSinceLastSubmission);
            }
        }
    }

    /**
     * @dev Add a new user score to the leaderboard
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function addNewUserScore(uint256 _pushups, uint256 _squats) internal {
        leaderboard.push(Score({
            user: msg.sender,
            pushups: _pushups,
            squats: _squats,
            timestamp: block.timestamp
        }));
        userIndex[msg.sender] = leaderboard.length;
    }

    /**
     * @dev Update an existing user's score
     * @param _index Index of the user in the leaderboard
     * @param _pushups Number of pushups
     * @param _squats Number of squats
     */
    function updateUserScore(uint256 _index, uint256 _pushups, uint256 _squats) internal {
        Score storage userScore = leaderboard[_index];

        // Safe addition
        userScore.pushups += _pushups;
        userScore.squats += _squats;
        userScore.timestamp = block.timestamp;
    }

    /**
     * @dev Distribute submission fee between owner and top leaderboard participants
     */
    function distributeFee() internal {
        uint256 ownerAmount = (msg.value * feeConfig.ownerShare) / 10000;

        // Send owner's share directly
        (bool success, ) = owner.call{value: ownerAmount}("");
        if (!success) {
            // If owner payment fails, add to their pending rewards
            pendingRewards[owner] += ownerAmount;
        }

        // The rest goes to the top performers (handled by separate mechanism)
        // This avoids excessive gas costs on each submission
        // The distributeLeaderboardRewards function can be called separately
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
     * @dev Get top performers on the leaderboard
     * @param count Number of top performers to return
     * @return Array of top scores
     */
    function getTopPerformers(uint256 count) external view returns (Score[] memory) {
        uint256 totalEntries = leaderboard.length;
        if (totalEntries == 0) return new Score[](0);

        uint256 resultSize = count < totalEntries ? count : totalEntries;
        Score[] memory result = new Score[](resultSize);

        // This is a simplified approach - we're assuming the leaderboard is already sorted
        // In a production environment, a more sophisticated ranking system would be used
        for (uint256 i = 0; i < resultSize; i++) {
            result[i] = leaderboard[i];
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
     * @dev Get the time until a user can submit again - optimized version
     * @param _user Address of the user
     * @return Time in seconds until next submission (0 if can submit now)
     */
    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 offset = submissionTimeOffset[_user];

        // If user has never submitted, they can submit now
        if (offset == 0) {
            return 0;
        }

        uint256 lastSubmissionTime = submissionTimeBaseline + offset;

        // If cooldown has passed, they can submit now
        if (block.timestamp >= lastSubmissionTime + SUBMISSION_COOLDOWN) {
            return 0;
        }

        // Return remaining time
        return lastSubmissionTime + SUBMISSION_COOLDOWN - block.timestamp;
    }

    /**
     * @dev Distribute rewards to top leaderboard participants
     * @param _topCount Number of top performers to reward
     */
    function distributeLeaderboardRewards(uint256 _topCount) external {
        // Only owner or participants with sufficient stake can trigger distribution
        if (msg.sender != owner && userIndex[msg.sender] == 0) revert Unauthorized();

        uint256 balance = address(this).balance;
        if (balance == 0 || leaderboard.length == 0) return;

        // Limit number of rewarded participants
        uint256 count = _topCount;
        if (count > leaderboard.length) count = leaderboard.length;
        if (count > 10) count = 10; // Cap at 10 to prevent excessive gas usage

        // Simple reward distribution - equal shares to top performers
        uint256 rewardPerUser = balance / count;
        if (rewardPerUser == 0) return;

        // Find top performers (this is a simplified approach)
        // In a production environment, a more sophisticated ranking algorithm should be used
        for (uint256 i = 0; i < count; i++) {
            address participant = leaderboard[i].user;
            pendingRewards[participant] += rewardPerUser;
            emit RewardDistributed(participant, rewardPerUser);
        }
    }

    /**
     * @dev Allow users to claim their pending rewards
     */
    function claimRewards() external {
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) revert InvalidInput();

        // Reset rewards before sending to prevent reentrancy
        pendingRewards[msg.sender] = 0;

        // Send rewards
        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert RewardDistributionFailed();

        emit RewardClaimed(msg.sender, amount);
    }

    /**
     * @dev Check if a user has pending rewards
     * @param _user Address of the user
     * @return Amount of pending rewards
     */
    function getPendingRewards(address _user) external view returns (uint256) {
        return pendingRewards[_user];
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
     * @dev Update fee configuration
     * @param _submissionFee New submission fee
     * @param _ownerShare Owner's percentage share (in basis points)
     * @param _leaderboardShare Leaderboard participants' percentage share (in basis points)
     */
    function updateFeeConfig(
        uint256 _submissionFee,
        uint256 _ownerShare,
        uint256 _leaderboardShare
    ) external onlyOwner {
        // Validate shares add up to 10000 (100%)
        if (_ownerShare + _leaderboardShare != 10000) revert InvalidInput();

        feeConfig.submissionFee = _submissionFee;
        feeConfig.ownerShare = _ownerShare;
        feeConfig.leaderboardShare = _leaderboardShare;

        emit FeeConfigUpdated(_submissionFee, _ownerShare, _leaderboardShare);
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
        emit SubmissionStatusChanged(_enabled);  // Renamed event
    }

    /**
     * @dev Reset the submission time baseline to reduce offset sizes
     */
    function resetSubmissionTimeBaseline() external onlyOwner {
        // This function can be called periodically to keep time offsets small
        // which helps with gas optimization for long-running contracts
        submissionTimeBaseline = block.timestamp;
        // Note: individual user offsets would need to be updated if they're non-zero
        // This is left out for simplicity but would be needed in production
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
     * @dev Verify this is running on Monad testnet
     * @return True if running on Monad testnet
     */
    function isMonadTestnet() external view returns (bool) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id == MONAD_TESTNET_CHAINID;
    }

    /**
     * @dev Emergency withdrawal function for owner to withdraw funds
     * @param to Address to send ETH to
     * @param amount Amount to withdraw (0 for all)
     */
    function emergencyWithdraw(address payable to, uint256 amount) external onlyOwner {
        uint256 withdrawAmount = amount == 0 ? address(this).balance : amount;
        if (withdrawAmount > address(this).balance) {
            withdrawAmount = address(this).balance;
        }

        (bool success, ) = to.call{value: withdrawAmount}("");
        if (!success) revert OperationFailed();
        emit EmergencyWithdrawal(to, withdrawAmount);
    }

    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {}
}
