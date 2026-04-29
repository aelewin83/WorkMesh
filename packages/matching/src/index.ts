import type {
  AvailabilityStatus,
  MarketSnapshot,
  MatchResult,
  MatchScoreComponents,
  SkillTag,
  WorkMeshId,
  WorkRequest,
  WorkerProfile,
} from "@workmesh/types";

export const MATCHING_FORMULA_VERSION = "workmesh.matching.v1";
export const WORKMESH_REQUIRED_FORMULA_VERSION = "workmesh.matching.required.v1";

export interface MatchingFormulaWeights {
  readonly requiredSkillCoverage: number;
  readonly optionalSkillCoverage: number;
  readonly availabilityFit: number;
  readonly budgetFit: number;
  readonly reputationFit: number;
  readonly locationFit: number;
  readonly freshnessFit: number;
}

export interface ScoreCandidateInput {
  readonly request: WorkRequest;
  readonly worker: WorkerProfile;
  readonly market?: MarketSnapshot;
  readonly now?: Date | string;
}

export interface RankCandidatesInput {
  readonly request: WorkRequest;
  readonly workers: readonly WorkerProfile[];
  readonly market?: MarketSnapshot;
  readonly now?: Date | string;
}

export interface MatchingOptions {
  readonly weights?: Partial<MatchingFormulaWeights>;
}

export interface RequiredMatchSignals {
  readonly skillFitWeight: number;
  readonly proximityWeight: number;
  readonly tierEligibilityWeight: number;
  readonly ratingWeight: number;
  readonly availabilityWeight: number;
  readonly completionHistoryWeight: number;
  readonly priceFitWeight: number;
  readonly responseWeight: number;
}

export interface RequiredMatchInput {
  readonly signals: RequiredMatchSignals;
  readonly missingRequirements?: readonly string[];
  readonly suggestedActions?: readonly string[];
}

export interface RequiredMatchOutput {
  readonly formulaVersion: typeof WORKMESH_REQUIRED_FORMULA_VERSION;
  readonly totalScore: number;
  readonly confidenceScore: number;
  readonly explanation: string;
  readonly missingRequirements: readonly string[];
  readonly suggestedActions: readonly string[];
  readonly components: RequiredMatchSignals;
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingFormulaWeights = {
  requiredSkillCoverage: 0.38,
  optionalSkillCoverage: 0.08,
  availabilityFit: 0.16,
  budgetFit: 0.12,
  reputationFit: 0.12,
  locationFit: 0.09,
  freshnessFit: 0.05,
};

const STATUS_FIT: Record<AvailabilityStatus, number> = {
  available: 1,
  limited: 0.68,
  busy: 0.24,
  offline: 0,
};

const URGENCY_WEEKLY_HOURS = {
  low: 5,
  normal: 12,
  high: 24,
  critical: 36,
} as const;

export function scoreCandidate(
  input: ScoreCandidateInput,
  options: MatchingOptions = {},
): MatchResult {
  const weights = normalizeWeights({
    ...DEFAULT_MATCHING_WEIGHTS,
    ...options.weights,
  });
  const workerSkills = new Set(input.worker.skills.map(normalizeTag));
  const requiredSkills = input.request.requiredSkills.map(normalizeTag);
  const optionalSkills = (input.request.optionalSkills ?? []).map(normalizeTag);

  const matchedRequiredSkills = input.request.requiredSkills.filter((skill) =>
    workerSkills.has(normalizeTag(skill)),
  );
  const missingRequiredSkills = input.request.requiredSkills.filter(
    (skill) => !workerSkills.has(normalizeTag(skill)),
  );
  const matchedOptionalSkills = (input.request.optionalSkills ?? []).filter(
    (skill) => workerSkills.has(normalizeTag(skill)),
  );

  const components: MatchScoreComponents = {
    requiredSkillCoverage: ratio(matchedRequiredSkills.length, requiredSkills.length),
    optionalSkillCoverage: ratio(matchedOptionalSkills.length, optionalSkills.length),
    availabilityFit: availabilityFit(input.request, input.worker),
    budgetFit: budgetFit(input.request, input.worker, input.market),
    reputationFit: reputationFit(input.worker),
    locationFit: locationFit(input.request, input.worker),
    freshnessFit: freshnessFit(input.worker.updatedAt, input.now),
  };

  const eligible =
    missingRequiredSkills.length === 0 &&
    input.worker.availability.status !== "offline" &&
    components.locationFit > 0;
  const weighted =
    components.requiredSkillCoverage * weights.requiredSkillCoverage +
    components.optionalSkillCoverage * weights.optionalSkillCoverage +
    components.availabilityFit * weights.availabilityFit +
    components.budgetFit * weights.budgetFit +
    components.reputationFit * weights.reputationFit +
    components.locationFit * weights.locationFit +
    components.freshnessFit * weights.freshnessFit;
  const normalizedScore = eligible ? round(weighted) : 0;
  const score = round(normalizedScore * 100, 1);

  return {
    formulaVersion: MATCHING_FORMULA_VERSION,
    requestId: input.request.id,
    workerId: input.worker.id,
    rank: null,
    eligible,
    decision: decisionFor(score, eligible),
    score,
    normalizedScore,
    components,
    matchedRequiredSkills,
    missingRequiredSkills,
    matchedOptionalSkills,
    explanations: explainMatch({
      request: input.request,
      worker: input.worker,
      missingRequiredSkills,
      matchedRequiredSkills,
      matchedOptionalSkills,
      components,
      score,
      eligible,
    }),
  };
}

export function rankCandidates(
  input: RankCandidatesInput,
  options: MatchingOptions = {},
): MatchResult[] {
  return input.workers
    .map((worker) =>
      scoreCandidate(
        {
          request: input.request,
          worker,
          ...(input.market ? { market: input.market } : {}),
          ...(input.now !== undefined ? { now: input.now } : {}),
        },
        options,
      ),
    )
    .sort((a, b) => {
      if (a.eligible !== b.eligible) {
        return a.eligible ? -1 : 1;
      }
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return String(a.workerId).localeCompare(String(b.workerId));
    })
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
}

export function calculateRequiredMatchScore(input: RequiredMatchInput): RequiredMatchOutput {
  const components = normalizeRequiredSignals(input.signals);
  const totalScore = round(
    components.skillFitWeight +
      components.proximityWeight +
      components.tierEligibilityWeight +
      components.ratingWeight +
      components.availabilityWeight +
      components.completionHistoryWeight +
      components.priceFitWeight +
      components.responseWeight,
    1,
  );
  const missingRequirements = input.missingRequirements ?? [];
  const confidenceScore = round(
    clamp(totalScore / 100) * 0.72 +
      clamp(components.skillFitWeight / 30) * 0.18 +
      (missingRequirements.length === 0 ? 0.1 : 0),
    2,
  );

  return {
    formulaVersion: WORKMESH_REQUIRED_FORMULA_VERSION,
    totalScore,
    confidenceScore,
    explanation:
      "matchScore = skillFitWeight + proximityWeight + tierEligibilityWeight + ratingWeight + availabilityWeight + completionHistoryWeight + priceFitWeight + responseWeight.",
    missingRequirements,
    suggestedActions:
      input.suggestedActions ??
      (missingRequirements.length > 0
        ? missingRequirements.map((requirement) => `Satisfy requirement: ${requirement}`)
        : ["Apply now or open encrypted chat with the employer."]),
    components,
  };
}

function normalizeWeights(weights: MatchingFormulaWeights): MatchingFormulaWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    throw new Error("Matching weights must sum to a positive number.");
  }
  return {
    requiredSkillCoverage: weights.requiredSkillCoverage / total,
    optionalSkillCoverage: weights.optionalSkillCoverage / total,
    availabilityFit: weights.availabilityFit / total,
    budgetFit: weights.budgetFit / total,
    reputationFit: weights.reputationFit / total,
    locationFit: weights.locationFit / total,
    freshnessFit: weights.freshnessFit / total,
  };
}

function normalizeRequiredSignals(signals: RequiredMatchSignals): RequiredMatchSignals {
  return {
    skillFitWeight: boundedWeight(signals.skillFitWeight, 30),
    proximityWeight: boundedWeight(signals.proximityWeight, 12),
    tierEligibilityWeight: boundedWeight(signals.tierEligibilityWeight, 12),
    ratingWeight: boundedWeight(signals.ratingWeight, 12),
    availabilityWeight: boundedWeight(signals.availabilityWeight, 10),
    completionHistoryWeight: boundedWeight(signals.completionHistoryWeight, 10),
    priceFitWeight: boundedWeight(signals.priceFitWeight, 8),
    responseWeight: boundedWeight(signals.responseWeight, 6),
  };
}

function boundedWeight(value: number, max: number): number {
  return round(Math.min(Math.max(value, 0), max), 2);
}

function availabilityFit(request: WorkRequest, worker: WorkerProfile): number {
  const statusFit = STATUS_FIT[worker.availability.status];
  if (statusFit === 0) {
    return 0;
  }
  const hoursNeeded = URGENCY_WEEKLY_HOURS[request.timing.urgency];
  const hoursFit = clamp(worker.availability.weeklyHours / hoursNeeded);
  return round(statusFit * 0.7 + hoursFit * 0.3);
}

function budgetFit(
  request: WorkRequest,
  worker: WorkerProfile,
  market?: MarketSnapshot,
): number {
  const checks: number[] = [];
  const workerRate = worker.rateCard.hourlyRate;
  if (request.budget.currency !== worker.rateCard.currency) {
    checks.push(market?.currency === request.budget.currency ? 0.72 : 0.55);
  }
  if (request.budget.maxHourlyRate !== undefined) {
    checks.push(clamp(request.budget.maxHourlyRate / workerRate));
  }
  if (
    request.budget.maxTotal !== undefined &&
    request.budget.targetHours !== undefined &&
    request.budget.targetHours > 0
  ) {
    checks.push(clamp(request.budget.maxTotal / (workerRate * request.budget.targetHours)));
  }
  if (checks.length === 0) {
    return 1;
  }
  return round(checks.reduce((sum, value) => sum + value, 0) / checks.length);
}

function reputationFit(worker: WorkerProfile): number {
  const ratingFit = clamp(worker.reputation.averageRating / 5);
  const volumeFit = clamp(Math.log10(worker.reputation.completedJobs + 1) / 2);
  const responseFit = clamp(worker.reputation.responseRate);
  const onTimeFit = clamp(worker.reputation.onTimeRate);
  const disputeFit = clamp(1 - worker.reputation.disputeRate);
  return round(
    ratingFit * 0.34 +
      volumeFit * 0.18 +
      responseFit * 0.18 +
      onTimeFit * 0.2 +
      disputeFit * 0.1,
  );
}

function locationFit(request: WorkRequest, worker: WorkerProfile): number {
  if (!worker.workModes.includes(request.locationMode)) {
    return 0;
  }
  if (request.locationMode === "remote") {
    return 1;
  }
  const preference = request.locationPreference;
  if (!preference) {
    return 0.75;
  }
  if (
    preference.city &&
    worker.location.city &&
    normalizeText(preference.city) === normalizeText(worker.location.city) &&
    normalizeText(preference.country) === normalizeText(worker.location.country)
  ) {
    return 1;
  }
  if (
    preference.region &&
    worker.location.region &&
    normalizeText(preference.region) === normalizeText(worker.location.region) &&
    normalizeText(preference.country) === normalizeText(worker.location.country)
  ) {
    return 0.82;
  }
  if (normalizeText(preference.country) === normalizeText(worker.location.country)) {
    return 0.65;
  }
  return 0.18;
}

function freshnessFit(updatedAt: string, nowValue?: Date | string): number {
  const now = nowValue ? new Date(nowValue) : new Date();
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime()) || Number.isNaN(now.getTime())) {
    return 0.5;
  }
  const ageDays = Math.max(0, (now.getTime() - updated.getTime()) / 86_400_000);
  if (ageDays <= 7) {
    return 1;
  }
  if (ageDays <= 30) {
    return 0.85;
  }
  if (ageDays <= 90) {
    return 0.65;
  }
  if (ageDays <= 180) {
    return 0.48;
  }
  return 0.32;
}

function explainMatch(input: {
  readonly request: WorkRequest;
  readonly worker: WorkerProfile;
  readonly missingRequiredSkills: readonly SkillTag[];
  readonly matchedRequiredSkills: readonly SkillTag[];
  readonly matchedOptionalSkills: readonly SkillTag[];
  readonly components: MatchScoreComponents;
  readonly score: number;
  readonly eligible: boolean;
}): string[] {
  const explanations = [
    `Matched ${input.matchedRequiredSkills.length}/${input.request.requiredSkills.length} required skills.`,
    `Matched ${input.matchedOptionalSkills.length}/${input.request.optionalSkills?.length ?? 0} optional skills.`,
    `Availability fit ${formatPercent(input.components.availabilityFit)} for ${input.worker.availability.status} status.`,
    `Budget fit ${formatPercent(input.components.budgetFit)} against worker rate.`,
    `Overall score ${input.score.toFixed(1)}.`,
  ];
  if (input.missingRequiredSkills.length > 0) {
    explanations.push(
      `Missing required skills: ${input.missingRequiredSkills.map(String).join(", ")}.`,
    );
  }
  if (!input.eligible) {
    explanations.push("Candidate is ineligible until hard requirements are satisfied.");
  }
  return explanations;
}

function decisionFor(
  score: number,
  eligible: boolean,
): MatchResult["decision"] {
  if (!eligible) {
    return "ineligible";
  }
  if (score >= 85) {
    return "strong";
  }
  if (score >= 70) {
    return "review";
  }
  return "weak";
}

function normalizeTag(value: SkillTag): string {
  return String(value).trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 1;
  }
  return round(numerator / denominator);
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
