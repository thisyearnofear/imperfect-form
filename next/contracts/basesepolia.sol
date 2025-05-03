/**
 *Submitted for verification at sepolia.basescan.org on 2024-09-18
*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FitnessLeaderboard {
    struct Score {
        address user;
        uint256 pushups;
        uint256 squats;
        uint256 timestamp;
    }

    Score[] public leaderboard;
    mapping(address => uint256) public userIndex;
    mapping(address => uint256) public lastSubmissionTime;

    // Change submission cooldown from 1 hour to 1 minute
    uint256 public SUBMISSION_COOLDOWN = 1 minutes;
    uint256 public MAX_SCORE_PER_SUBMISSION = 100;
    address public owner;

    event ScoreAdded(address indexed user, uint256 pushups, uint256 squats, uint256 timestamp);
    event SubmissionCooldownChanged(uint256 newCooldown);
    event MaxScorePerSubmissionChanged(uint256 newMaxScore);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addScore(uint256 _pushups, uint256 _squats) external {
        require(_pushups <= MAX_SCORE_PER_SUBMISSION && _squats <= MAX_SCORE_PER_SUBMISSION, "Score exceeds maximum allowed");
        require(block.timestamp >= lastSubmissionTime[msg.sender] + SUBMISSION_COOLDOWN, "Submission cooldown not met");

        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            leaderboard.push(Score(msg.sender, _pushups, _squats, block.timestamp));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            Score storage userScore = leaderboard[index - 1];
            userScore.pushups += _pushups;
            userScore.squats += _squats;
            userScore.timestamp = block.timestamp;
        }

        lastSubmissionTime[msg.sender] = block.timestamp;
        emit ScoreAdded(msg.sender, _pushups, _squats, block.timestamp);
    }

    function getLeaderboard() external view returns (Score[] memory) {
        return leaderboard;
    }

    function getUserScore(address _user) external view returns (Score memory) {
        uint256 index = userIndex[_user];
        require(index > 0, "User not found");
        return leaderboard[index - 1];
    }

    function getTimeUntilNextSubmission(address _user) external view returns (uint256) {
        uint256 timeSinceLastSubmission = block.timestamp - lastSubmissionTime[_user];
        if (timeSinceLastSubmission >= SUBMISSION_COOLDOWN) {
            return 0;
        }
        return SUBMISSION_COOLDOWN - timeSinceLastSubmission;
    }

    // Admin-only functions to modify contract parameters
    function setSubmissionCooldown(uint256 _cooldown) external onlyOwner {
        SUBMISSION_COOLDOWN = _cooldown;
        emit SubmissionCooldownChanged(_cooldown);
    }

    function setMaxScorePerSubmission(uint256 _maxScore) external onlyOwner {
        MAX_SCORE_PER_SUBMISSION = _maxScore;
        emit MaxScorePerSubmissionChanged(_maxScore);
    }

    // Function to transfer ownership 
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}