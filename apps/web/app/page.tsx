import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  HardHat,
  Home as HomeIcon,
  LockKeyhole,
  Mail,
  Menu,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  Zap
} from "lucide-react";

const roleCards = [
  {
    href: "/contractor",
    label: "Contractor",
    accent: "success",
    Icon: HardHat,
    copy: "Find work, manage escrow, build reputation, and grow.",
    stats: [
      ["94%", "Match fit"],
      ["$621", "Pending"],
      ["19", "Day streak"]
    ]
  },
  {
    href: "/employer",
    label: "Employer",
    accent: "gold",
    Icon: Building2,
    copy: "Post gigs, match verified operators, and get work done.",
    stats: [
      ["24", "Open tasks"],
      ["19", "Matched"],
      ["$25K", "Authority"]
    ]
  },
  {
    href: "/admin",
    label: "Admin",
    accent: "purple",
    Icon: ShieldCheck,
    copy: "Manage platform health, revenue, risk, and compliance.",
    stats: [
      ["$1.84M", "Gross volume"],
      ["8.2%", "Take rate"],
      ["312K", "Escrow float"]
    ]
  }
] as const;

const accentStyles = {
  success: {
    text: "text-success",
    border: "border-success/25",
    bg: "bg-success/10",
    glow: "shadow-green-glow"
  },
  gold: {
    text: "text-gold-primary",
    border: "border-gold-primary/25",
    bg: "bg-gold-primary/10",
    glow: "shadow-gold-glow"
  },
  purple: {
    text: "text-analytics-purple",
    border: "border-analytics-purple/25",
    bg: "bg-analytics-purple/10",
    glow: "shadow-purple-glow"
  }
};

const topNavItems = [
  { href: "/", label: "Home", Icon: HomeIcon, tone: "gold" },
  { href: "/contractor", label: "Contractor", Icon: HardHat, tone: "success" },
  { href: "/employer", label: "Employer", Icon: Building2, tone: "gold" },
  { href: "/admin", label: "Admin", Icon: UserRound, tone: "purple" }
] as const;

const featureItems = [
  { title: "Pseudonymous by default", body: "Zero-knowledge identity with selective disclosure.", Icon: ShieldCheck, tone: "success" },
  { title: "End-to-end encrypted", body: "Messages, files, and data protected at all times.", Icon: LockKeyhole, tone: "gold" },
  { title: "Protected payments", body: "Escrow, multi-rail payouts, and dispute resolution.", Icon: WalletCards, tone: "purple" },
  { title: "Reputation that travels", body: "Portable reputation across roles and regions.", Icon: Star, tone: "info" }
] as const;

const bottomFeatureItems = [
  { title: "Built for privacy", body: "Minimal data, maximum control", Icon: LockKeyhole },
  { title: "Secure by design", body: "Encryption at every layer", Icon: ShieldCheck },
  { title: "Multi-rail payments", body: "Fiat, stablecoin, and more", Icon: WalletCards },
  { title: "Dispute protection", body: "Fair, fast, and transparent", Icon: CheckCircle2 }
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-[#070809] pb-24 text-white md:pb-8">
      <div className="mx-auto max-w-[1480px] p-3 md:p-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_520px]">
          <section className="rounded-2xl border border-border-2 bg-bg-1/95 p-4 shadow-card md:p-6">
            <ShowcaseHeader />

            <div className="mt-8 grid gap-6 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div>
                <p className="wm-label text-gold-primary">Encrypted labor marketplace</p>
                <h1 className="wm-heading mt-4 max-w-[620px] text-[42px] font-bold leading-[1.02] text-white md:text-[56px]">
                  One Mesh. Three Command Surfaces.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-text-secondary">
                  Role-separated experiences for contractors, employers, and admins. Private, secure, and built for real work.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/contractor" className="wm-button-primary">
                    Get Started
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                  <Link href="#how-it-works" className="wm-button-secondary">
                    <CircleDollarSign className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    How it works
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {roleCards.map((role) => (
                  <RoleCard key={role.label} {...role} />
                ))}
              </div>
            </div>

            <FeatureStrip />
          </section>

          <section className="rounded-2xl border border-border-2 bg-bg-1/95 p-4 shadow-card md:p-6">
            <ContractorPreview />
          </section>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[.95fr_1.45fr_.95fr]">
          <EmployerMiniConsole />
          <AdminAnalyticsPanel />
          <RiskTrustPanel />
        </div>

        <BottomFeatureBand />
      </div>
    </main>
  );
}

function ShowcaseHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-primary/30 bg-gold-primary/10 text-gold-primary shadow-gold-glow">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="wm-heading text-xl font-bold tracking-tight">WORKMESH</span>
      </Link>

      <nav className="mx-auto hidden items-center gap-7 lg:flex">
        {topNavItems.map(({ href, label, Icon, tone }) => (
          <Link
            key={label}
            href={href}
            className={`relative flex items-center gap-2 pb-3 text-sm font-semibold ${
              tone === "success" ? "text-success" : tone === "purple" ? "text-analytics-purple" : "text-white"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            {label}
            {href === "/" ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-gold-primary shadow-gold-glow" /> : null}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border-2 bg-bg-2 text-white">
          <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-primary text-[0.65rem] font-bold text-bg-0">3</span>
        </button>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-2 bg-bg-2 text-text-secondary">
          <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function RoleCard({
  href,
  label,
  accent,
  Icon,
  copy,
  stats
}: {
  href: string;
  label: string;
  accent: keyof typeof accentStyles;
  Icon: typeof HardHat;
  copy: string;
  stats: readonly (readonly [string, string])[];
}) {
  const style = accentStyles[accent];

  return (
    <Link href={href} className={`rounded-2xl border ${style.border} bg-bg-2/90 p-4 shadow-card transition hover:-translate-y-0.5 hover:bg-bg-3`}>
      <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border ${style.border} ${style.bg} ${style.text} ${style.glow}`}>
        <Icon className="h-9 w-9" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 className={`wm-heading mt-5 text-center text-lg font-bold ${style.text}`}>{label}</h2>
      <p className="mx-auto mt-3 min-h-[66px] max-w-[170px] text-center text-sm leading-6 text-text-secondary">{copy}</p>
      <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-xl border border-border-2 bg-bg-1 px-3 py-2 text-sm font-semibold text-white">
        Enter console
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border-2 pt-3">
        {stats.map(([value, statLabel]) => (
          <div key={statLabel} className="text-center">
            <p className="wm-metric text-sm font-bold text-white">{value}</p>
            <p className="mt-1 text-[0.62rem] text-text-muted">{statLabel}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

function FeatureStrip() {
  return (
    <div id="how-it-works" className="mt-8 grid gap-3 rounded-2xl border border-border-2 bg-bg-2/85 p-4 md:grid-cols-4">
      {featureItems.map(({ title, body, Icon, tone }) => (
        <div key={title} className="flex items-center gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
              tone === "success"
                ? "border-success/20 bg-success/10 text-success"
                : tone === "purple"
                  ? "border-analytics-purple/20 bg-analytics-purple/10 text-analytics-purple"
                  : tone === "info"
                    ? "border-info/20 bg-info/10 text-info"
                    : "border-gold-primary/20 bg-gold-primary/10 text-gold-primary"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-text-secondary">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContractorPreview() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Menu className="h-5 w-5 text-text-secondary" strokeWidth={1.75} aria-hidden="true" />
          <p className="wm-label text-success">Contractor dashboard</p>
        </div>
        <div className="flex gap-3 text-text-secondary">
          <Mail className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          <UserRound className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
      </div>

      <div className="rounded-2xl border border-border-2 bg-bg-2 p-4 shadow-card">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10 text-gold-primary shadow-gold-glow">K</div>
          <div className="min-w-0 flex-1">
            <p className="wm-heading truncate text-xl font-bold">Operator K-914</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Online
            </div>
            <p className="mt-1 text-xs text-text-secondary">Anonymous contractor</p>
          </div>
          <div className="hidden rounded-xl border border-border-2 bg-bg-1 px-3 py-2 text-right sm:block">
            <p className="text-xs font-semibold text-gold-primary">Elite operator</p>
            <p className="wm-metric mt-1 text-xs text-white">Level 5</p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-3">
          <div className="h-full w-[84%] rounded-full bg-gold-primary" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="Ready now" value="On" tone="success" Icon={Zap} />
        <MiniStat label="Escrow balance" value="$621" tone="gold" Icon={WalletCards} />
      </div>

      <FeaturedGig />
      <PhoneFrame />
    </div>
  );
}

function MiniStat({ label, value, tone, Icon }: { label: string; value: string; tone: "success" | "gold"; Icon: typeof Zap }) {
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

function FeaturedGig() {
  return (
    <div className="mt-4 rounded-2xl border border-border-2 bg-bg-2 p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="wm-label text-text-muted">Featured gig</p>
          <h3 className="wm-heading mt-2 text-lg font-bold">Night dock unload, aisle 4-6</h3>
          <p className="mt-1 text-sm text-text-muted">Harbor Supply Node</p>
        </div>
        <span className="rounded-lg border border-gold-primary/30 bg-gold-primary/10 px-2 py-1 font-mono text-[0.65rem] text-gold-primary">Escrow</span>
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-border-2 border-y border-border-2 py-3">
        <Cell label="Range" value="1.2 mi" />
        <Cell label="Window" value="21:00" padded />
        <Cell label="Pay" value="$148" tone="success" padded />
      </div>
      <SurgeBars />
    </div>
  );
}

function Cell({ label, value, tone, padded }: { label: string; value: string; tone?: "success"; padded?: boolean }) {
  return (
    <div className={padded ? "px-3" : ""}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`wm-metric mt-1 text-sm font-semibold ${tone === "success" ? "text-success" : "text-white"}`}>{value}</p>
    </div>
  );
}

function SurgeBars() {
  const bars = [12, 18, 10, 24, 30, 36, 22, 18, 42, 48, 34, 26, 38, 55, 71, 45, 31, 42, 58, 84, 64, 39, 52, 73, 60, 44];
  return (
    <>
      <div className="mt-4 flex items-end gap-1">
        {bars.map((height, index) => (
          <span key={`${height}-${index}`} className="w-1 flex-1 rounded-t bg-gold-primary" style={{ height: `${Math.max(4, height / 3)}px`, opacity: index < 4 ? 0.45 : 1 }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        <span className="wm-label text-gold-primary">Surge</span>
        <span className="wm-label text-gold-primary">High demand</span>
      </div>
    </>
  );
}

function PhoneFrame() {
  return (
    <div className="pointer-events-none mx-auto mt-5 hidden max-w-[270px] rounded-[42px] border border-white/20 bg-black p-2 shadow-card lg:block">
      <div className="rounded-[34px] border border-border-2 bg-bg-1 p-3">
        <div className="mb-3 flex items-center justify-between text-[0.65rem] text-white">
          <span>9:01</span>
          <span>● ●</span>
        </div>
        <p className="wm-heading text-sm font-bold">WORKMESH</p>
        <p className="wm-label mt-3 text-success">Contractor</p>
        <div className="mt-3 rounded-2xl bg-bg-2 p-3">
          <p className="font-semibold">Operator K-914</p>
          <p className="mt-1 text-xs text-success">● Online</p>
          <div className="mt-3 h-1.5 rounded-full bg-bg-3">
            <div className="h-full w-[84%] rounded-full bg-gold-primary" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-bg-2 p-2 text-xs">Ready<br /><span className="text-success">On</span></div>
          <div className="rounded-xl bg-bg-2 p-2 text-xs">Escrow<br /><span className="text-gold-primary">$621</span></div>
        </div>
        <div className="mt-3 rounded-2xl bg-bg-2 p-3 text-xs">
          <p className="font-semibold">Night dock unload</p>
          <p className="mt-2 text-success">$148</p>
          <SurgeBars />
        </div>
      </div>
    </div>
  );
}

function EmployerMiniConsole() {
  return (
    <section className="rounded-2xl border border-border-2 bg-bg-1 p-4 shadow-card">
      <PanelHeader title="Employer console" tone="gold" Icon={Menu} />
      <div className="mt-4 rounded-2xl border border-border-2 bg-bg-2 p-4">
        <p className="wm-label text-text-muted">Post and manage work</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniBox value="24" label="Open tasks" />
          <MiniBox value="19" label="Matched" />
          <MiniBox value="$25K" label="Spend authority" />
          <MiniBox value="2" label="Active escrows" />
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {["Facilities repair - urgent", "Equipment delivery", "Site inspection - weekend"].map((item, index) => (
          <div key={item} className="flex items-center justify-between rounded-xl bg-bg-2 px-3 py-2">
            <span className="text-sm text-text-secondary">{item}</span>
            <span className={index === 0 ? "text-success" : index === 1 ? "text-warning" : "text-info"}>{index === 0 ? "Active" : index === 1 ? "In progress" : "Open"}</span>
          </div>
        ))}
      </div>
      <Link href="/employer" className="mt-3 flex min-h-11 items-center justify-center rounded-2xl bg-gold-primary font-semibold text-bg-0">
        Post a new gig
      </Link>
    </section>
  );
}

function AdminAnalyticsPanel() {
  return (
    <section className="rounded-2xl border border-border-2 bg-bg-1 p-4 shadow-card">
      <PanelHeader title="Admin analytics" tone="purple" Icon={Menu} />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminMetric value="$1.84M" label="Gross volume" change="+18.4%" tone="success" />
        <AdminMetric value="8.2%" label="Take rate" change="+0.6 pts" tone="success" />
        <AdminMetric value="$312K" label="Escrow float" change="+12.7%" tone="success" />
        <AdminMetric value="132" label="Disputes" change="-6.1%" tone="danger" />
      </div>
      <div className="mt-4 rounded-2xl border border-border-2 bg-bg-2 p-4">
        <div className="flex items-center justify-between">
          <p className="wm-label text-text-muted">Gross volume over time</p>
          <span className="wm-chip border-analytics-purple/20 bg-analytics-purple/10 text-analytics-purple">$312K Sat</span>
        </div>
        <svg viewBox="0 0 520 210" className="mt-4 h-56 w-full" role="img" aria-label="Revenue line chart">
          {[40, 82, 124, 166].map((y) => <line key={y} x1="0" x2="520" y1={y} y2={y} stroke="rgba(255,255,255,.055)" />)}
          <polyline
            points="0,160 45,126 80,98 120,132 164,80 205,42 252,102 300,126 344,82 390,58 438,118 486,74 520,92"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </section>
  );
}

function RiskTrustPanel() {
  return (
    <section className="rounded-2xl border border-border-2 bg-bg-1 p-4 shadow-card">
      <PanelHeader title="Risk & trust" tone="success" Icon={ShieldCheck} />
      <div className="mt-5 rounded-2xl border border-border-2 bg-bg-2 p-5">
        <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border-[18px] border-success shadow-green-glow">
          <div className="text-center">
            <p className="wm-metric text-4xl font-bold">98%</p>
            <p className="text-sm text-text-secondary">Trust health</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <RiskRow label="Low risk" value="92%" color="bg-success" />
          <RiskRow label="Med risk" value="6%" color="bg-gold-primary" />
          <RiskRow label="High risk" value="2%" color="bg-danger" />
        </div>
      </div>
      <Link href="/admin#operations-queues" className="mt-4 flex min-h-12 items-center justify-between rounded-2xl border border-border-2 bg-bg-2 px-4 font-semibold">
        View risk center
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </section>
  );
}

function BottomFeatureBand() {
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_.38fr]">
      <div className="grid gap-3 rounded-2xl bg-white p-5 text-bg-0 md:grid-cols-4">
        {bottomFeatureItems.map(({ title, body, Icon }) => (
          <div key={title} className="flex gap-3">
            <Icon className="mt-1 h-6 w-6 text-bg-3" strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-bg-3">{body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-analytics-purple/20 bg-analytics-purple/10 p-5 text-white shadow-purple-glow">
        <p className="wm-label text-analytics-purple">One platform. Three rules.</p>
        <p className="mt-3 text-sm leading-6 text-text-secondary">Every action protected. Every role empowered. Built for the future of work.</p>
      </div>
    </section>
  );
}

function PanelHeader({ title, tone, Icon }: { title: string; tone: "gold" | "purple" | "success"; Icon: typeof Menu }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-text-secondary" strokeWidth={1.75} aria-hidden="true" />
        <p className={`wm-label ${tone === "gold" ? "text-gold-primary" : tone === "purple" ? "text-analytics-purple" : "text-success"}`}>{title}</p>
      </div>
      <Mail className="h-5 w-5 text-text-secondary" strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

function MiniBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border-2 bg-bg-1 p-3">
      <p className="wm-metric text-xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}

function AdminMetric({ value, label, change, tone }: { value: string; label: string; change: string; tone: "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-border-2 bg-bg-2 p-3">
      <p className="wm-metric text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
      <p className={`mt-2 text-xs ${tone === "success" ? "text-success" : "text-danger"}`}>{change}</p>
    </div>
  );
}

function RiskRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        {label}
      </span>
      <span className="wm-metric text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
