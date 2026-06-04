"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BriefcaseBusiness, CheckCircle2, MessageSquareLock, WalletCards } from "lucide-react";
import { Field, inputClass, textareaClass, WorkflowModal } from "@/components/WorkflowModal";
import { EngagementCoordinationRoom } from "@/components/EngagementCoordinationRoom";
import { encryptEnvelopeString } from "@/lib/crypto-envelope";
import { operationalFocusOptions } from "@/lib/operational-focus";
import { engagementStructureDefinitions, engagementStructureOptions } from "@/lib/engagement-structure";

const employerWallet = "0xHarbor...9910";
type Gig = { id: string; title: string; pay: number; status: string; requiredSkills: string[]; applicantWallets?: string[]; dynamicPricingQuote?: { suggestedCompensationRange?: { minimum: number; suggested: number; premium: number } } };
type Applicant = { walletAddress: string; handle: string; skills?: string[]; verticals?: string[]; trustScore?: number; level?: number; availability?: string };
type TeamContributor = { id: string; contributorWallet: string; contributorHandle: string; assignedRole: string; status: string; capabilities?: string[]; agreementId?: string };
type VisibilityMode = "compartmentalized" | "operational_team" | "full_collaboration";
type TeamSummary = { engagementId: string; teamSize: number; acceptedCount: number; activeCount: number; pendingCount: number; visibilityMode?: VisibilityMode; contributors: TeamContributor[] };
type ChatThread = { id: string; agreementId?: string; gigId?: string; lastMessagePreview?: string; unreadCount?: number };
type ChatMessage = { id: string; senderWallet: string; encryptedPayload: string; status: string; createdAt: string };

export function EmployerWorkflowPanels() {
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
  if (hash === "#post-gig") return <PostGigPanel onClose={close} />;
  if (hash === "#review-applicants") return <ApplicantReviewPanel onClose={close} />;
  if (hash === "#employer-setup") return <EmployerSetupPanel onClose={close} />;
  if (hash === "#open-chat") return <EmployerChatPanel onClose={close} />;
  return null;
}

async function ensureEmployerSession() {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ walletAddress: employerWallet, role: "employer" })
  });
  await response.json().catch(() => null);
}

function PostGigPanel({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("Private field coordination request");
  const [vertical, setVertical] = useState("research-analysis-advisory");
  const [skills, setSkills] = useState("Research, coordination");
  const [pay, setPay] = useState("175");
  const [engagementStructure, setEngagementStructure] = useState("flat_fee");
  const [estimatedDuration, setEstimatedDuration] = useState("single_task");
  const [proposalNotes, setProposalNotes] = useState("Open to refining scope during agreement.");
  const [urgency, setUrgency] = useState("standard");
  const [locationMode, setLocationMode] = useState("local");
  const [preview, setPreview] = useState("Short scoped request with protected details shared after agreement.");
  const [message, setMessage] = useState("Save a draft or publish to trusted contributor discovery.");
  const [busy, setBusy] = useState(false);
  const quote = useMemo(() => {
    const amount = Math.max(0, Number(pay || 0));
    const multiplier = urgency === "surge" ? 1.25 : urgency === "priority" ? 1.12 : 1;
    return Math.round(amount * multiplier);
  }, [pay, urgency]);
  async function submit(status: "draft" | "published") {
    setBusy(true);
    setMessage(status === "draft" ? "Saving draft..." : "Publishing request...");
    try {
      await ensureEmployerSession();
      const response = await fetch("/api/employer/gigs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          vertical,
          category: vertical,
          requiredSkills: skills.split(",").map((item) => item.trim()).filter(Boolean),
          compensation: Number(pay),
          engagementStructure,
          rateAmount: Number(pay),
          ratePreview: engagementStructureDefinitions.find((item) => item.id === engagementStructure)?.placeholder,
          estimatedDuration,
          proposalNotes,
          urgency,
          locationMode,
          descriptionPreview: preview,
          encryptedJobDetailsRef: "local-encrypted-gig://draft-" + Date.now(),
          lifecycleStatus: status
        })
      });
      if (!response.ok) throw new Error((await response.json()).message ?? "Unable to save request.");
      setMessage(status === "draft" ? "Draft saved." : "Request published and available in discovery.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save request.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <WorkflowModal title="Create a secure request" eyebrow="Secure hiring" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Title"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Operational focus"><select className={inputClass} value={vertical} onChange={(event) => setVertical(event.target.value)}>{operationalFocusOptions().map((focus) => <option key={focus.id} value={focus.id}>{focus.label}</option>)}</select></Field>
          <Field label="Location mode"><select className={inputClass} value={locationMode} onChange={(event) => setLocationMode(event.target.value)}><option value="local">Local</option><option value="remote">Remote</option></select></Field>
        </div>
        <Field label="Required capabilities"><input className={inputClass} value={skills} onChange={(event) => setSkills(event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Compensation"><input className={inputClass} value={pay} onChange={(event) => setPay(event.target.value)} inputMode="numeric" /></Field>
          <Field label="Urgency"><select className={inputClass} value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="standard">Standard</option><option value="priority">Priority</option><option value="surge">Surge</option></select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Engagement structure"><select className={inputClass} value={engagementStructure} onChange={(event) => setEngagementStructure(event.target.value)}>{engagementStructureOptions().map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field><Field label="Estimated duration"><select className={inputClass} value={estimatedDuration} onChange={(event) => setEstimatedDuration(event.target.value)}><option value="single_task">Single task</option><option value="one_day">One day</option><option value="several_days">Several days</option><option value="one_week">One week</option><option value="ongoing">Ongoing</option><option value="flexible">Flexible</option></select></Field></div>
        <Field label="Proposal notes"><input className={inputClass} value={proposalNotes} onChange={(event) => setProposalNotes(event.target.value)} /></Field>
        <Field label="Public preview"><textarea className={textareaClass} value={preview} onChange={(event) => setPreview(event.target.value)} /></Field>
        <div className="rounded-2xl border border-gold-primary/20 bg-gold-primary/10 p-4 text-sm text-gold-primary">Suggested protected payout: ${quote}</div>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{message}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={busy} onClick={() => submit("draft")} className="wm-button-secondary min-h-12 disabled:opacity-60">Save draft</button>
          <button type="button" disabled={busy} onClick={() => submit("published")} className="wm-button-primary min-h-12 disabled:opacity-60">Publish request</button>
        </div>
      </div>
    </WorkflowModal>
  );
}

function ApplicantReviewPanel({ onClose }: { onClose: () => void }) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [selectedGig, setSelectedGig] = useState("");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>("compartmentalized");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading applicants...");
  useEffect(() => { void load(); }, []);
  async function load() {
    await ensureEmployerSession();
    const response = await fetch("/api/employer/gigs");
    const json = await response.json();
    const data = Array.isArray(json) ? json as Gig[] : [];
    setGigs(data);
    if (!response.ok) {
      setMessage("Applicant review is unavailable until an employer session is active.");
      return;
    }
    const first = data.find((gig) => (gig.applicantWallets?.length ?? 0) > 0) ?? data[0];
    if (first) await loadApplicants(first.id);
    else setMessage("No requests yet. Create a request first.");
  }
  async function loadApplicants(gigId: string) {
    if (!gigId) {
      setApplicants([]);
      setMessage("Create a request before reviewing applicants.");
      return;
    }
    setSelectedGig(gigId);
    setMessage("Loading applicants...");
    const [response, teamResponse] = await Promise.all([
      fetch("/api/employer/gigs/" + encodeURIComponent(gigId) + "/applicants"),
      fetch("/api/employer/engagements/" + encodeURIComponent(gigId) + "/team")
    ]);
    const data = await response.json();
    const teamData = await teamResponse.json();
    const list = Array.isArray(data) ? data : [];
    setApplicants(list);
    setTeam(teamResponse.ok ? teamData as TeamSummary : null);
    if (teamResponse.ok && (teamData as TeamSummary).visibilityMode) setVisibilityMode((teamData as TeamSummary).visibilityMode!);
    setRoleDrafts((current) => ({
      ...Object.fromEntries(list.map((applicant) => [applicant.walletAddress, current[applicant.walletAddress] ?? "Contributor"])),
      ...Object.fromEntries(((teamResponse.ok ? (teamData as TeamSummary).contributors : []) ?? []).map((contributor) => [contributor.id, contributor.assignedRole]))
    }));
    setMessage(list.length ? "Review applicants, assign roles, and build the engagement team." : "No applicants yet for this request.");
  }
  async function review(walletAddress: string, action: "accept" | "reject", assignedRole?: string) {
    await ensureEmployerSession();
    const response = await fetch("/api/employer/gigs/" + encodeURIComponent(selectedGig) + "/applicants/" + encodeURIComponent(walletAddress) + "/" + action, { method: "POST" });
    if (response.ok && action === "accept" && assignedRole) {
      const state = await response.json().catch(() => null);
      await fetch("/api/employer/engagements/" + encodeURIComponent(selectedGig) + "/team/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contributorWallet: walletAddress, assignedRole, agreementId: state?.agreement?.id })
      });
    }
    setMessage(response.ok ? (action === "accept" ? "Applicant accepted and added to the engagement team." : "Applicant rejected.") : "Unable to update applicant.");
    await loadApplicants(selectedGig);
  }
  async function updateRole(contributor: TeamContributor, assignedRole: string) {
    await ensureEmployerSession();
    await fetch("/api/employer/engagements/" + encodeURIComponent(selectedGig) + "/team/" + encodeURIComponent(contributor.id), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assignedRole })
    });
    await loadApplicants(selectedGig);
  }
  async function removeContributor(contributor: TeamContributor) {
    await ensureEmployerSession();
    const response = await fetch("/api/employer/engagements/" + encodeURIComponent(selectedGig) + "/team/" + encodeURIComponent(contributor.id), { method: "DELETE" });
    setMessage(response.ok ? "Contributor removed from this engagement." : "Unable to remove contributor from this engagement.");
    await loadApplicants(selectedGig);
  }
  async function saveVisibilityMode(nextMode: VisibilityMode) {
    setVisibilityMode(nextMode);
    await ensureEmployerSession();
    const response = await fetch("/api/employer/engagements/" + encodeURIComponent(selectedGig) + "/visibility", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibilityMode: nextMode })
    });
    setMessage(response.ok ? "Visibility mode updated for this engagement." : "Unable to update visibility mode.");
    await loadApplicants(selectedGig);
  }
  return (
    <WorkflowModal title="Review applicants" eyebrow="Secure hiring" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Request"><select className={inputClass} value={selectedGig} onChange={(event) => loadApplicants(event.target.value)}>{gigs.map((gig) => <option key={gig.id} value={gig.id}>{gig.title}</option>)}</select></Field>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{message}</div>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-white">Assigned contributors</h3>
              <p className="text-sm text-text-muted">Employer-visible roster for this engagement. Contributors only see their own assignment in Phase 1.</p>
            </div>
            <span className="wm-label text-text-muted">{team?.teamSize ?? 0} assigned</span>
          </div>
          <div className="mt-4 grid gap-3">
            {team?.contributors?.length ? team.contributors.map((contributor) => (
              <article key={contributor.id} className="rounded-2xl border border-border-2 bg-bg-3 p-3">
                <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                  <div>
                    <h4 className="font-semibold text-white">{contributor.contributorHandle}</h4>
                    <p className="text-xs text-text-muted">{contributor.status} {contributor.agreementId ? "· agreement linked" : "· assignment only"}</p>
                  </div>
                  <input
                    className={inputClass}
                    value={roleDrafts[contributor.id] ?? contributor.assignedRole}
                    onChange={(event) => setRoleDrafts((current) => ({ ...current, [contributor.id]: event.target.value }))}
                    onBlur={(event) => updateRole(contributor, event.target.value)}
                    aria-label="Role on this engagement"
                  />
                  <button type="button" onClick={() => removeContributor(contributor)} className="wm-button-secondary min-h-11">Remove</button>
                </div>
              </article>
            )) : <p className="text-sm text-text-muted">Accept applicants to assemble a trusted team for this engagement.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4">
          <Field label="Visibility mode">
            <select className={inputClass} value={visibilityMode} onChange={(event) => saveVisibilityMode(event.target.value as VisibilityMode)}>
              <option value="compartmentalized">Compartmentalized</option>
              <option value="operational_team">Operational Team</option>
              <option value="full_collaboration">Full Collaboration</option>
            </select>
          </Field>
          <div className="mt-3 grid gap-2 text-sm text-text-secondary">
            <p><strong className="text-white">Compartmentalized:</strong> Contributors see minimal team information.</p>
            <p><strong className="text-white">Operational Team:</strong> Contributors can view limited team roles and participant context.</p>
            <p><strong className="text-white">Full Collaboration:</strong> Contributors can collaborate more openly within the engagement.</p>
          </div>
        </div>
        {selectedGig && <EngagementCoordinationRoom engagementId={selectedGig} canCreate />}
        <div className="grid gap-3">
          {applicants.map((applicant) => (
            <article key={applicant.walletAddress} className="rounded-2xl border border-border-2 bg-bg-2 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">{applicant.handle}</h3>
                  <p className="mt-1 text-xs text-text-muted">Trust {applicant.trustScore ?? "pending"} / Level {applicant.level ?? "n/a"} / {applicant.availability ?? "availability hidden"}</p>
                  <p className="mt-2 text-sm text-text-secondary">{(applicant.skills ?? []).join(", ") || "Capabilities hidden by privacy settings"}</p>
                </div>
                <div className="grid gap-2 sm:w-64">
                  <input
                    className={inputClass}
                    placeholder="Role on this engagement"
                    value={roleDrafts[applicant.walletAddress] ?? "Contributor"}
                    onChange={(event) => setRoleDrafts((current) => ({ ...current, [applicant.walletAddress]: event.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => review(applicant.walletAddress, "reject")} className="wm-button-secondary min-h-11">Reject</button>
                    <button type="button" onClick={() => review(applicant.walletAddress, "accept", roleDrafts[applicant.walletAddress] || "Contributor")} className="wm-button-primary min-h-11">Accept</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </WorkflowModal>
  );
}

function EmployerSetupPanel({ onClose }: { onClose: () => void }) {
  const [handle, setHandle] = useState("harbor_supply");
  const [type, setType] = useState("local_smb");
  const [region, setRegion] = useState("NYC-03");
  const [message, setMessage] = useState("Complete hiring basics for private beta access.");
  async function save() {
    await ensureEmployerSession();
    const response = await fetch("/api/employer/profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ employerHandle: handle, employerType: type, region }) });
    setMessage(response.ok ? "Hiring setup saved." : "Unable to save hiring setup.");
  }
  return (
    <WorkflowModal title="Complete hiring setup" eyebrow="First-run setup" onClose={onClose}>
      <div className="grid gap-4">
        <Field label="Hiring handle"><input className={inputClass} value={handle} onChange={(event) => setHandle(event.target.value)} /></Field>
        <Field label="Organization type"><input className={inputClass} value={type} onChange={(event) => setType(event.target.value)} /></Field>
        <Field label="Region"><input className={inputClass} value={region} onChange={(event) => setRegion(event.target.value)} /></Field>
        <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{message}</div>
        <button type="button" onClick={save} className="wm-button-primary min-h-12">Save setup</button>
      </div>
    </WorkflowModal>
  );
}

function EmployerChatPanel({ onClose }: { onClose: () => void }) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [threadId, setThreadId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("Encrypted employer update: agreement scope is ready.");
  const [status, setStatus] = useState("Checking agreement and thread status...");
  useEffect(() => { void loadThreads(); }, []);
  async function loadThreads() {
    await ensureEmployerSession();
    const response = await fetch("/api/messages/threads?walletAddress=" + encodeURIComponent(employerWallet));
    const data = await response.json() as ChatThread[];
    const safeThreads = Array.isArray(data) ? data : [];
    setThreads(safeThreads);
    const first = safeThreads[0];
    if (first) {
      await loadMessages(first.id);
    } else {
      setStatus("Secure messaging activates after accepting an applicant and creating an agreement.");
    }
  }
  async function loadMessages(id: string) {
    setThreadId(id);
    const response = await fetch("/api/messages/thread/" + encodeURIComponent(id));
    const data = await response.json() as ChatMessage[];
    setMessages(Array.isArray(data) ? data : []);
    setStatus("Thread loaded. Messages are stored as encrypted payloads.");
  }
  async function send() {
    if (!threadId) return;
    setStatus("Sending encrypted payload...");
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, senderWallet: employerWallet, recipientWallet: "0xK914...7F21", encryptedPayload: await encryptEnvelopeString(text), attachmentRefs: [] })
    });
    setStatus(response.ok ? "Message sent." : "Unable to send message.");
    await loadMessages(threadId);
  }
  return (
    <WorkflowModal title="Employer chat" eyebrow="Encrypted coordination" onClose={onClose}>
      {threads.length ? (
        <div className="grid gap-4">
          <Field label="Agreement thread"><select className={inputClass} value={threadId} onChange={(event) => loadMessages(event.target.value)}>{threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.agreementId ?? thread.id}</option>)}</select></Field>
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-border-2 bg-bg-2 p-3">
            {messages.length ? messages.map((message) => <div key={message.id} className="mb-2 rounded-2xl bg-bg-3 p-3 text-sm text-text-secondary"><span className="wm-label">{message.status}</span><p className="mt-1 break-all">{message.encryptedPayload}</p></div>) : <p className="p-3 text-sm text-text-muted">{status}</p>}
          </div>
          <Field label="Message"><textarea className={textareaClass} value={text} onChange={(event) => setText(event.target.value)} /></Field>
          <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 text-sm text-text-secondary">{status}</div>
          <button type="button" onClick={send} disabled={!threadId} className="wm-button-primary min-h-12 disabled:opacity-60">Send encrypted message</button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border-2 bg-bg-2 p-5">
            <h3 className="font-semibold text-white">Secure messaging locked</h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">{status}</p>
            <p className="mt-3 text-sm leading-6 text-text-muted">Chat unlocks after a trusted contributor is accepted. Relai then creates an agreement-scoped thread so hiring teams cannot send random unsolicited messages.</p>
          </div>
          <a href="#review-applicants" className="wm-button-primary min-h-12">Review applicants</a>
        </div>
      )}
    </WorkflowModal>
  );
}
