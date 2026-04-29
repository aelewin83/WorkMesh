import assert from "node:assert/strict";
import test from "node:test";

import {
  currencyCode,
  isoDateTime,
  skillTag,
  workMeshId,
  type MarketSnapshot,
  type WorkRequest,
  type WorkerProfile,
} from "@workmesh/types";

import { calculateDynamicPrice, quoteMarketPrice } from "../src/index.js";

const request: WorkRequest = {
  id: workMeshId("request-1"),
  clientId: workMeshId("client-1"),
  title: "Build pricing service",
  requiredSkills: [skillTag("typescript"), skillTag("cryptography"), skillTag("marketplaces")],
  locationMode: "remote",
  timing: { urgency: "high" },
  budget: {
    currency: currencyCode("USD"),
    maxHourlyRate: 260,
    maxTotal: 12000,
    targetHours: 24,
  },
  complexity: "complex",
  createdAt: isoDateTime("2026-04-01T00:00:00.000Z"),
};

const worker: WorkerProfile = {
  id: workMeshId("worker-1"),
  displayName: "Ada",
  skills: request.requiredSkills,
  domains: ["marketplaces"],
  languages: ["en"],
  location: { country: "US" },
  workModes: ["remote"],
  availability: { status: "available", weeklyHours: 40 },
  rateCard: {
    currency: currencyCode("USD"),
    hourlyRate: 130,
    minimumEngagementHours: 12,
    rushMultiplier: 1.25,
  },
  reputation: {
    completedJobs: 60,
    averageRating: 4.9,
    responseRate: 0.98,
    disputeRate: 0,
    onTimeRate: 0.96,
  },
  verification: { identity: "verified" },
  updatedAt: isoDateTime("2026-04-25T00:00:00.000Z"),
};

const market: MarketSnapshot = {
  currency: currencyCode("USD"),
  medianHourlyRate: 115,
  supplyDemandRatio: 0.7,
  scarceSkills: [skillTag("cryptography")],
  capturedAt: isoDateTime("2026-04-20T00:00:00.000Z"),
};

test("returns a deterministic quote with required breakdown outputs", () => {
  const quote = calculateDynamicPrice({ request, worker, market });
  const repeat = calculateDynamicPrice({ request, worker, market });

  assert.deepEqual(quote, repeat);
  assert.equal(quote.requestId, "request-1");
  assert.equal(quote.workerId, "worker-1");
  assert.equal(quote.currency, "USD");
  assert.equal(quote.minChargeApplied, false);
  assert.ok(quote.breakdown.adjustedHourlyRate > quote.breakdown.baseHourlyRate);
  assert.ok(quote.breakdown.platformFee > 0);
  assert.ok(quote.breakdown.riskReserve > 0);
  assert.ok(quote.total > quote.breakdown.subtotal);
});

test("flags quotes outside budget and currency mismatch", () => {
  const quote = calculateDynamicPrice({
    request: {
      ...request,
      budget: { ...request.budget, currency: currencyCode("EUR"), maxHourlyRate: 100 },
    },
    worker,
    market,
  });

  assert.equal(quote.currency, "USD");
  assert.equal(quote.withinBudget, false);
});

test("quoteMarketPrice returns mandated dynamic pricing outputs", () => {
  const quote = quoteMarketPrice({
    baseTaskRate: 100,
    urgencyMultiplier: 1.25,
    supplyDemandMultiplier: 1.1,
    skillScarcityMultiplier: 1.08,
    timeWindowMultiplier: 1.12,
    locationMultiplier: 1,
  });

  assert.ok(quote.suggestedPrice > 100);
  assert.ok(quote.minimumPrice < quote.suggestedPrice);
  assert.ok(quote.premiumPrice > quote.suggestedPrice);
  assert.equal(quote.marketPressure, "surge");
  assert.match(quote.explanation, /baseTaskRate/);
});
