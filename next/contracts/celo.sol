// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FitnessLeaderboardCelo
 * @dev A leaderboard contract for tracking fitness scores optimized for Celo Mainnet
 * Based on FitnessLeaderboardV2 with Celo-specific optimizations and further improvements
 */
contract FitnessLeaderboardCelo {
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
    mapping(address => uint32) public lastSubmissionOffset; // Gas optimization: store offset instead of timestamp

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

    // Events - improved naming for consistency
    event ScoreAdded(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxScorePerSubmissionChanged(uint256 newMaxScore);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SubmissionStatusChanged(bool enabled);
    event EmergencyWithdrawal(address indexed to, uint256 amount);
    event StablecoinWithdrawal(address indexed to, address token, uint256 amount);

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

        // Update last submission time as an offset for gas optimization
        lastSubmissionOffset[msg.sender] = uint32(block.timestamp);

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
        uint32 lastSubmission = lastSubmissionOffset[user];
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
            pushups: uint16(_pushups), // Safe conversion with validation above
            squats: uint16(_squats),   // Safe conversion with validation above
            timestamp: uint32(block.timestamp) // Safe until year 2106
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

        // Safe addition with overflow check
        uint256 newPushups = uint256(userScore.pushups) + _pushups;
        uint256 newSquats = uint256(userScore.squats) + _squats;

        // Cap at uint16 max if overflow would occur
        userScore.pushups = newPushups > type(uint16).max ? type(uint16).max : uint16(newPushups);
        userScore.squats = newSquats > type(uint16).max ? type(uint16).max : uint16(newSquats);
        userScore.timestamp = uint32(block.timestamp);
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
        uint32 lastSubmission = lastSubmissionOffset[_user];

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
        (bool success, ) = to.call{value: balance}("");
        if (!success) revert OperationFailed();
        emit EmergencyWithdrawal(to, balance);
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

        bool success = tokenContract.transfer(to, balance);
        if (!success) revert OperationFailed();

        emit StablecoinWithdrawal(to, token, balance);
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
