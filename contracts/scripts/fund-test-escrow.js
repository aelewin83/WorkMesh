const { ethers, network } = require("hardhat");

const escrowAbi = [
  "function fundEscrow(uint256 workAgreementId,address payable payee) external payable returns (uint256 escrowId)",
  "function releaseToWorker(uint256 escrowId) external",
  "function refund(uint256 escrowId) external",
  "function openDispute(uint256 escrowId,string calldata reasonURI) external",
  "event EscrowFunded(uint256 indexed escrowId,uint256 indexed workAgreementId,address indexed payer,address payee,uint256 amount)"
];

async function main() {
  const [signer] = await ethers.getSigners();
  const contractAddress = process.env.RELAI_ESCROW_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("RELAI_ESCROW_CONTRACT_ADDRESS is required");
  const payee = process.env.ESCROW_TEST_PAYEE || "0x000000000000000000000000000000000000dEaD";
  if (payee.toLowerCase() === signer.address.toLowerCase()) throw new Error("ESCROW_TEST_PAYEE must differ from the payer");
  const agreementId = BigInt(process.env.ESCROW_TEST_AGREEMENT_ID || "1");
  const amount = ethers.parseEther(process.env.ESCROW_TEST_AMOUNT_ETH || "0.00001");
  const escrow = new ethers.Contract(contractAddress, escrowAbi, signer);
  const tx = await escrow.fundEscrow(agreementId, payee, { value: amount });
  console.log(JSON.stringify({ status: "submitted", network: network.name, chainId: network.config.chainId, txHash: tx.hash, agreementId: agreementId.toString(), payer: signer.address, payee, amountEth: ethers.formatEther(amount) }, null, 2));
  const receipt = await tx.wait();
  const funded = receipt.logs.map((log) => {
    try { return escrow.interface.parseLog(log); } catch { return null; }
  }).find((event) => event && event.name === "EscrowFunded");
  console.log(JSON.stringify({ status: "confirmed", blockNumber: receipt.blockNumber, txHash: receipt.hash, escrowId: funded ? funded.args.escrowId.toString() : undefined }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
