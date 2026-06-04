import { Pool } from "pg";
import type { ContractorCommandApiStateDto, PaymentEscrowDto, PayoutHistoryDto } from "@/lib/contractor-dtos";
import { getStateStoreMode } from "@/lib/server/relai-state-store";

let pool: Pool | undefined;

export function chainEscrowEnabled() {
  return getStateStoreMode() === "postgres" && Boolean(process.env.DATABASE_URL);
}

export function chainAgreementIdFor(agreementId: string) {
  if (/^\d+$/.test(agreementId)) return agreementId;
  if (agreementId === "agr_dock") return "1";
  const match = agreementId.match(/(\d+)$/);
  return match?.[1] ?? "1";
}

export async function applyChainEscrowOverlay(state: ContractorCommandApiStateDto): Promise<ContractorCommandApiStateDto> {
  if (!chainEscrowEnabled()) return state;
  const chainId = chainAgreementIdFor(state.agreement.id);
  const escrow = await readEscrow(chainId, state.escrow);
  const history = await readPaymentHistory(state.profile.walletAddress, state.payoutHistory);
  return { ...state, escrow, payoutHistory: history };
}

async function readEscrow(chainAgreementId: string, fallback: PaymentEscrowDto): Promise<PaymentEscrowDto> {
  const result = await getPool().query(
    "SELECT * FROM escrow_states WHERE agreement_id = $1",
    [chainAgreementId]
  );
  if (!result.rowCount) return fallback;
  const row = result.rows[0];
  const gross = numberOrFallback(row.gross_task_value, fallback.grossAmount);
  const platformFee = numberOrFallback(row.platform_fee, fallback.platformFee, true);
  const netPayout = numberOrFallback(row.net_payout, fallback.netPayout);
  return {
    ...fallback,
    status: normalizeStatus(row.status, fallback.status),
    grossAmount: gross,
    platformFee,
    netPayout,
    gasEstimate: numberOrFallback(row.gas_estimate, fallback.gasEstimate),
    treasuryWallet: process.env.TREASURY_WALLET ?? fallback.treasuryWallet,
    chainId: Number(row.chain_id ?? fallback.chainId),
    txHash: row.tx_hash ?? fallback.txHash,
    fundedAt: row.funded_at ? new Date(row.funded_at).toISOString() : fallback.fundedAt,
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : fallback.releasedAt,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : fallback.updatedAt
  };
}

async function readPaymentHistory(walletAddress: string, fallback: PayoutHistoryDto[]): Promise<PayoutHistoryDto[]> {
  const result = await getPool().query(
    "SELECT * FROM payment_history WHERE lower(wallet_address) = lower($1) ORDER BY created_at DESC LIMIT 25",
    [walletAddress]
  );
  if (!result.rowCount) return fallback;
  return result.rows.map((row) => ({
    id: String(row.id),
    walletAddress: String(row.wallet_address),
    agreementId: String(row.agreement_id),
    label: labelForStatus(String(row.status)),
    amount: numberOrFallback(row.net_payout, 0),
    status: String(row.status),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : undefined
  }));
}

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for chain escrow state");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function normalizeStatus(value: unknown, fallback: PaymentEscrowDto["status"]): PaymentEscrowDto["status"] {
  return value === "funded" || value === "pending_funding_tx" || value === "pending_release" || value === "released" || value === "refunded" || value === "disputed" || value === "not_funded" ? value : fallback;
}

function numberOrFallback(value: unknown, fallback: number, allowZero = false) {
  if (value === null || value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number > 0 || allowZero ? number : fallback;
}

function labelForStatus(status: string) {
  if (status === "released") return "Released payout";
  if (status === "funded") return "Escrow funded";
  if (status === "refunded") return "Escrow refunded";
  if (status === "disputed") return "Escrow disputed";
  return "Escrow update";
}
