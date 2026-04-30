"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquare,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  WalletCards,
  Zap
} from "lucide-react";
import {
  fieldLabel,
  createContractorServices,
  loadContractorCommandState,
  markAllNotificationsRead,
  markAllNotificationsReadWithActiveService,
  markNotificationRead,
  markNotificationReadWithActiveService,
  MockCryptoService,
  persistState,
  platformFee,
  resetContractorCommandState,
  updateDisclosure,
  updateDisclosureWithActiveService,
  type AgreementStatus,
  type ContractorCommandState,
  type ContractorFilters,
  type ContractorGig,
  type DisclosureField,
  type GigStatus,
  type MatchScore
} from "@/lib/contractor-services";
import { getDataMode } from "@/lib/config";

const cryptoService = new MockCryptoService();
const { gigService, matchingService, chatService, agreementService, paymentService } = createContractorServices(cryptoService);

export function ContractorMobileConsole() {
  const [state, setState] = useState<ContractorCommandState | null>(null);
  const [visibleGigs, setVisibleGigs] = useState<ContractorGig[]>([]);
  const [message, setMessage] = useState("");
  const [proofNote, setProofNote] = useState("Dock cleared, pallet count verified, timestamp and mock location attached.");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadContractorCommandState(cryptoService)
      .then(async (loaded) => {
        const matches = await matchingService.recommended(loaded.profile.walletAddress, loaded);
        const next = persistState({ ...loaded, matches });
        const gigs = await gigService.search(next.filters, next);
        if (mounted) {
          setState(next);
          setVisibleGigs(gigs);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError(`Unable to load ${getDataMode()} contractor command state.`);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedGig = useMemo(() => {
    if (!state) return null;
    return state.gigs.find((gig) => gig.id === state.selectedGigId) ?? state.gigs[0];
  }, [state]);

  const selectedMatch = useMemo(() => {
    if (!state || !selectedGig) return null;
    return state.matches.find((match) => match.gigId === selectedGig.id) ?? null;
  }, [selectedGig, state]);

  if (loading) return <MobileFrame><SkeletonConsole /></MobileFrame>;
  if (error || !state || !selectedGig) return <MobileFrame><ErrorState message={error ?? "Contractor state unavailable."} onRetry={() => location.reload()} /></MobileFrame>;

  const unreadCount = state.notifications.filter((item) => !item.read).length;
  const fee = platformFee(selectedGig.pay, state.payment.platformFeeBps);
  const net = Math.round((selectedGig.pay - fee) * 100) / 100;

  const refreshMatches = async (nextState = state) => {
    const matches = await matchingService.recommended(nextState.profile.walletAddress, nextState);
    const updated = persistState({ ...nextState, matches });
    const gigs = await gigService.search(updated.filters, updated);
    setState(updated);
    setVisibleGigs(gigs);
  };

  const updateFilters = async (filters: Partial<ContractorFilters>) => {
    const next = persistState({ ...state, filters: { ...state.filters, ...filters } });
    setState(next);
    setVisibleGigs(await gigService.search(next.filters, next));
  };

  const selectGig = async (gigId: string) => {
    const nextGig = state.gigs.find((gig) => gig.id === gigId);
    if (!nextGig) return;
    const next = persistState({
      ...state,
      selectedGigId: gigId,
      agreement: { ...state.agreement, gigId },
      payment: { ...state.payment, gross: nextGig.pay }
    });
    await refreshMatches(next);
  };

  const setGigStatus = async (status: GigStatus) => {
    const next = await gigService.updateStatus(selectedGig.id, status, state);
    await refreshMatches(next);
  };

  const sendMessage = async () => {
    const clean = message.trim();
    if (!clean) return;
    const next = await chatService.send(`thread_${selectedGig.id}`, clean, state);
    setMessage("");
    setState(next);
  };

  const runAgreementAction = async (action: "accept" | "arrival" | "start" | "complete" | "approve") => {
    const next = await agreementService.transition(action, state, proofNote);
    await refreshMatches(next);
  };

  const toggleDisclosure = (field: DisclosureField) => {
    const enabled = !state.profile.disclosures[field];
    const ok = window.confirm(
      enabled
        ? `Reveal ${fieldLabel(field)} to ${selectedGig.client} for agreement ${state.agreement.id}? This will be recorded in your disclosure audit trail.`
        : `Revoke ${fieldLabel(field)} from future profile previews? This will be recorded in your disclosure audit trail.`
    );
    if (!ok) return;
    updateDisclosureWithActiveService(state, field, enabled).then(setState).catch(() => {
      setState(updateDisclosure(state, field, enabled));
    });
  };

  return (
    <section id="mobile-home" className="min-h-screen scroll-mt-24 bg-bg-0 px-3 pb-28 pt-3 text-white">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[34px] border border-border-2 bg-bg-1 shadow-card">
        <div className="flex items-center justify-between border-b border-border-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <a href="#mobile-notifications" className="relative text-text-secondary">
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              {unreadCount ? <span className="absolute -right-2 -top-2 h-2.5 w-2.5 rounded-full bg-gold-primary" /> : null}
            </a>
            <div>
              <p className="wm-heading text-base font-bold">WorkMesh</p>
              <p className="wm-label text-success">Contractor</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <a href="#mobile-profile" aria-label="Open privacy controls">
              <LockKeyhole className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
            <a href="#mobile-gigs" aria-label="Open gig search">
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          <ProfileCard state={state} />

          <div className="grid grid-cols-2 gap-3">
            <MetricTile label="Ready now" value={state.profile.availability === "ready_now" ? "On" : "Hold"} tone="success" Icon={Zap} />
            <MetricTile label="Escrow" value={`$${selectedGig.pay}`} tone="gold" Icon={WalletCards} />
          </div>

          <FeaturedGig gig={selectedGig} match={selectedMatch} onApply={() => setGigStatus("applied")} onClaim={() => setGigStatus("claimed")} />

          <GigMarketplace
            state={state}
            gigs={visibleGigs}
            selectedGigId={selectedGig.id}
            onSelectGig={selectGig}
            onFilters={updateFilters}
            onRefresh={() => refreshMatches()}
          />

          <MatchPanel gig={selectedGig} match={selectedMatch} />

          <AgreementPanel status={state.agreement.status} terms={state.agreement.terms} proofNote={proofNote} setProofNote={setProofNote} onAction={runAgreementAction} />

          <ChatPanel messages={state.messages.filter((item) => item.threadId === `thread_${selectedGig.id}` || item.threadId === "thread_dock")} message={message} setMessage={setMessage} sendMessage={sendMessage} />

          <PaymentPanel state={state} gross={selectedGig.pay} fee={fee} net={net} connectWallet={async () => setState(await paymentService.connectWallet(state))} syncEscrow={async () => setState(await paymentService.syncEscrow(state))} />

          <ReputationPanel state={state} />

          <NotificationsPanel
            state={state}
            onRead={(notificationId) => {
              markNotificationReadWithActiveService(state, notificationId).then(setState).catch(() => setState(markNotificationRead(state, notificationId)));
            }}
            onReadAll={() => {
              markAllNotificationsReadWithActiveService(state).then(setState).catch(() => setState(markAllNotificationsRead(state)));
            }}
          />

          <PrivacyPanel state={state} onToggle={toggleDisclosure} />

          <button
            type="button"
            onClick={async () => {
              resetContractorCommandState();
              const next = await loadContractorCommandState(cryptoService);
              setState(next);
              setVisibleGigs(await gigService.search(next.filters, next));
            }}
            className="rounded-2xl border border-border-2 bg-bg-2 p-3 text-sm font-semibold text-text-secondary"
          >
            Reset local demo state
          </button>
        </div>
      </div>
    </section>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-bg-0 px-3 pb-28 pt-3 text-white">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[34px] border border-border-2 bg-bg-1 p-4 shadow-card">{children}</div>
    </section>
  );
}

function SkeletonConsole() {
  return (
    <div className="grid gap-3">
      {[88, 48, 160, 220, 180].map((height, index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-border-2 bg-bg-2" style={{ height }} />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-danger/20 bg-danger/10 p-5">
      <p className="wm-heading text-lg font-bold text-danger">Contractor console unavailable</p>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
      <button type="button" onClick={onRetry} className="wm-button-secondary mt-4">Retry</button>
    </div>
  );
}

function ProfileCard({ state }: { state: ContractorCommandState }) {
  const profile = state.profile;
  return (
    <article id="profile" className="rounded-3xl border border-border-2 bg-bg-2 p-4 shadow-card">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10 text-xl font-bold text-gold-primary shadow-gold-glow">
          {profile.initials}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="wm-heading truncate text-xl font-bold">{profile.publicHandle}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-success">
            <span className="h-2 w-2 rounded-full bg-success" />
            {profile.availability === "ready_now" ? "Online" : "Limited"}
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {profile.disclosures.realName ? "Real name disclosed for active work" : "Anonymous contractor"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-text-secondary">{profile.levelName} / Level {profile.level}</p>
          <p className="wm-metric mt-1 text-xs text-white">{profile.xp.toLocaleString()} / {profile.xpNext.toLocaleString()} XP</p>
        </div>
        <Sparkles className="h-4 w-4 text-gold-primary" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-3">
        <div className="h-full rounded-full bg-gold-primary shadow-gold-glow" style={{ width: `${Math.round((profile.xp / profile.xpNext) * 100)}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {profile.skillTags.slice(0, 4).map((tag) => <span key={tag} className="wm-chip">{tag}</span>)}
      </div>
    </article>
  );
}

function MetricTile({ label, value, tone, Icon }: { label: string; value: string; tone: "success" | "gold"; Icon: typeof Zap }) {
  return (
    <div className="rounded-2xl border border-border-2 bg-bg-2 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className={`wm-metric text-2xl font-semibold ${tone === "success" ? "text-success" : "text-gold-primary"}`}>{value}</p>
        <Icon className={`h-5 w-5 ${tone === "success" ? "text-success" : "text-gold-primary"}`} strokeWidth={1.75} aria-hidden="true" />
      </div>
    </div>
  );
}

function FeaturedGig({ gig, match, onApply, onClaim }: { gig: ContractorGig; match: MatchScore | null; onApply: () => void; onClaim: () => void }) {
  const isIneligible = match ? match.missingRequirements.some((item) => item.includes("Level")) : false;
  return (
    <article className="rounded-3xl border border-border-2 bg-bg-2 p-4 shadow-card">
      <p className="wm-label text-text-muted">Featured gig</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="wm-heading text-base font-bold leading-5">{gig.title}</h2>
          <p className="mt-1 text-xs text-text-muted">{gig.client}</p>
        </div>
        <span className="rounded-lg border border-gold-primary/30 bg-gold-primary/10 px-2 py-1 font-mono text-[0.65rem] font-semibold text-gold-primary">
          {gig.escrowRequired ? "Escrow" : "Direct"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-border-2 border-y border-border-2 py-3">
        <Detail label="Range" value={`${gig.distanceMiles} mi`} />
        <Detail label="Window" value={gig.window} padded />
        <Detail label="Pay" value={`$${gig.pay}`} tone="success" padded />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="wm-label text-gold-primary">{gig.urgency === "surge" ? "Surge" : gig.urgency}</span>
        <span className="wm-label text-gold-primary">{match?.totalScore ?? 0}% match</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onApply} disabled={gig.status !== "available" || isIneligible} className="wm-button-secondary disabled:opacity-50">
          Apply
        </button>
        <button type="button" onClick={onClaim} disabled={gig.status === "claimed" || gig.status === "completed" || isIneligible} className="wm-button-primary disabled:opacity-50">
          {gig.status === "claimed" ? "Claimed" : isIneligible ? "Locked" : "Claim gig"}
        </button>
      </div>
      <p className="mt-3 text-xs text-text-muted">Status: <span className="text-white">{gig.status.replace("_", " ")}</span></p>
    </article>
  );
}

function GigMarketplace({ state, gigs, selectedGigId, onSelectGig, onFilters, onRefresh }: { state: ContractorCommandState; gigs: ContractorGig[]; selectedGigId: string; onSelectGig: (id: string) => void; onFilters: (filters: Partial<ContractorFilters>) => void; onRefresh: () => void }) {
  return (
    <section id="mobile-gigs" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Marketplace" title="Search gigs" Icon={BriefcaseBusiness} action={<button type="button" onClick={onRefresh} className="text-text-secondary"><RefreshCw className="h-4 w-4" /></button>} />
      <div className="mt-3 grid gap-2">
        <input value={state.filters.query} onChange={(event) => onFilters({ query: event.target.value })} placeholder="Search skill, client, task..." className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none focus:border-info/50" />
        <div className="grid grid-cols-3 gap-2">
          <select value={state.filters.category} onChange={(event) => onFilters({ category: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-2 text-xs">
            <option value="all">All categories</option>
            <option value="logistics">Logistics</option>
            <option value="facilities">Facilities</option>
            <option value="events">Events</option>
          </select>
          <select value={state.filters.urgency} onChange={(event) => onFilters({ urgency: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-2 text-xs">
            <option value="all">All urgency</option>
            <option value="surge">Surge</option>
            <option value="priority">Priority</option>
            <option value="standard">Standard</option>
          </select>
          <select value={state.filters.minPay} onChange={(event) => onFilters({ minPay: Number(event.target.value) })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-2 text-xs">
            <option value="0">$0+</option>
            <option value="100">$100+</option>
            <option value="200">$200+</option>
          </select>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {gigs.length ? gigs.map((gig) => (
          <button key={gig.id} type="button" onClick={() => onSelectGig(gig.id)} className={`rounded-2xl border p-3 text-left transition ${selectedGigId === gig.id ? "border-gold-primary/40 bg-gold-primary/10 shadow-gold-glow" : "border-border-2 bg-bg-3"}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{gig.title}</p>
                <p className="mt-1 text-xs text-text-muted">{gig.distanceMiles} mi / {gig.window} / Level {gig.requiredLevel}</p>
              </div>
              <div className="text-right">
                <p className="wm-metric text-sm text-success">${gig.pay}</p>
                <p className="mt-1 text-xs text-gold-primary">{gig.status}</p>
              </div>
            </div>
          </button>
        )) : <EmptyState icon={<Filter className="h-5 w-5" />} title="No gigs match filters" body="Lower minimum pay or clear category filters." />}
      </div>
      <div className="mt-3 rounded-2xl border border-border-2 bg-bg-3 p-3">
        <div className="flex items-center gap-2 text-xs text-text-muted"><MapPin className="h-4 w-4 text-info" /> Mock nearby map: NYC-03, privacy radius active</div>
      </div>
    </section>
  );
}

function MatchPanel({ gig, match }: { gig: ContractorGig; match: MatchScore | null }) {
  if (!match) return null;
  const items = Object.entries(match.breakdown);
  return (
    <section id="mobile-match" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Matching engine" title={`${match.totalScore}% fit for ${gig.title}`} Icon={Sparkles} />
      <p className="mt-2 text-sm leading-6 text-text-secondary">{match.explanation}</p>
      <div className="mt-3 grid gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-bg-3 px-3 py-2 text-xs">
            <span className="capitalize text-text-secondary">{label.replace(/([A-Z])/g, " $1")}</span>
            <span className="wm-metric text-gold-primary">{value}</span>
          </div>
        ))}
      </div>
      {match.missingRequirements.length ? <p className="mt-3 text-xs text-warning">Missing: {match.missingRequirements.join(", ")}</p> : null}
      <p className="mt-2 text-xs text-success">{match.suggestedActions.join(" / ")}</p>
    </section>
  );
}

function AgreementPanel({ status, terms, proofNote, setProofNote, onAction }: { status: AgreementStatus; terms: string[]; proofNote: string; setProofNote: (value: string) => void; onAction: (action: "accept" | "arrival" | "start" | "complete" | "approve") => void }) {
  const nextAction = status === "draft" ? "accept" : status === "accepted" ? "arrival" : status === "arrived" ? "start" : status === "in_progress" ? "complete" : status === "completion_submitted" ? "approve" : null;
  return (
    <section id="mobile-agreement" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Agreement" title="Work terms + proof" Icon={BadgeCheck} />
      <div className="mt-3 grid gap-2">
        {terms.map((term) => <div key={term} className="flex items-center gap-2 text-sm text-text-secondary"><CheckCircle2 className="h-4 w-4 text-success" />{term}</div>)}
      </div>
      <textarea value={proofNote} onChange={(event) => setProofNote(event.target.value)} className="mt-3 min-h-24 w-full rounded-2xl border border-border-2 bg-bg-3 p-3 text-sm outline-none focus:border-info/50" />
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span>Status: <span className="text-white">{status.replace("_", " ")}</span></span>
        <Upload className="h-4 w-4 text-info" />
      </div>
      {nextAction ? <button type="button" onClick={() => onAction(nextAction)} className="wm-button-primary mt-3 w-full capitalize">{nextAction === "approve" ? "Mock employer approval" : nextAction.replace("_", " ")}</button> : <p className="mt-3 rounded-2xl bg-success/10 p-3 text-sm text-success">Agreement complete. Review flow available.</p>}
    </section>
  );
}

function ChatPanel({ messages, message, setMessage, sendMessage }: { messages: ContractorCommandState["messages"]; message: string; setMessage: (value: string) => void; sendMessage: () => void }) {
  return (
    <section id="mobile-chat" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Encrypted chat" title="Harbor Supply" Icon={MessageSquare} />
      <div className="mt-3 grid max-h-60 gap-2 overflow-auto pr-1 text-sm">
        {messages.map((item) => (
          <div key={item.id} className={`max-w-[84%] rounded-2xl p-3 ${item.from === "worker" ? "ml-auto bg-gold-primary font-semibold text-bg-0" : "bg-bg-3 text-text-secondary"}`}>
            {item.decryptedText}
            <p className="mt-1 text-[0.62rem] opacity-70">{item.status} / encrypted</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder="Encrypted reply..." className="min-h-11 min-w-0 flex-1 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none focus:border-info/50" />
        <button type="button" onClick={sendMessage} className="wm-button-secondary px-4">Send</button>
      </div>
    </section>
  );
}

function PaymentPanel({ state, gross, fee, net, connectWallet, syncEscrow }: { state: ContractorCommandState; gross: number; fee: number; net: number; connectWallet: () => void; syncEscrow: () => void }) {
  return (
    <section id="mobile-pay" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Protected payment" title="Escrow + payout" Icon={WalletCards} />
      <div className="mt-4 grid gap-2 text-sm">
        <PayRow label="Wallet" value={state.payment.walletConnected ? state.payment.walletAddress : "Not connected"} tone={state.payment.walletConnected ? "success" : "gold"} />
        <PayRow label="Gross task price" value={`$${gross.toFixed(2)}`} />
        <PayRow label="Platform fee" value={`$${fee.toFixed(2)}`} tone="gold" />
        <PayRow label="Net payout" value={`$${net.toFixed(2)}`} tone="success" />
        <PayRow label="Gas estimate" value={`$${state.payment.gasEstimate.toFixed(2)}`} />
        <PayRow label="Escrow status" value={state.payment.escrowStatus.replace("_", " ")} tone={state.payment.escrowStatus === "released" ? "success" : "gold"} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={connectWallet} className="wm-button-secondary">{state.payment.walletConnected ? "Wallet synced" : "Connect wallet"}</button>
        <button type="button" onClick={syncEscrow} className="wm-button-secondary">Sync escrow</button>
      </div>
      <div className="mt-3 grid gap-2">
        {state.payment.history.map((row) => <div key={row.id} className="rounded-2xl bg-bg-3 p-3 text-xs text-text-secondary">{row.label}: <span className="text-success">${row.amount}</span> / {row.status}</div>)}
      </div>
    </section>
  );
}

function ReputationPanel({ state }: { state: ContractorCommandState }) {
  const rep = state.reputation;
  return (
    <section id="mobile-reputation" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Reputation + XP" title={`${rep.levelName} / Level ${rep.level}`} Icon={Star} />
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-3"><div className="h-full rounded-full bg-gold-primary" style={{ width: `${Math.round((rep.xp / rep.xpNext) * 100)}%` }} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat value={rep.rating.toFixed(2)} label="Rating" tone="gold" />
        <MiniStat value={`${rep.completionRate}%`} label="Complete" tone="success" />
        <MiniStat value={`${state.profile.streakDays}d`} label="Streak" tone="info" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{rep.badges.map((badge) => <span key={badge} className="wm-chip">{badge}</span>)}</div>
    </section>
  );
}

function NotificationsPanel({ state, onRead, onReadAll }: { state: ContractorCommandState; onRead: (id: string) => void; onReadAll: () => void }) {
  return (
    <section id="mobile-notifications" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Notifications" title={`${state.notifications.filter((item) => !item.read).length} unread`} Icon={Bell} action={<button type="button" onClick={onReadAll} className="text-xs text-gold-primary">Read all</button>} />
      <div className="mt-3 grid gap-2">
        {state.notifications.map((item) => (
          <a key={item.id} href={item.target} onClick={() => onRead(item.id)} className={`rounded-2xl border p-3 ${item.read ? "border-border-2 bg-bg-3 text-text-muted" : "border-gold-primary/25 bg-gold-primary/10 text-white"}`}>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs text-text-secondary">{item.body}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function PrivacyPanel({ state, onToggle }: { state: ContractorCommandState; onToggle: (field: DisclosureField) => void }) {
  const fields: DisclosureField[] = ["realName", "phone", "email", "preciseLocation", "portfolio", "credentials"];
  return (
    <section id="mobile-profile" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Privacy controls" title="Selective disclosure" Icon={ShieldCheck} />
      <div className="mt-3 grid gap-2">
        {fields.map((field) => <DisclosureToggle key={field} label={fieldLabel(field)} enabled={state.profile.disclosures[field]} onToggle={() => onToggle(field)} />)}
      </div>
      <div className="mt-3 rounded-2xl border border-border-2 bg-bg-3 p-3">
        <p className="wm-label text-text-muted">Public preview</p>
        <p className="mt-2 text-sm">{state.profile.publicHandle} / {state.profile.approximateRegion} / {state.profile.disclosures.realName ? "Real name shared" : "Pseudonymous"}</p>
      </div>
      <div className="mt-3 grid gap-2">
        {state.disclosureAudit.slice(0, 4).map((row) => <div key={row.id} className="rounded-2xl bg-bg-3 p-3 text-xs text-text-secondary">{fieldLabel(row.disclosedField)} / {row.recipientWallet} / {row.revokedAt ? "revoked" : "active"}</div>)}
      </div>
    </section>
  );
}

function PanelHeader({ eyebrow, title, Icon, action }: { eyebrow: string; title: string; Icon: typeof Bell; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="wm-label text-text-muted">{eyebrow}</p>
        <h2 className="wm-heading mt-1 text-base font-bold">{title}</h2>
      </div>
      {action ?? <Icon className="h-5 w-5 text-gold-primary" strokeWidth={1.75} aria-hidden="true" />}
    </div>
  );
}

function Detail({ label, value, tone, padded }: { label: string; value: string; tone?: "success"; padded?: boolean }) {
  return <div className={padded ? "px-3" : ""}><p className="text-xs text-text-muted">{label}</p><p className={`wm-metric mt-1 text-sm font-semibold ${tone === "success" ? "text-success" : ""}`}>{value}</p></div>;
}

function DisclosureToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex items-center justify-between rounded-2xl border border-border-2 bg-bg-3 p-3 text-left">
      <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-text-muted">{enabled ? "Shared with active counterparties" : "Hidden by default"}</span></span>
      {enabled ? <Eye className="h-4 w-4 text-success" strokeWidth={1.75} /> : <EyeOff className="h-4 w-4 text-text-muted" strokeWidth={1.75} />}
    </button>
  );
}

function PayRow({ label, value, tone }: { label: string; value: string; tone?: "gold" | "success" }) {
  return <div className="flex items-center justify-between border-b border-border-2 py-2 last:border-0"><span className="text-text-secondary">{label}</span><span className={`wm-metric text-right ${tone === "gold" ? "text-gold-primary" : tone === "success" ? "text-success" : "text-white"}`}>{value}</span></div>;
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone: "gold" | "success" | "info" }) {
  return <div className="rounded-2xl bg-bg-3 p-3"><p className={`wm-metric ${tone === "gold" ? "text-gold-primary" : tone === "success" ? "text-success" : "text-info"}`}>{value}</p><p className="text-[0.65rem] text-text-muted">{label}</p></div>;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="rounded-2xl border border-border-2 bg-bg-3 p-4 text-center text-sm text-text-secondary"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-2 text-gold-primary">{icon}</div><p className="font-semibold text-white">{title}</p><p className="mt-1 text-xs">{body}</p></div>;
}
