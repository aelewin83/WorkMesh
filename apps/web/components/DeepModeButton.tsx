import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ScanLine } from "lucide-react";

type DeepModeButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  active?: boolean;
};

export function DeepModeButton({
  children,
  active = false,
  className = "",
  ...props
}: DeepModeButtonProps) {
  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-2 border px-3 py-2 text-xs font-bold uppercase transition ${
        active
          ? "border-gold bg-gold text-black"
          : "border-line bg-black text-zinc-100 hover:border-gold hover:text-gold"
      } ${className}`}
      {...props}
    >
      <ScanLine className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}
