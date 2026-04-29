import { Activity } from "lucide-react";

type MarketPressure = "low" | "steady" | "surge" | "critical";

type MarketPressureIndicatorProps = {
  pressure: MarketPressure;
  label?: string;
};

const pressureMeta: Record<
  MarketPressure,
  { label: string; bars: number; text: string; bar: string }
> = {
  low: { label: "Low", bars: 1, text: "text-zinc-400", bar: "bg-zinc-500" },
  steady: { label: "Steady", bars: 2, text: "text-zinc-200", bar: "bg-zinc-300" },
  surge: { label: "Surge", bars: 3, text: "text-gold", bar: "bg-gold" },
  critical: { label: "Critical", bars: 4, text: "text-danger", bar: "bg-danger" }
};

export function MarketPressureIndicator({
  pressure,
  label
}: MarketPressureIndicatorProps) {
  const meta = pressureMeta[pressure];

  return (
    <div className={`inline-flex items-center gap-1.5 ${meta.text}`}>
      <Activity className="h-3.5 w-3.5" aria-hidden="true" />
      <div className="flex items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={`block w-1 border border-current ${
              bar <= meta.bars ? meta.bar : "bg-black"
            }`}
            style={{ height: `${bar * 4 + 4}px` }}
          />
        ))}
      </div>
      <span className="mesh-label">{label ?? meta.label}</span>
    </div>
  );
}
