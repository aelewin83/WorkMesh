"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function WorkflowModal({
  title,
  eyebrow,
  children,
  onClose
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end bg-bg-0/80 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border-2 bg-bg-1 p-4 shadow-card sm:max-w-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {eyebrow ? <p className="wm-label text-gold-primary">{eyebrow}</p> : null}
            <h2 className="wm-heading mt-1 text-2xl font-bold text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border-2 bg-bg-2 text-text-secondary">
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="wm-label text-text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = "min-h-12 rounded-2xl border border-border-2 bg-bg-2 px-4 text-sm text-white outline-none focus:border-gold-primary";
export const textareaClass = "min-h-24 rounded-2xl border border-border-2 bg-bg-2 px-4 py-3 text-sm text-white outline-none focus:border-gold-primary";
