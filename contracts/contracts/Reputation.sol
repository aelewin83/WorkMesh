// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Reputation {
    enum ReputationOutcome {
        Completion,
        Dispute,
        Cancellation
    }

    struct Profile {
        uint32 completedGigs;
        uint32 disputedGigs;
        uint32 cancelledGigs;
        uint32 ratingCount;
        uint256 ratingTotal;
        int256 score;
    }

    mapping(address => bool) public admins;
    uint256 public adminCount;

    mapping(uint256 => bool) public reputationRecorded;
    mapping(address => Profile) private profiles;

    event AdminAdded(address indexed account);
    event AdminRemoved(address indexed account);
    event ReputationRecorded(
        uint256 indexed agreementId,
        address indexed subject,
        address indexed recordedBy,
        ReputationOutcome outcome,
        uint8 rating
    );
    event AttestationIssued(
        uint256 indexed agreementId,
        address indexed subject,
        address indexed recordedBy,
        uint8 rating,
        bytes32 reviewHash
    );

    modifier onlyAdmin() {
        require(admins[msg.sender], "not admin");
        _;
    }

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "admin required");

        admins[initialAdmin] = true;
        adminCount = 1;
        emit AdminAdded(initialAdmin);
    }

    function addAdmin(address account) external onlyAdmin {
        require(account != address(0), "admin required");
        require(!admins[account], "admin exists");

        admins[account] = true;
        adminCount++;
        emit AdminAdded(account);
    }

    function removeAdmin(address account) external onlyAdmin {
        require(admins[account], "admin not found");
        require(adminCount > 1, "last admin");

        admins[account] = false;
        adminCount--;
        emit AdminRemoved(account);
    }

    function recordCompletion(
        uint256 agreementId,
        address subject,
        uint8 rating
    ) external onlyAdmin {
        require(rating >= 1 && rating <= 5, "invalid rating");
        _recordOnce(agreementId, subject);

        Profile storage profile = profiles[subject];
        profile.completedGigs++;
        profile.ratingCount++;
        profile.ratingTotal += rating;
        profile.score += int256(uint256(rating)) + 5;

        emit ReputationRecorded(
            agreementId,
            subject,
            msg.sender,
            ReputationOutcome.Completion,
            rating
        );
    }

    function issueAttestation(
        uint256 agreementId,
        address subject,
        uint8 rating,
        bytes32 reviewHash
    ) external onlyAdmin {
        require(rating >= 1 && rating <= 5, "invalid rating");
        _recordOnce(agreementId, subject);

        Profile storage profile = profiles[subject];
        profile.completedGigs++;
        profile.ratingCount++;
        profile.ratingTotal += rating;
        profile.score += int256(uint256(rating)) + 5;

        emit AttestationIssued(agreementId, subject, msg.sender, rating, reviewHash);
    }

    function recordDispute(
        uint256 agreementId,
        address subject
    ) external onlyAdmin {
        _recordOnce(agreementId, subject);

        Profile storage profile = profiles[subject];
        profile.disputedGigs++;
        profile.score -= 5;

        emit ReputationRecorded(
            agreementId,
            subject,
            msg.sender,
            ReputationOutcome.Dispute,
            0
        );
    }

    function recordCancellation(
        uint256 agreementId,
        address subject
    ) external onlyAdmin {
        _recordOnce(agreementId, subject);

        Profile storage profile = profiles[subject];
        profile.cancelledGigs++;
        profile.score -= 1;

        emit ReputationRecorded(
            agreementId,
            subject,
            msg.sender,
            ReputationOutcome.Cancellation,
            0
        );
    }

    function profileOf(address account) external view returns (Profile memory) {
        return profiles[account];
    }

    function averageRating(address account) external view returns (uint256) {
        Profile storage profile = profiles[account];
        if (profile.ratingCount == 0) {
            return 0;
        }

        return (profile.ratingTotal * 1e18) / profile.ratingCount;
    }

    function _recordOnce(uint256 agreementId, address subject) private {
        require(agreementId != 0, "agreement required");
        require(subject != address(0), "subject required");
        require(!reputationRecorded[agreementId], "reputation already recorded");

        reputationRecorded[agreementId] = true;
    }
}
