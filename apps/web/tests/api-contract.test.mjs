import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { after, before, describe, test } from "node:test";

const port = 3025;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  await rm(".workmesh-dev", { recursive: true, force: true });
  server = spawn("node_modules/.bin/next", ["start", "-p", String(port)], {
    env: { ...process.env, NEXT_PUBLIC_DATA_MODE: "api" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForServer();
});

after(async () => {
  if (server) server.kill("SIGTERM");
  await rm(".workmesh-dev", { recursive: true, force: true });
});

describe("gig routes", () => {
  test("GET /api/gigs/search returns array and supports filters", async () => {
    const all = await api("/api/gigs/search");
    assert.equal(Array.isArray(all), true);
    assert.equal(all.length, 3);

    const filtered = await api("/api/gigs/search?category=events&minPay=200");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "event");

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
    assert.equal(typeof recommendations[0].matchScore.scoreBreakdown.skillFit, "number");
  });

  test("apply persists and duplicate apply is idempotent", async () => {
    let state = await api("/api/gigs/fixture/apply", { method: "POST" });
    assert.equal(state.gigs.find((gig) => gig.id === "fixture").status, "applied");

    state = await api("/api/gigs/fixture/apply", { method: "POST" });
    assert.equal(state.gigs.find((gig) => gig.id === "fixture").status, "applied");
  });

  test("claim success path and unavailable gig blocked", async () => {
    const state = await api("/api/gigs/dock/claim", { method: "POST" });
    assert.equal(state.gigs.find((gig) => gig.id === "dock").status, "claimed");

    const blocked = await raw("/api/gigs/dock/claim", { method: "POST" });
    assert.equal(blocked.status, 409);
  });

  test("PATCH /api/gigs/:id/status validates transitions", async () => {
    const invalid = await raw("/api/gigs/dock/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "nonsense" })
    });
    assert.equal(invalid.status, 400);

    const badTransition = await raw("/api/gigs/event/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" })
    });
    assert.equal(badTransition.status, 409);
  });
});

describe("message routes", () => {
  test("threads and messages load", async () => {
    const threads = await api("/api/messages/threads");
    assert.equal(threads[0].id, "thread_dock");

    const messages = await api("/api/messages/thread/thread_dock");
    assert.ok(messages.length >= 2);
    assert.match(messages[0].encryptedPayload, /^encrypted:/);
  });

  test("send persists encrypted payload and updates thread", async () => {
    const state = await api("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({
        threadId: "thread_dock",
        senderWallet: "0xK914...7F21",
        encryptedPayload: "encrypted:contract-test",
        attachmentRefs: ["local-attachment://mock"]
      })
    });
    assert.equal(state.messages.at(-1).encryptedPayload, "encrypted:contract-test");
    assert.equal(state.threads[0].lastMessagePreview, "encrypted:contract-test".slice(0, 28));
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
      body: JSON.stringify({ proofNote: "Contract proof note" })
    });
    assert.equal(completed.agreement.status, "completion_submitted");
    assert.ok(completed.agreement.proofNotes.includes("Contract proof note"));

    const status = await api("/api/agreements/agr_dock/status");
    assert.equal(status.status, "completion_submitted");
  });
});

describe("payment routes", () => {
  test("escrow, history, and gas estimate response shapes are valid", async () => {
    const escrow = await api("/api/payments/escrow/agr_dock");
    assert.equal(typeof escrow.grossAmount, "number");
    assert.equal(typeof escrow.platformFee, "number");
    assert.equal(typeof escrow.netPayout, "number");

    const history = await api("/api/payments/history/0xK914...7F21");
    assert.equal(Array.isArray(history), true);

    const gas = await api("/api/payments/gas-estimate");
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
    assert.equal(preview.handle, "Operator K-914");
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

describe("error handling", () => {
  test("malformed payloads and unsupported methods return errors", async () => {
    const malformed = await raw("/api/messages/send", { method: "POST", body: JSON.stringify({ threadId: "thread_dock" }) });
    assert.equal(malformed.status, 400);

    const unsupported = await raw("/api/gigs/search", { method: "PUT" });
    assert.ok([405, 404].includes(unsupported.status));
  });
});

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
  throw new Error(`Next server did not start.\n${stdout}\n${stderr}`);
}
