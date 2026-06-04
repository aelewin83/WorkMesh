const { ethers, network } = require("hardhat");

const escrowAbi = [
  "function releaseToWorker(uint256 escrowId) external",
  "function refund(uint256 escrowId) external",
  "function openDispute(uint256 escrowId,string calldata reasonURI) external"
];

async function main() {
  const [signer] = await ethers.getSigners();
  const contractAddress = process.env.RELAI_ESCROW_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("RELAI_ESCROW_CONTRACT_ADDRESS is required");
  const escrowId = BigInt(process.env.ESCROW_TEST_ESCROW_ID || "1");
  const action = process.env.ESCROW_TEST_ACTION || "release";
  const escrow = new ethers.Contract(contractAddress, escrowAbi, signer);
  let tx;
  if (action === "release") tx = await escrow.releaseToWorker(escrowId);
  else if (action === "refund") tx = await escrow.refund(escrowId);
  else if (action === "dispute") tx = await escrow.openDispute(escrowId, process.env.ESCROW_TEST_REASON_URI || "encrypted-dispute://test");
  else throw new Error("Unsupported ESCROW_TEST_ACTION: " + action);
  console.log(JSON.stringify({ status: "submitted", action, network: network.name, chainId: network.config.chainId, txHash: tx.hash, escrowId: escrowId.toString(), signer: signer.address }, null, 2));
  const receipt = await tx.wait();
  console.log(JSON.stringify({ status: "confirmed", action, blockNumber: receipt.blockNumber, txHash: receipt.hash }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
