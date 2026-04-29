// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IGigRegistry {
    function gigClient(uint256 gigId) external view returns (address);
}

contract WorkAgreement {
    enum AgreementStatus {
        Draft,
        Active,
        Completed,
        Cancelled
    }

    struct Agreement {
        uint256 id;
        uint256 gigId;
        address client;
        address worker;
        address escrowContract;
        string termsURI;
        uint256 amount;
        uint64 createdAt;
        AgreementStatus status;
    }

    IGigRegistry public immutable gigRegistry;
    uint256 public nextAgreementId = 1;

    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(
        uint256 indexed agreementId,
        uint256 indexed gigId,
        address indexed client,
        address worker,
        address escrowContract,
        uint256 amount,
        string termsURI
    );
    event AgreementAccepted(uint256 indexed agreementId, address indexed worker);
    event AgreementCompleted(uint256 indexed agreementId, address indexed client);
    event AgreementCancelled(uint256 indexed agreementId, address indexed cancelledBy);
    event AgreementTermsUpdated(uint256 indexed agreementId, string termsURI);

    constructor(address gigRegistry_) {
        require(gigRegistry_ != address(0), "registry required");
        gigRegistry = IGigRegistry(gigRegistry_);
    }

    modifier agreementExists(uint256 agreementId) {
        require(agreements[agreementId].client != address(0), "agreement not found");
        _;
    }

    modifier onlyClient(uint256 agreementId) {
        require(agreements[agreementId].client == msg.sender, "not client");
        _;
    }

    modifier onlyWorker(uint256 agreementId) {
        require(agreements[agreementId].worker == msg.sender, "not worker");
        _;
    }

    function createAgreement(
        uint256 gigId,
        address worker,
        address escrowContract,
        uint256 amount,
        string calldata termsURI
    ) external returns (uint256 agreementId) {
        address client = gigRegistry.gigClient(gigId);

        require(client != address(0), "gig not found");
        require(client == msg.sender, "not gig client");
        require(worker != address(0), "worker required");
        require(worker != msg.sender, "worker is client");
        require(escrowContract != address(0), "escrow required");
        require(amount != 0, "amount required");
        require(bytes(termsURI).length != 0, "terms required");

        agreementId = nextAgreementId++;
        agreements[agreementId] = Agreement({
            id: agreementId,
            gigId: gigId,
            client: msg.sender,
            worker: worker,
            escrowContract: escrowContract,
            termsURI: termsURI,
            amount: amount,
            createdAt: uint64(block.timestamp),
            status: AgreementStatus.Draft
        });

        emit AgreementCreated(
            agreementId,
            gigId,
            msg.sender,
            worker,
            escrowContract,
            amount,
            termsURI
        );
    }

    function acceptAgreement(
        uint256 agreementId
    ) external agreementExists(agreementId) onlyWorker(agreementId) {
        Agreement storage agreement = agreements[agreementId];
        require(agreement.status == AgreementStatus.Draft, "not draft");

        agreement.status = AgreementStatus.Active;
        emit AgreementAccepted(agreementId, msg.sender);
    }

    function updateTerms(
        uint256 agreementId,
        string calldata termsURI
    ) external agreementExists(agreementId) onlyClient(agreementId) {
        Agreement storage agreement = agreements[agreementId];
        require(agreement.status == AgreementStatus.Draft, "not draft");
        require(bytes(termsURI).length != 0, "terms required");

        agreement.termsURI = termsURI;
        emit AgreementTermsUpdated(agreementId, termsURI);
    }

    function markCompleted(
        uint256 agreementId
    ) external agreementExists(agreementId) onlyClient(agreementId) {
        Agreement storage agreement = agreements[agreementId];
        require(agreement.status == AgreementStatus.Active, "not active");

        agreement.status = AgreementStatus.Completed;
        emit AgreementCompleted(agreementId, msg.sender);
    }

    function cancelAgreement(
        uint256 agreementId
    ) external agreementExists(agreementId) {
        Agreement storage agreement = agreements[agreementId];
        require(
            agreement.client == msg.sender || agreement.worker == msg.sender,
            "not participant"
        );
        require(
            agreement.status == AgreementStatus.Draft ||
                agreement.status == AgreementStatus.Active,
            "not cancellable"
        );

        agreement.status = AgreementStatus.Cancelled;
        emit AgreementCancelled(agreementId, msg.sender);
    }
}
