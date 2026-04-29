import { CircleDollarSign, Clock3, ShieldAlert, WalletCards } from "lucide-react";

type PayoutStatus = "paid" | "escrow" | "pending" | "blocked";

type PayoutStatusChipProps = {
  status: PayoutStatus;
  label?: string;
};

const statusMeta: Record<
  PayoutStatus,
  { label: string; className: string; Icon: typeof CircleDollarSign }
> = {
  paid: {
    label: "Paid",
    className: "border-paid/50 bg-paid/10 text-paid",
    Icon: CircleDollarSign
  },
  escrow: {
    label: "Escrow",
    className: "border-gold/50 bg-gold/10 text-gold",
    Icon: WalletCards
  },
  pending: {
    label: "Pending",
    className: "border-zinc-500 bg-zinc-900 text-zinc-300",
    Icon: Clock3
  },
  blocked: {
    label: "Blocked",
    className: "border-danger/60 bg-danger/10 text-danger",
    Icon: ShieldAlert
  }
};

export function PayoutStatusChip({ status, label }: PayoutStatusChipProps) {
  const meta = statusMeta[status];
  const Icon = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase leading-none ${meta.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label ?? meta.label}
    </span>
  );
}
