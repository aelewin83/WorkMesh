// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum EscrowStatus {
        None,
        Funded,
        PayoutVerified,
        Refunded,
        Disputed
    }

    enum DisputeResolution {
        Refund,
        Payout
    }

    struct EscrowDeposit {
        uint256 id;
        uint256 workAgreementId;
        address payer;
        address payable payee;
        uint256 amount;
        EscrowStatus status;
        uint64 createdAt;
    }

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint16 public constant MAX_PLATFORM_FEE_BPS = 2_000;

    uint256 public nextEscrowId = 1;
    uint256 public adminActionNonce;
    uint16 public platformFeeBps;
    address public treasuryWallet;

    mapping(uint256 => EscrowDeposit) public deposits;
    mapping(address => bool) public admins;
    uint256 public adminCount;
    uint256 public adminThreshold;

    mapping(bytes32 => mapping(address => bool)) private adminActionApproved;
    mapping(bytes32 => uint256) public adminActionApprovalCount;

    bool private locked;

    event EscrowFunded(
        uint256 indexed escrowId,
        uint256 indexed workAgreementId,
        address indexed payer,
        address payee,
        uint256 amount
    );
    event PayoutVerified(
        uint256 indexed agreementId,
        address indexed worker,
        uint256 amount,
        uint256 timestamp
    );
    event FeeCollected(
        uint256 indexed agreementId,
        uint256 grossAmount,
        uint256 feeAmount,
        address indexed treasuryWallet,
        uint256 timestamp
    );
    event RefundIssued(
        uint256 indexed escrowId,
        address indexed payer,
        uint256 amount,
        uint256 feeWaived
    );
    event DisputeOpened(
        uint256 indexed escrowId,
        address indexed openedBy,
        string reasonURI
    );
    event DisputeResolved(
        uint256 indexed escrowId,
        address indexed resolvedBy,
        DisputeResolution resolution
    );
    event AdminActionApproved(
        bytes32 indexed action,
        address indexed admin,
        uint256 approvals,
        uint256 threshold
    );
    event AdminActionExecuted(bytes32 indexed action, address indexed executedBy);
    event AdminAdded(address indexed account);
    event AdminRemoved(address indexed account);
    event AdminThresholdUpdated(uint256 previousThreshold, uint256 newThreshold);
    event PlatformFeeUpdated(uint16 previousFeeBps, uint16 newFeeBps);
    event TreasuryWalletUpdated(address indexed previousTreasury, address indexed newTreasury);

    modifier nonReentrant() {
        require(!locked, "reentrant call");
        locked = true;
        _;
        locked = false;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "not admin");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(deposits[escrowId].payer != address(0), "escrow not found");
        _;
    }

    constructor(
        address treasuryWallet_,
        uint16 platformFeeBps_,
        address[] memory initialAdmins,
        uint256 adminThreshold_
    ) {
        require(treasuryWallet_ != address(0), "treasury required");
        require(platformFeeBps_ <= MAX_PLATFORM_FEE_BPS, "fee too high");
        require(initialAdmins.length != 0, "admins required");
        require(adminThreshold_ != 0, "threshold required");
        require(adminThreshold_ <= initialAdmins.length, "threshold too high");

        treasuryWallet = treasuryWallet_;
        platformFeeBps = platformFeeBps_;
        adminThreshold = adminThreshold_;

        for (uint256 i = 0; i < initialAdmins.length; i++) {
            address admin = initialAdmins[i];
            require(admin != address(0), "admin required");
            require(!admins[admin], "duplicate admin");

            admins[admin] = true;
            adminCount++;
            emit AdminAdded(admin);
        }
    }

    receive() external payable {
        revert("use fundEscrow");
    }

    function fundEscrow(
        uint256 workAgreementId,
        address payable payee
    ) external payable nonReentrant returns (uint256 escrowId) {
        require(workAgreementId != 0, "agreement required");
        require(payee != address(0), "payee required");
        require(payee != msg.sender, "payee is payer");
        require(msg.value != 0, "funding required");

        escrowId = nextEscrowId++;
        deposits[escrowId] = EscrowDeposit({
            id: escrowId,
            workAgreementId: workAgreementId,
            payer: msg.sender,
            payee: payee,
            amount: msg.value,
            status: EscrowStatus.Funded,
            createdAt: uint64(block.timestamp)
        });

        emit EscrowFunded(escrowId, workAgreementId, msg.sender, payee, msg.value);
    }

    function verifyPayout(
        uint256 escrowId
    ) external nonReentrant escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.payer == msg.sender, "not payer");
        require(deposit.status == EscrowStatus.Funded, "not funded");

        _releasePayout(escrowId, deposit);
    }

    function releaseToWorker(
        uint256 escrowId
    ) external nonReentrant escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.payer == msg.sender, "not payer");
        require(deposit.status == EscrowStatus.Funded, "not funded");

        _releasePayout(escrowId, deposit);
    }

    function refund(
        uint256 escrowId
    ) external nonReentrant escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.payer == msg.sender, "not payer");
        require(
            deposit.status == EscrowStatus.Funded ||
                deposit.status == EscrowStatus.Disputed,
            "not refundable"
        );

        _issueRefund(escrowId, deposit);
    }

    function refundEmployer(
        uint256 escrowId
    ) external nonReentrant escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.payer == msg.sender, "not payer");
        require(
            deposit.status == EscrowStatus.Funded ||
                deposit.status == EscrowStatus.Disputed,
            "not refundable"
        );

        _issueRefund(escrowId, deposit);
    }

    function openDispute(
        uint256 escrowId,
        string calldata reasonURI
    ) external escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(
            deposit.payer == msg.sender || deposit.payee == msg.sender,
            "not participant"
        );
        require(deposit.status == EscrowStatus.Funded, "not funded");

        deposit.status = EscrowStatus.Disputed;
        emit DisputeOpened(escrowId, msg.sender, reasonURI);
    }

    function raiseDispute(
        uint256 escrowId,
        string calldata reasonURI
    ) external escrowExists(escrowId) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(
            deposit.payer == msg.sender || deposit.payee == msg.sender,
            "not participant"
        );
        require(deposit.status == EscrowStatus.Funded, "not funded");

        deposit.status = EscrowStatus.Disputed;
        emit DisputeOpened(escrowId, msg.sender, reasonURI);
    }

    function resolveDisputeWithRefund(
        uint256 escrowId
    ) external onlyAdmin nonReentrant escrowExists(escrowId) returns (bool executed) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.status == EscrowStatus.Disputed, "not disputed");

        bytes32 action = keccak256(abi.encode("DISPUTE_REFUND", escrowId));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        _issueRefund(escrowId, deposit);
        emit DisputeResolved(escrowId, msg.sender, DisputeResolution.Refund);
        return true;
    }

    function resolveDisputeWithPayout(
        uint256 escrowId
    ) external onlyAdmin nonReentrant escrowExists(escrowId) returns (bool executed) {
        EscrowDeposit storage deposit = deposits[escrowId];
        require(deposit.status == EscrowStatus.Disputed, "not disputed");

        bytes32 action = keccak256(abi.encode("DISPUTE_PAYOUT", escrowId));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        _releasePayout(escrowId, deposit);
        emit DisputeResolved(escrowId, msg.sender, DisputeResolution.Payout);
        return true;
    }

    function setPlatformFeeBps(
        uint16 newFeeBps
    ) external onlyAdmin returns (bool executed) {
        require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "fee too high");

        bytes32 action = _configAction("SET_PLATFORM_FEE_BPS", abi.encode(newFeeBps));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        uint16 previousFeeBps = platformFeeBps;
        platformFeeBps = newFeeBps;
        adminActionNonce++;

        emit PlatformFeeUpdated(previousFeeBps, newFeeBps);
        emit AdminActionExecuted(action, msg.sender);
        return true;
    }

    function setTreasuryWallet(
        address newTreasuryWallet
    ) external onlyAdmin returns (bool executed) {
        require(newTreasuryWallet != address(0), "treasury required");

        bytes32 action = _configAction(
            "SET_TREASURY_WALLET",
            abi.encode(newTreasuryWallet)
        );
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        address previousTreasuryWallet = treasuryWallet;
        treasuryWallet = newTreasuryWallet;
        adminActionNonce++;

        emit TreasuryWalletUpdated(previousTreasuryWallet, newTreasuryWallet);
        emit AdminActionExecuted(action, msg.sender);
        return true;
    }

    function addAdmin(address account) external onlyAdmin returns (bool executed) {
        require(account != address(0), "admin required");
        require(!admins[account], "admin exists");

        bytes32 action = _configAction("ADD_ADMIN", abi.encode(account));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        admins[account] = true;
        adminCount++;
        adminActionNonce++;

        emit AdminAdded(account);
        emit AdminActionExecuted(action, msg.sender);
        return true;
    }

    function removeAdmin(address account) external onlyAdmin returns (bool executed) {
        require(admins[account], "admin not found");
        require(adminCount > 1, "last admin");
        require(adminCount - 1 >= adminThreshold, "threshold too high");

        bytes32 action = _configAction("REMOVE_ADMIN", abi.encode(account));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        admins[account] = false;
        adminCount--;
        adminActionNonce++;

        emit AdminRemoved(account);
        emit AdminActionExecuted(action, msg.sender);
        return true;
    }

    function setAdminThreshold(
        uint256 newThreshold
    ) external onlyAdmin returns (bool executed) {
        require(newThreshold != 0, "threshold required");
        require(newThreshold <= adminCount, "threshold too high");

        bytes32 action = _configAction("SET_ADMIN_THRESHOLD", abi.encode(newThreshold));
        if (_approveAction(action) < adminThreshold) {
            return false;
        }

        uint256 previousThreshold = adminThreshold;
        adminThreshold = newThreshold;
        adminActionNonce++;

        emit AdminThresholdUpdated(previousThreshold, newThreshold);
        emit AdminActionExecuted(action, msg.sender);
        return true;
    }

    function hasApprovedAction(
        bytes32 action,
        address admin
    ) external view returns (bool) {
        return adminActionApproved[action][admin];
    }

    function _releasePayout(
        uint256 escrowId,
        EscrowDeposit storage deposit
    ) private {
        uint256 grossAmount = deposit.amount;
        uint256 feeAmount = (grossAmount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = grossAmount - feeAmount;

        deposit.status = EscrowStatus.PayoutVerified;

        if (feeAmount != 0) {
            _sendValue(treasuryWallet, feeAmount);
            emit FeeCollected(
                deposit.workAgreementId,
                grossAmount,
                feeAmount,
                treasuryWallet,
                block.timestamp
            );
        }

        _sendValue(deposit.payee, netAmount);

        emit PayoutVerified(
            deposit.workAgreementId,
            deposit.payee,
            netAmount,
            block.timestamp
        );
    }

    function _issueRefund(
        uint256 escrowId,
        EscrowDeposit storage deposit
    ) private {
        uint256 amount = deposit.amount;
        uint256 feeWaived = (amount * platformFeeBps) / BPS_DENOMINATOR;

        deposit.status = EscrowStatus.Refunded;

        _sendValue(deposit.payer, amount);
        emit RefundIssued(escrowId, deposit.payer, amount, feeWaived);
    }

    function _approveAction(bytes32 action) private returns (uint256 approvals) {
        require(!adminActionApproved[action][msg.sender], "action already approved");

        adminActionApproved[action][msg.sender] = true;
        approvals = ++adminActionApprovalCount[action];

        emit AdminActionApproved(action, msg.sender, approvals, adminThreshold);
    }

    function _configAction(
        string memory actionName,
        bytes memory actionData
    ) private view returns (bytes32) {
        return keccak256(abi.encode(actionName, actionData, adminActionNonce));
    }

    function _sendValue(address account, uint256 amount) private {
        if (amount == 0) {
            return;
        }

        (bool success, ) = payable(account).call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}
