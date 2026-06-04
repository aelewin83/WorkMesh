export type OperationalFocusId =
  | "writing-reporting"
  | "media-production"
  | "research-analysis-advisory"
  | "logistics-transport"
  | "local-sourcing-fixer"
  | "security-coordination"
  | "executive-assistance-coordination"
  | "events-staffing"
  | "technical-support-advisory"
  | "custom";

export type OperationalFocusDefinition = {
  id: OperationalFocusId;
  label: string;
  examples: string[];
  capabilities: string[];
  priority: "primary" | "secondary" | "cautious" | "custom";
  note?: string;
};

export const operationalFocusDefinitions: OperationalFocusDefinition[] = [
  {
    id: "writing-reporting",
    label: "Writing and Reporting",
    examples: ["Journalism", "Editorial", "Copywriting", "Reporting", "Research writing", "Communications"],
    capabilities: ["Writing", "Editing", "Fact-checking", "Translation", "Research writing", "Communications"],
    priority: "primary"
  },
  {
    id: "media-production",
    label: "Media and Production",
    examples: ["Video", "Photography", "Editing", "Audio", "Production coordination", "Content creation"],
    capabilities: ["Videography", "Photography", "Editing", "Audio production", "Production coordination", "Content creation"],
    priority: "primary"
  },
  {
    id: "research-analysis-advisory",
    label: "Research, Analysis, and Advisory",
    examples: ["Market research", "Financial analysis", "Strategic advisory", "Due diligence", "Investigative research", "Intelligence gathering"],
    capabilities: ["Research", "Analysis", "Financial modeling", "Due diligence", "Investigative research", "Strategic advisory"],
    priority: "primary"
  },
  {
    id: "logistics-transport",
    label: "Logistics and Transport",
    examples: ["Transport coordination", "Drivers", "Pickups/drop-offs", "Route planning", "Field logistics", "Inventory movement"],
    capabilities: ["Transport", "Route planning", "Pickups/drop-offs", "Field logistics", "Inventory movement", "Coordination"],
    priority: "secondary"
  },
  {
    id: "local-sourcing-fixer",
    label: "Local Sourcing and Fixer Work",
    examples: ["Translators", "Local guides", "Local coordination", "Field sourcing", "Regional support", "Local operational access"],
    capabilities: ["Translation", "Local coordination", "Field sourcing", "Regional support", "Local guide", "Vendor coordination"],
    priority: "primary"
  },
  {
    id: "security-coordination",
    label: "Security Coordination",
    examples: ["Event security coordination", "Travel coordination", "Route planning", "Site assessment", "Field escort coordination", "Emergency coordination"],
    capabilities: ["Route planning", "Event security coordination", "Site assessment", "Travel coordination", "Field escort coordination", "Emergency coordination"],
    priority: "cautious",
    note: "Security-related work must remain lawful, licensed where required, and coordination-focused. Combat, weapons procurement, and offensive services are not supported."
  },
  {
    id: "executive-assistance-coordination",
    label: "Executive Assistance and Coordination",
    examples: ["Executive assistants", "Scheduling", "Travel planning", "Concierge support", "Communications support", "Operational administration"],
    capabilities: ["Executive assistance", "Scheduling", "Travel planning", "Concierge support", "Communications support", "Operational administration"],
    priority: "primary"
  },
  {
    id: "events-staffing",
    label: "Events and Staffing",
    examples: ["Event setup", "Temporary staffing", "Hospitality support", "Coordination", "Venue operations", "Live production support"],
    capabilities: ["Event setup", "Temporary staffing", "Hospitality support", "Venue operations", "Live production support", "Coordination"],
    priority: "secondary"
  },
  {
    id: "technical-support-advisory",
    label: "Technical Support and Advisory",
    examples: ["Troubleshooting", "Technical consulting", "Systems support", "IT coordination", "Operational technical support", "Implementation support"],
    capabilities: ["Troubleshooting", "Technical consulting", "Systems support", "IT coordination", "Implementation support", "Operational technical support"],
    priority: "secondary"
  },
  {
    id: "custom",
    label: "Custom",
    examples: ["Custom operational focus", "Custom capability tags"],
    capabilities: [],
    priority: "custom"
  }
];

export const operationalFocusIds = operationalFocusDefinitions.map((focus) => focus.id);

export const legacyOperationalFocusMap: Record<string, OperationalFocusId> = {
  "professional-consulting": "research-analysis-advisory",
  "logistics-field-tasks": "logistics-transport",
  "property-operations": "executive-assistance-coordination",
  "operational-assistance": "executive-assistance-coordination",
  "events-temporary-staffing": "events-staffing",
  "private-security-risk": "security-coordination",
  "consulting": "research-analysis-advisory",
  "logistics": "logistics-transport",
  "facilities": "executive-assistance-coordination",
  "events": "events-staffing"
};

export function normalizeOperationalFocusId(value: string | undefined | null): OperationalFocusId {
  if (!value) return "custom";
  const clean = value.trim().toLowerCase();
  if (operationalFocusIds.includes(clean as OperationalFocusId)) return clean as OperationalFocusId;
  return legacyOperationalFocusMap[clean] ?? "custom";
}

export function operationalFocusLabel(value: string | undefined | null) {
  const id = normalizeOperationalFocusId(value);
  return operationalFocusDefinitions.find((focus) => focus.id === id)?.label ?? "Custom";
}

export function operationalFocusOptions() {
  return operationalFocusDefinitions.map(({ id, label }) => ({ id, label }));
}

export function capabilitySuggestionsFor(focusIds: string[]) {
  return Array.from(new Set(focusIds.flatMap((id) => operationalFocusDefinitions.find((focus) => focus.id === normalizeOperationalFocusId(id))?.capabilities ?? []))).sort();
}

export function examplesForOperationalFocus(focusIds: string[]) {
  return Array.from(new Set(focusIds.flatMap((id) => operationalFocusDefinitions.find((focus) => focus.id === normalizeOperationalFocusId(id))?.examples ?? [])));
}
