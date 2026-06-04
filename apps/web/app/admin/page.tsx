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
import { AdminWorkflowPanels } from "@/components/AdminWorkflowPanels";

export default function AdminPage() {
  return (
    <AppShell
      role="admin"
      eyebrow="Internal ops"
      title="Manage beta invites, disputes, and trust."
      subtitle="A lightweight internal panel for private beta operations: invites, moderation, disputes, escrow visibility, and basic health."
      cta="Review Ops"
      ctaHref="/admin#admin-disputes"
      paymentsHref="/admin#payment-rails"
      profile={{ name: "Ops Admin", detail: "Finance + risk" }}
    >
      <HeroProfile
        avatar="A"
        name="Relai Ops"
        detail="Private beta operations / secure hiring visibility"
        status="Beta healthy"
        level="Invite-only beta"
        progress={78}
        score="99.9"
        chips={["Invite access", "Encrypted messages", "Dispute visibility"]}
      />

      <WorkflowGrid
        id="admin-workflow"
        title="Admin workflow"
        subtitle="Lightweight private beta operations. Advanced analytics and compliance tooling are intentionally deferred."
        items={[
          {
            title: "Invite management",
            description: "Read-only invite visibility for private beta access. Code creation tools stay minimal for MVP.",
            action: "View invites",
            actionHref: "/admin#admin-invites",
            Icon: ChartLine,
            tone: "gold"
          },
          {
            title: "Dispute queue",
            description: "Review basic dispute and blocked-work signals. Full case tooling is deferred until beta usage exists.",
            action: "View disputes",
            actionHref: "/admin#admin-disputes",
            Icon: ReceiptText,
            tone: "purple"
          },
          {
            title: "Escrow visibility",
            description: "Read-only payment and settlement status for private beta operations. No payment controls are exposed.",
            action: "View payments",
            actionHref: "/admin#admin-payments",
            Icon: WalletCards,
            tone: "info"
          },
          {
            title: "Moderation queue",
            description: "Lightweight review for disputes, suspicious activity, and category abuse during private beta.",
            action: "Review queue",
            actionHref: "/admin#admin-disputes",
            Icon: ShieldAlert,
            tone: "danger"
          },
          {
            title: "User visibility",
            description: "Read-only user and role visibility. Advanced verification, KYC, and compliance systems are deferred.",
            action: "View users",
            actionHref: "/admin#admin-users",
            Icon: Scale,
            tone: "warning"
          },
          {
            title: "Privacy operations",
            description: "Read-only privacy posture summary for encrypted messages, disclosure defaults, and retention boundaries.",
            action: "View privacy notes",
            actionHref: "/admin#privacy",
            Icon: LockKeyhole,
            tone: "success"
          }
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Invites" value="12" change="4 unused" tone="gold" Icon={ChartLine} />
        <MetricCard label="Active beta users" value="6" change="seed group" tone="success" Icon={Banknote} />
        <MetricCard label="Open disputes" value="1" change="needs review" tone="purple" Icon={ReceiptText} />
        <MetricCard label="Escrow states" value="3" change="testnet visible" tone="info" Icon={WalletCards} />
        <MetricCard label="Reports" value="0" change="no abuse reports" tone="success" Icon={UsersRound} />
        <MetricCard label="System" value="OK" change="local beta" tone="gold" Icon={Gauge} />
      </div>

      <Section id="marketplace-analytics" title="Beta operations" subtitle="Small, practical signals for the current private beta. Read-only monitoring only.">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <LineChartCard title="Invite activity" value="12" data={[2, 3, 4, 5, 7, 8, 10, 12]} tone="gold" note="weekly" />
          </div>
          <LineChartCard title="Risk trend" value="1.7%" data={[9, 8, 7, 5, 6, 4, 3, 2]} tone="success" note="down" />
          <BarListCard
            title="Ops visibility"
            tone="purple"
            items={[
              { label: "Invites", value: "46%", percent: 46 },
              { label: "Disputes", value: "22%", percent: 22 },
              { label: "Users", value: "18%", percent: 18 },
              { label: "Payments", value: "14%", percent: 14 }
            ]}
          />
        </div>
      </Section>

      <Section id="operations-queues" title="Operations queues" subtitle="Disputes, moderation, payment visibility, and beta health.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Disputes queue"
            items={[
              { label: "New disputes", value: "1", tone: "warning", Icon: Scale },
              { label: "Needs review", value: "1", tone: "danger", Icon: AlertTriangle },
              { label: "Protected settlement", value: "Visible", tone: "gold", Icon: ReceiptText },
              { label: "Median close time", value: "11h", tone: "success", Icon: CheckCircle2 }
            ]}
          />
          <StatusPanel
            title="Moderation alerts"
            items={[
              { label: "Account review", value: "0", tone: "success", Icon: ShieldAlert },
              { label: "Spam throttles", value: "Normal", tone: "success", Icon: ShieldCheck },
              { label: "Velocity anomalies", value: "0", tone: "success", Icon: Zap },
              { label: "External steering", value: "None", tone: "success", Icon: Siren }
            ]}
          />
          <StatusPanel
            title="Payment visibility"
            items={[
              { label: "Test wallet", value: "Configured", tone: "gold", Icon: WalletCards },
              { label: "Settlement records", value: "Read-only", tone: "success", Icon: CheckCircle2 },
              { label: "Protected settlement", value: "Tracked", tone: "info", Icon: HandCoins },
              { label: "Config changes", value: "Step-up", tone: "muted", Icon: LockKeyhole }
            ]}
          />
        </div>
      </Section>

      <div id="payment-rails" className="scroll-mt-24" />

      <Section id="supply-demand" title="Private beta activity" subtitle="Lightweight readiness signals. No scale-signaling analytics yet.">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <LineChartCard title="Request readiness" value="3 active" data={[1, 1, 2, 2, 3, 3, 3, 3]} tone="info" note="seed data" />
          <BarListCard
            title="Focus areas"
            tone="gold"
            items={[
              { label: "Logistics", value: "Active", percent: 74 },
              { label: "Research", value: "Seeded", percent: 58 },
              { label: "Events", value: "Seeded", percent: 44 },
              { label: "Advisory", value: "Quiet", percent: 28 }
            ]}
          />
        </div>
      </Section>

      <Section id="compliance-health" title="Beta health" subtitle="Privacy defaults, payment gates, and operational readiness.">
        <div className="grid gap-4 lg:grid-cols-3">
          <StatusPanel
            title="Review queue"
            items={[
              { label: "Contributor reports", value: "0", tone: "success", Icon: Scale },
              { label: "Payment review", value: "Read-only", tone: "info", Icon: Banknote },
              { label: "Verification hooks", value: "Deferred", tone: "muted", Icon: ShieldCheck },
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
            title="Deferred tooling"
            tone="purple"
            items={[
              { label: "Advanced analytics", value: "Deferred", percent: 46 },
              { label: "Treasury tooling", value: "Deferred", percent: 18 },
              { label: "Compliance workflows", value: "Deferred", percent: 14 },
              { label: "Team controls", value: "Deferred", percent: 12 }
            ]}
          />
        </div>
      </Section>

      <Section id="privacy" title="Privacy operations" subtitle="No plaintext private content. Minimal discovery metadata. Selective disclosure only.">
        <PrivacyStrip />
      </Section>
      <AdminWorkflowPanels />
    </AppShell>
  );
}
