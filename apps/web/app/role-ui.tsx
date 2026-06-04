import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Building2, HardHat, Home, LineChart, Network } from "lucide-react";

export type Tone = "default" | "gold" | "paid" | "danger";

const toneClass: Record<Tone, string> = {
  default: "text-zinc-100",
  gold: "text-gold",
  paid: "text-paid",
  danger: "text-danger"
};

const nav = [
  { href: "/", label: "Home", key: "home", icon: Home },
  { href: "/contractor", label: "Contributors", key: "contractor", icon: HardHat },
  { href: "/employer", label: "Hiring", key: "employer", icon: Building2 },
  { href: "/admin", label: "Admin", key: "admin", icon: LineChart }
] as const;

export function RoleHeader({
  eyebrow,
  title,
  subtitle,
  active
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  active: "home" | "contractor" | "employer" | "admin";
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-black/95">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4 lg:px-6">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center border border-gold bg-black text-gold">
            <Network className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>
            <span className="mesh-heading block text-sm font-black uppercase leading-4 text-white">
              Relai
            </span>
            <span className="mesh-label block text-zinc-500">{eyebrow}</span>
          </span>
        </a>
        <nav className="flex flex-wrap justify-end gap-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[0.68rem] uppercase ${
                  active === item.key
                    ? "border-gold bg-gold text-black"
                    : "border-line bg-panel text-zinc-400 hover:border-gold hover:text-gold"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-line px-3 py-3 sm:px-4 lg:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="mesh-label text-gold">{eyebrow}</p>
          <h1 className="mesh-heading mt-1 text-2xl font-black uppercase leading-7 text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

export function Panel({
  id,
  title,
  kicker,
  icon: Icon,
  children
}: {
  id: string;
  title: string;
  kicker: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mesh-section scroll-mt-36 px-3 py-4 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-end justify-between gap-3 border-b border-line pb-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-gold">
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="mesh-label truncate">{kicker}</p>
            </div>
            <h2 className="mesh-heading text-lg font-black uppercase leading-6 text-white sm:text-xl">
              {title}
            </h2>
          </div>
          <a
            href="#top"
            className="hidden border border-line bg-black px-2 py-1 font-mono text-[0.65rem] uppercase text-zinc-500 hover:border-gold hover:text-gold sm:inline-flex"
          >
            top
          </a>
        </div>
        {children}
      </div>
    </section>
  );
}

export function StatCell({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="mesh-field p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="mesh-label text-zinc-500">{label}</p>
        <Icon className={`h-4 w-4 ${toneClass[tone]}`} aria-hidden="true" />
      </div>
      <p className={`mt-2 font-mono text-lg font-bold ${toneClass[tone]}`}>{value}</p>
      {detail ? <p className="mt-1 text-[0.68rem] leading-4 text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export function StatusRow({
  label,
  value,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${toneClass[tone]}`} aria-hidden="true" />
        <span className="truncate text-xs text-zinc-300">{label}</span>
      </div>
      <span className={`shrink-0 font-mono text-xs ${toneClass[tone]}`}>{value}</span>
    </div>
  );
}

export function StepLine({
  step,
  label,
  state
}: {
  step: string;
  label: string;
  state: "done" | "active" | "hold";
}) {
  const stateClass =
    state === "done"
      ? "border-paid text-paid"
      : state === "active"
        ? "border-gold text-gold"
        : "border-zinc-700 text-zinc-500";

  return (
    <div className="flex items-center gap-2 border-b border-line py-2 last:border-b-0">
      <span
        className={`flex h-6 w-8 shrink-0 items-center justify-center border font-mono text-[0.65rem] ${stateClass}`}
      >
        {step}
      </span>
      <span className="text-xs text-zinc-300">{label}</span>
    </div>
  );
}
