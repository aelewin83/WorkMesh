import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  ChartLine,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Home,
  LucideIcon,
  Menu,
  ShieldCheck,
  UserRound,
  WalletCards
} from "lucide-react";

type Role = "contractor" | "employer" | "admin";
type Tone = "gold" | "success" | "warning" | "danger" | "info" | "purple" | "muted";

const roleLinks: Array<{ href: string; label: string; role?: Role; Icon: LucideIcon }> = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/contractor", label: "Contractor", role: "contractor", Icon: UserRound },
  { href: "/employer", label: "Employer", role: "employer", Icon: BriefcaseBusiness },
  { href: "/admin", label: "Admin", role: "admin", Icon: ChartLine }
];

const toneText: Record<Tone, string> = {
  gold: "text-gold-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  purple: "text-analytics-purple",
  muted: "text-text-secondary"
};

const toneBg: Record<Tone, string> = {
  gold: "bg-gold-primary/10 text-gold-primary border-gold-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
  purple: "bg-analytics-purple/10 text-analytics-purple border-analytics-purple/20",
  muted: "bg-white/[.035] text-text-secondary border-border-2"
};

export function AppShell({
  role,
  eyebrow,
  title,
  subtitle,
  cta,
  ctaHref,
  paymentsHref,
  mobileHero,
  profile,
  children
}: {
  role: Role;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref?: string;
  paymentsHref?: string;
  mobileHero?: ReactNode;
  profile: { name: string; detail: string };
  children: ReactNode;
}) {
  return (
    <main className="wm-shell pb-24 text-text-primary md:pb-10">
      <header className="sticky top-0 z-50 border-b border-border-2 bg-bg-0/85 backdrop-blur-xl">
        <div className="wm-container flex min-h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold-primary/20 bg-gold-primary/10 text-gold-primary shadow-gold-glow">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div>
              <p className="wm-heading text-base font-bold leading-5">WorkMesh</p>
              <p className="wm-label hidden sm:block">{eyebrow}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-2xl border border-border-2 bg-bg-1 p-1 md:flex">
            {roleLinks.slice(1).map(({ href, label, role: itemRole, Icon }) => {
              const active = role === itemRole;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 font-mono text-xs font-semibold transition ${
                    active
                      ? "bg-gold-primary text-bg-0 shadow-gold-glow"
                      : "border border-transparent text-text-muted hover:border-border-2 hover:bg-white/[.04] hover:text-text-primary"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border-2 bg-bg-1 text-text-secondary md:flex">
              <Bell className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-border-2 bg-bg-1 py-1.5 pl-2 pr-3 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-bg-3 text-gold-primary">
                <UserRound className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-4">{profile.name}</p>
                <p className="wm-label">{profile.detail}</p>
              </div>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-2 bg-bg-1 text-text-secondary md:hidden">
              <Menu className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {mobileHero ? <div className="md:hidden">{mobileHero}</div> : null}

      <section
        id="profile"
        className={`wm-container scroll-mt-24 pt-8 md:pt-12 ${mobileHero ? "hidden md:block" : ""}`}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="wm-label mb-3 text-gold-soft">{eyebrow}</p>
            <h1 className="wm-heading max-w-4xl text-[32px] font-bold leading-[1.02] tracking-normal text-white sm:text-[40px] lg:text-[56px]">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-text-secondary md:text-base">
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={ctaHref ?? `/${role}#workflow`} className="wm-button-primary">
              <CircleDollarSign className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {cta}
            </Link>
            <Link href={paymentsHref ?? `/${role}#payments`} className="wm-button-secondary">
              <WalletCards className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Payments
            </Link>
          </div>
        </div>
      </section>

      <section className="wm-container mt-6 hidden md:block">
        <div className="grid gap-3 rounded-3xl border border-border-2 bg-bg-1 p-2 shadow-card md:grid-cols-3">
          {roleLinks.slice(1).map(({ href, label, role: itemRole, Icon }) => {
            const active = role === itemRole;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition ${
                  active
                    ? "bg-gold-primary text-bg-0"
                    : "bg-bg-2 text-text-secondary hover:bg-bg-3 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  <span className="font-semibold">{label}</span>
                </span>
                <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="wm-container mt-8 grid gap-6 lg:mt-10">{children}</div>
    </main>
  );
}

export function WorkflowGrid({
  title,
  subtitle,
  id,
  items
}: {
  title: string;
  subtitle: string;
  id?: string;
  items: Array<{
    title: string;
    description: string;
    action: string;
    actionHref: string;
    Icon: LucideIcon;
    tone?: Tone;
  }>;
}) {
  return (
    <Section id={id} title={title} subtitle={subtitle}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map(({ title: itemTitle, description, action, actionHref, Icon, tone = "muted" }) => (
          <article key={itemTitle} className="wm-card flex min-h-[188px] flex-col justify-between p-5">
            <div>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border ${toneBg[tone]}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="wm-heading text-lg font-bold text-white">{itemTitle}</h3>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
            <Link
              href={actionHref}
              className={`mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                tone === "gold"
                  ? "border-gold-primary bg-gold-primary text-bg-0 shadow-gold-glow"
                  : "border-border-2 bg-bg-1 text-white hover:border-white/15 hover:bg-bg-3"
              }`}
            >
              {action}
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </Section>
  );
}

export function Section({
  id,
  title,
  subtitle,
  children,
  action
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="wm-heading text-xl font-bold text-white md:text-2xl lg:text-[28px]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-text-muted md:text-[15px]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  change,
  tone = "muted",
  Icon
}: {
  label: string;
  value: string;
  change: string;
  tone?: Tone;
  Icon: LucideIcon;
}) {
  return (
    <article className="wm-card p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-text-muted">{label}</p>
        <span className={`rounded-xl border p-2 ${toneBg[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
      </div>
      <p className="wm-metric mt-5 text-[26px] font-semibold leading-none text-white md:text-[30px] lg:text-[36px]">
        {value}
      </p>
      <p className={`wm-label mt-3 ${toneText[tone]}`}>{change}</p>
    </article>
  );
}

export function HeroProfile({
  avatar,
  name,
  detail,
  status,
  level,
  progress,
  score,
  chips
}: {
  avatar: string;
  name: string;
  detail: string;
  status: string;
  level: string;
  progress: number;
  score: string;
  chips: string[];
}) {
  return (
    <article className="wm-card overflow-hidden p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-gold-primary/25 bg-gold-primary/10 text-xl font-bold text-gold-primary shadow-gold-glow">
            {avatar}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="wm-heading truncate text-2xl font-bold text-white md:text-[28px]">{name}</h2>
              <span className="wm-chip border-success/20 bg-success/10 text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-text-secondary">{detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span key={chip} className="wm-chip">{chip}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border-2 bg-bg-1 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="wm-label">Level</p>
              <p className="mt-1 font-semibold text-white">{level}</p>
            </div>
            <div className="text-right">
              <p className="wm-label">Trust score</p>
              <p className="wm-metric mt-1 text-2xl font-semibold text-gold-primary">{score}</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-3">
            <div className="h-full rounded-full bg-gold-primary shadow-gold-glow" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-text-muted">
            <span>XP progress</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function LineChartCard({
  title,
  value,
  data,
  tone = "gold",
  note
}: {
  title: string;
  value: string;
  data: number[];
  tone?: Tone;
  note: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 82 - ((item - min) / Math.max(max - min, 1)) * 58;
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = {
    gold: "#FFD700",
    success: "#00FF41",
    warning: "#F59E0B",
    danger: "#FF4D2E",
    info: "#38BDF8",
    purple: "#8B5CF6",
    muted: "#A0A0A0"
  }[tone];

  return (
    <article className="wm-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          <p className="wm-metric mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <span className={`wm-chip ${toneBg[tone]}`}>{note}</span>
      </div>
      <svg viewBox="0 0 100 90" className="mt-5 h-44 w-full overflow-visible" role="img" aria-label={`${title} chart`}>
        {[20, 40, 60, 80].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(255,255,255,.055)" strokeWidth=".6" />
        ))}
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((item, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 100;
          const y = 82 - ((item - min) / Math.max(max - min, 1)) * 58;
          return <circle key={`${item}-${index}`} cx={x} cy={y} r="1.8" fill={stroke} />;
        })}
      </svg>
    </article>
  );
}

export function BarListCard({
  title,
  items,
  tone = "purple"
}: {
  title: string;
  tone?: Tone;
  items: Array<{ label: string; value: string; percent: number }>;
}) {
  return (
    <article className="wm-card p-5">
      <p className="text-sm text-text-muted">{title}</p>
      <div className="mt-5 grid gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between gap-4 text-sm">
              <span className="text-text-secondary">{item.label}</span>
              <span className="wm-metric text-white">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-3">
              <div className={`h-full rounded-full ${tone === "gold" ? "bg-gold-primary" : tone === "success" ? "bg-success" : "bg-analytics-purple"}`} style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function OpportunityCard({
  title,
  meta,
  price,
  match,
  tags,
  urgent
}: {
  title: string;
  meta: string;
  price: string;
  match: string;
  tags: string[];
  urgent?: boolean;
}) {
  return (
    <article className="wm-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-text-muted">{meta}</p>
        </div>
        <span className={`wm-chip ${urgent ? toneBg.warning : toneBg.gold}`}>{match}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="wm-label">Gross pay</p>
          <p className="wm-metric mt-1 text-3xl font-semibold text-white">{price}</p>
        </div>
        <span className="wm-chip border-success/20 bg-success/10 text-success">Escrow ready</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="wm-chip">{tag}</span>
        ))}
      </div>
    </article>
  );
}

export function StatusPanel({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; value: string; tone?: Tone; Icon?: LucideIcon }>;
}) {
  return (
    <article className="wm-card p-5">
      <p className="text-sm text-text-muted">{title}</p>
      <div className="mt-4 divide-y divide-border-2">
        {items.map(({ label, value, tone = "muted", Icon = CheckCircle2 }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`rounded-xl border p-2 ${toneBg[tone]}`}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="truncate text-sm text-text-secondary">{label}</span>
            </div>
            <span className={`wm-metric text-sm ${toneText[tone]}`}>{value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PrivacyStrip() {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {[
        ["E2EE chat", "Default on"],
        ["Encrypted jobs", "No plaintext briefs"],
        ["Pseudonymous", "Public by default"],
        ["Selective reveal", "Consent gated"]
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-border-2 bg-bg-1 p-4">
          <p className="wm-label">{label}</p>
          <p className="mt-2 text-sm font-semibold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
