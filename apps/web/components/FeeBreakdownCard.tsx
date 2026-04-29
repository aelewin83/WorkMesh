type FeeItem = {
  label: string;
  value: string;
  tone?: "default" | "paid" | "gold" | "danger";
};

type FeeBreakdownCardProps = {
  title: string;
  items: FeeItem[];
  total: string;
  note?: string;
};

const feeToneClass: Record<NonNullable<FeeItem["tone"]>, string> = {
  default: "text-zinc-200",
  paid: "text-paid",
  gold: "text-gold",
  danger: "text-danger"
};

export function FeeBreakdownCard({
  title,
  items,
  total,
  note
}: FeeBreakdownCardProps) {
  return (
    <div className="mesh-panel p-3">
      <p className="mesh-label text-zinc-500">{title}</p>
      <div className="mt-2 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 py-2 text-xs">
            <span className="text-zinc-400">{item.label}</span>
            <span className={`font-mono ${feeToneClass[item.tone ?? "default"]}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="mesh-label text-zinc-500">Total</span>
        <span className="font-mono text-xl font-bold text-white">{total}</span>
      </div>
      {note ? <p className="mt-2 text-[0.68rem] leading-4 text-zinc-500">{note}</p> : null}
    </div>
  );
}
