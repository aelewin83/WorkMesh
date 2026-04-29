import { ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

type RevenueStatCardProps = {
  label: string;
  value: string;
  change: string;
  tone?: "up" | "down" | "flat";
};

const revenueTone = {
  up: { className: "text-paid", Icon: TrendingUp },
  down: { className: "text-danger", Icon: TrendingDown },
  flat: { className: "text-zinc-400", Icon: Minus }
};

export function RevenueStatCard({
  label,
  value,
  change,
  tone = "up"
}: RevenueStatCardProps) {
  const meta = revenueTone[tone];
  const Icon = meta.Icon;

  return (
    <div className="mesh-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="mesh-label text-zinc-500">{label}</p>
        <ArrowUpRight className="h-4 w-4 text-zinc-500" aria-hidden="true" />
      </div>
      <p className="mt-3 font-mono text-2xl font-bold text-white">{value}</p>
      <div className={`mt-2 flex items-center gap-1 font-mono text-[0.68rem] ${meta.className}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {change}
      </div>
    </div>
  );
}
