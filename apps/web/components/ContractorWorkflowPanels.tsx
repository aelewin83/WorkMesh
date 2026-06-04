"use client";

import { useEffect, useState } from "react";
import { Field, inputClass, textareaClass, WorkflowModal } from "@/components/WorkflowModal";
import { EngagementCoordinationRoom } from "@/components/EngagementCoordinationRoom";
import { encryptEnvelopeString } from "@/lib/crypto-envelope";
import { operationalFocusOptions } from "@/lib/operational-focus";
import { engagementStructureDefinitions, engagementStructureOptions } from "@/lib/engagement-structure";

const contractorWallet = "0xK914...7F21";
type Thread = { id: string; lastMessagePreview?: string; unreadCount?: number };
type Message = { id: string; senderWallet: string; encryptedPayload: string; status: string; createdAt: string };
type AssignedEngagement = {
  engagement: { id: string; title: string; descriptionPreview: string; status: string; employerWallet: string; teamSize: number; multiContributor: boolean };
  assignment: { assignedRole: string; status: string; agreementId?: string };
  visibility: { guidance: string; teamRosterVisible: boolean };
};

export function ContractorWorkflowPanels() {
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
  if (hash === "#complete-setup") return <SetupPanel onClose={close} />;
  if (hash === "#open-chat") return <ChatPanel onClose={close} />;
  return null;
}

export function AssignedEngagementsPanel() {
  const [items, setItems] = useState<AssignedEngagement[]>([]);
  const [status, setStatus] = useState("Loading assigned engagements...");
  useEffect(() => { void load(); }, []);
  async function load() {
    await ensureContractorSession();
    const response = await fetch("/api/contributor/engagements");
    const data = await response.json();
    const list = Array.isArray(data) ? data as AssignedEngagement[] : [];
    setItems(list);
    setStatus(list.length ? "Your active assignments are scoped to your role." : "Accepted assignments will appear here.");
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <article key={item.engagement.id} className="rounded-3xl border border-border-2 bg-bg-2 p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="wm-label text-gold-primary">Assigned engagement</p>
              <h3 className="mt-2 text-xl font-bold text-white">{item.engagement.title}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{item.engagement.descriptionPreview}</p>
            </div>
            <span className="wm-chip border-border-2 bg-bg-3 text-text-secondary">{item.assignment.status}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border-2 bg-bg-3 p-3">
              <p className="wm-label text-text-muted">Your role</p>
              <p className="mt-1 font-semibold text-white">{item.assignment.assignedRole}</p>
            </div>
            <div className="rounded-2xl border border-border-2 bg-bg-3 p-3">
              <p className="wm-label text-text-muted">Agreement</p>
              <p className="mt-1 font-semibold text-white">{item.assignment.agreementId ? "Linked" : "Pending"}</p>
            </div>
            <div className="rounded-2xl border border-border-2 bg-bg-3 p-3">
              <p className="wm-label text-text-muted">Team context</p>
              <p className="mt-1 font-semibold text-white">{item.engagement.multiContributor ? "Limited" : "Single"}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-text-muted">{item.visibility.guidance}</p>
          <div className="mt-4">
            <EngagementCoordinationRoom engagementId={item.engagement.id} currentWallet={contractorWallet} />
          </div>
        </article>
      ))}
      {!items.length && <div className="rounded-3xl border border-border-2 bg-bg-2 p-5 text-sm text-text-secondary">{status}</div>}
    </div>
  );
}

async function ensureContractorSession() {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAddress: contractorWallet, role: "contractor" })
  });
  await response.json().catch(() => null);
}

function SetupPanel({ onClose }: { onClose: () => void }) {
  const [handle, setHandle] = useState("K-914");
  const [vertical, setVertical] = useState("research-analysis-advisory");
  const [skills, setSkills] = useState("Research, coordination");
  const [engagementStructure, setEngagementStructure] = useState("flat_fee");
  const [ratePreview, setRatePreview] = useState("$800-$1,500/project");
  const [region, setRegion] = useState("NYC-03");
  const [availability, setAvailability] = useState("available_today");
  const [message, setMessage] = useState("Completion: 72%. Add the basics below to finish setup.");
  async function save() {
    await ensureContractorSession();
    const response = await fetch("/api/profile/" + encodeURIComponent(contractorWallet), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        handle,
        verticals: [vertical],
        skills: skills.split(",").map((item) => item.trim()).filter(Boolean),
        engagementPreferences: [{ structure: engagementStructure, ratePreview, visibility: "after_application" }],
        rateVisibility: "after_application",
        region: { country: "US", metro: region, locationMode: "hybrid", serviceRadiusMiles: 10, preciseLocationShared: false },
        availability,
        onboardingCompleted: true,
        profileVisibility: { showHandle: true, showSkills: true, showRegion: true, showRating: true, showAvailability: true, showExactLocation: false, showRealName: false, showPhone: false, showEmail: false }
      })
    });
    setMessage(response.ok ? "Setup saved. Your dashboard now reflects the updated profile." : "Unable to save setup.");
  }
  return (
    <WorkflowModal title="Complete trusted work setup" eyebrow="First-run setup" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Pseudonymous handle"><input className={inputClass} value={handle} onChange={(event) => setHandle(event.target.value)} /></Field>
        <Field label="Operational focus"><select className={inputClass} value={vertical} onChange={(event) => setVertical(event.target.value)}>{operationalFocusOptions().map((focus) => <option key={focus.id} value={focus.id}>{focus.label}</option>)}</select></Field>
        <Field label="Capabilities"><input className={inputClass} value={skills} onChange={(event) => setSkills(event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Preferred engagement"><select className={inputClass} value={engagementStructure} onChange={(event) => setEngagementStructure(event.target.value)}>{engagementStructureOptions().map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label="Typical range"><input className={inputClass} value={ratePreview} onChange={(event) => setRatePreview(event.target.value)} placeholder={engagementStructureDefinitions.find((item) => item.id === engagementStructure)?.placeholder} /></Field></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region"><input className={inputClass} value={region} onChange={(event) => setRegion(event.target.value)} /></Field>
          <Field label="Availability"><select className={inputClass} value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="ready_now">Ready now</option><option value="available_today">Available today</option><option value="scheduled">Scheduled</option></select></Field>
        </div>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">Privacy defaults: exact location, real name, phone, and email remain hidden.</div>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{message}</div>
        <button type="button" onClick={save} className="wm-button-primary min-h-12">Save setup</button>
      </div>
    </WorkflowModal>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("Encrypted update: I can confirm the scope.");
  const [status, setStatus] = useState("Loading thread...");
  useEffect(() => { void loadThreads(); }, []);
  async function loadThreads() {
    await ensureContractorSession();
    const response = await fetch("/api/messages/threads?walletAddress=" + encodeURIComponent(contractorWallet));
    const data = await response.json() as Thread[];
    setThreads(data);
    const first = data[0];
    if (first) await loadMessages(first.id);
    else setStatus("No thread yet. Apply to or accept a request to start coordination.");
  }
  async function loadMessages(id: string) {
    setThreadId(id);
    const response = await fetch("/api/messages/thread/" + encodeURIComponent(id));
    const data = await response.json() as Message[];
    setMessages(Array.isArray(data) ? data : []);
    setStatus("Thread loaded. Messages are stored as encrypted payloads.");
  }
  async function send() {
    if (!threadId) return;
    setStatus("Sending encrypted payload...");
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, senderWallet: contractorWallet, recipientWallet: "0xHarbor...9910", encryptedPayload: await encryptEnvelopeString(text), attachmentRefs: [] })
    });
    setStatus(response.ok ? "Message sent." : "Unable to send message.");
    await loadMessages(threadId);
  }
  return (
    <WorkflowModal title="Open chat" eyebrow="Encrypted coordination" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Thread"><select className={inputClass} value={threadId} onChange={(event) => loadMessages(event.target.value)}>{threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.id}</option>)}</select></Field>
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-border-2 bg-bg-2 p-3">
          {messages.length ? messages.map((message) => <div key={message.id} className="mb-2 rounded-2xl bg-bg-3 p-3 text-sm text-text-secondary"><span className="wm-label">{message.status}</span><p className="mt-1 break-all">{message.encryptedPayload}</p></div>) : <p className="p-3 text-sm text-text-muted">{status}</p>}
        </div>
        <Field label="Message"><textarea className={textareaClass} value={text} onChange={(event) => setText(event.target.value)} /></Field>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{status}</div>
        <button type="button" onClick={send} disabled={!threadId} className="wm-button-primary min-h-12 disabled:opacity-60">Send encrypted message</button>
      </div>
    </WorkflowModal>
  );
}
