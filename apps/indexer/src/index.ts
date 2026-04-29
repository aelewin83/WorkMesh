type EscrowEventName =
  | "EscrowFunded"
  | "PayoutVerified"
  | "FeeCollected"
  | "RefundIssued"
  | "DisputeRaised";

export interface IndexedEscrowEvent {
  eventName: EscrowEventName;
  agreementId: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
  payload: Record<string, string>;
}

export interface IndexerCheckpoint {
  chainId: number;
  lastBlock: bigint;
  contractAddress: `0x${string}`;
}

export class WorkMeshIndexer {
  private checkpoint?: IndexerCheckpoint;

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
    return {
      id: `${event.txHash}:${event.eventName}:${event.agreementId.toString()}`,
      source: "escrow",
      eventName: event.eventName,
      agreementId: event.agreementId.toString(),
      txHash: event.txHash,
      blockNumber: event.blockNumber.toString(),
      payload: event.payload,
      indexedAt: new Date().toISOString()
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexer = new WorkMeshIndexer(Number(process.env.WORKMESH_CHAIN_ID ?? 31337));
  console.log(JSON.stringify({ status: "ready", checkpoint: indexer.getCheckpoint() ?? null }));
}
