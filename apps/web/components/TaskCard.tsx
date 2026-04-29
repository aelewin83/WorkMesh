import { CalendarClock, MapPin, ShieldCheck } from "lucide-react";
import { MarketPressureIndicator } from "./MarketPressureIndicator";
import { PayoutStatusChip } from "./PayoutStatusChip";

type TaskCardProps = {
  title: string;
  client: string;
  distance: string;
  price: string;
  window: string;
  pressure: "low" | "steady" | "surge" | "critical";
  payout: "paid" | "escrow" | "pending" | "blocked";
  skills: string[];
};

export function TaskCard({
  title,
  client,
  distance,
  price,
  window,
  pressure,
  payout,
  skills
}: TaskCardProps) {
  return (
    <article className="mesh-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mesh-label mt-1 text-zinc-500">{client}</p>
        </div>
        <PayoutStatusChip status={payout} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="mesh-field p-2">
          <MapPin className="mb-1 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Range</p>
          <p className="font-mono text-xs text-zinc-100">{distance}</p>
        </div>
        <div className="mesh-field p-2">
          <CalendarClock className="mb-1 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Window</p>
          <p className="font-mono text-xs text-zinc-100">{window}</p>
        </div>
        <div className="mesh-field p-2">
          <ShieldCheck className="mb-1 h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Pay</p>
          <p className="font-mono text-xs text-paid">{price}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <MarketPressureIndicator pressure={pressure} />
        <div className="flex flex-wrap justify-end gap-1">
          {skills.map((skill) => (
            <span
              key={skill}
              className="border border-line bg-black px-1.5 py-0.5 font-mono text-[0.62rem] uppercase text-zinc-400"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
