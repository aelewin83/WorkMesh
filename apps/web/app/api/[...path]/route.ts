import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import type {
  AgreementDto,
  ContractorCommandApiStateDto,
  ContractorDisclosureField,
  ContractorGigDto,
  ContractorGigStatus,
  ContractorNotificationType,
  ContractorProfileDto,
  DisclosureAuditDto,
  MessageDto,
  MessageThreadDto,
  NotificationDto,
  PaymentEscrowDto,
  PayoutHistoryDto,
  RecommendedGigDto
} from "@/lib/contractor-dtos";

export const dynamic = "force-dynamic";

type Db = ContractorCommandApiStateDto;
type Params = { params: { path: string[] } };
class RouteError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const wallet = "0xK914...7F21";
const employerWallet = "0xHarbor...9910";
const dbPath = path.join(process.cwd(), ".workmesh-dev", "contractor-db.json");
const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export async function GET(request: NextRequest, context: Params) {
  return handle(request, context, "GET");
}

export async function POST(request: NextRequest, context: Params) {
  return handle(request, context, "POST");
}

export async function PATCH(request: NextRequest, context: Params) {
  return handle(request, context, "PATCH");
}

async function handle(request: NextRequest, { params }: Params, method: "GET" | "POST" | "PATCH") {
  try {
    const db = await readDb();
    const parts = params.path ?? [];
    const body = method === "GET" ? {} : await safeJson(request);
    const url = new URL(request.url);

    if (method === "GET" && route(parts, "contractor", "state")) {
      return json(db);
    }

    if (method === "GET" && route(parts, "gigs", "search")) {
      const filtered = filterGigs(db.gigs, url.searchParams);
      return json(filtered);
    }

    if (method === "GET" && parts[0] === "gigs" && parts[1] && parts.length === 2) {
      return json(requireGig(db, parts[1]));
    }

    if (method === "GET" && route(parts, "gigs", "recommended") && parts[2]) {
      return json(scoreGigs(db, parts[2]));
    }

    if (method === "POST" && parts[0] === "gigs" && parts[1] && parts[2] === "apply") {
      return json(await persist(updateGigStatus(db, parts[1], "applied")));
    }

    if (method === "POST" && parts[0] === "gigs" && parts[1] && parts[2] === "claim") {
      return json(await persist(updateGigStatus(db, parts[1], "claimed")));
    }

    if (method === "PATCH" && parts[0] === "gigs" && parts[1] && parts[2] === "status") {
      return json(await persist(updateGigStatus(db, parts[1], stringBody(body.status, "status") as ContractorGigStatus)));
    }

    if (method === "GET" && route(parts, "messages", "threads")) {
      return json(db.threads);
    }

    if (method === "GET" && route(parts, "messages", "thread") && parts[2]) {
      return json(db.messages.filter((message) => message.threadId === parts[2]));
    }

    if (method === "POST" && route(parts, "messages", "send")) {
      const threadId = stringBody(body.threadId, "threadId");
      const encryptedPayload = stringBody(body.encryptedPayload, "encryptedPayload");
      const message: MessageDto = {
        id: newId("msg"),
        threadId,
        senderWallet: stringBody(body.senderWallet, "senderWallet"),
        encryptedPayload,
        attachmentRefs: Array.isArray(body.attachmentRefs) ? body.attachmentRefs.map(String) : [],
        status: "delivered",
        createdAt: now()
      };
      db.messages.push(message);
      upsertThreadPreview(db, threadId, encryptedPayload);
      db.notifications.unshift(makeNotification("message_received", "Message delivered", "Encrypted reply delivered.", "message", message.id, "#mobile-chat", true));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "messages" && parts[1] && parts[2] === "read") {
      db.messages = db.messages.map((message) =>
        message.id === parts[1] ? { ...message, status: "read", readAt: now() } : message
      );
      db.threads = db.threads.map((thread) =>
        thread.id === db.messages.find((message) => message.id === parts[1])?.threadId ? { ...thread, unreadCount: 0 } : thread
      );
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "agreements" && parts[1] && parts.length === 2) {
      return json(db.agreement.id === parts[1] ? db.agreement : notFound("Agreement not found"));
    }

    if (method === "GET" && parts[0] === "agreements" && parts[1] && parts[2] === "status") {
      return json({ id: db.agreement.id, status: db.agreement.status });
    }

    if (method === "POST" && parts[0] === "agreements" && parts[1]) {
      const action = parts[2];
      if (["accept", "arrival", "start", "complete"].includes(action ?? "")) {
        return json(await persist(transitionAgreement(db, action as "accept" | "arrival" | "start" | "complete", optionalString(body.proofNote))));
      }
      if (action === "proof") {
        db.agreement.proofRefs.push(optionalString(body.proofRef) ?? `local-proof://${newId("proof")}`);
        db.agreement.proofNotes.push(optionalString(body.proofNote) ?? "Proof submitted.");
        return json(await persist(db));
      }
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "escrow" && parts[2]) {
      return json(db.escrow);
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "history" && parts[2]) {
      return json(db.payoutHistory.filter((item) => item.walletAddress === parts[2]));
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "gas-estimate") {
      return json({ gasEstimate: db.escrow.gasEstimate, chainId: db.escrow.chainId });
    }

    if (method === "POST" && parts[0] === "payments" && parts[1] === "wallet-connect") {
      db.notifications.unshift(makeNotification("escrow_funded", "Wallet connected", "Escrow rail is ready for contractor payout sync.", "payment", db.agreement.id, "#mobile-pay"));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "notifications") {
      return json(db.notifications);
    }

    if (method === "POST" && parts[0] === "notifications") {
      db.notifications.unshift(makeNotification(
        (optionalString(body.type) as ContractorNotificationType) || "gig_matched",
        optionalString(body.title) ?? "WorkMesh update",
        optionalString(body.body) ?? "New contractor event.",
        "gig",
        optionalString(body.relatedEntityId) ?? "dock",
        optionalString(body.target) ?? "#mobile-notifications"
      ));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "notifications" && parts[1] === "read-all") {
      db.notifications = db.notifications.map((item) => ({ ...item, read: true }));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "notifications" && parts[1] && parts[2] === "read") {
      db.notifications = db.notifications.map((item) => (item.id === parts[1] ? { ...item, read: true } : item));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts.length === 2) {
      return json(db.profile.walletAddress === parts[1] ? db.profile : notFound("Profile not found"));
    }

    if (method === "POST" && parts[0] === "profile" && parts.length === 1) {
      db.profile = { ...db.profile, ...(body as Partial<ContractorProfileDto>), updatedAt: now() };
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "profile" && parts[1] && parts.length === 2) {
      db.profile = { ...db.profile, ...(body as Partial<ContractorProfileDto>), updatedAt: now() };
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts[2] === "public-preview") {
      return json(publicPreview(db.profile));
    }

    if (method === "POST" && parts[0] === "profile" && parts[1] && parts[2] === "disclosures") {
      const fields = Array.isArray(body.disclosedFields) ? body.disclosedFields.map(String) as ContractorDisclosureField[] : [];
      const enabled = body.enabled !== false;
      fields.forEach((field) => {
        db.profile.privacySettings[field] = enabled;
      });
      db.disclosureAudit.unshift({
        id: newId("audit"),
        walletAddress: parts[1],
        recipientWallet: optionalString(body.recipientWallet) ?? employerWallet,
        disclosedFields: fields,
        purpose: optionalString(body.purpose) ?? (enabled ? "Selective disclosure granted" : "Selective disclosure revoked"),
        agreementId: optionalString(body.agreementId) ?? db.agreement.id,
        createdAt: now(),
        revokedAt: enabled ? undefined : now()
      });
      db.notifications.unshift(makeNotification("disclosure_request", enabled ? "Disclosure granted" : "Disclosure revoked", `${fields.join(", ")} updated.`, "profile", parts[1], "#mobile-profile"));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts[2] === "disclosures") {
      return json(db.disclosureAudit.filter((item) => item.walletAddress === parts[1]));
    }

    return NextResponse.json({ error: "Route not found", path: parts }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    const status = error instanceof RouteError ? error.status : message.includes("required") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(dbPath, "utf8")) as Db;
  } catch {
    const seeded = seedDb();
    await persist(seeded);
    return seeded;
  }
}

async function persist(db: Db): Promise<Db> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2));
  return db;
}

function seedDb(): Db {
  const timestamp = now();
  const profile: ContractorProfileDto = {
    walletAddress: wallet,
    handle: "Operator K-914",
    publicKey: "x25519_mock_api_k914",
    signingPublicKey: "ed25519_mock_api_k914",
    publicFields: {
      initials: "K",
      approximateRegion: "NYC-03",
      rating: 4.96,
      trustScore: 98,
      levelName: "Elite Operator"
    },
    encryptedPrivateBlobRef: "local-encrypted-profile://operator-k914",
    level: 5,
    xp: 8420,
    xpNext: 10000,
    streakDays: 19,
    trustScore: 98,
    skills: ["Lift", "Dock", "Scan", "Tools", "Photo proof"],
    serviceCategories: ["logistics", "facilities"],
    availability: "ready_now",
    workPreference: "local",
    privacySettings: {
      realName: false,
      phone: false,
      email: false,
      preciseLocation: false,
      portfolio: false,
      credentials: true
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };
  const gigs = seedGigs(timestamp);
  const agreement = seedAgreement(timestamp);
  const escrow = feeEscrow(agreement.id, gigs[0].pay, "funded");
  return {
    profile,
    gigs,
    recommendations: scoreGigs({ profile, gigs } as Db, wallet),
    threads: [{
      id: "thread_dock",
      participantWallets: [wallet, employerWallet],
      gigId: "dock",
      agreementId: "agr_dock",
      lastMessagePreview: "encrypted:gate-details",
      unreadCount: 0,
      updatedAt: timestamp
    }],
    messages: [
      encryptedMessage("msg_employer_1", "thread_dock", employerWallet, "encrypted:Escrow is locked. Gate code is visible to your device."),
      encryptedMessage("msg_worker_1", "thread_dock", wallet, "encrypted:On site in 18 minutes.")
    ],
    agreement,
    escrow,
    payoutHistory: [{ id: "pay_seed", walletAddress: wallet, agreementId: agreement.id, label: "Prior payout", amount: 214, status: "released", createdAt: timestamp }],
    notifications: [
      makeNotification("gig_matched", "Priority gig nearby", "Night dock unload is a 96% fit.", "gig", "dock", "#mobile-gigs"),
      makeNotification("escrow_funded", "Escrow funded", "$148 is locked for Harbor Supply.", "payment", agreement.id, "#mobile-pay")
    ],
    disclosureAudit: [{
      id: "audit_seed",
      walletAddress: wallet,
      recipientWallet: employerWallet,
      disclosedFields: ["credentials"],
      purpose: "Verified skill proof for dock work",
      agreementId: agreement.id,
      createdAt: timestamp
    }]
  };
}

function seedGigs(timestamp: string): ContractorGigDto[] {
  return [
    gig("dock", "Night dock unload, aisle 4-6", "Harbor Supply Node", "logistics", "surge", 1.2, "21:00", 148, 4, ["Lift", "Dock", "Scan"], true, timestamp),
    gig("fixture", "Emergency fixture swap", "Northline Retail", "facilities", "priority", 0.6, "18:30", 92, 3, ["Tools", "Photo proof"], true, timestamp),
    gig("event", "Event teardown lead", "Civic Hall Ops", "events", "standard", 2.8, "23:15", 225, 6, ["Crew", "Van", "Lead"], false, timestamp)
  ];
}

function gig(id: string, title: string, client: string, category: string, urgency: ContractorGigDto["urgency"], distanceMiles: number, timeWindow: string, pay: number, requiredLevel: number, requiredSkills: string[], escrowRequired: boolean, timestamp: string): ContractorGigDto {
  return {
    id,
    title,
    client,
    employerWallet,
    category,
    descriptionPreview: `${title} for ${client}`,
    encryptedDetailsRef: `local-encrypted-gig://${id}`,
    pay,
    currency: "USD",
    distanceMiles,
    locationMode: "local",
    coordinates: { lat: 40.72 + distanceMiles / 100, lng: -74.0 },
    timeWindow,
    urgency,
    requiredLevel,
    requiredSkills,
    status: "available",
    escrowRequired,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function seedAgreement(timestamp: string): AgreementDto {
  return {
    id: "agr_dock",
    gigId: "dock",
    employerWallet,
    contractorWallet: wallet,
    termsRef: "local-encrypted-terms://agr_dock",
    termsPreview: ["Protected escrow required", "Arrival ping required", "Photo/checklist proof required", "Employer review before release"],
    status: "draft",
    proofRefs: [],
    proofNotes: [],
    acceptedAt: undefined,
    arrivedAt: undefined,
    startedAt: undefined,
    completedAt: undefined
  };
}

function encryptedMessage(id: string, threadId: string, senderWallet: string, encryptedPayload: string): MessageDto {
  return { id, threadId, senderWallet, encryptedPayload, attachmentRefs: [], status: "delivered", createdAt: now() };
}

function scoreGigs(db: Pick<Db, "profile" | "gigs">, _walletAddress: string): RecommendedGigDto[] {
  return db.gigs.map((gig) => {
    const matchedSkills = gig.requiredSkills.filter((skill) => db.profile.skills.includes(skill)).length;
    const skillFit = Math.round((matchedSkills / gig.requiredSkills.length) * 24);
    const proximity = gig.distanceMiles < 1 ? 18 : gig.distanceMiles < 2 ? 16 : 12;
    const levelEligibility = db.profile.level >= gig.requiredLevel ? 16 : 4;
    const rating = Math.round(db.profile.publicFields.rating * 2);
    const availability = db.profile.availability === "ready_now" ? 12 : 6;
    const completionHistory = Math.round(db.profile.trustScore / 10);
    const priceFit = gig.pay >= 120 ? 10 : 8;
    const responseSpeed = db.profile.streakDays > 10 ? 10 : 7;
    const totalScore = skillFit + proximity + levelEligibility + rating + availability + completionHistory + priceFit + responseSpeed;
    const missingRequirements = [
      ...(db.profile.level < gig.requiredLevel ? [`Level ${gig.requiredLevel} required`] : []),
      ...gig.requiredSkills.filter((skill) => !db.profile.skills.includes(skill)).map((skill) => `${skill} skill proof`)
    ];
    return {
      gig,
      matchScore: {
        totalScore,
        confidenceScore: Math.min(98, totalScore + 4),
        scoreBreakdown: { skillFit, proximity, levelEligibility, rating, availability, completionHistory, priceFit, responseSpeed },
        explanation: missingRequirements.length ? "Strong nearby opportunity, but eligibility needs one more proof or level unlock." : "High fit based on proximity, skills, trust score, availability, and payout fit.",
        missingRequirements,
        suggestedActions: missingRequirements.length ? ["Complete one verified proof", "Maintain streak to unlock higher-value work"] : ["Claim while escrow is funded", "Send ETA in encrypted chat"],
        levelUnlock: db.profile.level < gig.requiredLevel ? { missingLevel: gig.requiredLevel, xpNeeded: Math.max(0, db.profile.xpNext - db.profile.xp), action: "Complete verified work to level up" } : undefined
      }
    };
  });
}

function filterGigs(gigs: ContractorGigDto[], params: URLSearchParams) {
  const query = (params.get("query") ?? "").toLowerCase();
  const minPay = Number(params.get("minPay") ?? 0);
  const category = params.get("category") ?? "all";
  const urgency = params.get("urgency") ?? "all";
  const remoteLocal = params.get("remoteLocal") ?? "all";
  return gigs.filter((gig) => {
    const text = `${gig.title} ${gig.client} ${gig.requiredSkills.join(" ")}`.toLowerCase();
    return (!query || text.includes(query)) &&
      gig.pay >= minPay &&
      (category === "all" || gig.category === category) &&
      (urgency === "all" || gig.urgency === urgency) &&
      (remoteLocal === "all" || gig.locationMode === remoteLocal);
  });
}

function updateGigStatus(db: Db, gigId: string, status: ContractorGigStatus) {
  const validStatuses: ContractorGigStatus[] = ["available", "applied", "claimed", "in_progress", "completed", "disputed"];
  if (!validStatuses.includes(status)) {
    throw new RouteError(400, "Invalid gig status");
  }
  const current = requireGig(db, gigId);
  if (status === "claimed" && ["claimed", "in_progress", "completed", "disputed"].includes(current.status)) {
    throw new RouteError(409, "Gig is not available to claim");
  }
  if (status === "in_progress" && current.status !== "claimed") {
    throw new RouteError(409, "Gig must be claimed before starting");
  }
  if (status === "completed" && current.status !== "in_progress") {
    throw new RouteError(409, "Gig must be in progress before completion");
  }
  const timestamp = now();
  db.gigs = db.gigs.map((gig) => (gig.id === gigId ? { ...gig, status, updatedAt: timestamp } : gig));
  const gig = requireGig(db, gigId);
  db.escrow = feeEscrow(db.agreement.id, gig.pay, status === "completed" ? "completion_submitted" : "funded");
  db.notifications.unshift(makeNotification(status === "claimed" ? "agreement_ready" : "gig_matched", status === "claimed" ? "Agreement ready" : "Gig updated", `${gig.title} is now ${status.replace("_", " ")}.`, "gig", gigId, status === "claimed" ? "#mobile-agreement" : "#mobile-gigs"));
  db.recommendations = scoreGigs(db, wallet);
  return db;
}

function transitionAgreement(db: Db, action: "accept" | "arrival" | "start" | "complete", proofNote?: string) {
  const timestamp = now();
  if (action === "accept") {
    if (db.agreement.status !== "draft" && db.agreement.status !== "accepted") throw new RouteError(409, "Agreement cannot be accepted from current state");
    db.agreement.status = "accepted";
    db.agreement.acceptedAt = timestamp;
    if (requireGig(db, db.agreement.gigId).status === "available") updateGigStatus(db, db.agreement.gigId, "claimed");
  }
  if (action === "arrival") {
    if (db.agreement.status !== "accepted" && db.agreement.status !== "arrived") throw new RouteError(409, "Agreement must be accepted before arrival");
    db.agreement.status = "arrived";
    db.agreement.arrivedAt = timestamp;
  }
  if (action === "start") {
    if (db.agreement.status !== "arrived" && db.agreement.status !== "in_progress") throw new RouteError(409, "Arrival must be recorded before work starts");
    db.agreement.status = "in_progress";
    db.agreement.startedAt = timestamp;
    if (requireGig(db, db.agreement.gigId).status !== "in_progress") updateGigStatus(db, db.agreement.gigId, "in_progress");
  }
  if (action === "complete") {
    if (db.agreement.status !== "in_progress" && db.agreement.status !== "completion_submitted") throw new RouteError(409, "Work must be in progress before completion");
    db.agreement.status = "completion_submitted";
    db.agreement.completedAt = timestamp;
    db.agreement.proofRefs.push(`local-proof://${newId("proof")}`);
    db.agreement.proofNotes.push(proofNote ?? "Proof submitted.");
    updateGigStatus(db, db.agreement.gigId, "completed");
  }
  db.notifications.unshift(makeNotification("agreement_ready", "Agreement updated", `Agreement status is now ${db.agreement.status.replace("_", " ")}.`, "agreement", db.agreement.id, "#mobile-agreement"));
  return db;
}

function feeEscrow(agreementId: string, grossAmount: number, status: PaymentEscrowDto["status"]): PaymentEscrowDto {
  const platformFee = Math.round(grossAmount * 0.082 * 100) / 100;
  return {
    agreementId,
    status,
    grossAmount,
    platformFee,
    netPayout: Math.round((grossAmount - platformFee) * 100) / 100,
    gasEstimate: 3.44,
    treasuryWallet: "0xTreasury...FEE5",
    chainId: 31337,
    txHash: status === "funded" ? "0xmockfunded" : undefined,
    updatedAt: now()
  };
}

function publicPreview(profile: ContractorProfileDto) {
  return {
    handle: profile.handle,
    region: profile.publicFields.approximateRegion,
    trustScore: profile.trustScore,
    level: profile.level,
    disclosed: profile.privacySettings
  };
}

function upsertThreadPreview(db: Db, threadId: string, encryptedPayload: string) {
  db.threads = db.threads.map((thread) =>
    thread.id === threadId ? { ...thread, lastMessagePreview: encryptedPayload.slice(0, 28), updatedAt: now() } : thread
  );
}

function makeNotification(type: ContractorNotificationType, title: string, body: string, relatedEntityType: NotificationDto["relatedEntityType"], relatedEntityId: string, target: string, read = false): NotificationDto {
  return { id: newId("note"), walletAddress: wallet, type, title, body, relatedEntityType, relatedEntityId, target, read, createdAt: now() };
}

function requireGig(db: Pick<Db, "gigs">, gigId: string) {
  const gig = db.gigs.find((item) => item.id === gigId);
  if (!gig) throw new RouteError(404, "Gig not found");
  return gig;
}

function route(parts: string[], a: string, b: string) {
  return parts[0] === a && parts[1] === b;
}

async function safeJson(request: NextRequest) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringBody(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new RouteError(400, `${field} is required`);
  return value.trim();
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

function json(data: unknown) {
  if (data instanceof NextResponse) return data;
  return NextResponse.json(data);
}
