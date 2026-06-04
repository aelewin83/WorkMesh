import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  ChartLine,
  Clock3,
  Gauge,
  HandCoins,
  LockKeyhole,
  Menu,
  MapPin,
  Medal,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  WalletCards,
  Zap
} from "lucide-react";
import {
  AppShell,
  BarListCard,
  HeroProfile,
  LineChartCard,
  MetricCard,
  OpportunityCard,
  PrivacyStrip,
  Section,
  StatusPanel,
  WorkflowGrid
} from "@/components/PremiumDashboard";
import { ContractorMobileConsole } from "@/components/ContractorMobileConsole";
import { AssignedEngagementsPanel, ContractorWorkflowPanels } from "@/components/ContractorWorkflowPanels";

const gigs = [
  {
    title: "Inventory movement support",
    meta: "1.2 mi / 21:00-23:00 / Harbor Supply",
    price: "$148",
    match: "96% fit",
    tags: ["Transport", "Inventory movement", "Coordination"],
    urgent: true
  },
  {
    title: "Executive office coordination support",
    meta: "0.6 mi / 18:30 / Northline Retail",
    price: "$92",
    match: "91% fit",
    tags: ["Scheduling", "Operational admin", "Coordination"]
  },
  {
    title: "Private event staffing lead",
    meta: "2.8 mi / 23:15 / Civic Hall Ops",
    price: "$225",
    match: "89% fit",
    tags: ["Event operations", "Temporary staffing", "Coordination"]
  }
];

export default function ContractorPage() {
  return (
    <AppShell
      role="contractor"
      eyebrow="Trusted work profile"
      title="Build your trusted work profile."
      subtitle="Complete onboarding, review trusted requests, coordinate privately, and track protected settlement without revealing more than needed."
      cta="Complete Setup"
      ctaHref="/contractor#complete-setup"
      paymentsHref="/contractor#payments"
      profile={{ name: "K-914", detail: "Trusted contributor" }}
      mobileHero={<ContractorMobileConsole />}
    >
      <HeroProfile
        avatar="K"
        name="K-914"
        detail="Pseudonymous contributor / NYC-03 / available for trusted work"
        status="Online"
        level="Level 5 / Trusted contributor"
        progress={84}
        score="98"
        chips={["Responsive", "Verified work history", "Private identity"]}
      />

      <WorkflowGrid
        id="contractor-workflow"
        title="Trusted work workflow"
        subtitle="Focused entry points for setup, trusted requests, secure coordination, agreements, and settlement."
        items={[
          {
            title: "Private identity",
            description: "Finish your pseudonymous profile, capabilities, region, availability, and selective disclosure defaults.",
            action: "Complete setup",
            actionHref: "/contractor#complete-setup",
            Icon: ShieldCheck,
            tone: "gold"
          },
          {
            title: "Recommended requests",
            description: "Review private-beta requests ranked by your focus areas, capabilities, region, and availability.",
            action: "Browse requests",
            actionHref: "/contractor#recommended-gigs",
            Icon: BriefcaseBusiness,
            tone: "info"
          },
          {
            title: "Area preview",
            description: "Read-only local work-area context. Exact location stays hidden unless you choose to disclose it later.",
            action: "View preview",
            actionHref: "/contractor#recommended-gigs",
            Icon: MapPin
          },
          {
            title: "Encrypted chat",
            description: "Secure messaging opens when a task or agreement thread exists. Messages remain encrypted payloads.",
            action: "Open chat",
            actionHref: "/contractor#open-chat",
            Icon: Bell,
            tone: "purple"
          },
          {
            title: "Protected settlement",
            description: "View protected settlement status, expected net payout, platform fee, and payment history for active agreements.",
            action: "View payments",
            actionHref: "/contractor#payments",
            Icon: WalletCards,
            tone: "success"
          },
          {
            title: "Trust profile",
            description: "Read-only trust summary. Deeper analytics unlock after real completed work exists.",
            action: "View summary",
            actionHref: "/contractor#work-cockpit",
            Icon: Medal,
            tone: "warning"
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Onboarding" value="72%" change="finish privacy setup" tone="gold" Icon={WalletCards} />
        <MetricCard label="Open requests" value="3" change="private beta seed" tone="success" Icon={HandCoins} />
        <MetricCard label="Agreements" value="1" change="ready to review" tone="success" Icon={BadgeCheck} />
        <MetricCard label="Profile fit" value="Good" change="skills selected" tone="info" Icon={Gauge} />
      </div>

      <Section title="Beta progress" subtitle="Lightweight indicators for your first usable workflow. Larger analytics unlock after real activity exists.">
        <div className="grid gap-4 lg:grid-cols-3">
          <LineChartCard title="Settlement trend" value="$12.4K" data={[8, 10, 9, 14, 16, 15, 19, 22]} tone="gold" note="30 days" />
          <LineChartCard title="Rating trend" value="4.96" data={[90, 91, 92, 94, 93, 96, 97, 98]} tone="success" note="stable" />
          <BarListCard
            title="Focus performance"
            tone="purple"
            items={[
              { label: "Logistics", value: "96%", percent: 96 },
              { label: "Facilities", value: "88%", percent: 88 },
              { label: "Events", value: "76%", percent: 76 }
            ]}
          />
        </div>
      </Section>

      <Section
        id="recommended-gigs"
        title="Recommended requests"
        subtitle="Ranked by proximity, eligibility, availability, payout fit, and prior focus-area history."
        action={<span className="wm-chip border-gold-primary/20 bg-gold-primary/10 text-gold-primary"><Sparkles className="h-3.5 w-3.5" /> Best fit</span>}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {gigs.map((gig) => (
            <OpportunityCard key={gig.title} {...gig} />
          ))}
        </div>
      </Section>

      <Section id="assigned-engagements" title="Assigned engagements" subtitle="Your role, agreement status, and limited team context for accepted multi-contributor work.">
        <AssignedEngagementsPanel />
      </Section>

      <Section id="work-cockpit" title="Work status" subtitle="Trust profile, settlement state, and secure coordination alerts.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Trust progress"
            items={[
              { label: "Current streak", value: "19d", tone: "gold", Icon: Zap },
              { label: "Next unlock", value: "Lower escrow friction", tone: "info", Icon: Sparkles },
              { label: "Response medal", value: "Platinum", tone: "purple", Icon: Medal },
              { label: "Trust shield", value: "Active", tone: "success", Icon: ShieldCheck }
            ]}
          />
          <StatusPanel
            title="Protected payments"
            items={[
              { label: "Dock unload escrow", value: "$148 locked", tone: "gold", Icon: WalletCards },
              { label: "Stablecoin rail", value: "Available", tone: "success", Icon: HandCoins },
              { label: "Direct settlement", value: "Locked", tone: "warning", Icon: Timer },
              { label: "Gas estimate", value: "$3.44", tone: "muted", Icon: Gauge }
            ]}
          />
          <StatusPanel
            title="Notifications"
            items={[
              { label: "Priority request nearby", value: "now", tone: "gold", Icon: Bell },
              { label: "Credential proof requested", value: "9m", tone: "info", Icon: Star },
              { label: "Escrow release pending", value: "14m", tone: "warning", Icon: Clock3 },
              { label: "Work area", value: "Midtown east", tone: "muted", Icon: MapPin }
            ]}
          />
        </div>
      </Section>

      <div id="payments" className="scroll-mt-24" />

      <Section id="privacy" title="Privacy defaults" subtitle="Public discovery exposes only minimal matching metadata. Private content stays encrypted.">
        <PrivacyStrip />
      </Section>
      <ContractorWorkflowPanels />
    </AppShell>
  );
}

function ContractorMobileDashboard() {
  const surgeBars = [12, 18, 10, 24, 30, 36, 22, 18, 42, 48, 34, 26, 38, 55, 71, 45, 31, 42, 58, 84, 64, 39, 52, 73, 60, 44, 35, 47];

  return (
    <section id="mobile-home" className="min-h-screen scroll-mt-24 bg-bg-0 px-3 pb-28 pt-3 text-white">
      <div className="mx-auto max-w-[430px] overflow-hidden rounded-[34px] border border-border-2 bg-bg-1 shadow-card">
        <div className="flex items-center justify-between border-b border-border-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <Menu className="h-5 w-5 text-text-secondary" strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="wm-heading text-base font-bold">Relai</p>
              <p className="wm-label text-success">Contributor</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-text-secondary">
            <LockKeyhole className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <Search className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        <div className="p-4">
          <article id="profile" className="rounded-3xl border border-border-2 bg-bg-2 p-4 shadow-card">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10 text-xl font-bold text-gold-primary shadow-gold-glow">
                K
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="wm-heading truncate text-xl font-bold">K-914</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-success">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Online
                </div>
                <p className="mt-1 text-xs text-text-secondary">Pseudonymous contributor</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-text-secondary">Trusted contributor / Level 5</p>
                <p className="wm-metric mt-1 text-xs text-white">8,420 / 10,000 XP</p>
              </div>
              <Sparkles className="h-4 w-4 text-gold-primary" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-3">
              <div className="h-full w-[84%] rounded-full bg-gold-primary shadow-gold-glow" />
            </div>
          </article>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <a href="#work-cockpit" className="rounded-2xl border border-border-2 bg-bg-2 p-4">
              <p className="text-xs text-text-muted">Ready now</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="wm-metric text-2xl font-semibold text-success">On</p>
                <Zap className="h-5 w-5 text-success" strokeWidth={1.75} aria-hidden="true" />
              </div>
            </a>
            <a id="payments" href="#work-cockpit" className="rounded-2xl border border-border-2 bg-bg-2 p-4">
              <p className="text-xs text-text-muted">Escrow</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="wm-metric text-2xl font-semibold text-gold-primary">$621</p>
                <WalletCards className="h-5 w-5 text-gold-primary" strokeWidth={1.75} aria-hidden="true" />
              </div>
            </a>
          </div>

          <p id="mobile-gigs" className="wm-label mt-5 scroll-mt-24 text-text-muted">Featured request</p>
          <article id="recommended-gigs" className="mt-2 rounded-3xl border border-border-2 bg-bg-2 p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="wm-heading text-base font-bold leading-5">Same-day inventory movement support</h2>
                <p className="mt-1 text-xs text-text-muted">Harbor Supply Node</p>
              </div>
              <span className="rounded-lg border border-gold-primary/30 bg-gold-primary/10 px-2 py-1 font-mono text-[0.65rem] font-semibold text-gold-primary">
                Protected
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-border-2 border-y border-border-2 py-3">
              <div>
                <p className="text-xs text-text-muted">Range</p>
                <p className="wm-metric mt-1 text-sm font-semibold">1.2 mi</p>
              </div>
              <div className="px-3">
                <p className="text-xs text-text-muted">Window</p>
                <p className="wm-metric mt-1 text-sm font-semibold">21:00</p>
              </div>
              <div className="pl-3">
                <p className="text-xs text-text-muted">Payout</p>
                <p className="wm-metric mt-1 text-sm font-semibold text-success">$148</p>
              </div>
            </div>

            <div className="mt-4 flex items-end gap-1">
              {surgeBars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="w-1 flex-1 rounded-t bg-gold-primary"
                  style={{ height: `${Math.max(4, height / 3)}px`, opacity: index < 4 ? 0.45 : 1 }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="wm-label text-gold-primary">Surge</span>
              <span className="wm-label text-gold-primary">High demand</span>
            </div>
          </article>

          <div className="mt-3 grid gap-3">
            {[
              ["Executive office coordination support", "0.6 mi / 18:30", "$92", "91%"],
              ["Private event staffing lead", "2.8 mi / 23:15", "$225", "89%"]
            ].map(([title, meta, pay, fit]) => (
              <a key={title} href="#mobile-gigs" className="rounded-2xl border border-border-2 bg-bg-2 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs text-text-muted">{meta}</p>
                  </div>
                  <div className="text-right">
                    <p className="wm-metric text-sm text-success">{pay}</p>
                    <p className="mt-1 text-xs text-gold-primary">{fit} fit</p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div id="contractor-workflow" className="mt-3 grid grid-cols-2 gap-3">
            <a href="#recommended-gigs" className="wm-button-primary">Find work</a>
            <a href="#mobile-chat" className="wm-button-secondary">Open chat</a>
          </div>

          <article id="mobile-chat" className="mt-3 scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="wm-label text-text-muted">Latest message</p>
                <p className="mt-1 text-sm font-semibold">Harbor Supply sent gate details.</p>
              </div>
              <MessageSquare className="h-5 w-5 text-info" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="max-w-[82%] rounded-2xl bg-bg-3 p-3 text-text-secondary">Escrow is locked. Gate code is visible to your device.</div>
              <div className="ml-auto max-w-[82%] rounded-2xl bg-gold-primary p-3 font-semibold text-bg-0">On site in 18 minutes.</div>
            </div>
          </article>

          <article id="mobile-pay" className="mt-3 scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="wm-label text-text-muted">Protected payment</p>
                <p className="mt-1 text-sm font-semibold">Dock unload escrow</p>
              </div>
              <WalletCards className="h-5 w-5 text-gold-primary" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <PayRow label="Gross task price" value="$148.00" />
              <PayRow label="Platform fee" value="$12.14" tone="gold" />
              <PayRow label="Net payout" value="$132.42" tone="success" />
            </div>
          </article>

          <article id="mobile-profile" className="mt-3 scroll-mt-24 rounded-3xl border border-border-2 bg-bg-2 p-4">
            <p className="wm-label text-text-muted">Profile</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-bg-3 p-3"><p className="wm-metric text-success">98%</p><p className="text-[0.65rem] text-text-muted">Trust</p></div>
              <div className="rounded-2xl bg-bg-3 p-3"><p className="wm-metric">NYC-03</p><p className="text-[0.65rem] text-text-muted">Region</p></div>
              <div className="rounded-2xl bg-bg-3 p-3"><p className="wm-metric text-gold-primary">Sync</p><p className="text-[0.65rem] text-text-muted">Keys</p></div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function PayRow({ label, value, tone }: { label: string; value: string; tone?: "gold" | "success" }) {
  return (
    <div className="flex items-center justify-between border-b border-border-2 py-2 last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className={`wm-metric ${tone === "gold" ? "text-gold-primary" : tone === "success" ? "text-success" : "text-white"}`}>{value}</span>
    </div>
  );
}
