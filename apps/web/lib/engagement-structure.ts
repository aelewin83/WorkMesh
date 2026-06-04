export type EngagementStructureId = "flat_fee" | "hourly" | "day_rate" | "weekly_retainer" | "open_proposal";

export type EngagementStructureDefinition = {
  id: EngagementStructureId;
  label: string;
  shortLabel: string;
  placeholder: string;
  guidance: string;
};

export const engagementStructureDefinitions: EngagementStructureDefinition[] = [
  { id: "flat_fee", label: "Flat Fee", shortLabel: "Flat fee", placeholder: "$2,500/project", guidance: "Good for scoped deliverables and clearly defined outcomes." },
  { id: "hourly", label: "Hourly", shortLabel: "Hourly", placeholder: "$75/hour", guidance: "Useful when scope may change but trust and approval stay explicit." },
  { id: "day_rate", label: "Day Rate", shortLabel: "Day rate", placeholder: "$650/day", guidance: "Common for media, events, field work, and production days." },
  { id: "weekly_retainer", label: "Weekly/Retainer", shortLabel: "Retainer", placeholder: "$4,000/week or $8,500/month", guidance: "Best for recurring trusted coordination or ongoing support." },
  { id: "open_proposal", label: "Negotiable/Open Proposal", shortLabel: "Open proposal", placeholder: "Open to discussion", guidance: "Use when scope should be finalized through conversation and agreement." }
];

export const engagementStructureIds = engagementStructureDefinitions.map((item) => item.id);

const legacyEngagementMap: Record<string, EngagementStructureId> = {
  flat: "flat_fee",
  fixed: "flat_fee",
  fixed_fee: "flat_fee",
  project: "flat_fee",
  hourly_rate: "hourly",
  day: "day_rate",
  daily: "day_rate",
  weekly: "weekly_retainer",
  retainer: "weekly_retainer",
  negotiable: "open_proposal",
  proposal: "open_proposal",
  open: "open_proposal"
};

export function normalizeEngagementStructure(value: unknown): EngagementStructureId {
  const clean = String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (engagementStructureIds.includes(clean as EngagementStructureId)) return clean as EngagementStructureId;
  return legacyEngagementMap[clean] ?? "open_proposal";
}

export function engagementStructureLabel(value: unknown) {
  const id = normalizeEngagementStructure(value);
  return engagementStructureDefinitions.find((item) => item.id === id)?.label ?? "Negotiable/Open Proposal";
}

export function engagementStructureOptions() {
  return engagementStructureDefinitions.map(({ id, label }) => ({ id, label }));
}

export function preferredEngagementStructuresForFocus(focus: string): EngagementStructureId[] {
  if (focus === "media-production") return ["day_rate", "weekly_retainer", "flat_fee"];
  if (focus === "research-analysis-advisory") return ["flat_fee", "open_proposal", "hourly"];
  if (focus === "executive-assistance-coordination") return ["hourly", "weekly_retainer", "open_proposal"];
  if (focus === "logistics-transport") return ["hourly", "day_rate", "flat_fee"];
  if (focus === "events-staffing") return ["hourly", "day_rate"];
  if (focus === "writing-reporting") return ["flat_fee", "open_proposal", "hourly"];
  if (focus === "local-sourcing-fixer") return ["day_rate", "flat_fee", "open_proposal"];
  return ["open_proposal", "flat_fee"];
}

export function formatEngagementSummary(input: { engagementStructure?: unknown; ratePreview?: string; rateAmount?: number; rateCurrency?: string }) {
  const label = engagementStructureLabel(input.engagementStructure);
  if (input.ratePreview) return label + " · " + input.ratePreview;
  if (typeof input.rateAmount === "number" && input.rateAmount > 0) return label + " · " + (input.rateCurrency ?? "USD") + " " + input.rateAmount;
  return label;
}
