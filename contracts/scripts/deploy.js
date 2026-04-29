const { ethers } = require("hardhat");

function parseAddressList(value, fallback) {
  if (!value || value.trim() === "") {
    return fallback;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  const treasuryWallet = process.env.TREASURY_WALLET || deployer.address;
  const platformFeeBps = Number(process.env.PLATFORM_FEE_BPS || "500");
  const escrowAdmins = parseAddressList(process.env.ESCROW_ADMINS, [
    deployer.address
  ]);
  const escrowAdminThreshold = Number(
    process.env.ESCROW_ADMIN_THRESHOLD || "1"
  );
  const reputationAdmin = process.env.REPUTATION_ADMIN || deployer.address;

  for (const address of [treasuryWallet, reputationAdmin, ...escrowAdmins]) {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
  }

  const GigRegistry = await ethers.getContractFactory("GigRegistry");
  const registry = await GigRegistry.deploy();
  await registry.waitForDeployment();

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    treasuryWallet,
    platformFeeBps,
    escrowAdmins,
    escrowAdminThreshold
  );
  await escrow.waitForDeployment();

  const WorkAgreement = await ethers.getContractFactory("WorkAgreement");
  const agreements = await WorkAgreement.deploy(await registry.getAddress());
  await agreements.waitForDeployment();

  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(reputationAdmin);
  await reputation.waitForDeployment();

  console.log(
    JSON.stringify(
      {
        deployer: deployer.address,
        platformFeeBps,
        treasuryWallet,
        escrowAdmins,
        escrowAdminThreshold,
        reputationAdmin,
        contracts: {
          gigRegistry: await registry.getAddress(),
          workAgreement: await agreements.getAddress(),
          escrow: await escrow.getAddress(),
          reputation: await reputation.getAddress()
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
