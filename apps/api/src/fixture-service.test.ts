import assert from "node:assert/strict";
import test from "node:test";
import { FixtureService } from "./fixture-service.js";

test("recommended gigs include mandated match score fields", () => {
  const service = new FixtureService();
  const [recommendation] = service.recommendedGigs("0xalice");

  assert.ok(recommendation);
  assert.equal(typeof recommendation.match.totalScore, "number");
  assert.equal(typeof recommendation.match.confidenceScore, "number");
  assert.ok(recommendation.match.explanation.includes("skill fit"));
  assert.ok(Array.isArray(recommendation.match.missingRequirements));
  assert.ok(Array.isArray(recommendation.match.suggestedActions));
});

test("pricing quote exposes fee transparency and dynamic market fields", () => {
  const service = new FixtureService();
  const quote = service.createPriceQuote({
    wallet: "0xalice",
    gigId: "gig-escrow-audit",
    timelineDays: 3
  });

  assert.equal(quote.buyerPays, quote.suggestedPrice);
  assert.equal(quote.workerReceives, quote.suggestedPrice - quote.platformFee);
  assert.ok(quote.estimatedGasFee > 0);
  assert.ok(["high", "surge"].includes(quote.marketPressure));
  assert.ok(quote.explanation.includes("Platform fee"));
  assert.equal(quote.settlementPolicy, "protected_required");
  assert.ok(quote.paymentRails.includes("stablecoin_escrow"));
  assert.ok(quote.protectedPaymentReason.length > 0);
});

test("gig index stores encrypted details and minimal public discovery metadata", () => {
  const service = new FixtureService();
  const [gig] = service.searchGigs({ q: "escrow" });

  assert.ok(gig.encryptedDetailsRef?.startsWith("ipfs://encrypted/"));
  assert.equal(gig.protectedPaymentRequired, true);
  assert.equal(gig.directSettlementEligible, false);
  assert.ok(gig.publicDiscoveryMetadata.some((item) => item.startsWith("budget_band:")));
  assert.ok(gig.allowedPaymentRails.includes("wallet_processor"));
});

test("message endpoint stores encrypted payloads only", () => {
  const service = new FixtureService();
  const { message } = service.sendMessage({
    fromWallet: "0xalice",
    toWallet: "0xcarol",
    body: "plaintext attempt"
  });

  assert.equal(message.plaintextRejected, true);
  assert.notEqual(message.encryptedPayload.ciphertext, "plaintext attempt");
  assert.equal(message.encryptedPayload.algorithm, "PLAINTEXT_REJECTED_SHA256_REDACTION");
});
