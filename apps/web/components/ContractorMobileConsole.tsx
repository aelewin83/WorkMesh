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
import { operationalFocusDefinitions, normalizeOperationalFocusId } from "@/lib/operational-focus";
import { engagementStructureDefinitions, engagementStructureLabel } from "@/lib/engagement-structure";


const cryptoService = new MockCryptoService();
const { gigService, matchingService, chatService, agreementService, paymentService, profileService } = createContractorServices(cryptoService);

export function ContractorMobileConsole() {
  const [state, setState] = useState<ContractorCommandState | null>(null);
  const [visibleGigs, setVisibleGigs] = useState<ContractorGig[]>([]);
  const [message, setMessage] = useState("");
  const [proofNote, setProofNote] = useState("Dock cleared, pallet count verified, timestamp and mock location attached.");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

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
  if (!state.profile.onboardingCompleted || onboardingOpen) {
    return (
      <ContractorOnboardingShell
        state={state}
        onCancel={state.profile.onboardingCompleted ? () => setOnboardingOpen(false) : undefined}
        onSave={async (profile) => {
          const nextState = { ...state, profile: { ...profile, onboardingCompleted: true } };
          if (profileService) {
            const saved = await profileService.updateProfile(profile.walletAddress, profileToDtoPatch(nextState.profile));
            setState(saved);
            setVisibleGigs(await gigService.search(saved.filters, saved));
          } else {
            const saved = persistState(nextState);
            setState(saved);
            setVisibleGigs(await gigService.search(saved.filters, saved));
          }
          setOnboardingOpen(false);
        }}
      />
    );
  }

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
              <p className="wm-heading text-base font-bold">Relai</p>
              <p className="wm-label text-success">Contributor</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <a href="#mobile-profile" aria-label="Open privacy controls">
              <LockKeyhole className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
            <a href="#mobile-gigs" aria-label="Open request search">
              <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="grid gap-3 p-4">
          <ProfileCard state={state} onEdit={() => setOnboardingOpen(true)} />

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
            Reset local beta state
          </button>
        </div>
      </div>
    </section>
  );
}

function ContractorOnboardingShell({ state, onSave, onCancel }: { state: ContractorCommandState; onSave: (profile: ContractorCommandState["profile"]) => Promise<void>; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState(state.profile);
  const steps = ["Identity", "Capabilities", "Availability", "Region", "Privacy", "Review"];
  const [customSkill, setCustomSkill] = useState("");
  const selectedVerticals = operationalFocusDefinitions.filter((vertical) => profile.verticals.map(normalizeOperationalFocusId).includes(vertical.id));
  const availableSkills = Array.from(new Set(selectedVerticals.flatMap((vertical) => vertical.capabilities))).sort();
  const selectedUseCases = Array.from(new Set(selectedVerticals.flatMap((vertical) => vertical.examples)));
  const canSave = profile.publicHandle.replace(/^@/, "").length >= 3 && profile.verticals.length > 0 && profile.skillTags.length > 0 && (profile.workPreference === "remote" || profile.region.metro || profile.region.city);
  const setPatch = (patch: Partial<typeof profile>) => setProfile((current) => ({ ...current, ...patch }));
  const setRegion = (patch: Partial<typeof profile.region>) => setPatch({ region: { ...profile.region, ...patch }, approximateRegion: patch.metro ?? patch.city ?? profile.approximateRegion });
  const setAvailabilityDetails = (patch: Partial<typeof profile.availabilityDetails>) => setPatch({ availabilityDetails: { ...profile.availabilityDetails, ...patch } });
  const setVisibility = (key: keyof typeof profile.profileVisibility, value: boolean) => setPatch({ profileVisibility: { ...profile.profileVisibility, [key]: value } });

  const save = async () => {
    if (!canSave) {
      setError("Add a valid handle, at least one skill, and a region or remote preference.");
      return;
    }
    setSaving(true);
    setError(null);
    const handle = profile.publicHandle.replace(/^@/, "").trim();
    const next = {
      ...profile,
      publicHandle: handle,
      initials: handle.slice(0, 1).toUpperCase(),
      useCasePreferences: selectedUseCases,
      serviceCategories: profile.verticals.length ? profile.verticals : profile.serviceCategories,
      categories: profile.verticals.length ? profile.verticals : profile.categories,
      approximateRegion: profile.workPreference === "remote" ? "Remote" : (profile.region.metro || profile.region.city || profile.approximateRegion),
      availability: profile.availabilityDetails.availableNow ? "ready_now" as const : "available_today" as const,
      onboardingCompleted: true
    };
    try {
      await onSave(next);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Profile could not be saved.");
      setSaving(false);
    }
  };

  return (
    <MobileFrame>
      <div className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="wm-label text-success">Trusted contributor onboarding</p>
            <h1 className="wm-heading mt-1 text-2xl font-bold">Build your trusted work profile.</h1>
            <p className="mt-2 text-sm leading-6 text-text-secondary">Pseudonymous by default. No legal name, phone, email, or exact address required.</p>
          </div>
          {onCancel ? <button type="button" onClick={onCancel} className="text-sm text-text-muted">Close</button> : null}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={(index <= step ? "bg-gold-primary" : "bg-bg-3") + " h-1.5 rounded-full"} aria-label={label} />)}
        </div>

        {step === 0 ? <OnboardingCard eyebrow="Step 1" title="Identity">
          <label className="grid gap-2 text-sm font-semibold">Pseudonymous handle
            <div className="flex min-h-11 items-center rounded-2xl border border-border-2 bg-bg-3 px-3"><span className="text-text-muted">@</span><input value={profile.publicHandle.replace(/^@/, "")} onChange={(event) => setPatch({ publicHandle: event.target.value })} className="min-w-0 flex-1 bg-transparent px-1 outline-none" placeholder="k914" /></div>
          </label>
          <div className="grid grid-cols-2 gap-2"><InfoPill label="Wallet" value={profile.walletAddress} /><InfoPill label="Public key" value="synced" /></div>
        </OnboardingCard> : null}

        {step === 1 ? <OnboardingCard eyebrow="Step 2" title="Operational focus + capabilities">
          <p className="text-sm leading-6 text-text-secondary">Choose the types of trusted work you want to support. Your selections help match you with relevant private opportunities.</p>
          <div className="grid gap-2">
            <p className="wm-label text-text-muted">Operational focus</p>
            {operationalFocusDefinitions.map((vertical) => (
              <button key={vertical.id} type="button" onClick={() => {
                const nextVerticals = toggle(profile.verticals, vertical.id);
                const nextUseCases = Array.from(new Set(operationalFocusDefinitions.filter((item) => nextVerticals.includes(item.id)).flatMap((item) => item.examples)));
                setPatch({ verticals: nextVerticals, categories: nextVerticals, serviceCategories: nextVerticals, useCasePreferences: nextUseCases });
              }} className={(profile.verticals.map(normalizeOperationalFocusId).includes(vertical.id) ? "border-gold-primary/40 bg-gold-primary/10 shadow-gold-glow" : "border-border-2 bg-bg-3") + " rounded-2xl border p-3 text-left transition"}>
                <span className="block text-sm font-semibold">{vertical.label}</span>
                <span className="mt-1 block text-xs leading-5 text-text-muted">{vertical.examples.slice(0, 3).join(" / ")}</span>
              </button>
            ))}
          </div>
          {profile.verticals.map(normalizeOperationalFocusId).includes("security-coordination") ? <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-warning">{operationalFocusDefinitions.find((vertical) => vertical.id === "security-coordination")?.note}</p> : null}
          <div className="grid gap-2">
            <p className="wm-label text-text-muted">Relevant capabilities</p>
            {availableSkills.length ? <div className="flex flex-wrap gap-2">{availableSkills.map((skill) => <ChipButton key={skill} active={profile.skillTags.includes(skill)} label={skill} onClick={() => { const next = toggle(profile.skillTags, skill); setPatch({ skillTags: next, skillDetails: next.map((label) => ({ id: slug(label), label, category: profile.verticals[0] ?? "custom", proficiencyLevel: "capable" as const })) }); }} />)}</div> : <p className="rounded-2xl bg-bg-3 p-3 text-xs text-text-muted">Select an operational focus to load suggested capabilities, or add a custom capability below.</p>}
          </div>
          <div className="flex gap-2">
            <input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} placeholder="Add custom capability" className="min-h-11 min-w-0 flex-1 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" />
            <button type="button" onClick={() => { const clean = customSkill.trim(); if (!clean) return; const nextSkills = profile.skillTags.includes(clean) ? profile.skillTags : [...profile.skillTags, clean]; const nextCustom = profile.customSkills.includes(clean) ? profile.customSkills : [...profile.customSkills, clean]; setPatch({ skillTags: nextSkills, customSkills: nextCustom, skillDetails: nextSkills.map((label) => ({ id: slug(label), label, category: profile.verticals[0] ?? "custom", proficiencyLevel: "capable" as const })) }); setCustomSkill(""); }} className="wm-button-secondary px-4">Add</button>
          </div>
          <div className="rounded-2xl border border-border-2 bg-bg-3 p-3">
            <p className="wm-label text-text-muted">Selected preview</p>
            <p className="mt-2 text-xs text-text-secondary">Focus: {selectedVerticals.length ? selectedVerticals.map((vertical) => vertical.label).join(" / ") : "None selected"}</p>
            <div className="mt-3 flex flex-wrap gap-2">{profile.skillTags.length ? profile.skillTags.map((skill) => <span key={skill} className="wm-chip">{skill}</span>) : <span className="text-xs text-text-muted">No capabilities selected</span>}</div>
            {selectedUseCases.length ? <p className="mt-3 text-xs leading-5 text-text-muted">Use cases: {selectedUseCases.slice(0, 6).join(" / ")}</p> : null}
          </div>
          <div className="grid gap-2 rounded-2xl border border-border-2 bg-bg-3 p-3"><label className="grid gap-2 text-sm font-semibold">Self-declared background<span className="text-xs font-normal text-text-muted">This is context only. It does not unlock higher-paying or higher-risk work.</span><select value={profile.experienceLevel} onChange={(event) => setPatch({ experienceLevel: event.target.value as typeof profile.experienceLevel })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-2 px-3 text-sm"><option value="0_1">0-1 years</option><option value="1_3">1-3 years</option><option value="3_5">3-5 years</option><option value="5_plus">5+ years</option></select></label></div><div className="rounded-2xl border border-success/20 bg-success/10 p-3 text-xs leading-5 text-text-secondary"><span className="font-semibold text-success">Eligibility is verified by Relai activity:</span> completed work, focus-area history, ratings, dispute rate, proof quality, credentials, and attestations.</div>
        </OnboardingCard> : null}

        {step === 2 ? <OnboardingCard eyebrow="Step 3" title="Preferred engagement structures">
          <p className="text-sm text-text-secondary">Choose the compensation patterns you are comfortable discussing. Rates are optional and visibility stays controlled.</p>
          <div className="grid gap-2">{engagementStructureDefinitions.map((structure) => {
            const active = Boolean(profile.engagementPreferences?.some((item) => item.structure === structure.id));
            const current = profile.engagementPreferences?.find((item) => item.structure === structure.id);
            return <div key={structure.id} className="rounded-2xl border border-border-2 bg-bg-3 p-3"><ToggleRow label={structure.label} checked={active} onChange={(checked) => {
              const currentPreferences = profile.engagementPreferences ?? [];
              const nextPreferences = checked
                ? currentPreferences.some((item) => item.structure === structure.id) ? currentPreferences : [...currentPreferences, { structure: structure.id, visibility: "after_application" as const }]
                : currentPreferences.filter((item) => item.structure !== structure.id);
              setPatch({ engagementPreferences: nextPreferences });
            }} />{active ? <input value={current?.ratePreview ?? ""} onChange={(event) => {
              const nextPreferences = (profile.engagementPreferences ?? []).map((item) => item.structure === structure.id ? { ...item, ratePreview: event.target.value } : item);
              setPatch({ engagementPreferences: nextPreferences });
            }} className="mt-2 min-h-11 w-full rounded-2xl border border-border-2 bg-bg-2 px-3 text-sm outline-none" placeholder={structure.placeholder} /> : <p className="mt-2 text-xs text-text-muted">{structure.guidance}</p>}</div>;
          })}</div>
        </OnboardingCard> : null}

        {step === 3 ? <OnboardingCard eyebrow="Step 4" title="Availability">
          <ToggleRow label="Available now" checked={profile.availabilityDetails.availableNow} onChange={(checked) => setAvailabilityDetails({ availableNow: checked })} />
          <ToggleRow label="Same-day requests" checked={profile.availabilityDetails.sameDay} onChange={(checked) => setAvailabilityDetails({ sameDay: checked })} />
          <ToggleRow label="Recurring work" checked={profile.availabilityDetails.recurring} onChange={(checked) => setAvailabilityDetails({ recurring: checked })} />
          <input value={profile.availabilityDetails.weeklySchedule.join(", ")} onChange={(event) => setAvailabilityDetails({ weeklySchedule: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" placeholder="Mon PM, Wed PM, Sat AM" />
        </OnboardingCard> : null}

        {step === 4 ? <OnboardingCard eyebrow="Step 5" title="Region">
          <div className="grid grid-cols-2 gap-2"><input value={profile.region.city} onChange={(event) => setRegion({ city: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" placeholder="City" /><input value={profile.region.metro} onChange={(event) => setRegion({ metro: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" placeholder="Metro / zone" /></div>
          <div className="grid grid-cols-2 gap-2"><input value={profile.region.state} onChange={(event) => setRegion({ state: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" placeholder="State" /><input type="number" min="0" value={profile.region.serviceRadiusMiles} onChange={(event) => setRegion({ serviceRadiusMiles: Number(event.target.value) })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none" /></div>
          <div className="grid grid-cols-3 gap-2">{(["local", "remote", "hybrid"] as const).map((mode) => <ChipButton key={mode} active={profile.workPreference === mode} label={mode} onClick={() => { setPatch({ workPreference: mode }); setRegion({ locationMode: mode }); }} />)}</div>
          <p className="text-xs text-text-muted">Precise location is never required. Employers see only your approximate work area unless you disclose more.</p>
        </OnboardingCard> : null}

        {step === 5 ? <OnboardingCard eyebrow="Step 6" title="Privacy">
          <p className="rounded-2xl border border-success/20 bg-success/10 p-3 text-sm text-text-secondary">You control what employers can see. Sensitive fields stay hidden unless you disclose them.</p>
          {([ ["showHandle", "Show handle"], ["showSkills", "Show skills"], ["showRegion", "Show approximate region"], ["showAvailability", "Show availability"], ["showRating", "Show rating"], ["showExactLocation", "Show exact location"], ["showRealName", "Show real name"], ["showPhone", "Show phone"], ["showEmail", "Show email"] ] as Array<[keyof typeof profile.profileVisibility, string]>).map(([key, label]) => <ToggleRow key={key} label={label} checked={profile.profileVisibility[key]} onChange={(checked) => setVisibility(key, checked)} />)}
        </OnboardingCard> : null}

        {step === 6 ? <OnboardingCard eyebrow="Step 7" title="Review + save"><PublicProfilePreview profile={profile} />{error ? <p className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}</OnboardingCard> : null}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="wm-button-secondary disabled:opacity-40">Back</button>
          {step < steps.length - 1 ? <button type="button" onClick={() => setStep(step + 1)} className="wm-button-primary">Next</button> : <button type="button" onClick={save} disabled={saving || !canSave} className="wm-button-primary disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button>}
        </div>
      </div>
    </MobileFrame>
  );
}

function OnboardingCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="grid gap-3 rounded-3xl border border-border-2 bg-bg-2 p-4"><PanelHeader eyebrow={eyebrow} title={title} Icon={ShieldCheck} />{children}</section>;
}

function PublicProfilePreview({ profile }: { profile: ContractorCommandState["profile"] }) {
  const handle = "@" + profile.publicHandle.replace(/^@/, "");
  const selectedVerticalLabels = profile.verticals.map((id) => operationalFocusDefinitions.find((vertical) => vertical.id === normalizeOperationalFocusId(id))?.label ?? id);
  return <div className="rounded-3xl border border-border-2 bg-bg-3 p-4"><p className="wm-label text-text-muted">Public preview</p><h2 className="wm-heading mt-2 text-xl font-bold">{profile.profileVisibility.showHandle ? handle : "Pseudonymous contributor"}</h2><p className="mt-2 text-sm text-text-secondary">{profile.profileVisibility.showRegion ? profile.approximateRegion : "Region hidden"} / {profile.profileVisibility.showAvailability ? availabilityLabel(profile.availabilityDetails.availableNow ? "ready_now" : "available_today") : "Availability hidden"}</p>{selectedVerticalLabels.length ? <p className="mt-2 text-xs text-text-muted">{selectedVerticalLabels.join(" / ")}</p> : null}{profile.profileVisibility.showSkills ? <div className="mt-3 flex flex-wrap gap-2">{profile.skillTags.map((skill) => <span key={skill} className="wm-chip">{skill}</span>)}</div> : null}{profile.engagementPreferences?.length ? <p className="mt-3 text-xs text-text-muted">Preferred engagements: {profile.engagementPreferences.slice(0, 3).map((item) => item.ratePreview ? engagementStructureLabel(item.structure) + " · " + item.ratePreview : engagementStructureLabel(item.structure)).join(" / ")}</p> : null}<p className="mt-3 text-xs text-text-muted">Real name, phone, email, exact location, and unverified background details stay hidden unless you explicitly disclose them.</p></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex min-h-11 items-center justify-between rounded-2xl border border-border-2 bg-bg-3 px-3 text-left text-sm"><span>{label}</span><span className={(checked ? "bg-success" : "bg-border-1") + " h-5 w-9 rounded-full p-0.5"}><span className={(checked ? "translate-x-4" : "") + " block h-4 w-4 rounded-full bg-white transition"} /></span></button>;
}

function ChipButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={(active ? "border-gold-primary/40 bg-gold-primary text-bg-0" : "border-border-2 bg-bg-3 text-text-secondary") + " rounded-2xl border px-3 py-2 text-xs font-semibold capitalize"}>{label}</button>;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-bg-3 p-3"><p className="text-xs text-text-muted">{label}</p><p className="mt-1 truncate text-xs font-semibold text-text-secondary">{value}</p></div>;
}

function availabilityLabel(value: ContractorCommandState["profile"]["availability"]) { return value === "ready_now" ? "Ready now" : value === "available_today" ? "Available today" : "Offline"; }
function toggle(items: string[], item: string) { return items.includes(item) ? items.filter((value) => value !== item) : [...items, item]; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
function profileToDtoPatch(profile: ContractorCommandState["profile"]) {
  return {
    handle: profile.publicHandle.replace(/^@/, ""),
    initials: profile.initials,
    verticals: profile.verticals,
    skills: profile.skillTags,
    customSkills: profile.customSkills,
    useCasePreferences: profile.useCasePreferences,
    engagementPreferences: profile.engagementPreferences,
    rateVisibility: profile.rateVisibility,
    skillDetails: profile.skillDetails,
    categories: profile.verticals,
    serviceCategories: profile.verticals,
    experienceLevel: profile.experienceLevel,
    certifications: profile.certifications,
    licenses: profile.licenses,
    availability: profile.availability,
    availabilityDetails: profile.availabilityDetails,
    region: profile.region,
    workPreference: profile.workPreference,
    privacySettings: profile.disclosures,
    profileVisibility: profile.profileVisibility,
    disclosureSettings: profile.disclosureSettings,
    publicProfileFields: profile.publicProfileFields,
    onboardingCompleted: true,
    publicFields: { initials: profile.initials, approximateRegion: profile.approximateRegion, rating: profile.rating, trustScore: profile.publicReputation, levelName: profile.levelName }
  };
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
      <p className="wm-heading text-lg font-bold text-danger">Trusted work console unavailable</p>
      <p className="mt-2 text-sm text-text-secondary">{message}</p>
      <button type="button" onClick={onRetry} className="wm-button-secondary mt-4">Retry</button>
    </div>
  );
}

function ProfileCard({ state, onEdit }: { state: ContractorCommandState; onEdit: () => void }) {
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
            {profile.disclosures.realName ? "Real name disclosed for active work" : "Pseudonymous contributor"}
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
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-bg-3 p-3 text-xs text-text-secondary">
        <span>{profile.verticals.slice(0, 2).map((id) => operationalFocusDefinitions.find((vertical) => vertical.id === normalizeOperationalFocusId(id))?.label ?? id).join(" / ") || profile.region.locationMode} / verified Level {profile.level}</span>
        <button type="button" onClick={onEdit} className="font-semibold text-gold-primary">Edit profile</button>
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
      <p className="wm-label text-text-muted">Featured request</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="wm-heading text-base font-bold leading-5">{gig.title}</h2>
          <p className="mt-1 text-xs text-text-muted">{gig.client}</p>
        </div>
        <span className="rounded-lg border border-gold-primary/30 bg-gold-primary/10 px-2 py-1 font-mono text-[0.65rem] font-semibold text-gold-primary">
          {gig.escrowRequired ? "Protected" : "Direct"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-border-2 border-y border-border-2 py-3">
        <Detail label="Range" value={`${gig.distanceMiles} mi`} />
        <Detail label="Window" value={gig.window} padded />
        <Detail label="Payout" value={`$${gig.pay}`} tone="success" padded />
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
          {gig.status === "claimed" ? "Claimed" : isIneligible ? "Locked" : "Accept request"}
        </button>
      </div>
      <p className="mt-3 text-xs text-text-muted">Status: <span className="text-white">{gig.status.replace("_", " ")}</span></p>
    </article>
  );
}

function GigMarketplace({ state, gigs, selectedGigId, onSelectGig, onFilters, onRefresh }: { state: ContractorCommandState; gigs: ContractorGig[]; selectedGigId: string; onSelectGig: (id: string) => void; onFilters: (filters: Partial<ContractorFilters>) => void; onRefresh: () => void }) {
  return (
    <section id="mobile-gigs" className="scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
      <PanelHeader eyebrow="Private discovery" title="Search requests" Icon={BriefcaseBusiness} action={<button type="button" onClick={onRefresh} className="text-text-secondary"><RefreshCw className="h-4 w-4" /></button>} />
      <div className="mt-3 grid gap-2">
        <input value={state.filters.query} onChange={(event) => onFilters({ query: event.target.value })} placeholder="Search skill, client, task..." className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-3 text-sm outline-none focus:border-info/50" />
        <div className="grid grid-cols-3 gap-2">
          <select value={state.filters.category} onChange={(event) => onFilters({ category: event.target.value })} className="min-h-11 rounded-2xl border border-border-2 bg-bg-3 px-2 text-xs">
            <option value="all">All focus</option>
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
        )) : <EmptyState icon={<Filter className="h-5 w-5" />} title="No requests match filters" body="Lower minimum payout or clear focus filters." />}
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
      <PanelHeader eyebrow="Recommendation fit" title={`${match.totalScore}% fit for ${gig.title}`} Icon={Sparkles} />
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
  const nextAction = status === "draft" ? "accept" : status === "accepted" ? "arrival" : status === "arrived" ? "start" : status === "in_progress" ? "complete" : status === "completion_submitted" || status === "pending_employer_confirmation" ? "approve" : null;
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
      {nextAction ? <button type="button" onClick={() => onAction(nextAction)} className="wm-button-primary mt-3 w-full capitalize">{nextAction === "approve" ? "Employer approval" : nextAction.replace("_", " ")}</button> : <p className="mt-3 rounded-2xl bg-success/10 p-3 text-sm text-success">Agreement complete. Review flow available.</p>}
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
      <PanelHeader eyebrow="Protected settlement" title="Escrow + payout" Icon={WalletCards} />
      <div className="mt-4 grid gap-2 text-sm">
        <PayRow label="Wallet" value={state.payment.walletConnected ? state.payment.walletAddress : "Not connected"} tone={state.payment.walletConnected ? "success" : "gold"} />
        <PayRow label="Gross request value" value={`$${gross.toFixed(2)}`} />
        <PayRow label="Relai fee" value={`$${fee.toFixed(2)}`} tone="gold" />
        <PayRow label="Expected payout" value={`$${net.toFixed(2)}`} tone="success" />
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
      <PanelHeader eyebrow="Trust profile" title={`${rep.levelName} / Level ${rep.level}`} Icon={Star} />
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-3"><div className="h-full rounded-full bg-gold-primary" style={{ width: `${Math.round((rep.xp / rep.xpNext) * 100)}%` }} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat value={rep.rating.toFixed(2)} label="Rating" tone="gold" />
        <MiniStat value={`${rep.completionRate}%`} label="Completion" tone="success" />
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
