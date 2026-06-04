"use client";

import { useEffect, useState } from "react";
import { encryptEnvelopeString } from "@/lib/crypto-envelope";
import { Field, textareaClass } from "@/components/WorkflowModal";

type Room = { id: string; engagementId: string; title: string; status: string };
type Participant = { id: string; walletAddress: string; handle: string; assignedRole: string; participantType: string; status: string; dmPermission?: string; disclosureState?: string; lastReadAt?: string };
type Message = { id: string; senderWallet: string; senderHandle: string; senderRole: string; encryptedPayload: string; createdAt: string };
type Roster = { participants: Participant[]; activeCount: number; contributorCount: number; visibilityMode?: string; dmEnabled?: boolean };

export function EngagementCoordinationRoom({ engagementId, canCreate = false, currentWallet }: { engagementId: string; canCreate?: boolean; currentWallet?: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmRecipient, setDmRecipient] = useState("");
  const [draft, setDraft] = useState("Encrypted team update: scope and timing are ready for review.");
  const [status, setStatus] = useState("Loading secure coordination room...");

  useEffect(() => { void load(); }, [engagementId]);

  async function load() {
    setStatus("Loading secure coordination room...");
    const response = await fetch("/api/engagements/" + encodeURIComponent(engagementId) + "/room", { method: canCreate ? "POST" : "GET" });
    const payload = await response.json().catch(() => null);
    const nextRoom = payload?.room ?? payload;
    if (!response.ok || !nextRoom?.id) {
      setRoom(null);
      setRoster(null);
      setMessages([]);
      setStatus(canCreate ? "Add contributors to activate this room." : "Secure coordination room opens after acceptance.");
      return;
    }
    setRoom(nextRoom);
    await loadRoom(nextRoom.id);
  }

  async function loadRoom(roomId: string) {
    const [participantsResponse, messagesResponse] = await Promise.all([
      fetch("/api/rooms/" + encodeURIComponent(roomId) + "/participants"),
      fetch("/api/rooms/" + encodeURIComponent(roomId) + "/messages")
    ]);
    const participants = await participantsResponse.json().catch(() => null);
    const roomMessages = await messagesResponse.json().catch(() => []);
    setRoster(participantsResponse.ok ? participants as Roster : null);
    setMessages(Array.isArray(roomMessages) ? roomMessages : []);
    setStatus(participants?.activeCount ? "This room is linked to the engagement and includes accepted contributors." : "Add contributors to activate this room.");
  }

  async function send() {
    if (!room) return;
    setStatus("Encrypting and sending team message...");
    const response = await fetch("/api/rooms/" + encodeURIComponent(room.id) + "/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encryptedPayload: await encryptEnvelopeString(draft), attachmentRefs: [] })
    });
    setStatus(response.ok ? "Team message sent." : "Unable to send team message.");
    await loadRoom(room.id);
  }

  async function sendDm() {
    if (!dmRecipient) return;
    setStatus("Encrypting engagement-scoped direct message...");
    const response = await fetch("/api/engagements/" + encodeURIComponent(engagementId) + "/dms/" + encodeURIComponent(dmRecipient), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ encryptedPayload: await encryptEnvelopeString(draft), attachmentRefs: [] })
    });
    setStatus(response.ok ? "Engagement-scoped direct message sent." : "Direct messages are available only in Full Collaboration mode.");
  }

  const dmParticipants = (roster?.participants ?? []).filter((participant) =>
    roster?.dmEnabled && participant.participantType === "contributor" && participant.dmPermission === "engagement_dm_enabled" && participant.walletAddress !== "hidden" && (!currentWallet || participant.walletAddress.toLowerCase() !== currentWallet.toLowerCase())
  );
  const modeLabel = roster?.visibilityMode === "full_collaboration" ? "Full Collaboration" : roster?.visibilityMode === "operational_team" ? "Operational Team" : "Limited visibility";

  return (
    <section className="rounded-2xl border border-border-2 bg-bg-2 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Secure coordination room</h3>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{modeLabel}: participants see only the team context allowed for this engagement. Private contact details stay hidden unless disclosed.</p>
        </div>
        <span className="wm-chip border-border-2 bg-bg-3 text-text-secondary">{roster?.activeCount ?? 0} active</span>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border-2 bg-bg-3 p-3">
          <p className="wm-label text-text-muted">Engagement team</p>
          <div className="mt-3 grid gap-2">
            {roster?.participants.length ? roster.participants.map((participant) => (
              <div key={participant.id} className="rounded-xl border border-border-2 bg-bg-2 p-3">
                <p className="font-semibold text-white">{participant.handle}</p>
                <p className="text-xs text-text-muted">{participant.assignedRole} · {participant.participantType} · {participant.disclosureState ?? "minimal"}</p>
              </div>
            )) : <p className="text-sm text-text-muted">No active room participants yet.</p>}
          </div>
        </aside>
        <div className="grid gap-3">
          <div className="max-h-72 overflow-y-auto rounded-2xl border border-border-2 bg-bg-3 p-3">
            {messages.length ? messages.map((message) => (
              <article key={message.id} className="mb-2 rounded-2xl bg-bg-2 p-3 text-sm text-text-secondary">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{message.senderHandle}</span>
                  <span className="wm-label text-text-muted">{message.senderRole}</span>
                </div>
                <p className="mt-2 break-all text-xs leading-5 text-text-muted">{message.encryptedPayload}</p>
              </article>
            )) : <p className="p-3 text-sm text-text-muted">{status}</p>}
          </div>
          <Field label="Team message"><textarea className={textareaClass} value={draft} onChange={(event) => setDraft(event.target.value)} /></Field>
          <div className="rounded-2xl border border-border-2 bg-bg-3 p-3 text-sm text-text-secondary">{status}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={!room} onClick={send} className="wm-button-primary min-h-12 disabled:opacity-60">Send encrypted team message</button>
            <div className="grid gap-2">
              <select className="min-h-12 rounded-2xl border border-border-2 bg-bg-3 px-4 text-sm text-white outline-none disabled:opacity-50" value={dmRecipient} onChange={(event) => setDmRecipient(event.target.value)} disabled={!dmParticipants.length}>
                <option value="">{dmParticipants.length ? "Direct message..." : "DMs disabled"}</option>
                {dmParticipants.map((participant) => <option key={participant.id} value={participant.walletAddress}>{participant.handle} · {participant.assignedRole}</option>)}
              </select>
              <button type="button" disabled={!dmRecipient} onClick={sendDm} className="wm-button-secondary min-h-12 disabled:opacity-60">Send scoped DM</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
