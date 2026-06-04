"use client";

import { useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, WalletCards } from "lucide-react";
import { fundEscrow, type EscrowFundingIntent } from "@/lib/escrow-contract-service";
import { connectBrowserWallet } from "@/lib/wallet-service";

type FundingStatus = "idle" | "connecting_wallet" | "awaiting_signature" | "transaction_pending" | "transaction_confirmed" | "indexed_confirmed" | "transaction_failed";

const statusCopy: Record<FundingStatus, string> = {
  idle: "Ready for Base Sepolia",
  connecting_wallet: "Connecting wallet",
  awaiting_signature: "Awaiting signature",
  transaction_pending: "Transaction submitted",
  transaction_confirmed: "Transaction confirmed",
  indexed_confirmed: "Escrow indexed",
  transaction_failed: "Funding failed"
};

export function EmployerEscrowFunding() {
  const [status, setStatus] = useState<FundingStatus>("idle");
  const [message, setMessage] = useState("Connect wallet and fund the protected testnet escrow.");
  const [txHash, setTxHash] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function onFundEscrow() {
    setBusy(true);
    setTxHash(undefined);
    try {
      setStatus("connecting_wallet");
      const wallet = await connectBrowserWallet();
      if (!wallet.connected || !wallet.walletAddress) throw new Error(wallet.error || wallet.status || "Wallet connection failed");

      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet.walletAddress, role: "employer" })
      });

      const intentResponse = await fetch("/api/payments/escrow/agr_dock/funding-intent", { method: "POST" });
      if (!intentResponse.ok) throw new Error(await intentResponse.text());
      const intent = await intentResponse.json() as EscrowFundingIntent;

      setStatus("awaiting_signature");
      setMessage("Review the MetaMask transaction. This uses Base Sepolia test ETH.");
      const result = await fundEscrow(intent, wallet);
      setTxHash(result.txHash);
      setStatus("transaction_pending");
      setMessage("Transaction sent. Waiting for Base Sepolia confirmation and indexer sync.");

      await fetch("/api/payments/escrow/" + encodeURIComponent(intent.agreementId) + "/tx-submitted", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash: result.txHash, walletAddress: wallet.walletAddress, chainId: result.chainId })
      });

      setStatus("transaction_confirmed");
      const indexed = await waitForIndexedState(intent.agreementId, result.txHash);
      if (indexed) {
        setStatus("indexed_confirmed");
        setMessage("Escrow funded on Base Sepolia and synced into Relai.");
      } else {
        setMessage("Transaction confirmed. The indexer may need one more sync pass.");
      }
    } catch (error) {
      setStatus("transaction_failed");
      setMessage(error instanceof Error ? cleanError(error.message) : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="wm-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">Live escrow funding</p>
          <h3 className="mt-2 font-semibold text-white">Base Sepolia protected payment</h3>
        </div>
        <span className="rounded-xl border border-gold-primary/20 bg-gold-primary/10 p-2 text-gold-primary">
          {status === "indexed_confirmed" ? <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} /> : <WalletCards className="h-4 w-4" strokeWidth={1.75} />}
        </span>
      </div>

      <div className="mt-4 divide-y divide-border-2">
        <FundingRow label="Status" value={statusCopy[status]} tone={status === "transaction_failed" ? "danger" : status === "indexed_confirmed" ? "success" : "gold"} />
        <FundingRow label="Network" value="Base Sepolia" tone="info" />
        <FundingRow label="Amount" value={(process.env.NEXT_PUBLIC_ESCROW_TEST_AMOUNT_ETH ?? "0.00001") + " ETH"} tone="muted" />
      </div>

      <p className="mt-4 text-sm leading-6 text-text-secondary">{message}</p>
      {txHash ? (
        <a className="mt-3 inline-flex items-center gap-2 text-xs text-info" href={"https://sepolia.basescan.org/tx/" + txHash} target="_blank" rel="noreferrer">
          View transaction <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
      ) : null}

      <button type="button" onClick={onFundEscrow} disabled={busy} className="wm-button-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : null}
        {busy ? "Funding escrow" : "Fund Escrow"}
      </button>
    </article>
  );
}

function FundingRow({ label, value, tone }: { label: string; value: string; tone: "gold" | "success" | "info" | "muted" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "info" ? "text-info" : tone === "danger" ? "text-danger" : tone === "gold" ? "text-gold-primary" : "text-text-secondary";
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={"wm-metric text-sm " + color}>{value}</span>
    </div>
  );
}

async function waitForIndexedState(agreementId: string, txHash: string) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1500 : 3000));
    const response = await fetch("/api/payments/escrow/" + encodeURIComponent(agreementId));
    if (!response.ok) continue;
    const escrow = await response.json() as { status?: string; txHash?: string };
    if ((escrow.status === "funded" || escrow.status === "released") && escrow.txHash?.toLowerCase() === txHash.toLowerCase()) return true;
  }
  return false;
}

function cleanError(message: string) {
  if (message.includes("User rejected") || message.toLowerCase().includes("reject")) return "Transaction was rejected in wallet.";
  if (message.length > 160) return message.slice(0, 157) + "...";
  return message;
}
