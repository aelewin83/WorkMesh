import { Fingerprint, KeyRound, Shield, UserRound } from "lucide-react";

type AnonymousProfileCardProps = {
  alias: string;
  role: string;
  trustScore: number;
  region: string;
  keysSynced?: boolean;
};

export function AnonymousProfileCard({
  alias,
  role,
  trustScore,
  region,
  keysSynced = true
}: AnonymousProfileCardProps) {
  return (
    <div className="mesh-panel p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-line bg-black text-gold">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{alias}</p>
          <p className="mesh-label text-zinc-500">{role}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-[0.68rem]">
        <div className="mesh-field p-2">
          <Fingerprint className="mb-1 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Trust</p>
          <p className="font-mono text-paid">{trustScore}%</p>
        </div>
        <div className="mesh-field p-2">
          <Shield className="mb-1 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Region</p>
          <p className="font-mono text-zinc-200">{region}</p>
        </div>
        <div className="mesh-field p-2">
          <KeyRound className="mb-1 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <p className="mesh-label text-zinc-500">Keys</p>
          <p className={`font-mono ${keysSynced ? "text-paid" : "text-danger"}`}>
            {keysSynced ? "Sync" : "Hold"}
          </p>
        </div>
      </div>
    </div>
  );
}
