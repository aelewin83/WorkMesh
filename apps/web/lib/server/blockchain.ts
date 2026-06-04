import { parseAbi } from "viem";
import type { PaymentEscrowDto } from "@/lib/contractor-dtos";

export const relaiEscrowAbi = parseAbi([
  "event EscrowFunded(uint256 indexed escrowId,uint256 indexed workAgreementId,address indexed payer,address payee,uint256 amount)",
  "event WorkStarted(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,uint256 timestamp)",
  "event ProofSubmitted(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,string proofRef,uint256 timestamp)",
  "event EscrowReleased(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,uint256 grossAmount,uint256 platformFee,uint256 netPayout,address treasuryWallet,uint256 timestamp)",
  "event EscrowRefunded(uint256 indexed escrowId,uint256 indexed agreementId,address indexed employer,uint256 amount,uint256 timestamp)",
  "event DisputeOpened(uint256 indexed escrowId,address indexed openedBy,string reasonURI)"
]);

export type ChainEscrowEventName = "EscrowFunded" | "WorkStarted" | "ProofSubmitted" | "EscrowReleased" | "EscrowRefunded" | "DisputeOpened";

export type ChainEscrowEvent = {
  id: string;
  chainId: number;
  contractAddress: `0x${string}`;
  eventName: ChainEscrowEventName;
  agreementId: string;
  escrowId?: string;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
  payload: Record<string, string>;
};

export function chainEventId(chainId: number, txHash: string, logIndex: number) {
  return `${chainId}:${txHash}:${logIndex}`;
}

export function eventToEscrowState(event: ChainEscrowEvent, current: PaymentEscrowDto): PaymentEscrowDto {
  const timestamp = new Date().toISOString();
  if (event.eventName === "EscrowFunded") return { ...current, status: "funded", txHash: event.txHash, fundedAt: timestamp, updatedAt: timestamp };
  if (event.eventName === "ProofSubmitted" || event.eventName === "WorkStarted") return { ...current, txHash: event.txHash, updatedAt: timestamp };
  if (event.eventName === "EscrowReleased") return { ...current, status: "released", txHash: event.txHash, releasedAt: timestamp, updatedAt: timestamp };
  if (event.eventName === "EscrowRefunded") return { ...current, status: "refunded", txHash: event.txHash, updatedAt: timestamp };
  if (event.eventName === "DisputeOpened") return { ...current, status: "disputed", txHash: event.txHash, updatedAt: timestamp };
  return current;
}
