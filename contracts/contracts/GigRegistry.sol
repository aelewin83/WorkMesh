// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GigRegistry {
    enum GigStatus {
        Open,
        Filled,
        Closed,
        Cancelled
    }

    struct Gig {
        uint256 id;
        address client;
        string metadataURI;
        uint256 budget;
        uint64 createdAt;
        GigStatus status;
    }

    uint256 public nextGigId = 1;

    mapping(uint256 => Gig) public gigs;

    event GigCreated(
        uint256 indexed gigId,
        address indexed client,
        string metadataURI,
        uint256 budget
    );
    event GigStatusUpdated(
        uint256 indexed gigId,
        GigStatus previousStatus,
        GigStatus newStatus
    );
    event GigMetadataUpdated(uint256 indexed gigId, string metadataURI);

    modifier onlyGigClient(uint256 gigId) {
        require(gigs[gigId].client != address(0), "gig not found");
        require(gigs[gigId].client == msg.sender, "not gig client");
        _;
    }

    function createGig(
        string calldata metadataURI,
        uint256 budget
    ) external returns (uint256 gigId) {
        require(bytes(metadataURI).length != 0, "metadata required");
        require(budget != 0, "budget required");

        gigId = nextGigId++;
        gigs[gigId] = Gig({
            id: gigId,
            client: msg.sender,
            metadataURI: metadataURI,
            budget: budget,
            createdAt: uint64(block.timestamp),
            status: GigStatus.Open
        });

        emit GigCreated(gigId, msg.sender, metadataURI, budget);
    }

    function updateGigMetadata(
        uint256 gigId,
        string calldata metadataURI
    ) external onlyGigClient(gigId) {
        require(bytes(metadataURI).length != 0, "metadata required");

        gigs[gigId].metadataURI = metadataURI;
        emit GigMetadataUpdated(gigId, metadataURI);
    }

    function updateGigStatus(
        uint256 gigId,
        GigStatus newStatus
    ) external onlyGigClient(gigId) {
        Gig storage gig = gigs[gigId];
        GigStatus previousStatus = gig.status;

        require(previousStatus != newStatus, "status unchanged");
        gig.status = newStatus;

        emit GigStatusUpdated(gigId, previousStatus, newStatus);
    }

    function gigClient(uint256 gigId) external view returns (address) {
        return gigs[gigId].client;
    }

    function gigExists(uint256 gigId) external view returns (bool) {
        return gigs[gigId].client != address(0);
    }
}
