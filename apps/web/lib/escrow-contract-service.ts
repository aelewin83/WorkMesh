import { encodeFunctionData, parseEther } from "viem";
import type { BrowserWalletResult } from "@/lib/wallet-service";

export type EscrowFundingIntent = {
  agreementId: string;
  chainAgreementId: string;
  contractAddress: `0x${string}`;
  chainId: number;
  payee: `0x${string}`;
  amountEth: string;
};

export type EscrowFundingResult = {
  txHash: string;
  chainId: number;
  submittedAt: string;
};

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const escrowAbi = [{
  type: "function",
  name: "fundEscrow",
  stateMutability: "payable",
  inputs: [
    { name: "workAgreementId", type: "uint256" },
    { name: "payee", type: "address" }
  ],
  outputs: [{ name: "escrowId", type: "uint256" }]
}] as const;

export async function fundEscrow(intent: EscrowFundingIntent, wallet: BrowserWalletResult): Promise<EscrowFundingResult> {
  if (!window.ethereum) throw new Error("Wallet provider unavailable");
  if (!wallet.walletAddress) throw new Error("Wallet address unavailable");
  if (!intent.contractAddress || !intent.payee || !intent.amountEth || !intent.chainAgreementId) {
    throw new Error("Escrow funding intent is incomplete");
  }
  const data = encodeFunctionData({
    abi: escrowAbi,
    functionName: "fundEscrow",
    args: [BigInt(intent.chainAgreementId), intent.payee]
  });
  const value = "0x" + parseEther(intent.amountEth).toString(16);
  const txHash = await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: wallet.walletAddress, to: intent.contractAddress, value, data }]
  }) as string;
  return { txHash, chainId: intent.chainId, submittedAt: new Date().toISOString() };
}
