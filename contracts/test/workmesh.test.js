const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Relai contracts MVP", function () {
  const FEE_BPS = 500;
  const BPS_DENOMINATOR = 10_000n;

  let client;
  let worker;
  let treasury;
  let admin1;
  let admin2;
  let admin3;
  let outsider;
  let registry;
  let agreements;
  let escrow;
  let reputation;

  beforeEach(async function () {
    [, client, worker, treasury, admin1, admin2, admin3, outsider] =
      await ethers.getSigners();

    const GigRegistry = await ethers.getContractFactory("GigRegistry");
    registry = await GigRegistry.deploy();

    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      treasury.address,
      FEE_BPS,
      [admin1.address, admin2.address, admin3.address],
      2
    );

    const WorkAgreement = await ethers.getContractFactory("WorkAgreement");
    agreements = await WorkAgreement.deploy(await registry.getAddress());

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy(admin1.address);
  });

  it("creates a gig and activates a work agreement", async function () {
    const amount = ethers.parseEther("1");
    const escrowAddress = await escrow.getAddress();

    await expect(
      registry.connect(client).createGig("ipfs://gig-1", amount)
    )
      .to.emit(registry, "GigCreated")
      .withArgs(1, client.address, "ipfs://gig-1", amount);

    await expect(
      agreements
        .connect(client)
        .createAgreement(1, worker.address, escrowAddress, amount, "ipfs://terms-1")
    )
      .to.emit(agreements, "AgreementCreated")
      .withArgs(
        1,
        1,
        client.address,
        worker.address,
        escrowAddress,
        amount,
        "ipfs://terms-1"
      );

    await expect(agreements.connect(worker).acceptAgreement(1))
      .to.emit(agreements, "AgreementAccepted")
      .withArgs(1, worker.address);

    const agreement = await agreements.agreements(1);
    expect(agreement.status).to.equal(1n);
  });

  it("deducts the platform fee on successful payout and emits accounting events", async function () {
    const amount = ethers.parseEther("1");
    const fee = (amount * BigInt(FEE_BPS)) / BPS_DENOMINATOR;
    const net = amount - fee;

    await expect(
      escrow.connect(client).fundEscrow(1, worker.address, { value: amount })
    )
      .to.emit(escrow, "EscrowFunded")
      .withArgs(1, 1, client.address, worker.address, amount);

    await expect(escrow.connect(worker).markWorkStarted(1))
      .to.emit(escrow, "WorkStarted")
      .withArgs(1, 1, worker.address, anyValue);
    await expect(escrow.connect(worker).submitProof(1, "encrypted-proof://proof-1"))
      .to.emit(escrow, "ProofSubmitted")
      .withArgs(1, 1, worker.address, "encrypted-proof://proof-1", anyValue);

    const workerBefore = await ethers.provider.getBalance(worker.address);
    const treasuryBefore = await ethers.provider.getBalance(treasury.address);

    const tx = await escrow.connect(client).verifyPayout(1);
    await expect(tx)
      .to.emit(escrow, "FeeCollected")
      .withArgs(1, amount, fee, treasury.address, anyValue);
    await expect(tx)
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1, 1, worker.address, amount, fee, net, treasury.address, anyValue);
    await expect(tx)
      .to.emit(escrow, "PayoutVerified")
      .withArgs(1, worker.address, net, anyValue);

    expect(await ethers.provider.getBalance(worker.address)).to.equal(
      workerBefore + net
    );
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(
      treasuryBefore + fee
    );

    const deposit = await escrow.deposits(1);
    expect(deposit.status).to.equal(2n);
  });

  it("waives platform fees on refunds", async function () {
    const amount = ethers.parseEther("1");
    const waivedFee = (amount * BigInt(FEE_BPS)) / BPS_DENOMINATOR;
    const escrowAddress = await escrow.getAddress();

    await escrow.connect(client).fundEscrow(1, worker.address, { value: amount });

    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    const refundTx = await escrow.connect(client).refund(1);
    await expect(refundTx)
      .to.emit(escrow, "EscrowRefunded")
      .withArgs(1, 1, client.address, amount, anyValue);
    await expect(refundTx)
      .to.emit(escrow, "RefundIssued")
      .withArgs(1, client.address, amount, waivedFee);

    expect(await ethers.provider.getBalance(treasury.address)).to.equal(
      treasuryBefore
    );
    expect(await ethers.provider.getBalance(escrowAddress)).to.equal(0n);

    const deposit = await escrow.deposits(1);
    expect(deposit.status).to.equal(3n);
  });

  it("requires threshold admin approval and rejects duplicate admin actions", async function () {
    await expect(escrow.connect(admin1).setPlatformFeeBps(750)).to.emit(
      escrow,
      "AdminActionApproved"
    );
    expect(await escrow.platformFeeBps()).to.equal(FEE_BPS);

    await expect(
      escrow.connect(admin1).setPlatformFeeBps(750)
    ).to.be.revertedWith("action already approved");

    await expect(escrow.connect(admin2).setPlatformFeeBps(750))
      .to.emit(escrow, "PlatformFeeUpdated")
      .withArgs(FEE_BPS, 750);
    expect(await escrow.platformFeeBps()).to.equal(750);

    await expect(
      escrow.connect(admin1).addAdmin(admin1.address)
    ).to.be.revertedWith("admin exists");
    await expect(
      escrow.connect(outsider).setTreasuryWallet(outsider.address)
    ).to.be.revertedWith("not admin");
  });

  it("tracks disputes and lets admins resolve with refund or payout by threshold", async function () {
    const amount = ethers.parseEther("2");
    const fee = (amount * BigInt(FEE_BPS)) / BPS_DENOMINATOR;
    const net = amount - fee;

    await escrow.connect(client).fundEscrow(7, worker.address, { value: amount });
    await expect(escrow.connect(worker).openDispute(1, "ipfs://dispute-1"))
      .to.emit(escrow, "DisputeOpened")
      .withArgs(1, worker.address, "ipfs://dispute-1");

    await escrow.connect(admin1).resolveDisputeWithPayout(1);

    const workerBefore = await ethers.provider.getBalance(worker.address);
    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    const tx = await escrow.connect(admin2).resolveDisputeWithPayout(1);

    await expect(tx)
      .to.emit(escrow, "DisputeResolved")
      .withArgs(1, admin2.address, 1);
    await expect(tx)
      .to.emit(escrow, "EscrowReleased")
      .withArgs(1, 7, worker.address, amount, fee, net, treasury.address, anyValue);
    await expect(tx)
      .to.emit(escrow, "PayoutVerified")
      .withArgs(7, worker.address, net, anyValue);

    expect(await ethers.provider.getBalance(worker.address)).to.equal(
      workerBefore + net
    );
    expect(await ethers.provider.getBalance(treasury.address)).to.equal(
      treasuryBefore + fee
    );
  });

  it("prevents duplicate reputation records and duplicate reputation admins", async function () {
    await expect(
      reputation.connect(admin1).recordCompletion(42, worker.address, 5)
    )
      .to.emit(reputation, "ReputationRecorded")
      .withArgs(42, worker.address, admin1.address, 0, 5);

    const profile = await reputation.profileOf(worker.address);
    expect(profile.completedGigs).to.equal(1n);
    expect(profile.ratingCount).to.equal(1n);
    expect(profile.score).to.equal(10n);

    await expect(
      reputation.connect(admin1).recordCompletion(42, worker.address, 4)
    ).to.be.revertedWith("reputation already recorded");
    await expect(
      reputation.connect(outsider).recordCompletion(43, worker.address, 5)
    ).to.be.revertedWith("not admin");
    await expect(
      reputation.connect(admin1).addAdmin(admin1.address)
    ).to.be.revertedWith("admin exists");
  });

  it("issues portable review attestations once per agreement", async function () {
    const reviewHash = ethers.keccak256(ethers.toUtf8Bytes("excellent encrypted review"));

    await expect(
      reputation.connect(admin1).issueAttestation(77, worker.address, 5, reviewHash)
    )
      .to.emit(reputation, "AttestationIssued")
      .withArgs(77, worker.address, admin1.address, 5, reviewHash);

    await expect(
      reputation.connect(admin1).issueAttestation(77, worker.address, 5, reviewHash)
    ).to.be.revertedWith("reputation already recorded");
  });
});
