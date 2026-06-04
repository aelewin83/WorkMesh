export type EscrowEventName =
  | "EscrowFunded"
  | "WorkStarted"
  | "ProofSubmitted"
  | "EscrowReleased"
  | "EscrowRefunded"
  | "DisputeOpened"
  | "PayoutVerified"
  | "FeeCollected";

export interface IndexedEscrowEvent {
  eventName: EscrowEventName;
  agreementId: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
  payload: Record<string, string>;
}

export interface IndexerCheckpoint {
  chainId: number;
  lastBlock: bigint;
  contractAddress: `0x${string}`;
}

export interface ReconciledEscrowState {
  agreementId: string;
  status: "not_funded" | "funded" | "pending_release" | "released" | "refunded" | "disputed";
  txHash?: `0x${string}`;
  updatedAt: string;
}

export class RelaiIndexer {
  private checkpoint?: IndexerCheckpoint;
  private readonly seenEventIds = new Set<string>();

  constructor(private readonly chainId: number) {}

  restore(checkpoint: IndexerCheckpoint) {
    if (checkpoint.chainId !== this.chainId) {
      throw new Error("Checkpoint chainId mismatch");
    }
    this.checkpoint = checkpoint;
  }

  getCheckpoint() {
    return this.checkpoint;
  }

  normalizeEscrowEvent(event: IndexedEscrowEvent) {
    const id = `${this.chainId}:${event.txHash}:${event.logIndex}`;
    if (this.seenEventIds.has(id)) return null;
    this.seenEventIds.add(id);
    return {
      id,
      source: "escrow",
      eventName: event.eventName,
      agreementId: event.agreementId.toString(),
      txHash: event.txHash,
      logIndex: event.logIndex,
      blockNumber: event.blockNumber.toString(),
      payload: event.payload,
      indexedAt: new Date().toISOString()
    };
  }

  applyEscrowEvent(event: IndexedEscrowEvent, current?: ReconciledEscrowState): ReconciledEscrowState {
    const previous: ReconciledEscrowState = current ?? {
      agreementId: event.agreementId.toString(),
      status: "not_funded",
      updatedAt: new Date().toISOString()
    };
    const updatedAt = new Date().toISOString();
    if (event.eventName === "EscrowFunded") return { ...previous, status: "funded", txHash: event.txHash, updatedAt };
    if (event.eventName === "WorkStarted" || event.eventName === "ProofSubmitted") return { ...previous, txHash: event.txHash, updatedAt };
    if (event.eventName === "EscrowReleased" || event.eventName === "PayoutVerified") return { ...previous, status: "released", txHash: event.txHash, updatedAt };
    if (event.eventName === "EscrowRefunded") return { ...previous, status: "refunded", txHash: event.txHash, updatedAt };
    if (event.eventName === "DisputeOpened") return { ...previous, status: "disputed", txHash: event.txHash, updatedAt };
    return previous;
  }
}


if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new RelaiIndexer(Number(process.env.RELAI_CHAIN_ID ?? 31337));
  console.log(JSON.stringify({ status: "ready", checkpoint: indexer.getCheckpoint() ?? null }));
}
