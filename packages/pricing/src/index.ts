import type {
  CurrencyCode,
  MarketSnapshot,
  PriceQuote,
  SkillTag,
  WorkRequest,
  WorkerProfile,
} from "@workmesh/types";

export const PRICING_FORMULA_VERSION = "workmesh.pricing.v1";
export const WORKMESH_MARKET_PRICING_VERSION = "workmesh.pricing.required.v1";

export interface PricingInput {
  readonly request: WorkRequest;
  readonly worker?: WorkerProfile;
  readonly market?: MarketSnapshot;
}

export interface PricingOptions {
  readonly defaultHourlyRate?: number;
  readonly platformFeeRate?: number;
  readonly riskReserveRate?: number;
}

export interface MarketPricingInput {
  readonly baseTaskRate: number;
  readonly urgencyMultiplier: number;
  readonly supplyDemandMultiplier: number;
  readonly skillScarcityMultiplier: number;
  readonly timeWindowMultiplier: number;
  readonly locationMultiplier: number;
}

export interface MarketPricingQuote {
  readonly formulaVersion: typeof WORKMESH_MARKET_PRICING_VERSION;
  readonly suggestedPrice: number;
  readonly minimumPrice: number;
  readonly premiumPrice: number;
  readonly marketPressure: "low" | "balanced" | "high" | "surge";
  readonly explanation: string;
  readonly factors: MarketPricingInput;
}

const DEFAULT_COMPLEXITY_HOURS = {
  simple: 4,
  standard: 12,
  complex: 32,
  expert: 80,
} as const;

const URGENCY_MULTIPLIER = {
  low: 0.95,
  normal: 1,
  high: 1.22,
  critical: 1.5,
} as const;

const COMPLEXITY_MULTIPLIER = {
  simple: 0.9,
  standard: 1,
  complex: 1.25,
  expert: 1.55,
} as const;

export function calculateDynamicPrice(
  input: PricingInput,
  options: PricingOptions = {},
): PriceQuote {
  const request = input.request;
  const worker = input.worker;
  const currency = quoteCurrency(input);
  const estimatedHours = request.budget.targetHours ?? DEFAULT_COMPLEXITY_HOURS[request.complexity];
  const minimumHours = worker?.rateCard.minimumEngagementHours ?? 0;
  const billableHours = Math.max(estimatedHours, minimumHours);
  const minChargeApplied = billableHours > estimatedHours;
  const baseHourlyRate =
    worker?.rateCard.hourlyRate ??
    input.market?.medianHourlyRate ??
    options.defaultHourlyRate ??
    85;
  const scarceSkills = new Set((input.market?.scarceSkills ?? []).map(normalizeSkill));
  const skillPremium = calculateSkillPremium(request.requiredSkills, scarceSkills);
  const urgencyMultiplier = calculateUrgencyMultiplier(input);
  const complexityMultiplier = COMPLEXITY_MULTIPLIER[request.complexity];
  const scarcityMultiplier = calculateScarcityMultiplier(input.market);
  const reputationMultiplier = calculateReputationMultiplier(worker);
  const adjustedHourlyRate = roundMoney(
    baseHourlyRate *
      (1 + skillPremium) *
      urgencyMultiplier *
      complexityMultiplier *
      scarcityMultiplier *
      reputationMultiplier,
  );
  const subtotal = roundMoney(adjustedHourlyRate * billableHours);
  const platformFeeRate = options.platformFeeRate ?? 0.1;
  const riskReserveRate =
    options.riskReserveRate ?? (request.complexity === "expert" ? 0.05 : 0.03);
  const platformFee = roundMoney(subtotal * platformFeeRate);
  const riskReserve = roundMoney(subtotal * riskReserveRate);
  const total = roundMoney(subtotal + platformFee + riskReserve);
  const withinBudget = isWithinBudget({
    request,
    adjustedHourlyRate,
    total,
    currency,
  });

  return {
    formulaVersion: PRICING_FORMULA_VERSION,
    requestId: request.id,
    ...(worker ? { workerId: worker.id } : {}),
    currency,
    total,
    withinBudget,
    minChargeApplied,
    breakdown: {
      baseHourlyRate: roundMoney(baseHourlyRate),
      skillPremium: round(skillPremium, 4),
      urgencyMultiplier,
      complexityMultiplier,
      scarcityMultiplier,
      reputationMultiplier,
      adjustedHourlyRate,
      estimatedHours: billableHours,
      subtotal,
      platformFeeRate,
      platformFee,
      riskReserveRate,
      riskReserve,
    },
    explanations: explainPrice({
      request,
      currency,
      skillPremium,
      minChargeApplied,
      total,
      withinBudget,
      ...(input.market ? { market: input.market } : {}),
    }),
  };
}

export function quoteMarketPrice(input: MarketPricingInput): MarketPricingQuote {
  const factors = {
    baseTaskRate: positive(input.baseTaskRate, "baseTaskRate"),
    urgencyMultiplier: positive(input.urgencyMultiplier, "urgencyMultiplier"),
    supplyDemandMultiplier: positive(input.supplyDemandMultiplier, "supplyDemandMultiplier"),
    skillScarcityMultiplier: positive(input.skillScarcityMultiplier, "skillScarcityMultiplier"),
    timeWindowMultiplier: positive(input.timeWindowMultiplier, "timeWindowMultiplier"),
    locationMultiplier: positive(input.locationMultiplier, "locationMultiplier"),
  };
  const pressureIndex =
    factors.urgencyMultiplier *
    factors.supplyDemandMultiplier *
    factors.skillScarcityMultiplier *
    factors.timeWindowMultiplier *
    factors.locationMultiplier;
  const suggestedPrice = roundMoney(factors.baseTaskRate * pressureIndex);
  const minimumPrice = roundMoney(Math.max(factors.baseTaskRate * 0.82, suggestedPrice * 0.74));
  const premiumPrice = roundMoney(suggestedPrice * 1.22);

  return {
    formulaVersion: WORKMESH_MARKET_PRICING_VERSION,
    suggestedPrice,
    minimumPrice,
    premiumPrice,
    marketPressure:
      pressureIndex >= 1.45 ? "surge" : pressureIndex >= 1.18 ? "high" : pressureIndex <= 0.92 ? "low" : "balanced",
    explanation:
      "suggestedPrice = baseTaskRate * urgencyMultiplier * supplyDemandMultiplier * skillScarcityMultiplier * timeWindowMultiplier * locationMultiplier.",
    factors,
  };
}

function quoteCurrency(input: PricingInput): CurrencyCode {
  return input.worker?.rateCard.currency ?? input.market?.currency ?? input.request.budget.currency;
}

function calculateSkillPremium(
  requiredSkills: readonly SkillTag[],
  scarceSkills: ReadonlySet<string>,
): number {
  const baseSkillLoad = Math.max(0, requiredSkills.length - 2) * 0.025;
  const scarcityLoad = requiredSkills.filter((skill) =>
    scarceSkills.has(normalizeSkill(skill)),
  ).length * 0.075;
  return Math.min(0.35, round(baseSkillLoad + scarcityLoad, 4));
}

function calculateUrgencyMultiplier(input: PricingInput): number {
  const defaultMultiplier = URGENCY_MULTIPLIER[input.request.timing.urgency];
  const workerRush = input.worker?.rateCard.rushMultiplier;
  if (input.request.timing.urgency === "high" || input.request.timing.urgency === "critical") {
    return Math.max(defaultMultiplier, workerRush ?? defaultMultiplier);
  }
  return defaultMultiplier;
}

function calculateScarcityMultiplier(market?: MarketSnapshot): number {
  const ratio = market?.supplyDemandRatio;
  if (ratio === undefined) {
    return 1;
  }
  if (ratio < 0.5) {
    return 1.25;
  }
  if (ratio < 0.9) {
    return 1.12;
  }
  if (ratio > 1.8) {
    return 0.95;
  }
  return 1;
}

function calculateReputationMultiplier(worker?: WorkerProfile): number {
  if (!worker) {
    return 1;
  }
  const rating = worker.reputation.averageRating;
  const completionFit = Math.min(1, Math.log10(worker.reputation.completedJobs + 1) / 2);
  const premium = (rating - 4.2) * 0.04 + completionFit * 0.04;
  return round(Math.min(1.18, Math.max(0.94, 1 + premium)), 4);
}

function isWithinBudget(input: {
  readonly request: WorkRequest;
  readonly adjustedHourlyRate: number;
  readonly total: number;
  readonly currency: CurrencyCode;
}): boolean {
  if (input.request.budget.currency !== input.currency) {
    return false;
  }
  if (
    input.request.budget.maxHourlyRate !== undefined &&
    input.adjustedHourlyRate > input.request.budget.maxHourlyRate
  ) {
    return false;
  }
  if (
    input.request.budget.maxTotal !== undefined &&
    input.total > input.request.budget.maxTotal
  ) {
    return false;
  }
  return true;
}

function explainPrice(input: {
  readonly request: WorkRequest;
  readonly market?: MarketSnapshot;
  readonly currency: CurrencyCode;
  readonly skillPremium: number;
  readonly minChargeApplied: boolean;
  readonly total: number;
  readonly withinBudget: boolean;
}): string[] {
  const explanations = [
    `Quote currency is ${input.currency}.`,
    `Urgency ${input.request.timing.urgency} and complexity ${input.request.complexity} applied.`,
    `Skill premium is ${Math.round(input.skillPremium * 100)}%.`,
    `Total quote is ${input.total.toFixed(2)} ${input.currency}.`,
  ];
  if (input.market?.supplyDemandRatio !== undefined) {
    explanations.push(`Market supply/demand ratio is ${input.market.supplyDemandRatio}.`);
  }
  if (input.minChargeApplied) {
    explanations.push("Worker minimum engagement hours increased billable hours.");
  }
  if (!input.withinBudget) {
    explanations.push("Quote is outside the request budget constraints.");
  }
  return explanations;
}

function normalizeSkill(skill: SkillTag): string {
  return String(skill).trim().toLowerCase();
}

function roundMoney(value: number): number {
  return round(value, 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function positive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive finite number.`);
  }
  return value;
}
