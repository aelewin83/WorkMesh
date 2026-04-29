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

const workers = [
  {
    title: "Operator K-914",
    meta: "1.2 mi / Level 5 / logistics specialist",
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
      eyebrow="Employer console"
      title="Post privately. Match fast. Pay with confidence."
      subtitle="A demand operations center for encrypted gig posting, dynamic pricing, trusted worker matching, and protected settlement."
      cta="Post New Gig"
      ctaHref="/employer#employer-workflow"
      paymentsHref="/employer#payments"
      profile={{ name: "Harbor Supply", detail: "Verified employer" }}
    >
      <HeroProfile
        avatar="H"
        name="Harbor Supply Node"
        detail="Verified SMB employer / NYC-03 / spend authority active"
        status="Verified"
        level="$25K spend authority"
        progress={72}
        score="97"
        chips={["24 active tasks", "Fast release history", "Private demand"]}
      />

      <WorkflowGrid
        id="employer-workflow"
        title="Employer workflow"
        subtitle="Employer-only modules with direct actions for posting, matching, agreements, and settlement."
        items={[
          {
            title: "Employer onboarding",
            description: "Review business proof, jobsite attestations, spend authority, and private demand setup.",
            action: "Open onboarding",
            actionHref: "/employer#profile",
            Icon: BriefcaseBusiness,
            tone: "gold"
          },
          {
            title: "Post new gig",
            description: "Create encrypted job details while public discovery shows only category, zone, skill tags, and budget band.",
            action: "Post gig",
            actionHref: "/employer#employer-workflow",
            Icon: FileCheck2,
            tone: "info"
          },
          {
            title: "Recommended workers",
            description: "Compare pseudonymous candidates by match score, reputation, availability, level, and price fit.",
            action: "Review matches",
            actionHref: "/employer#recommended-workers",
            Icon: UserRoundCheck,
            tone: "success"
          },
          {
            title: "Dynamic pricing",
            description: "Use supply, demand, urgency, scarcity, time window, and location to price the task clearly.",
            action: "Open quote",
            actionHref: "/employer#operations",
            Icon: ReceiptText,
            tone: "purple"
          },
          {
            title: "Agreement builder",
            description: "Build scope, proof checklist, selective credential acceptance, signatures, and release conditions.",
            action: "Build agreement",
            actionHref: "/employer#operations",
            Icon: BadgeCheck
          },
          {
            title: "Fund escrow",
            description: "Choose eligible payment rails, fund protected payment, or request direct-settlement review.",
            action: "Open payments",
            actionHref: "/employer#payments",
            Icon: WalletCards,
            tone: "warning"
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open tasks" value="24" change="6 priority" tone="gold" Icon={BriefcaseBusiness} />
        <MetricCard label="Matched workers" value="19" change="79% fill progress" tone="success" Icon={UserRoundCheck} />
        <MetricCard label="Escrows live" value="$8.6K" change="12 funded" tone="info" Icon={WalletCards} />
        <MetricCard label="Spend this month" value="$42K" change="+12.8%" tone="purple" Icon={Banknote} />
      </div>

      <Section id="demand-analytics" title="Demand analytics" subtitle="Spend, fill rate, time-to-match, and category mix.">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <LineChartCard title="Spend trend" value="$42K" data={[16, 22, 20, 28, 31, 34, 39, 42]} tone="gold" note="month" />
          </div>
          <LineChartCard title="Fill rate" value="86%" data={[55, 62, 70, 76, 74, 82, 85, 86]} tone="success" note="live" />
          <BarListCard
            title="Category mix"
            tone="purple"
            items={[
              { label: "Logistics", value: "44%", percent: 44 },
              { label: "Facilities", value: "31%", percent: 31 },
              { label: "Events", value: "25%", percent: 25 }
            ]}
          />
        </div>
      </Section>

      <Section id="recommended-workers" title="Recommended workers" subtitle="Pseudonymous matches ranked without exposing private identity.">
        <div className="grid gap-4 lg:grid-cols-3">
          {workers.map((worker) => (
            <OpportunityCard key={worker.title} {...worker} />
          ))}
        </div>
      </Section>

      <Section id="operations" title="Operations" subtitle="Pricing, agreements, escrow queue, and encrypted coordination.">
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
            title="Fund escrow queue"
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
              { label: "Worker signature", value: "Pending", tone: "warning", Icon: Timer },
              { label: "Secure chat", value: "Sealed", tone: "info", Icon: MessageSquareLock },
              { label: "Proof checklist", value: "4 clauses", tone: "muted", Icon: BadgeCheck }
            ]}
          />
        </div>
      </Section>

      <div id="payments" className="scroll-mt-24" />

      <Section id="settlement-rules" title="Marketplace safeguards" subtitle="Protected payment stays required for first-time, high-value, remote, or low-trust work.">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <StatusPanel
            title="Settlement rules"
            items={[
              { label: "First-time counterparties", value: "Protected", tone: "gold", Icon: ShieldCheck },
              { label: "High-value tasks", value: "Protected", tone: "gold", Icon: WalletCards },
              { label: "Trusted repeats", value: "Direct eligible", tone: "success", Icon: CheckCircle2 },
              { label: "Remote deliverables", value: "Protected", tone: "warning", Icon: Clock3 }
            ]}
          />
          <BarListCard
            title="Average time to match"
            tone="gold"
            items={[
              { label: "Priority logistics", value: "34 sec", percent: 88 },
              { label: "Facilities repair", value: "51 sec", percent: 74 },
              { label: "Event crews", value: "2.1 min", percent: 58 }
            ]}
          />
        </div>
      </Section>

      <Section id="privacy" title="Privacy defaults" subtitle="Post privately, reveal only what is necessary for legitimate work completion.">
        <PrivacyStrip />
      </Section>
    </AppShell>
  );
}
