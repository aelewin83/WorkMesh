import {
  AlertTriangle,
  Banknote,
  ChartLine,
  CheckCircle2,
  Gauge,
  HandCoins,
  HeartPulse,
  LockKeyhole,
  ReceiptText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UsersRound,
  WalletCards,
  Zap
} from "lucide-react";
import {
  AppShell,
  BarListCard,
  HeroProfile,
  LineChartCard,
  MetricCard,
  PrivacyStrip,
  Section,
  StatusPanel,
  WorkflowGrid
} from "@/components/PremiumDashboard";

export default function AdminPage() {
  return (
    <AppShell
      role="admin"
      eyebrow="Admin command center"
      title="Monitor growth, payments, risk, and trust."
      subtitle="A marketplace command center for revenue, liquidity, protected settlement, privacy posture, compliance queues, and system health."
      cta="Review Ops"
      ctaHref="/admin#operations-queues"
      paymentsHref="/admin#payment-rails"
      profile={{ name: "Ops Admin", detail: "Finance + risk" }}
    >
      <HeroProfile
        avatar="A"
        name="WorkMesh Network"
        detail="Production-readiness console / privacy-native marketplace operations"
        status="Systems nominal"
        level="Multi-rail settlement"
        progress={78}
        score="99.9"
        chips={["Treasury multisig", "E2EE enforced", "Risk queues live"]}
      />

      <WorkflowGrid
        id="admin-workflow"
        title="Admin workflow"
        subtitle="Internal-only operating modules for marketplace economics, risk, treasury, and compliance."
        items={[
          {
            title: "Revenue analytics",
            description: "Monitor GMV, net revenue, take rate, escrow float, active users, fill rate, and rail economics.",
            action: "Open revenue",
            actionHref: "/admin#marketplace-analytics",
            Icon: ChartLine,
            tone: "gold"
          },
          {
            title: "Fee ledger",
            description: "Audit basis points, fee snapshots, refund waivers, processor costs, and treasury reconciliation.",
            action: "Open ledger",
            actionHref: "/admin#operations-queues",
            Icon: ReceiptText,
            tone: "purple"
          },
          {
            title: "Payment rails",
            description: "Review ACH, card, wallet processor, stablecoin escrow, protected-payment gates, and direct settlement.",
            action: "Review rails",
            actionHref: "/admin#payment-rails",
            Icon: WalletCards,
            tone: "info"
          },
          {
            title: "Risk queue",
            description: "Triage disputes, fraud alerts, sybil review, suspicious velocity, chargebacks, and category abuse.",
            action: "Review risk",
            actionHref: "/admin#operations-queues",
            Icon: ShieldAlert,
            tone: "danger"
          },
          {
            title: "Compliance queue",
            description: "Track worker classification, KYC/KYB hooks, sanctions screening, tax readiness, and market restrictions.",
            action: "Open compliance",
            actionHref: "/admin#compliance-health",
            Icon: Scale,
            tone: "warning"
          },
          {
            title: "Privacy operations",
            description: "Audit E2EE defaults, encrypted job briefs, minimal metadata, selective disclosure, and retention policy.",
            action: "Open privacy",
            actionHref: "/admin#privacy",
            Icon: LockKeyhole,
            tone: "success"
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="GMV" value="$1.84M" change="+18.4% wk" tone="gold" Icon={ChartLine} />
        <MetricCard label="Net revenue" value="$151K" change="+14.2% wk" tone="success" Icon={Banknote} />
        <MetricCard label="Take rate" value="8.2%" change="+0.6 pts" tone="purple" Icon={ReceiptText} />
        <MetricCard label="Escrow float" value="$312K" change="12 active rails" tone="info" Icon={WalletCards} />
        <MetricCard label="Active users" value="48.2K" change="+9.1%" tone="success" Icon={UsersRound} />
        <MetricCard label="Fill rate" value="86%" change="+4.3 pts" tone="gold" Icon={Gauge} />
      </div>

      <Section id="marketplace-analytics" title="Marketplace analytics" subtitle="Revenue, rail mix, liquidity, and risk movement.">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <LineChartCard title="Revenue over time" value="$151K" data={[42, 48, 51, 63, 71, 88, 116, 151]} tone="gold" note="weekly" />
          </div>
          <LineChartCard title="Risk trend" value="1.7%" data={[9, 8, 7, 5, 6, 4, 3, 2]} tone="success" note="down" />
          <BarListCard
            title="Fee revenue by rail"
            tone="purple"
            items={[
              { label: "Escrow", value: "46%", percent: 46 },
              { label: "ACH / card", value: "22%", percent: 22 },
              { label: "Wallet", value: "18%", percent: 18 },
              { label: "Stablecoin", value: "14%", percent: 14 }
            ]}
          />
        </div>
      </Section>

      <Section id="operations-queues" title="Operations queues" subtitle="Disputes, fraud, treasury, compliance, and platform health.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Disputes queue"
            items={[
              { label: "New disputes", value: "12", tone: "warning", Icon: Scale },
              { label: "High-value review", value: "3", tone: "danger", Icon: AlertTriangle },
              { label: "Refund waivers", value: "$3.8K", tone: "gold", Icon: ReceiptText },
              { label: "Median close time", value: "11h", tone: "success", Icon: CheckCircle2 }
            ]}
          />
          <StatusPanel
            title="Fraud alerts"
            items={[
              { label: "Sybil review", value: "18 wallets", tone: "danger", Icon: ShieldAlert },
              { label: "Spam throttles", value: "Normal", tone: "success", Icon: ShieldCheck },
              { label: "Velocity anomalies", value: "6", tone: "warning", Icon: Zap },
              { label: "External steering", value: "Flagged", tone: "warning", Icon: Siren }
            ]}
          />
          <StatusPanel
            title="Treasury wallet"
            items={[
              { label: "Multisig target", value: "0x...dEaD", tone: "gold", Icon: WalletCards },
              { label: "Fee reconciliation", value: "99.8%", tone: "success", Icon: CheckCircle2 },
              { label: "Stablecoin escrow", value: "Lawful markets", tone: "info", Icon: HandCoins },
              { label: "Config changes", value: "Step-up", tone: "muted", Icon: LockKeyhole }
            ]}
          />
        </div>
      </Section>

      <div id="payment-rails" className="scroll-mt-24" />

      <Section id="supply-demand" title="Supply and demand" subtitle="Liquidity and category pressure across active markets.">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <LineChartCard title="Supply vs demand" value="0.72 ratio" data={[86, 83, 78, 72, 69, 73, 71, 72]} tone="info" note="thin supply" />
          <BarListCard
            title="Market pressure"
            tone="gold"
            items={[
              { label: "NYC logistics", value: "Surge", percent: 94 },
              { label: "Chicago repair", value: "High", percent: 78 },
              { label: "Austin events", value: "Balanced", percent: 54 },
              { label: "Remote ops", value: "Low", percent: 38 }
            ]}
          />
        </div>
      </Section>

      <Section id="compliance-health" title="Compliance and system health" subtitle="Global privacy defaults, payment gates, and operational readiness.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Compliance queue"
            items={[
              { label: "Worker classification", value: "Review", tone: "warning", Icon: Scale },
              { label: "Payment rail review", value: "4 markets", tone: "warning", Icon: Banknote },
              { label: "KYC/KYB hooks", value: "Ready", tone: "success", Icon: ShieldCheck },
              { label: "Direct settlement", value: "Reputation gated", tone: "gold", Icon: Gauge }
            ]}
          />
          <StatusPanel
            title="System health"
            items={[
              { label: "API status", value: "99.98%", tone: "success", Icon: HeartPulse },
              { label: "Indexer lag", value: "2.1 sec", tone: "success", Icon: ChartLine },
              { label: "Encrypted storage", value: "Healthy", tone: "success", Icon: LockKeyhole },
              { label: "Webhook failures", value: "0.2%", tone: "info", Icon: Zap }
            ]}
          />
          <BarListCard
            title="Revenue channels"
            tone="purple"
            items={[
              { label: "Platform fees", value: "46%", percent: 46 },
              { label: "Priority placement", value: "18%", percent: 18 },
              { label: "Verification", value: "14%", percent: 14 },
              { label: "Team tools", value: "12%", percent: 12 }
            ]}
          />
        </div>
      </Section>

      <Section id="privacy" title="Privacy operations" subtitle="No plaintext private content. Minimal discovery metadata. Selective disclosure only.">
        <PrivacyStrip />
      </Section>
    </AppShell>
  );
}
