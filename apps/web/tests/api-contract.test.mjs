import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { after, before, describe, test } from "node:test";

const port = 3025;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  await rm(".relai-dev", { recursive: true, force: true });
  server = spawn("node_modules/.bin/next", ["start", "-p", String(port)], {
    env: { ...process.env, NEXT_PUBLIC_DATA_MODE: "api" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForServer();
});

after(async () => {
  if (server) server.kill("SIGTERM");
  await rm(".relai-dev", { recursive: true, force: true });
});

describe("auth and permissions", () => {
  test("wallet-linked session can be created, restored, and invalidated", async () => {
    const createdResponse = await raw("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ walletAddress: "0xK914...7F21", role: "contractor" })
    });
    assert.equal(createdResponse.status, 200);
    const cookie = createdResponse.headers.get("set-cookie");
    assert.match(cookie ?? "", /relai_session=/);
    const created = await createdResponse.json();
    assert.equal(created.walletAddress, "0xK914...7F21");
    assert.equal(created.role, "contractor");
    assert.equal(created.authMethod, "wallet_placeholder");

    const restored = await api("/api/auth/session", { headers: { cookie } });
    assert.equal(restored.walletAddress, "0xK914...7F21");
    assert.equal(restored.isDevelopmentFallback, false);

    const devices = await api("/api/auth/devices", { headers: { cookie } });
    assert.equal(devices.length >= 1, true);
    assert.equal(devices[0].walletAddress, "0xK914...7F21");
    assert.equal(typeof devices[0].deviceFingerprintHash, "string");

    const events = await api("/api/auth/security-events", { headers: { cookie } });
    assert.equal(events.some((event) => event.eventType === "login"), true);

    const revoked = await api("/api/auth/devices/" + devices[0].sessionId + "/revoke", { method: "POST", headers: { cookie } });
    assert.equal(revoked.revoked, true);

    const deleted = await raw("/api/auth/session", { method: "DELETE", headers: { cookie } });
    assert.equal(deleted.status, 200);
  });

  test("wallet spoofing and admin access are blocked", async () => {
    const spoofedApply = await raw("/api/gigs/fixture/apply", {
      method: "POST",
      body: JSON.stringify({ walletAddress: "0xOther" })
    });
    assert.equal(spoofedApply.status, 403);
    const spoofedBody = await spoofedApply.json();
    assert.equal(spoofedBody.code, "RESOURCE_NOT_OWNED");

    const foreignProfile = await raw("/api/profile/0xOther", { method: "PATCH", body: JSON.stringify({ handle: "bad_actor" }) });
    assert.equal(foreignProfile.status, 403);

    const foreignPayments = await raw("/api/payments/history/0xOther");
    assert.equal(foreignPayments.status, 403);

    const admin = await raw("/api/admin/revenue");
    assert.equal(admin.status, 403);
  });
});

describe("gig routes", () => {
  test("GET /api/gigs/search returns array and supports filters", async () => {
    const all = await api("/api/gigs/search");
    assert.equal(Array.isArray(all), true);
    assert.equal(all.length, 4);

    const filtered = await api("/api/gigs/search?category=events-staffing&minPay=200");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "event");

    const vertical = await api("/api/gigs/search?vertical=research-analysis-advisory&skill=Financial&locationMode=remote");
    assert.equal(vertical[0].id, "model");

    const empty = await api("/api/gigs/search?query=zzzz");
    assert.equal(empty.length, 0);
  });

  test("GET /api/gigs/:id handles valid and invalid ids", async () => {
    const gig = await api("/api/gigs/dock");
    assert.equal(gig.id, "dock");

    const missing = await raw("/api/gigs/nope");
    assert.equal(missing.status, 404);
  });

  test("GET /api/gigs/recommended/:walletAddress includes score breakdown", async () => {
    const recommendations = await api("/api/gigs/recommended/0xK914...7F21");
    assert.ok(recommendations[0].matchScore.totalScore > 0);
    assert.equal(typeof recommendations[0].matchScore.scoreBreakdown.verticalFit, "number");
    assert.equal(typeof recommendations[0].matchScore.scoreBreakdown.skillFit, "number");
    assert.equal(Array.isArray(recommendations[0].matchScore.whyMatched), true);
    assert.equal(Array.isArray(recommendations[0].matchScore.suggestedUnlockActions), true);
  });

  test("apply persists and duplicate apply is idempotent", async () => {
    let state = await api("/api/gigs/fixture/apply", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    let gig = state.gigs.find((item) => item.id === "fixture");
    assert.equal(gig.status, "applied");
    assert.equal(gig.applicantWallets.includes("0xK914...7F21"), true);

    state = await api("/api/gigs/fixture/apply", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    gig = state.gigs.find((item) => item.id === "fixture");
    assert.equal(gig.status, "applied");
    assert.equal(gig.applicantWallets.filter((wallet) => wallet === "0xK914...7F21").length, 1);
  });

  test("claim success path and unavailable gig blocked", async () => {
    const state = await api("/api/gigs/dock/claim", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    const gig = state.gigs.find((item) => item.id === "dock");
    assert.equal(gig.status, "claimed");
    assert.equal(gig.contractorWallet, "0xK914...7F21");

    const blocked = await raw("/api/gigs/dock/claim", { method: "POST", body: JSON.stringify({ walletAddress: "0xOther" }) });
    assert.equal(blocked.status, 403);
  });

  test("PATCH /api/gigs/:id/status validates transitions", async () => {
    const invalid = await raw("/api/gigs/dock/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "nonsense" })
    });
    assert.equal(invalid.status, 400);

    const appliedStart = await raw("/api/gigs/fixture/status", {
      method: "PATCH",
      body: JSON.stringify({ walletAddress: "0xK914...7F21", status: "in_progress" })
    });
    assert.equal(appliedStart.status, 409);

    const badTransition = await raw("/api/gigs/event/status", {
      method: "PATCH",
      body: JSON.stringify({ walletAddress: "0xK914...7F21", status: "completed" })
    });
    assert.equal(badTransition.status, 409);

    await api("/api/gigs/model/claim", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    let modelState = await api("/api/gigs/model/status", { method: "PATCH", body: JSON.stringify({ walletAddress: "0xK914...7F21", status: "in_progress" }) });
    assert.equal(modelState.gigs.find((gig) => gig.id === "model").status, "in_progress");
    modelState = await api("/api/gigs/model/status", { method: "PATCH", body: JSON.stringify({ walletAddress: "0xK914...7F21", status: "completed" }) });
    assert.equal(modelState.gigs.find((gig) => gig.id === "model").status, "completed");
  });
});

describe("message routes", () => {
  test("threads and messages load", async () => {
    const threads = await api("/api/messages/threads");
    assert.equal(threads[0].id, "thread_dock");

    const messages = await api("/api/messages/thread/thread_dock");
    assert.ok(messages.length >= 2);
    assert.match(messages[0].encryptedPayload, /^relai-envelope:/);
  });

  test("encrypted attachment metadata is authorized and envelope-only", async () => {
    const uploaded = await api("/api/attachments/metadata", {
      method: "POST",
      body: JSON.stringify({
        threadId: "thread_dock",
        encryptedFileRef: "encrypted-attachment://contract-test",
        encryptedMetadata: testEnvelope("attachment metadata"),
        mimeType: "text/plain",
        encryptedSize: 42
      })
    });
    assert.equal(uploaded.encryptedFileRef, "encrypted-attachment://contract-test");

    const invalid = await raw("/api/attachments/metadata", {
      method: "POST",
      body: JSON.stringify({ threadId: "thread_dock", encryptedFileRef: "https://public.example/file.txt", encryptedMetadata: "plaintext" })
    });
    assert.equal(invalid.status, 500);
  });

  test("send persists encrypted payload and updates thread", async () => {
    const state = await api("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({
        threadId: "thread_dock",
        senderWallet: "0xK914...7F21",
        encryptedPayload: testEnvelope("contract-test"),
        attachmentRefs: ["local-attachment://mock"]
      })
    });
    assert.match(state.messages.at(-1).encryptedPayload, /^relai-envelope:/);
    assert.equal(state.threads[0].lastMessagePreview, state.messages.at(-1).encryptedPayload.slice(0, 28));

    const plaintext = await raw("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({ threadId: "thread_dock", senderWallet: "0xK914...7F21", text: "do not store me", encryptedPayload: testEnvelope("ok") })
    });
    assert.equal(plaintext.status, 400);
  });

  test("read status persists", async () => {
    const state = await api("/api/messages/msg_employer_1/read", { method: "PATCH" });
    assert.equal(state.messages.find((message) => message.id === "msg_employer_1").status, "read");
  });
});

describe("agreement routes", () => {
  test("agreement loads and invalid lifecycle order is blocked", async () => {
    const agreement = await api("/api/agreements/agr_dock");
    assert.equal(agreement.id, "agr_dock");

    const blocked = await raw("/api/agreements/agr_dock/start", { method: "POST" });
    assert.equal(blocked.status, 409);
  });

  test("agreement lifecycle and proof persist", async () => {
    await api("/api/agreements/agr_dock/accept", { method: "POST" });
    await api("/api/agreements/agr_dock/arrival", { method: "POST" });
    await api("/api/agreements/agr_dock/start", { method: "POST" });
    const completed = await api("/api/agreements/agr_dock/complete", {
      method: "POST",
      body: JSON.stringify({ proofText: testEnvelope("Contract proof note") })
    });
    assert.equal(completed.agreement.status, "pending_employer_confirmation");
    assert.match(completed.agreement.proofNotes.at(-1), /^relai-envelope:/);
    assert.equal(completed.agreement.proofNotes.includes("Contract proof note"), false);
    assert.equal(completed.escrow.status, "pending_release");

    const status = await api("/api/agreements/agr_dock/status");
    assert.equal(status.status, "pending_employer_confirmation");

    const approved = await api("/api/agreements/agr_dock/approve", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    assert.equal(approved.agreement.status, "approved");
    assert.equal(approved.escrow.status, "released");
  });
});

describe("payment routes", () => {
  test("escrow, history, and gas estimate response shapes are valid", async () => {
    const escrow = await api("/api/payments/escrow/agr_dock");
    assert.equal(typeof escrow.grossAmount, "number");
    assert.equal(typeof escrow.platformFee, "number");
    assert.equal(typeof escrow.netPayout, "number");
    assert.equal(escrow.engagementStructure, "day_rate");
    assert.equal(escrow.platformFee, Math.round(escrow.grossAmount * 0.082 * 100) / 100);

    const history = await api("/api/payments/history/0xK914...7F21");
    assert.equal(Array.isArray(history), true);

    const gas = await api("/api/payments/gas-estimate?chainId=31337&amount=148");
    assert.equal(typeof gas.gasEstimate, "number");
  });
});

describe("notification routes", () => {
  test("create, read one, and read all persist", async () => {
    const created = await api("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ type: "gig_matched", title: "Contract test note", body: "Testing", target: "#mobile-gigs" })
    });
    const note = created.notifications[0];
    assert.equal(note.read, false);

    const oneRead = await api(`/api/notifications/${note.id}/read`, { method: "PATCH" });
    assert.equal(oneRead.notifications.find((item) => item.id === note.id).read, true);

    const allRead = await api("/api/notifications/read-all", { method: "PATCH" });
    assert.equal(allRead.notifications.every((item) => item.read), true);
  });
});

describe("profile routes", () => {
  test("profile loads, patches, and public preview respects privacy settings", async () => {
    const profile = await api("/api/profile/0xK914...7F21");
    assert.equal(profile.encryptedPrivateBlobRef.startsWith("local-encrypted-profile://"), true);

    const patched = await api("/api/profile/0xK914...7F21", {
      method: "PATCH",
      body: JSON.stringify({ encryptedPrivateBlobRef: "local-encrypted-profile://updated" })
    });
    assert.equal(patched.profile.encryptedPrivateBlobRef, "local-encrypted-profile://updated");

    const preview = await api("/api/profile/0xK914...7F21/public-preview");
    assert.equal(preview.handle, "K-914");
    assert.equal(preview.sensitiveFields.phone, false);

    const privatePreviewState = await api("/api/profile/0xK914...7F21", {
      method: "PATCH",
      body: JSON.stringify({ profileVisibility: { showRegion: false, showSkills: false } })
    });
    assert.equal(privatePreviewState.profile.profileVisibility.showRegion, false);

    const privatePreview = await api("/api/profile/0xK914...7F21/public-preview");
    assert.equal(privatePreview.region, "Approximate region hidden");
    assert.deepEqual(privatePreview.skills, []);
  });

  test("profile creation validates onboarding requirements", async () => {
    const invalid = await raw("/api/profile", {
      method: "POST",
      body: JSON.stringify({ walletAddress: "0xK914...7F21", handle: "x", skills: [] })
    });
    assert.equal(invalid.status, 400);

    const created = await api("/api/profile", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: "0xK914...7F21",
        handle: "relai_operator",
        verticals: ["research-analysis-advisory", "custom"],
        skills: ["Financial modeling", "Custom diligence"],
        engagementPreferences: [{ structure: "flat_fee", ratePreview: "$5k-$8k/project", visibility: "after_application" }, { structure: "open_proposal", ratePreview: "Negotiable", visibility: "public" }],
        customSkills: ["Custom diligence"],
        useCasePreferences: ["Financial analysis"],
        categories: ["research-analysis-advisory", "custom"],
        serviceCategories: ["research-analysis-advisory", "custom"],
        certifications: [],
        licenses: [],
        region: { country: "US", state: "NY", city: "Brooklyn", metro: "NYC-02", serviceRadiusMiles: 8, locationMode: "hybrid", preciseLocationShared: false },
        workPreference: "hybrid",
        profileVisibility: { showHandle: true, showSkills: true, showRegion: true, showRating: true, showAvailability: true, showExactLocation: false, showRealName: false, showPhone: false, showEmail: false, requireConfirmationBeforeDisclosure: true },
        onboardingCompleted: true
      })
    });
    assert.equal(created.profile.handle, "relai_operator");
    assert.deepEqual(created.profile.verticals, ["research-analysis-advisory", "custom"]);
    assert.deepEqual(created.profile.customSkills, ["Custom diligence"]);
    assert.deepEqual(created.profile.useCasePreferences, ["Financial analysis"]);
    assert.equal(created.profile.engagementPreferences[0].structure, "flat_fee");
    assert.equal(created.profile.onboardingCompleted, true);
    assert.equal(created.profile.region.metro, "NYC-02");

    const createdPreview = await api("/api/profile/0xK914...7F21/public-preview");
    assert.deepEqual(createdPreview.verticals, ["research-analysis-advisory", "custom"]);
    assert.deepEqual(createdPreview.customSkills, ["Custom diligence"]);
  });

  test("disclosures persist and audit log records fields", async () => {
    const state = await api("/api/profile/0xK914...7F21/disclosures", {
      method: "POST",
      body: JSON.stringify({
        disclosedFields: ["phone"],
        enabled: true,
        recipientWallet: "0xHarbor...9910",
        purpose: "contract test"
      })
    });
    assert.equal(state.profile.privacySettings.phone, true);
    assert.equal(state.disclosureAudit[0].disclosedFields[0], "phone");

    const audit = await api("/api/profile/0xK914...7F21/disclosures");
    assert.equal(Array.isArray(audit), true);
    assert.equal(audit[0].disclosedFields[0], "phone");
  });
});

describe("private beta validation", () => {
  test("invite status, acceptance, feedback, and minimal analytics work", async () => {
    const invite = await api("/api/beta/invites/RELAI-BETA");
    assert.equal(invite.status, "active");
    assert.equal(invite.intentionalGrowth, true);

    const accepted = await api("/api/beta/invites/accept", { method: "POST", body: JSON.stringify({ inviteCode: "RELAI-BETA", walletAddress: "0xK914...7F21" }) });
    assert.equal(accepted.betaInvites[0].acceptedBy.includes("0xK914...7F21"), true);

    const feedback = await api("/api/beta/feedback", { method: "POST", body: JSON.stringify({ category: "onboarding", context: "first_run", rating: 4, feedback: "Clearer next action helped." }) });
    assert.equal(feedback.betaFeedback[0].category, "onboarding");

    const tracked = await api("/api/beta/analytics", { method: "POST", body: JSON.stringify({ eventName: "engagement_structure_selected", operationalFocus: "research-analysis-advisory" }) });
    assert.equal(tracked.betaAnalyticsEvents[0].operationalFocus, "research-analysis-advisory");

    const adminCookie = await sessionCookie("0xAdmin...0001", "admin");
    const summary = await api("/api/admin/analytics", { headers: { cookie: adminCookie } });
    assert.equal(summary.byEvent.engagement_structure_selected >= 1, true);
    assert.equal(summary.retention.includes("no message plaintext"), true);
  });
});

describe("trust and resilience hardening", () => {
  test("trust summary, private endorsement, and portable export avoid public graph exposure", async () => {
    const summary = await api("/api/trust/summary/0xK914...7F21");
    assert.equal(summary.relationshipGraph, "hidden");
    assert.equal(typeof summary.trustScore, "number");

    const endorsed = await api("/api/trust/endorsements", {
      method: "POST",
      body: JSON.stringify({ toWallet: "0xK914...7F21", agreementId: "agr_dock", encryptedNoteRef: testEnvelope("private endorsement") })
    });
    assert.equal(endorsed.trustEndorsements[0].visibility, "private");

    const exported = await api("/api/trust/export/0xK914...7F21", { method: "POST", body: JSON.stringify({ scope: "summary_only" }) });
    assert.match(exported.encryptedExportRef, /^relai-envelope:/);
    assert.equal(exported.signedSummary.counterpartiesIncluded, false);
    assert.equal(exported.signedSummary.fullHistoryIncluded, false);
  });

  test("reports are encrypted and admin visibility is limited", async () => {
    const report = await api("/api/reports", {
      method: "POST",
      body: JSON.stringify({ targetWallet: "0xHarbor...9910", agreementId: "agr_dock", category: "suspicious_payment", encryptedReportRef: testEnvelope("report details") })
    });
    assert.equal(report.moderationReports[0].limitedVisibility, true);

    const adminCookie = await sessionCookie("0xAdmin...0001", "admin");
    const reports = await api("/api/admin/reports", { headers: { cookie: adminCookie } });
    assert.equal(reports[0].limitedVisibility, true);
    assert.equal(reports[0].encryptedReportRef, undefined);
    assert.equal(reports[0].encryptedReportAvailable, true);
  });

  test("temporary disclosures and account freeze are explicit", async () => {
    const disclosure = await api("/api/profile/0xK914...7F21/disclosures", {
      method: "POST",
      body: JSON.stringify({ disclosedFields: ["preciseLocation"], enabled: true, temporary: true, agreementId: "agr_dock" })
    });
    assert.equal(disclosure.disclosureAudit[0].disclosedFields[0], "preciseLocation");
    assert.ok(disclosure.disclosureAudit[0].revokedAt);

    const frozen = await api("/api/account/freeze", { method: "POST", body: JSON.stringify({ reason: "Lost device" }) });
    assert.equal(frozen.accountSecurity[0].frozen, true);

    const security = await api("/api/account/security");
    assert.equal(security.frozen, true);
    assert.ok(security.recoveryDelayUntil);
  });
});

describe("security baseline", () => {
  test("login endpoint rate limits repeated failures", async () => {
    let limited = false;
    for (let index = 0; index < 10; index += 1) {
      const response = await raw("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "missing_user", password: "wrong-password" }) });
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    assert.equal(limited, true);
  });
});

describe("error handling", () => {
  test("malformed payloads and unsupported methods return errors", async () => {
    const malformed = await raw("/api/messages/send", { method: "POST", body: JSON.stringify({ threadId: "thread_dock" }) });
    assert.equal(malformed.status, 400);

    const unsupported = await raw("/api/gigs/search", { method: "PUT" });
    assert.ok([405, 404].includes(unsupported.status));
  });
});

describe("employer routes", () => {
  test("employer profile and gig lifecycle persist with ownership enforcement", async () => {
    const contractorBlocked = await raw("/api/employer/profile");
    assert.equal(contractorBlocked.status, 403);

    const employerCookie = await sessionCookie("0xHarbor...9910", "employer");
    const foreignEmployerCookie = await sessionCookie("0xOtherEmployer", "employer");

    const profileState = await api("/api/employer/profile", {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ employerHandle: "harbor_ops", organizationName: "Harbor Ops", employerType: "local_smb", region: "NYC-03" })
    });
    assert.equal(profileState.employerProfiles.find((item) => item.walletAddress === "0xHarbor...9910").organizationName, "Harbor Ops");

    const created = await api("/api/employer/gigs", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ id: "employer_test", title: "Private inventory audit", category: "logistics-transport", vertical: "logistics-transport", requiredSkills: ["Inventory movement", "Coordination"], compensation: 180, engagementStructure: "hourly", rateAmount: 60, estimatedHours: 3, estimatedDuration: "several_days", proposalNotes: "Scope can be finalized in agreement.", urgency: "priority", encryptedJobDetailsRef: "encrypted-job://employer-test" })
    });
    const createdGig = created.gigs.find((item) => item.id === "employer_test");
    assert.equal(createdGig.employerWallet, "0xHarbor...9910");
    assert.equal(createdGig.encryptedDetailsRef, "encrypted-job://employer-test");
    assert.equal(createdGig.dynamicPricingQuote.estimatedPlatformFee > 0, true);
    assert.equal(createdGig.engagementStructure, "hourly");
    assert.equal(createdGig.pay, 180);

    const foreignEdit = await raw("/api/employer/gigs/employer_test", {
      method: "PATCH",
      headers: { cookie: foreignEmployerCookie },
      body: JSON.stringify({ title: "stolen edit" })
    });
    assert.equal(foreignEdit.status, 403);

    const updated = await api("/api/employer/gigs/employer_test", {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ compensation: 210, requiredSkills: ["Inventory movement", "Coordination", "Photo proof"] })
    });
    assert.equal(updated.gigs.find((item) => item.id === "employer_test").pay, 210);
  });

  test("employer applicant and agreement actions are protected", async () => {
    const employerCookie = await sessionCookie("0xHarbor...9910", "employer");
    const foreignEmployerCookie = await sessionCookie("0xOtherEmployer", "employer");
    await api("/api/gigs/employer_test/apply", { method: "POST", body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });

    const applicants = await api("/api/employer/gigs/employer_test/applicants", { headers: { cookie: employerCookie } });
    assert.equal(applicants[0].walletAddress, "0xK914...7F21");
    assert.equal(applicants[0].handle, "relai_operator");

    const applicantPath = "/api/employer/gigs/employer_test/applicants/" + encodeURIComponent("0xK914...7F21") + "/accept";
    const accepted = await api(applicantPath, { method: "POST", headers: { cookie: employerCookie } });
    assert.equal(accepted.agreement.gigId, "employer_test");
    assert.equal(accepted.agreement.employerWallet, "0xHarbor...9910");
    assert.equal(accepted.agreement.engagementStructure, "hourly");
    assert.equal(accepted.agreement.paymentSchedule, "Single protected settlement");

    await api("/api/employer/agreements/" + accepted.agreement.id + "/approve", { method: "POST", headers: { cookie: employerCookie } });

    const intent = await api("/api/payments/escrow/" + accepted.agreement.id + "/funding-intent", { method: "POST", headers: { cookie: employerCookie } });
    assert.equal(intent.agreementId, accepted.agreement.id);
    assert.equal(intent.chainId, 84532);
    assert.match(intent.contractAddress, /^0x[0-9a-fA-F]{40}$/);

    const foreignIntent = await raw("/api/payments/escrow/" + accepted.agreement.id + "/funding-intent", { method: "POST", headers: { cookie: foreignEmployerCookie } });
    assert.equal(foreignIntent.status, 403);

    const submitted = await api("/api/payments/escrow/" + accepted.agreement.id + "/tx-submitted", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ txHash: "0x" + "a".repeat(64), walletAddress: "0xHarbor...9910", chainId: 84532 })
    });
    assert.equal(submitted.escrow.status, "pending_funding_tx");
    assert.equal(submitted.escrow.txHash, "0x" + "a".repeat(64));

    const spoofedSubmission = await raw("/api/payments/escrow/" + accepted.agreement.id + "/tx-submitted", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ txHash: "0x" + "b".repeat(64), walletAddress: "0xOther", chainId: 84532 })
    });
    assert.equal(spoofedSubmission.status, 403);

    const funded = await api("/api/employer/agreements/" + accepted.agreement.id + "/fund", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ grossAmount: 210 })
    });
    assert.equal(funded.agreement.status, "funded");
    assert.equal(funded.escrow.status, "funded");

    const foreignAgreement = await raw("/api/employer/agreements/" + accepted.agreement.id + "/fund", { method: "POST", headers: { cookie: foreignEmployerCookie } });
    assert.equal(foreignAgreement.status, 403);

    await api("/api/agreements/" + accepted.agreement.id + "/arrival", { method: "POST" });
    await api("/api/agreements/" + accepted.agreement.id + "/start", { method: "POST" });
    await api("/api/agreements/" + accepted.agreement.id + "/complete", { method: "POST", body: JSON.stringify({ proofText: testEnvelope("Employer workflow proof") }) });

    const revision = await api("/api/employer/agreements/" + accepted.agreement.id + "/request-revision", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ note: testEnvelope("Please add a timestamped photo.") })
    });
    assert.equal(revision.agreement.status, "revision_requested");

    const disputed = await api("/api/employer/agreements/" + accepted.agreement.id + "/dispute", { method: "POST", headers: { cookie: employerCookie } });
    assert.equal(disputed.agreement.status, "disputed");
    assert.equal(disputed.escrow.status, "disputed");
  });
});

describe("multi-contributor engagement routes", () => {
  test("employer can manage a simple engagement team and contributor sees only own assignment", async () => {
    const employerCookie = await sessionCookie("0xHarbor...9910", "employer");
    const foreignEmployerCookie = await sessionCookie("0xOtherEmployer", "employer");
    const contributorCookie = await sessionCookie("0xK914...7F21", "contractor");
    const otherContributorCookie = await sessionCookie("0xOtherContributor", "contractor");

    await api("/api/employer/gigs", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ id: "team_test", title: "Field reporting assignment", category: "writing-reporting", vertical: "writing-reporting", requiredSkills: ["Reporting", "Translation"], compensation: 900, engagementStructure: "day_rate", encryptedJobDetailsRef: "encrypted-job://team-test" })
    });
    await api("/api/gigs/team_test/apply", { method: "POST", headers: { cookie: contributorCookie }, body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });

    const acceptedPath = "/api/employer/gigs/team_test/applicants/" + encodeURIComponent("0xK914...7F21") + "/accept";
    await api(acceptedPath, { method: "POST", headers: { cookie: employerCookie } });

    const added = await api("/api/employer/engagements/team_test/team/add", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ contributorWallet: "0xLocalFixer...2244", assignedRole: "Local Fixer" })
    });
    const roster = added.engagementContributors.filter((item) => item.engagementId === "team_test" && item.status !== "removed");
    assert.equal(roster.length, 2);
    assert.equal(roster.some((item) => item.assignedRole === "Local Fixer"), true);

    const team = await api("/api/employer/engagements/team_test/team", { headers: { cookie: employerCookie } });
    assert.equal(team.teamSize, 2);
    assert.equal(team.acceptedCount, 2);

    const contributorEntry = team.contributors.find((item) => item.contributorWallet === "0xK914...7F21");
    const patched = await api("/api/employer/engagements/team_test/team/" + contributorEntry.id, {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ assignedRole: "Reporter" })
    });
    assert.equal(patched.engagementContributors.find((item) => item.id === contributorEntry.id).assignedRole, "Reporter");

    const foreignRoster = await raw("/api/employer/engagements/team_test/team", { headers: { cookie: foreignEmployerCookie } });
    assert.equal(foreignRoster.status, 403);

    const assignments = await api("/api/contributor/engagements", { headers: { cookie: contributorCookie } });
    const assignment = assignments.find((item) => item.engagement.id === "team_test");
    assert.equal(assignment.assignment.assignedRole, "Reporter");
    assert.equal(assignment.visibility.teamRosterVisible, false);
    assert.equal(assignment.engagement.teamSize, 2);
    assert.equal(assignment.team, undefined);

    const unrelated = await raw("/api/contributor/engagements/team_test", { headers: { cookie: otherContributorCookie } });
    assert.equal(unrelated.status, 403);

    const extra = team.contributors.find((item) => item.contributorWallet === "0xLocalFixer...2244");
    const removed = await api("/api/employer/engagements/team_test/team/" + extra.id, { method: "DELETE", headers: { cookie: employerCookie } });
    assert.equal(removed.engagementContributors.find((item) => item.id === extra.id).status, "removed");
  });
});

describe("secure group coordination rooms", () => {
  test("engagement room is scoped, encrypted, synced, and contributor-safe", async () => {
    const employerCookie = await sessionCookie("0xHarbor...9910", "employer");
    const contributorCookie = await sessionCookie("0xK914...7F21", "contractor");
    const secondContributorCookie = await sessionCookie("0xLocalFixer...2244", "contractor");
    const outsiderCookie = await sessionCookie("0xOutsider...9999", "contractor");

    await api("/api/employer/gigs", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ id: "room_test", title: "Documentary field crew", category: "media-production", vertical: "media-production", requiredSkills: ["Videography", "Local coordination"], compensation: 1200, engagementStructure: "day_rate", encryptedJobDetailsRef: "encrypted-job://room-test" })
    });
    await api("/api/gigs/room_test/apply", { method: "POST", headers: { cookie: contributorCookie }, body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    await api("/api/employer/gigs/room_test/applicants/" + encodeURIComponent("0xK914...7F21") + "/accept", { method: "POST", headers: { cookie: employerCookie } });
    await api("/api/employer/engagements/room_test/team/add", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ contributorWallet: "0xLocalFixer...2244", assignedRole: "Local Fixer" })
    });

    const createdRoom = await api("/api/engagements/room_test/room", { method: "POST", headers: { cookie: employerCookie } });
    assert.equal(createdRoom.room.engagementId, "room_test");
    const roomId = createdRoom.room.id;

    const contributorRoom = await api("/api/engagements/room_test/room", { headers: { cookie: contributorCookie } });
    assert.equal(contributorRoom.id, roomId);

    const outsiderRoom = await raw("/api/engagements/room_test/room", { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderRoom.status, 403);

    let roster = await api("/api/rooms/" + roomId + "/participants", { headers: { cookie: employerCookie } });
    assert.equal(roster.activeCount, 3);
    assert.equal(roster.contributorCount, 2);
    assert.equal(roster.participants.some((item) => item.assignedRole === "Local Fixer"), true);

    const teamForRole = await api("/api/employer/engagements/room_test/team", { headers: { cookie: employerCookie } });
    const firstContributor = teamForRole.contributors.find((item) => item.contributorWallet === "0xK914...7F21");
    await api("/api/employer/engagements/room_test/team/" + firstContributor.id, {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ assignedRole: "Videographer" })
    });
    await api("/api/rooms/" + roomId + "/sync-participants", { method: "POST", headers: { cookie: employerCookie } });
    roster = await api("/api/rooms/" + roomId + "/participants", { headers: { cookie: contributorCookie } });
    assert.equal(roster.participants.some((item) => item.assignedRole === "Videographer"), true);
    assert.equal(roster.participants.some((item) => item.handle.includes("@")), false);

    const employerMessage = await api("/api/rooms/" + roomId + "/messages", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ encryptedPayload: testEnvelope("room employer update") })
    });
    assert.match(employerMessage.message.encryptedPayload, /^relai-envelope:/);
    assert.equal(employerMessage.message.senderRole, "Hiring lead");

    const plaintext = await raw("/api/rooms/" + roomId + "/messages", {
      method: "POST",
      headers: { cookie: contributorCookie },
      body: JSON.stringify({ text: "do not store me", encryptedPayload: testEnvelope("ok") })
    });
    assert.equal(plaintext.status, 400);

    await api("/api/rooms/" + roomId + "/messages", {
      method: "POST",
      headers: { cookie: contributorCookie },
      body: JSON.stringify({ encryptedPayload: testEnvelope("room contributor reply") })
    });
    const messages = await api("/api/rooms/" + roomId + "/messages", { headers: { cookie: contributorCookie } });
    assert.equal(messages.length >= 2, true);
    assert.equal(messages.some((message) => message.encryptedPayload === "room contributor reply"), false);

    const read = await api("/api/rooms/" + roomId + "/read", { method: "PATCH", headers: { cookie: contributorCookie } });
    assert.equal(read.coordinationRoomParticipants.some((item) => item.roomId === roomId && item.walletAddress === "0xK914...7F21" && item.lastReadAt), true);

    const team = await api("/api/employer/engagements/room_test/team", { headers: { cookie: employerCookie } });
    const second = team.contributors.find((item) => item.contributorWallet === "0xLocalFixer...2244");
    await api("/api/employer/engagements/room_test/team/" + second.id, { method: "DELETE", headers: { cookie: employerCookie } });
    const removedAccess = await raw("/api/rooms/" + roomId + "/messages", { headers: { cookie: secondContributorCookie } });
    assert.equal(removedAccess.status, 403);
  });
});

describe("visibility and compartmentalization controls", () => {
  test("visibility modes shape contributor rosters and engagement-scoped DMs", async () => {
    const employerCookie = await sessionCookie("0xHarbor...9910", "employer");
    const contributorCookie = await sessionCookie("0xK914...7F21", "contractor");

    await api("/api/employer/gigs", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ id: "visibility_test", title: "Sensitive research pod", category: "research-analysis-advisory", vertical: "research-analysis-advisory", requiredSkills: ["Research", "Translation"], compensation: 700, engagementStructure: "flat_fee", encryptedJobDetailsRef: "encrypted-job://visibility-test" })
    });
    await api("/api/gigs/visibility_test/apply", { method: "POST", headers: { cookie: contributorCookie }, body: JSON.stringify({ walletAddress: "0xK914...7F21" }) });
    await api("/api/employer/gigs/visibility_test/applicants/" + encodeURIComponent("0xK914...7F21") + "/accept", { method: "POST", headers: { cookie: employerCookie } });
    await api("/api/employer/engagements/visibility_test/team/add", {
      method: "POST",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ contributorWallet: "0xTranslator...5511", assignedRole: "Translator" })
    });

    const roomResult = await api("/api/engagements/visibility_test/room", { method: "POST", headers: { cookie: employerCookie } });
    const roomId = roomResult.room.id;

    let contributorRoster = await api("/api/rooms/" + roomId + "/participants", { headers: { cookie: contributorCookie } });
    assert.equal(contributorRoster.visibilityMode, "compartmentalized");
    assert.equal(contributorRoster.participants.some((item) => item.assignedRole === "Translator"), false);
    assert.equal(contributorRoster.dmEnabled, false);

    const dmBlocked = await raw("/api/engagements/visibility_test/dms/" + encodeURIComponent("0xTranslator...5511"), {
      method: "POST",
      headers: { cookie: contributorCookie },
      body: JSON.stringify({ encryptedPayload: testEnvelope("blocked dm") })
    });
    assert.equal(dmBlocked.status, 403);

    await api("/api/employer/engagements/visibility_test/visibility", {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ visibilityMode: "operational_team" })
    });
    contributorRoster = await api("/api/rooms/" + roomId + "/participants", { headers: { cookie: contributorCookie } });
    assert.equal(contributorRoster.visibilityMode, "operational_team");
    assert.equal(contributorRoster.participants.some((item) => item.assignedRole === "Translator"), true);
    assert.equal(contributorRoster.participants.every((item) => item.dmPermission !== "engagement_dm_enabled"), true);

    await api("/api/employer/engagements/visibility_test/visibility", {
      method: "PATCH",
      headers: { cookie: employerCookie },
      body: JSON.stringify({ visibilityMode: "full_collaboration" })
    });
    contributorRoster = await api("/api/rooms/" + roomId + "/participants", { headers: { cookie: contributorCookie } });
    assert.equal(contributorRoster.visibilityMode, "full_collaboration");
    assert.equal(contributorRoster.dmEnabled, true);
    assert.equal(contributorRoster.participants.some((item) => item.dmPermission === "engagement_dm_enabled"), true);

    const dm = await api("/api/engagements/visibility_test/dms/" + encodeURIComponent("0xTranslator...5511"), {
      method: "POST",
      headers: { cookie: contributorCookie },
      body: JSON.stringify({ encryptedPayload: testEnvelope("allowed dm") })
    });
    assert.equal(dm.room.roomType, "engagement_dm");
    assert.match(dm.message.encryptedPayload, /^relai-envelope:/);
  });
});


async function sessionCookie(walletAddress, role) {
  const response = await raw("/api/auth/session", { method: "POST", body: JSON.stringify({ walletAddress, role }) });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie");
}

async function api(path, init) {
  const response = await raw(path, init);
  const text = await response.text();
  assert.ok(response.ok, `${path} returned ${response.status}: ${text}`);
  return JSON.parse(text);
}

function raw(path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {})
    }
  });
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/contractor/state`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const stdout = server.stdout.read()?.toString() ?? "";
  const stderr = server.stderr.read()?.toString() ?? "";
  throw new Error(`Next server did not start.
${stdout}
${stderr}`);
}


function testEnvelope(label) {
  const envelope = {
    version: 1,
    algorithm: "AES-256-GCM",
    keyId: "api-contract-test",
    nonce: Buffer.from("test-nonce-12").toString("base64url"),
    ciphertext: Buffer.from(label).toString("base64url"),
    createdAt: new Date().toISOString()
  };
  return "relai-envelope:" + Buffer.from(JSON.stringify(envelope)).toString("base64url");
}
