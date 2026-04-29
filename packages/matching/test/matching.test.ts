import assert from "node:assert/strict";
import test from "node:test";

import {
  currencyCode,
  isoDateTime,
  skillTag,
  workMeshId,
  type WorkRequest,
  type WorkerProfile,
} from "@workmesh/types";

import { calculateRequiredMatchScore, rankCandidates, scoreCandidate } from "../src/index.js";

const request: WorkRequest = {
  id: workMeshId("request-1"),
  clientId: workMeshId("client-1"),
  title: "Build worker matching service",
  requiredSkills: [skillTag("typescript"), skillTag("search")],
  optionalSkills: [skillTag("crypto")],
  locationMode: "remote",
  timing: { urgency: "high" },
  budget: {
    currency: currencyCode("USD"),
    maxHourlyRate: 140,
    targetHours: 20,
  },
  complexity: "complex",
  createdAt: isoDateTime("2026-04-01T00:00:00.000Z"),
};

function worker(overrides: Partial<WorkerProfile>): WorkerProfile {
  return {
    id: workMeshId("worker-a"),
    displayName: "Ada",
    skills: [skillTag("typescript"), skillTag("search"), skillTag("crypto")],
    domains: ["marketplaces"],
    languages: ["en"],
    location: { country: "US", timeZone: "America/New_York" },
    workModes: ["remote"],
    availability: { status: "available", weeklyHours: 32 },
    rateCard: { currency: currencyCode("USD"), hourlyRate: 120 },
    reputation: {
      completedJobs: 48,
      averageRating: 4.9,
      responseRate: 0.96,
      disputeRate: 0.01,
      onTimeRate: 0.94,
    },
    verification: { identity: "verified" },
    updatedAt: isoDateTime("2026-04-20T00:00:00.000Z"),
    ...overrides,
  };
}

test("scores a complete candidate with required audit outputs", () => {
  const result = scoreCandidate({
    request,
    worker: worker({}),
    now: "2026-04-28T00:00:00.000Z",
  });

  assert.equal(result.requestId, "request-1");
  assert.equal(result.workerId, "worker-a");
  assert.equal(result.rank, null);
  assert.equal(result.eligible, true);
  assert.equal(result.missingRequiredSkills.length, 0);
  assert.equal(result.matchedRequiredSkills.length, 2);
  assert.ok(result.score > 80);
  assert.ok(result.normalizedScore <= 1);
});

test("marks missing required skills as ineligible", () => {
  const result = scoreCandidate({
    request,
    worker: worker({ skills: [skillTag("typescript")] }),
    now: "2026-04-28T00:00:00.000Z",
  });

  assert.equal(result.eligible, false);
  assert.equal(result.decision, "ineligible");
  assert.equal(result.score, 0);
  assert.deepEqual(result.missingRequiredSkills, [skillTag("search")]);
});

test("ranks deterministically with worker id tie-breaker", () => {
  const ranked = rankCandidates({
    request,
    now: "2026-04-28T00:00:00.000Z",
    workers: [
      worker({ id: workMeshId("worker-b") }),
      worker({ id: workMeshId("worker-a") }),
    ],
  });

  assert.equal(ranked[0]?.workerId, "worker-a");
  assert.equal(ranked[0]?.rank, 1);
  assert.equal(ranked[1]?.rank, 2);
});

test("calculateRequiredMatchScore returns mandated WorkMesh score fields", () => {
  const result = calculateRequiredMatchScore({
    signals: {
      skillFitWeight: 27,
      proximityWeight: 10,
      tierEligibilityWeight: 12,
      ratingWeight: 11,
      availabilityWeight: 9,
      completionHistoryWeight: 8,
      priceFitWeight: 7,
      responseWeight: 5,
    },
  });

  assert.equal(result.totalScore, 89);
  assert.equal(result.missingRequirements.length, 0);
  assert.ok(result.confidenceScore > 0.7);
  assert.match(result.explanation, /matchScore = skillFitWeight/);
});
