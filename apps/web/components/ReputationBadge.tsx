import { ShieldCheck, Star, Verified } from "lucide-react";

type ReputationBadgeProps = {
  score: number;
  label: string;
  signals?: string[];
};

export function ReputationBadge({
  score,
  label,
  signals = []
}: ReputationBadgeProps) {
  return (
    <div className="mesh-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mesh-label text-zinc-500">Reputation</p>
          <p className="mt-1 text-sm font-semibold text-white">{label}</p>
        </div>
        <div className="flex items-center gap-1 border border-gold bg-black px-1.5 py-1 font-mono text-sm font-bold text-gold">
          <Star className="h-3.5 w-3.5" aria-hidden="true" />
          {score}
        </div>
      </div>
      <div className="mt-3 grid gap-1.5">
        {signals.map((signal) => (
          <div
            key={signal}
            className="flex items-center gap-1.5 font-mono text-[0.68rem] text-zinc-300"
          >
            <Verified className="h-3 w-3 text-paid" aria-hidden="true" />
            {signal}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 text-[0.68rem] text-zinc-500">
        <ShieldCheck className="h-3.5 w-3.5 text-paid" aria-hidden="true" />
        Public proof, private identity
      </div>
    </div>
  );
}
