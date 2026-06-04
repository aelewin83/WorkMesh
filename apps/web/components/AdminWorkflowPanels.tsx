"use client";

import { useEffect, useState } from "react";
import { WorkflowModal } from "@/components/WorkflowModal";

const adminWallet = "0xAdmin...0001";
type AdminData = Record<string, unknown>;

function summarize(item: AdminData) {
  const entries = Object.entries(item).slice(0, 5);
  return entries.map(([key, value]) => (
    <div key={key} className="flex flex-col gap-1 rounded-2xl border border-border-2 bg-bg-3 p-3 sm:flex-row sm:items-start sm:justify-between">
      <span className="text-xs uppercase tracking-[0.18em] text-text-muted">{key}</span>
      <span className="break-words text-sm text-text-secondary sm:max-w-[70%] sm:text-right">{typeof value === "object" && value !== null ? JSON.stringify(value) : String(value)}</span>
    </div>
  ));
}

export function AdminWorkflowPanels() {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const close = () => {
    history.replaceState(null, "", window.location.pathname);
    setHash("");
  };
  const map: Record<string, { title: string; endpoint: string }> = {
    "#admin-disputes": { title: "Review disputes", endpoint: "/api/admin/disputes" },
    "#admin-invites": { title: "Invite management", endpoint: "/api/admin/invites" },
    "#admin-users": { title: "View users", endpoint: "/api/admin/users" },
    "#admin-payments": { title: "View payments", endpoint: "/api/admin/payments" }
  };
  const config = map[hash];
  return config ? <AdminPanel title={config.title} endpoint={config.endpoint} onClose={close} /> : null;
}

function AdminPanel({ title, endpoint, onClose }: { title: string; endpoint: string; onClose: () => void }) {
  const [data, setData] = useState<AdminData | AdminData[]>([]);
  const [message, setMessage] = useState("Loading internal read-only data...");
  useEffect(() => { void load(); }, [endpoint]);
  async function load() {
    const sessionResponse = await fetch("/api/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ walletAddress: adminWallet, role: "admin" }) });
    await sessionResponse.json().catch(() => null);
    const response = await fetch(endpoint);
    const json = await response.json();
    setData(json);
    setMessage(response.ok ? "Read-only private beta operations view." : "Unable to load admin data.");
  }
  return (
    <WorkflowModal title={title} eyebrow="Internal ops" onClose={onClose}>
      <div className="grid gap-4">
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm leading-6 text-text-secondary">{message} Advanced admin tooling is deferred for MVP; this panel is intentionally read-only.</div>
        <div className="max-h-[52vh] overflow-auto rounded-2xl border border-border-2 bg-bg-2 p-4">
          {Array.isArray(data) && data.length ? (
            <div className="grid gap-3">
              {data.map((item, index) => (
                <article key={index} className="rounded-2xl border border-border-2 bg-bg-2 p-3">
                  <div className="grid gap-2">{summarize(item)}</div>
                </article>
              ))}
            </div>
          ) : !Array.isArray(data) && Object.keys(data).length ? (
            <div className="grid gap-2">{summarize(data)}</div>
          ) : (
            <p className="text-sm text-text-muted">No records yet. This is expected for a small private beta.</p>
          )}
        </div>
      </div>
    </WorkflowModal>
  );
}
