type LevelProgressBarProps = {
  level: number;
  xp: number;
  nextXp: number;
  label?: string;
};

export function LevelProgressBar({
  level,
  xp,
  nextXp,
  label = "Operator level"
}: LevelProgressBarProps) {
  const progress = Math.min(100, Math.round((xp / nextXp) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="mesh-label text-zinc-400">{label}</span>
        <span className="font-mono text-xs text-gold">L{level}</span>
      </div>
      <div className="h-2 border border-line bg-black">
        <div className="h-full bg-gold" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between font-mono text-[0.66rem] text-zinc-500">
        <span>{xp.toLocaleString()} XP</span>
        <span>{nextXp.toLocaleString()} XP</span>
      </div>
    </div>
  );
}
