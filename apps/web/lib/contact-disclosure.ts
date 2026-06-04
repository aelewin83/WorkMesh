export type ContactDisclosureCategory =
  | "phone"
  | "email"
  | "external_link"
  | "messaging_handle";

export type ContactDisclosureSignal = {
  detected: boolean;
  categories: ContactDisclosureCategory[];
  guidance: string;
};

const guidance = "Contact sharing becomes available once your agreement is active and protected settlement is ready.";

const detectors: Array<{ category: ContactDisclosureCategory; pattern: RegExp }> = [
  { category: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
  { category: "phone", pattern: /(?:\+?\d[\s().-]*){7,}\d/ },
  { category: "external_link", pattern: /\b(?:https?:\/\/|www\.|calendly\.com|meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s]+/i },
  { category: "messaging_handle", pattern: /\b(?:whatsapp|signal|telegram|discord|tg|wa|calendly)\s*[:@]\s*[\w.-]+/i }
];

export function detectContactDisclosure(value: string): ContactDisclosureSignal {
  const categories = detectors
    .filter((detector) => detector.pattern.test(value))
    .map((detector) => detector.category);
  const unique = Array.from(new Set(categories));
  return { detected: unique.length > 0, categories: unique, guidance };
}

export function hasContactDisclosureSignal(value: unknown): value is ContactDisclosureSignal {
  if (!value || typeof value !== "object") return false;
  const signal = value as Partial<ContactDisclosureSignal>;
  return signal.detected === true && Array.isArray(signal.categories);
}
