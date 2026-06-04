import { Pool } from "pg";
import { createPublicClient, formatEther, http, parseAbi } from "viem";
import { baseSepolia, hardhat, sepolia } from "viem/chains";
import { RelaiIndexer, type IndexedEscrowEvent } from "./index.js";

const abi = parseAbi([
  "event EscrowFunded(uint256 indexed escrowId,uint256 indexed workAgreementId,address indexed payer,address payee,uint256 amount)",
  "event WorkStarted(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,uint256 timestamp)",
  "event ProofSubmitted(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,string proofRef,uint256 timestamp)",
  "event EscrowReleased(uint256 indexed escrowId,uint256 indexed agreementId,address indexed contractor,uint256 grossAmount,uint256 platformFee,uint256 netPayout,address treasuryWallet,uint256 timestamp)",
  "event EscrowRefunded(uint256 indexed escrowId,uint256 indexed agreementId,address indexed employer,uint256 amount,uint256 timestamp)",
  "event DisputeOpened(uint256 indexed escrowId,address indexed openedBy,string reasonURI)",
  "event FeeCollected(uint256 indexed agreementId,uint256 grossAmount,uint256 feeAmount,address indexed treasuryWallet,uint256 timestamp)",
  "event PayoutVerified(uint256 indexed agreementId,address indexed worker,uint256 amount,uint256 timestamp)",
  "event RefundIssued(uint256 indexed escrowId,address indexed employer,uint256 amount,uint256 feeWaived)"
]);

const databaseUrl = requireEnv("DATABASE_URL");
const rpcUrl = process.env.RELAI_RPC_URL ?? process.env.BASE_SEPOLIA_RPC_URL;
const contractAddress = requireEnv("RELAI_ESCROW_CONTRACT_ADDRESS") as `0x${string}`;
const chainId = Number(process.env.RELAI_CHAIN_ID ?? process.env.CHAIN_ID ?? 84532);
const pollMs = Number(process.env.RELAI_INDEXER_POLL_MS ?? 15000);
const runOnce = process.env.RELAI_INDEXER_ONCE === "true";
const fromBlockFallback = BigInt(process.env.RELAI_INDEXER_FROM_BLOCK ?? 0);
const maxLogBlockRange = BigInt(process.env.RELAI_INDEXER_MAX_LOG_BLOCK_RANGE ?? 10);

if (!rpcUrl) throw new Error("RELAI_RPC_URL or BASE_SEPOLIA_RPC_URL is required");

const chain = chainId === 84532 ? baseSepolia : chainId === 11155111 ? sepolia : hardhat;
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const pool = new Pool({ connectionString: databaseUrl });
const relaiIndexer = new RelaiIndexer(chainId);

async function main() {
  await ensureTables();
  console.log(JSON.stringify({ status: "indexer-started", chainId, contractAddress, pollMs }));
  if (runOnce) {
    await pollOnce();
    console.log(JSON.stringify({ status: "indexer-finished", checkpoint: checkpointId() }));
    await pool.end();
    return;
  }
  while (true) {
    await pollOnce().catch((error) => console.error("indexer poll failed", error));
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function pollOnce() {
  const latest = await publicClient.getBlockNumber();
  let fromBlock = await getFromBlock();
  if (fromBlock > latest) return;
  while (fromBlock <= latest) {
    const toBlock = minBigInt(latest, fromBlock + maxLogBlockRange - 1n);
    const logs = await publicClient.getLogs({ address: contractAddress, events: abi, fromBlock, toBlock });
    for (const log of logs) {
      const event = toIndexedEvent(log as any);
      if (!event) continue;
      const normalized = relaiIndexer.normalizeEscrowEvent(event);
      if (!normalized) continue;
      await processEvent(event, normalized);
    }
    fromBlock = toBlock + 1n;
    await saveCheckpoint(fromBlock);
  }
}

function toIndexedEvent(log: any): IndexedEscrowEvent | null {
  const eventName = log.eventName;
  const args = log.args ?? {};
  const agreementId = BigInt(args.workAgreementId ?? args.agreementId ?? 0);
  if (!agreementId) return null;
  return {
    eventName,
    agreementId,
    txHash: log.transactionHash,
    logIndex: Number(log.logIndex ?? 0),
    blockNumber: log.blockNumber,
    payload: Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)]))
  } as IndexedEscrowEvent;
}

async function processEvent(event: IndexedEscrowEvent, normalized: any) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query(
      "INSERT INTO chain_events (id, chain_id, contract_address, event_name, agreement_id, tx_hash, log_index, block_number, payload, indexed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now()) ON CONFLICT (id) DO NOTHING RETURNING id",
      [normalized.id, chainId, contractAddress, normalized.eventName, normalized.agreementId, normalized.txHash, normalized.logIndex, normalized.blockNumber, JSON.stringify(normalized.payload)]
    );
    if (inserted.rowCount) await reconcileEscrow(client, event);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function reconcileEscrow(client: any, event: IndexedEscrowEvent) {
  const status = statusForEvent(event.eventName);
  if (!status) return;
  const payload = event.payload ?? {};
  const amountEth = event.eventName === "PayoutVerified" ? 0 : ethNumber(payload.amount ?? payload.grossAmount);
  const platformFeeEth = ethNumber(payload.platformFee ?? payload.feeAmount);
  const netPayoutEth = event.eventName === "PayoutVerified" ? ethNumber(payload.amount) : ethNumber(payload.netPayout ?? payload.amount);
  await client.query(
    "INSERT INTO escrow_states (agreement_id, status, gross_task_value, platform_fee, net_payout, chain_id, contract_address, escrow_id, tx_hash, funded_at, released_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $2 = 'funded' THEN now() ELSE NULL END,CASE WHEN $2 = 'released' THEN now() ELSE NULL END,now()) ON CONFLICT (agreement_id) DO UPDATE SET status = EXCLUDED.status, gross_task_value = CASE WHEN EXCLUDED.gross_task_value > 0 THEN EXCLUDED.gross_task_value ELSE escrow_states.gross_task_value END, platform_fee = CASE WHEN EXCLUDED.platform_fee > 0 THEN EXCLUDED.platform_fee ELSE escrow_states.platform_fee END, net_payout = CASE WHEN EXCLUDED.net_payout > 0 THEN EXCLUDED.net_payout ELSE escrow_states.net_payout END, chain_id = EXCLUDED.chain_id, contract_address = EXCLUDED.contract_address, escrow_id = COALESCE(EXCLUDED.escrow_id, escrow_states.escrow_id), tx_hash = EXCLUDED.tx_hash, funded_at = COALESCE(escrow_states.funded_at, EXCLUDED.funded_at), released_at = COALESCE(EXCLUDED.released_at, escrow_states.released_at), updated_at = now()",
    [event.agreementId.toString(), status, amountEth, platformFeeEth, netPayoutEth, chainId, contractAddress, payload.escrowId ?? null, event.txHash]
  );
  await insertPaymentHistory(client, event, status, amountEth, platformFeeEth, netPayoutEth);
}

async function insertPaymentHistory(client: any, event: IndexedEscrowEvent, status: string, grossAmount: number, platformFee: number, netPayout: number) {
  if (!["funded", "released", "refunded", "disputed"].includes(status)) return;
  const walletAddress = event.payload.payee ?? event.payload.contractor ?? event.payload.employer ?? event.payload.payer ?? "unknown";
  await client.query(
    "INSERT INTO payment_history (id, wallet_address, agreement_id, gross_amount, platform_fee, net_payout, status, tx_hash, created_at, released_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),CASE WHEN $7 = 'released' THEN now() ELSE NULL END) ON CONFLICT (id) DO NOTHING",
    [normalizedPaymentId(event, status), walletAddress, event.agreementId.toString(), grossAmount, platformFee, netPayout || grossAmount, status, event.txHash]
  );
}

function statusForEvent(eventName: string) {
  if (eventName === "EscrowFunded") return "funded";
  if (eventName === "EscrowReleased" || eventName === "PayoutVerified") return "released";
  if (eventName === "EscrowRefunded" || eventName === "RefundIssued") return "refunded";
  if (eventName === "DisputeOpened") return "disputed";
  return undefined;
}

function ethNumber(value: unknown) {
  if (value === undefined || value === null) return 0;
  try { return Number(formatEther(BigInt(String(value)))); } catch { return 0; }
}

function normalizedPaymentId(event: IndexedEscrowEvent, status: string) {
  return chainId + ":" + event.txHash + ":" + event.logIndex + ":" + status;
}

async function getFromBlock() {
  const result = await pool.query("SELECT last_block FROM indexer_checkpoints WHERE id = $1", [checkpointId()]);
  return result.rowCount ? BigInt(result.rows[0].last_block) : fromBlockFallback;
}

async function saveCheckpoint(nextBlock: bigint) {
  await pool.query(
    "INSERT INTO indexer_checkpoints (id, chain_id, contract_address, last_block, updated_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (id) DO UPDATE SET last_block = EXCLUDED.last_block, updated_at = now()",
    [checkpointId(), chainId, contractAddress, nextBlock.toString()]
  );
}

async function ensureTables() {
  await pool.query("CREATE TABLE IF NOT EXISTS indexer_checkpoints (id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, contract_address TEXT NOT NULL, last_block NUMERIC(32,0) NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  await pool.query("CREATE TABLE IF NOT EXISTS chain_events (id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL, contract_address TEXT NOT NULL, event_name TEXT NOT NULL, agreement_id TEXT NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, block_number NUMERIC(32,0) NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, indexed_at TIMESTAMPTZ NOT NULL DEFAULT now())");
}

function minBigInt(a: bigint, b: bigint) {
  return a < b ? a : b;
}

function checkpointId() {
  return chainId + ":" + contractAddress.toLowerCase();
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + " is required");
  return value;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
