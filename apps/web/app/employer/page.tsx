import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  ChartLine,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  HandCoins,
  HardHat,
  MessageSquareLock,
  ReceiptText,
  ShieldCheck,
  Timer,
  UserRoundCheck,
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
import { EmployerEscrowFunding } from "@/components/EmployerEscrowFunding";
import { EmployerWorkflowPanels } from "@/components/EmployerWorkflowPanels";

const contributors = [
  {
    title: "Contributor K-914",
    meta: "1.2 mi / Level 5 / logistics coordination",
    price: "$148",
    match: "96% fit",
    tags: ["Fast response", "184 closes", "Escrow ready"]
  },
  {
    title: "Crew Lead M-208",
    meta: "2.4 mi / Level 4 / event operations",
    price: "$225",
    match: "92% fit",
    tags: ["Crew lead", "Van", "5 star"]
  },
  {
    title: "Repair Node Q-771",
    meta: "0.8 mi / Level 3 / facilities",
    price: "$96",
    match: "89% fit",
    tags: ["Tools", "Insured", "Photo proof"]
  }
];

export default function EmployerPage() {
  return (
    <AppShell
      role="employer"
      eyebrow="Secure hiring"
      title="Create your first secure hiring request."
      subtitle="Create a scoped private request, review trusted contributors, create an agreement, and fund protected settlement when you are ready."
      cta="Create Request"
      ctaHref="/employer#post-gig"
      paymentsHref="/employer#payments"
      profile={{ name: "Harbor Supply", detail: "Verified employer" }}
    >
      <HeroProfile
        avatar="H"
        name="Harbor Supply Node"
        detail="Beta hiring profile / NYC-03 / setup in progress"
        status="Verified"
        level="Private beta access"
        progress={72}
        score="97"
        chips={["Active requests", "Fast release history", "Private coordination"]}
      />

      <WorkflowGrid
        id="employer-workflow"
        title="Secure hiring workflow"
        subtitle="Focused entry points for setup, secure requests, applicant review, agreement creation, and protected settlement."
        items={[
          {
            title: "Hiring setup",
            description: "Complete hiring handle, organization type, region, and privacy defaults for private beta access.",
            action: "Complete setup",
            actionHref: "/employer#employer-setup",
            Icon: BriefcaseBusiness,
            tone: "gold"
          },
          {
            title: "Create secure request",
            description: "Create protected request details while discovery shows only focus area, zone, capabilities, and payout band.",
            action: "Create request",
            actionHref: "/employer#post-gig",
            Icon: FileCheck2,
            tone: "info"
          },
          {
            title: "Trusted contributors",
            description: "Review applicants for your owned requests. Secure chat unlocks after accepting a trusted contributor.",
            action: "Review applicants",
            actionHref: "/employer#review-applicants",
            Icon: UserRoundCheck,
            tone: "success"
          },
          {
            title: "Dynamic pricing",
            description: "Read-only pricing guidance appears during request creation. Hiring teams can still choose final payout.",
            action: "View quote preview",
            actionHref: "/employer#operations",
            Icon: ReceiptText,
            tone: "purple"
          },
          {
            title: "Agreement builder",
            description: "Agreement creation happens after applicant acceptance so chat and protected settlement stay tied to real work.",
            action: "Review applicants",
            actionHref: "/employer#review-applicants",
            Icon: BadgeCheck
          },
          {
            title: "Fund protected settlement",
            description: "Open settlement visibility and funding state for accepted agreements. Funding requires an agreement first.",
            action: "Open escrow",
            actionHref: "/employer#payments",
            Icon: WalletCards,
            tone: "warning"
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Draft requests" value="1" change="finish first request" tone="gold" Icon={BriefcaseBusiness} />
        <MetricCard label="Applicants" value="2" change="review required" tone="success" Icon={UserRoundCheck} />
        <MetricCard label="Settlement" value="Ready" change="Base Sepolia test" tone="info" Icon={WalletCards} />
        <MetricCard label="Privacy" value="Set" change="minimal disclosure" tone="purple" Icon={Banknote} />
      </div>

      <Section id="demand-analytics" title="First request setup" subtitle="Keep the beta focused: one private request, clear scope, protected settlement.">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <LineChartCard title="Settlement trend" value="$42K" data={[16, 22, 20, 28, 31, 34, 39, 42]} tone="gold" note="month" />
          </div>
          <LineChartCard title="Fill rate" value="86%" data={[55, 62, 70, 76, 74, 82, 85, 86]} tone="success" note="live" />
          <BarListCard
            title="Focus mix"
            tone="purple"
            items={[
              { label: "Logistics", value: "44%", percent: 44 },
              { label: "Facilities", value: "31%", percent: 31 },
              { label: "Events", value: "25%", percent: 25 }
            ]}
          />
        </div>
      </Section>

      <Section id="recommended-workers" title="Trusted contributors" subtitle="Pseudonymous matches ranked without exposing private identity.">
        <div className="grid gap-4 lg:grid-cols-3">
          {contributors.map((contributor) => (
            <OpportunityCard key={contributor.title} {...contributor} />
          ))}
        </div>
      </Section>

      <Section id="operations" title="Operations" subtitle="Pricing, agreements, protected settlement, and encrypted coordination.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Dynamic pricing"
            items={[
              { label: "Suggested price", value: "$148", tone: "gold", Icon: ReceiptText },
              { label: "Minimum viable", value: "$117", tone: "muted", Icon: Gauge },
              { label: "Premium fill", value: "$171", tone: "success", Icon: Zap },
              { label: "Market pressure", value: "High", tone: "warning", Icon: ChartLine }
            ]}
          />
          <StatusPanel
            title="Protected settlement queue"
            items={[
              { label: "Dock unload group B", value: "$888", tone: "gold", Icon: WalletCards },
              { label: "Fixture swaps", value: "$276", tone: "info", Icon: HandCoins },
              { label: "Direct settlement", value: "Review", tone: "warning", Icon: ShieldCheck },
              { label: "Stablecoin rail", value: "Allowed", tone: "success", Icon: CheckCircle2 }
            ]}
          />
          <StatusPanel
            title="Agreement status"
            items={[
              { label: "Encrypted scope", value: "Ready", tone: "success", Icon: FileCheck2 },
              { label: "Contributor signature", value: "Pending", tone: "warning", Icon: Timer },
              { label: "Secure chat", value: "Locked", tone: "info", Icon: MessageSquareLock },
              { label: "Proof checklist", value: "4 clauses", tone: "muted", Icon: BadgeCheck }
            ]}
          />
        </div>
      </Section>

      <div id="payments" className="scroll-mt-24" />

      <Section id="settlement-rules" title="Settlement safeguards" subtitle="Protected settlement stays required for first-time, high-value, remote, or lower-trust work.">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <EmployerEscrowFunding />
          <StatusPanel
            title="Settlement rules"
            items={[
              { label: "First-time counterparties", value: "Protected", tone: "gold", Icon: ShieldCheck },
              { label: "High-value tasks", value: "Protected", tone: "gold", Icon: WalletCards },
              { label: "Trusted repeats", value: "Direct eligible", tone: "success", Icon: CheckCircle2 },
              { label: "Remote deliverables", value: "Protected", tone: "warning", Icon: Clock3 }
            ]}
          />
        </div>
      </Section>

      <Section id="privacy" title="Privacy defaults" subtitle="Create requests privately, reveal only what is necessary for legitimate work completion.">
        <PrivacyStrip />
      </Section>
      <EmployerWorkflowPanels />
    </AppShell>
  );
}
