import { NextResponse, type NextRequest } from "next/server";
import { AuthError, createRelaiSession, getRelaiSession, listRelaiSecurityEvents, listRelaiSessions, revokeAllRelaiSessions, revokeRelaiSession, revokeRelaiSessionById, sessionCookieName, assertOwnWallet, assertRole, updateRelaiDeviceTrust, type RelaiSession } from "@/lib/server/auth";
import { isEncryptedEnvelopeString, makeServerEncryptedEnvelope } from "@/lib/server/encrypted-envelope";
import { normalizeEncryptedAttachment } from "@/lib/server/encrypted-attachment";
import { appendSecurityEvent } from "@/lib/server/session-store";
import { normalizeEncryptedProof } from "@/lib/server/proof-storage";
import { assertRateLimit, RateLimitError } from "@/lib/server/rate-limit";
import { createRelaiStateStore } from "@/lib/server/relai-state-store";
import { applyChainEscrowOverlay, chainAgreementIdFor } from "@/lib/server/chain-escrow-store";
import { checkUsername, loginAccount, registerAccount } from "@/lib/server/account-store";
import { normalizeOperationalFocusId, operationalFocusLabel } from "@/lib/operational-focus";
import { engagementStructureLabel, normalizeEngagementStructure, preferredEngagementStructuresForFocus } from "@/lib/engagement-structure";
import { hasContactDisclosureSignal } from "@/lib/contact-disclosure";
import type {
  AgreementDto,
  ContractorCommandApiStateDto,
  ContractorDisclosureField,
  ContributorMessagingPermission,
  CoordinationMessageDto,
  CoordinationRoomDto,
  CoordinationRoomParticipantDto,
  DisclosureState,
  EngagementContributorDto,
  EngagementContributorStatus,
  EngagementDto,
  EngagementTeamSummaryDto,
  EngagementVisibilityMode,
  ParticipantVisibilityLevel,
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

type EmployerProfileDto = {
  walletAddress: string;
  employerHandle: string;
  organizationName?: string;
  employerType: string;
  region: string;
  disclosureSettings: Record<string, boolean>;
  trustScore: number;
  createdAt: string;
  updatedAt: string;
};

type DynamicPricingQuoteDto = {
  suggestedCompensationRange: { minimum: number; suggested: number; premium: number };
  urgencyMultiplier: number;
  scarcityMultiplier: number;
  estimatedPlatformFee: number;
  estimatedNetPayout: number;
  engagementStructure?: string;
};

type TrustEndorsementDto = { id: string; fromWallet: string; toWallet: string; agreementId?: string; encryptedNoteRef: string; createdAt: string; visibility: "private" | "agreement_scoped" };
type ModerationReportDto = { id: string; reporterWallet: string; targetWallet?: string; agreementId?: string; category: string; encryptedReportRef: string; status: "open" | "triaged" | "closed"; createdAt: string; limitedVisibility: true };
type AccountSecurityDto = { walletAddress: string; frozen: boolean; frozenAt?: string; recoveryDelayUntil?: string; reason?: string };
type BetaInviteDto = { code: string; ownerWallet: string; status: "active" | "expired" | "paused"; expiresAt: string; maxUses: number; acceptedBy: string[]; note?: string; createdAt: string };
type BetaFeedbackDto = { id: string; walletAddress: string; category: string; context: string; rating?: number; feedbackPreview?: string; encryptedFeedbackRef?: string; createdAt: string };
type BetaAnalyticsEventDto = { id: string; walletAddress?: string; eventName: string; operationalFocus?: string; role?: string; createdAt: string };

type Db = ContractorCommandApiStateDto & {
  employerProfiles?: EmployerProfileDto[];
  trustEndorsements?: TrustEndorsementDto[];
  moderationReports?: ModerationReportDto[];
  accountSecurity?: AccountSecurityDto[];
  betaInvites?: BetaInviteDto[];
  betaFeedback?: BetaFeedbackDto[];
  betaAnalyticsEvents?: BetaAnalyticsEventDto[];
};
type Params = { params: { path: string[] } };
class RouteError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const wallet = "0xK914...7F21";
const employerWallet = "0xHarbor...9910";
const now = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
const stateStore = createRelaiStateStore(seedDb);

export async function GET(request: NextRequest, context: Params) {
  return handle(request, context, "GET");
}

export async function POST(request: NextRequest, context: Params) {
  return handle(request, context, "POST");
}

export async function PATCH(request: NextRequest, context: Params) {
  return handle(request, context, "PATCH");
}

export async function DELETE(request: NextRequest, context: Params) {
  return handle(request, context, "DELETE");
}

async function handle(request: NextRequest, { params }: Params, method: "GET" | "POST" | "PATCH" | "DELETE") {
  try {
    const db = await readDb();
    const parts = params.path ?? [];
    const body = method === "GET" ? {} : await safeJson(request);
    const url = new URL(request.url);
    enforceRateLimit(request, parts, method);
    const session = await getRelaiSession(request);

    if (parts[0] === "auth" && parts[1] === "check-username" && method === "POST") {
      return json(await checkUsername(body.username));
    }

    if (parts[0] === "beta" && parts[1] === "invites" && parts[2] && method === "GET") {
      return json(publicInviteStatus(db, parts[2]));
    }

    if (parts[0] === "beta" && parts[1] === "invites" && parts[2] === "accept" && method === "POST") {
      return json(await persist(acceptInvite(db, optionalString(body.inviteCode) ?? optionalString(body.code) ?? "RELAI-BETA", optionalString(body.walletAddress))));
    }

    if (parts[0] === "beta" && parts[1] === "analytics" && method === "POST") {
      return json(await persist(recordBetaAnalytics(db, session, body)));
    }

    if (parts[0] === "beta" && parts[1] === "feedback" && method === "POST") {
      return json(await persist(recordBetaFeedback(db, session, body)));
    }

    if (parts[0] === "auth" && parts[1] === "register" && method === "POST") {
      const account = await registerAccount(body);
      const created = await createRelaiSession({ walletAddress: account.walletAddress, role: account.role, authMethod: "wallet_placeholder", request, deviceName: optionalString(body.deviceName) });
      const response = json({ account, session: created.session });
      response.cookies.set(sessionCookieName, created.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    if (parts[0] === "auth" && parts[1] === "login" && method === "POST") {
      const account = await loginAccount(body);
      const created = await createRelaiSession({ walletAddress: account.walletAddress, role: account.role, authMethod: "wallet_placeholder", request, deviceName: optionalString(body.deviceName) });
      const response = json({ account, session: created.session });
      response.cookies.set(sessionCookieName, created.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    if (parts[0] === "auth" && parts[1] === "logout" && method === "POST") {
      await revokeRelaiSession(request);
      const response = json({ ok: true });
      response.cookies.set(sessionCookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
      return response;
    }

    if (parts[0] === "auth" && parts[1] === "session") {
      if (method === "GET") return json(session);
      if (method === "POST") {
        const created = await createRelaiSession({
          walletAddress: stringBody(body.walletAddress, "walletAddress"),
          role: body.role === "employer" || body.role === "admin" ? body.role : "contractor",
          authMethod: body.role === "admin" ? "admin_internal" : "wallet_placeholder",
          request,
          deviceName: optionalString(body.deviceName)
        });
        const response = json(created.session);
        response.cookies.set(sessionCookieName, created.token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 7
        });
        return response;
      }
      if (method === "DELETE") {
        await revokeRelaiSession(request);
        const response = json({ ok: true });
        response.cookies.set(sessionCookieName, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
        return response;
      }
    }

    if (parts[0] === "auth" && parts[1] === "devices") {
      if (method === "GET" && parts.length === 2) return json(await listRelaiSessions(session));
      if (method === "POST" && parts[2] === "revoke-all") return json({ revoked: await revokeAllRelaiSessions(session, true) });
      if (method === "POST" && parts[2] && parts[3] === "revoke") return json({ revoked: await revokeRelaiSessionById(session, parts[2]) });
      if (method === "PATCH" && parts[2] && parts[3] === "trust") {
        const trustState = body.trustState === "trusted" || body.trustState === "suspicious" ? body.trustState : "new";
        const updated = await updateRelaiDeviceTrust(session, parts[2], trustState);
        return json(updated ?? notFound("Device session not found"));
      }
    }

    if (parts[0] === "auth" && parts[1] === "security-events" && method === "GET") {
      return json(await listRelaiSecurityEvents(session));
    }

    if (parts[0] === "auth" && parts[1] === "recovery" && method === "POST") {
      return json({
        status: "recovery_package_ready",
        recoveryPackageRef: "local-recovery-package://" + session.sessionId,
        guidance: "Save this package somewhere private. Relai cannot restore encrypted content without your device key or recovery package."
      });
    }

    if (parts[0] === "auth" && parts[1] === "nonce" && method === "GET") {
      return json({ nonce: newId("nonce"), authMethod: "future_siwe", expiresInSeconds: 300 });
    }

    if (parts[0] === "auth" && parts[1] === "verify" && method === "POST") {
      throw new RouteError(501, "SIWE verification is scaffolded but not enabled yet");
    }

    if (parts[0] === "admin") {
      assertRole(session, ["admin"]);
      if (method === "GET" && parts[1] === "disputes") return json([{ id: "disp_beta_1", agreementId: db.agreement.id, status: db.agreement.status === "disputed" ? "open" : "none_open", summary: "No active high-risk dispute in the seed workflow." }]);
      if (method === "GET" && parts[1] === "invites") return json((db.betaInvites ?? []).map((invite) => ({ ...publicInviteStatus(db, invite.code), ownerWallet: invite.ownerWallet, acceptedCount: invite.acceptedBy.length })));
      if (method === "GET" && parts[1] === "users") return json([{ role: "contractor", walletAddress: db.profile.walletAddress, handle: db.profile.handle, onboardingCompleted: db.profile.onboardingCompleted }, ...(db.employerProfiles ?? []).map((profile) => ({ role: "employer", walletAddress: profile.walletAddress, handle: profile.employerHandle }))]);
      if (method === "GET" && parts[1] === "payments") return json({ escrow: db.escrow, payoutHistory: db.payoutHistory });
      if (method === "GET" && parts[1] === "reports") return json((db.moderationReports ?? []).map(adminReportPreview));
      if (method === "GET" && parts[1] === "feedback") return json((db.betaFeedback ?? []).map((item) => ({ id: item.id, category: item.category, context: item.context, rating: item.rating, encryptedFeedbackAvailable: Boolean(item.encryptedFeedbackRef), feedbackPreview: item.feedbackPreview, createdAt: item.createdAt })));
      if (method === "GET" && parts[1] === "analytics") return json(betaAnalyticsSummary(db));
    }

    if (parts[0] === "employer") {
      assertRole(session, ["employer", "admin"]);

      if (method === "GET" && route(parts, "employer", "profile")) return json(getEmployerProfile(db, session.walletAddress));
      if (route(parts, "employer", "gigs") && method === "GET" && parts.length === 2) return json(db.gigs.filter((gig) => session.role === "admin" || sameWallet(gig.employerWallet, session.walletAddress)));
      if ((method === "POST" || method === "PATCH") && route(parts, "employer", "profile")) return json(await persist(upsertEmployerProfile(db, session.walletAddress, body)));
      if (method === "POST" && route(parts, "employer", "gigs") && parts.length === 2) return json(await persist(createEmployerGig(db, session.walletAddress, body)));
      if (method === "PATCH" && parts[1] === "gigs" && parts[2] && parts.length === 3) return json(await persist(updateEmployerGig(db, session, parts[2], body)));
      if (method === "POST" && parts[1] === "gigs" && parts[2] && parts[3] === "close") return json(await persist(setEmployerGigLifecycle(db, session, parts[2], "closed")));
      if (method === "POST" && parts[1] === "gigs" && parts[2] && parts[3] === "cancel") return json(await persist(setEmployerGigLifecycle(db, session, parts[2], "cancelled")));
      if (method === "GET" && parts[1] === "gigs" && parts[2] && parts[3] === "applicants") {
        const gig = requireEmployerGig(db, session, parts[2]);
        return json((gig.applicantWallets ?? []).map((contractorWallet) => applicantSummary(db, contractorWallet)));
      }
      if (method === "POST" && parts[1] === "gigs" && parts[2] && parts[3] === "applicants" && parts[4] && parts[5] === "accept") return json(await persist(reviewApplicant(db, session, parts[2], decodeURIComponent(parts[4]), "accept")));
      if (method === "POST" && parts[1] === "gigs" && parts[2] && parts[3] === "applicants" && parts[4] && parts[5] === "reject") return json(await persist(reviewApplicant(db, session, parts[2], decodeURIComponent(parts[4]), "reject")));
      if (method === "POST" && parts[1] === "gigs" && parts[2] && parts[3] === "create-agreement") return json(await persist(createEmployerAgreement(db, session, parts[2], body)));
      if (method === "GET" && parts[1] === "engagements" && parts[2] && parts[3] === "team") return json(requireEmployerTeam(db, session, parts[2]));
      if (method === "POST" && parts[1] === "engagements" && parts[2] && parts[3] === "team" && parts[4] === "add") return json(await persist(addEngagementContributor(db, session, parts[2], body)));
      if (method === "PATCH" && parts[1] === "engagements" && parts[2] && parts[3] === "team" && parts[4]) return json(await persist(updateEngagementContributor(db, session, parts[2], parts[4], body)));
      if (method === "DELETE" && parts[1] === "engagements" && parts[2] && parts[3] === "team" && parts[4]) return json(await persist(removeEngagementContributor(db, session, parts[2], parts[4])));
      if (method === "PATCH" && parts[1] === "engagements" && parts[2] && parts[3] === "visibility") return json(await persist(updateEngagementVisibility(db, session, parts[2], body)));
      if (method === "GET" && parts[1] === "agreements" && parts[2]) return json(requireEmployerAgreement(db, session, parts[2]));
      if (method === "POST" && parts[1] === "agreements" && parts[2] && parts[3]) return json(await persist(transitionEmployerAgreement(db, session, parts[2], parts[3] as string, body)));
    }

    if (method === "GET" && route(parts, "contractor", "state")) {
      return json(db);
    }

    if (method === "GET" && parts[0] === "contributor" && parts[1] === "engagements" && parts.length === 2) {
      return json(listContributorEngagements(db, session.walletAddress));
    }

    if (method === "GET" && parts[0] === "contributor" && parts[1] === "engagements" && parts[2]) {
      return json(requireContributorEngagement(db, session.walletAddress, parts[2]));
    }

    if (method === "GET" && parts[0] === "engagements" && parts[1] && parts[2] === "room") {
      return json(requireCoordinationRoomAccess(db, session, parts[1]).room);
    }

    if (method === "POST" && parts[0] === "engagements" && parts[1] && parts[2] === "room") {
      const roomResult = createCoordinationRoom(db, session, parts[1]);
      await persist(db);
      return json(roomResult);
    }

    if (method === "GET" && parts[0] === "rooms" && parts[1] && parts[2] === "participants") {
      return json(roomRoster(db, requireCoordinationRoomById(db, session, parts[1]), session));
    }

    if (method === "GET" && parts[0] === "rooms" && parts[1] && parts[2] === "messages") {
      const room = requireCoordinationRoomById(db, session, parts[1]);
      return json((db.coordinationMessages ?? []).filter((message) => message.roomId === room.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }

    if (method === "POST" && parts[0] === "rooms" && parts[1] && parts[2] === "messages") {
      const messageResult = sendCoordinationMessage(db, session, parts[1], body);
      await persist(db);
      return json(messageResult);
    }

    if (method === "PATCH" && parts[0] === "rooms" && parts[1] && parts[2] === "read") {
      return json(await persist(markCoordinationRoomRead(db, session, parts[1])));
    }

    if (method === "POST" && parts[0] === "rooms" && parts[1] && parts[2] === "sync-participants") {
      const room = requireCoordinationRoomById(db, session, parts[1]);
      requireEmployerEngagement(db, session, room.engagementId);
      syncCoordinationRoomParticipants(db, room.engagementId);
      return json(await persist(db));
    }

    if (method === "POST" && parts[0] === "engagements" && parts[1] && parts[2] === "dms" && parts[3]) {
      const dmResult = sendEngagementDm(db, session, parts[1], decodeURIComponent(parts[3]), body);
      await persist(db);
      return json(dmResult);
    }

    if (parts[0] === "account" && parts[1] === "freeze" && method === "POST") {
      const security = freezeAccount(db, session, optionalString(body.reason) ?? "User requested emergency freeze");
      await appendSecurityEvent({ sessionId: session.sessionId, eventType: "admin_action", walletAddress: session.walletAddress, metadata: { action: "account_freeze", reason: security.reason } });
      return json(await persist(db));
    }

    if (parts[0] === "account" && parts[1] === "security" && method === "GET") {
      return json(getAccountSecurity(db, session.walletAddress));
    }

    if (parts[0] === "trust" && parts[1] === "summary" && parts[2] && method === "GET") {
      assertOwnWallet(session, parts[2]);
      return json(trustSummary(db, parts[2]));
    }

    if (parts[0] === "trust" && parts[1] === "export" && parts[2] && method === "POST") {
      assertOwnWallet(session, parts[2]);
      return json(portableReputationExport(db, parts[2], optionalString(body.scope) ?? "summary_only"));
    }

    if (parts[0] === "trust" && parts[1] === "endorsements" && method === "POST") {
      const endorsement = createTrustEndorsement(db, session, body);
      await appendSecurityEvent({ sessionId: session.sessionId, eventType: "admin_action", walletAddress: session.walletAddress, metadata: { action: "private_endorsement", toWallet: endorsement.toWallet } });
      return json(await persist(db));
    }

    if (parts[0] === "reports" && method === "POST") {
      const report = createModerationReport(db, session, body);
      await appendSecurityEvent({ sessionId: session.sessionId, eventType: "admin_action", walletAddress: session.walletAddress, metadata: { action: "moderation_report", category: report.category, agreementId: report.agreementId } });
      return json(await persist(db));
    }

    if (method === "GET" && route(parts, "gigs", "search")) {
      const filtered = filterGigs(db.gigs, url.searchParams, db.profile);
      return json(filtered);
    }

    if (method === "GET" && parts[0] === "gigs" && parts[1] && parts.length === 2) {
      return json(requireGig(db, parts[1]));
    }

    if (method === "GET" && route(parts, "gigs", "recommended") && parts[2]) {
      return json(scoreGigs(db, parts[2]));
    }

    if (method === "POST" && parts[0] === "gigs" && parts[1] && parts[2] === "apply") {
      return json(await persist(updateGigStatus(db, parts[1], "applied", actorWallet(session, body.walletAddress, db.profile.walletAddress))));
    }

    if (method === "POST" && parts[0] === "gigs" && parts[1] && parts[2] === "claim") {
      return json(await persist(updateGigStatus(db, parts[1], "claimed", actorWallet(session, body.walletAddress, db.profile.walletAddress))));
    }

    if (method === "PATCH" && parts[0] === "gigs" && parts[1] && parts[2] === "status") {
      return json(await persist(updateGigStatus(db, parts[1], stringBody(body.status, "status") as ContractorGigStatus, actorWallet(session, body.walletAddress, db.profile.walletAddress))));
    }

    if (method === "GET" && route(parts, "messages", "threads")) {
      const walletAddress = url.searchParams.get("walletAddress") ?? session.walletAddress;
      assertOwnWallet(session, walletAddress);
      return json(db.threads.filter((thread) => thread.participantWallets.includes(walletAddress)));
    }

    if (method === "GET" && route(parts, "messages", "thread") && parts[2]) {
      const thread = requireThread(db, parts[2]);
      assertThreadAccess(session, thread);
      return json(db.messages.filter((message) => message.threadId === parts[2]));
    }

    if (method === "POST" && route(parts, "attachments", "metadata")) {
      const metadata = normalizeEncryptedAttachment(body, session.walletAddress);
      if (metadata.threadId) assertThreadAccess(session, requireThread(db, metadata.threadId));
      if (metadata.agreementId) assertAgreementAccess(session, db.agreement);
      return json(metadata);
    }

    if (method === "POST" && route(parts, "messages", "send")) {
      if (typeof body.text === "string" || typeof body.plaintext === "string" || typeof body.message === "string") {
        throw new RouteError(400, "plaintext message body is not accepted");
      }
      const threadId = stringBody(body.threadId, "threadId");
      const encryptedPayload = stringBody(body.encryptedPayload, "encryptedPayload");
      if (!isEncryptedEnvelopeString(encryptedPayload)) throw new RouteError(400, "encryptedPayload must be a Relai encrypted envelope");
      const senderWallet = stringBody(body.senderWallet, "senderWallet");
      assertOwnWallet(session, senderWallet);
      const recipientWallet = optionalString(body.recipientWallet) ?? employerWallet;
      const message: MessageDto = {
        id: newId("msg"),
        threadId,
        senderWallet,
        encryptedPayload,
        attachmentRefs: Array.isArray(body.attachmentRefs) ? body.attachmentRefs.map(String).filter((ref) => ref.startsWith("encrypted-attachment://") || ref.startsWith("local-attachment://mock")) : [],
        status: "delivered",
        createdAt: now()
      };
      db.messages.push(message);
      upsertThreadPreview(db, threadId, encryptedPayload, senderWallet, recipientWallet);
      db.notifications.unshift(makeNotification("message_received", "Message delivered", "You have a new secure message.", "message", message.id, "#mobile-chat", true));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "messages" && parts[1] && parts[2] === "read") {
      const message = db.messages.find((item) => item.id === parts[1]);
      if (!message) throw new RouteError(404, "Message not found");
      assertThreadAccess(session, requireThread(db, message.threadId));
      db.messages = db.messages.map((item) =>
        item.id === parts[1] ? { ...item, status: "read", readAt: now() } : item
      );
      db.threads = db.threads.map((thread) =>
        thread.id === message.threadId ? { ...thread, unreadCount: 0, updatedAt: now() } : thread
      );
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "agreements" && parts[1] && parts.length === 2) {
      if (db.agreement.id !== parts[1]) return json(notFound("Agreement not found"));
      assertAgreementAccess(session, db.agreement);
      return json(db.agreement);
    }

    if (method === "GET" && parts[0] === "agreements" && parts[1] && parts[2] === "status") {
      if (db.agreement.id !== parts[1]) return json(notFound("Agreement not found"));
      assertAgreementAccess(session, db.agreement);
      return json({ id: db.agreement.id, status: db.agreement.status });
    }

    if (method === "POST" && parts[0] === "agreements" && parts[1]) {
      assertAgreementAccess(session, db.agreement);
      const action = parts[2];
      assertOwnWallet(session, optionalString(body.walletAddress) ?? db.profile.walletAddress);
      if (["accept", "arrival", "start", "complete", "approve"].includes(action ?? "")) {
        return json(await persist(transitionAgreement(db, parts[1], action as "accept" | "arrival" | "start" | "complete" | "approve", body)));
      }
      if (action === "proof") {
        return json(await persist(submitProof(db, parts[1], body)));
      }
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "escrow" && parts[2]) {
      assertAgreementAccess(session, db.agreement);
      return json(db.escrow);
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "history" && parts[2]) {
      assertOwnWallet(session, parts[2]);
      return json(db.payoutHistory.filter((item) => item.walletAddress === parts[2]));
    }

    if (method === "POST" && parts[0] === "payments" && parts[1] === "escrow" && parts[2] && parts[3] === "funding-intent") {
      assertRole(session, ["employer", "admin"]);
      return json(createFundingIntent(db, session, parts[2]));
    }

    if (method === "POST" && parts[0] === "payments" && parts[1] === "escrow" && parts[2] && parts[3] === "tx-submitted") {
      assertRole(session, ["employer", "admin"]);
      return json(await persist(recordFundingTxSubmitted(db, session, parts[2], body)));
    }

    if (method === "GET" && parts[0] === "payments" && parts[1] === "gas-estimate") {
      const amount = Number(url.searchParams.get("amount") ?? db.escrow.grossAmount);
      const chainId = Number(url.searchParams.get("chainId") ?? db.escrow.chainId);
      return json({ gasEstimate: Math.round((2.35 + Math.max(amount, 0) * 0.004) * 100) / 100, chainId });
    }

    if (method === "POST" && parts[0] === "payments" && parts[1] === "wallet-connect") {
      const walletAddress = optionalString(body.walletAddress) ?? session.walletAddress;
      assertOwnWallet(session, walletAddress);
      db.notifications.unshift(makeNotification("escrow_funded", "Wallet connected", "Escrow rail is ready for contractor payout sync.", "payment", db.agreement.id, "#mobile-pay"));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "notifications") {
      return json(db.notifications.filter((item) => session.role === "admin" || item.walletAddress === session.walletAddress));
    }

    if (method === "POST" && parts[0] === "notifications") {
      assertOwnWallet(session, optionalString(body.walletAddress) ?? session.walletAddress);
      db.notifications.unshift(makeNotification(
        (optionalString(body.type) as ContractorNotificationType) || "gig_matched",
        safeNotificationTitle(optionalString(body.title) ?? "Relai update"),
        safeNotificationBody((optionalString(body.type) as ContractorNotificationType) || "gig_matched", optionalString(body.body)),
        "gig",
        optionalString(body.relatedEntityId) ?? "dock",
        optionalString(body.target) ?? "#mobile-notifications"
      ));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "notifications" && parts[1] === "read-all") {
      db.notifications = db.notifications.map((item) => session.role === "admin" || item.walletAddress === session.walletAddress ? { ...item, read: true } : item);
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "notifications" && parts[1] && parts[2] === "read") {
      const notification = db.notifications.find((item) => item.id === parts[1]);
      if (!notification) throw new RouteError(404, "Notification not found");
      assertOwnWallet(session, notification.walletAddress);
      db.notifications = db.notifications.map((item) => (item.id === parts[1] ? { ...item, read: true } : item));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts.length === 2) {
      assertOwnWallet(session, parts[1]);
      return json(db.profile.walletAddress === parts[1] ? db.profile : notFound("Profile not found"));
    }

    if (method === "POST" && parts[0] === "profile" && parts.length === 1) {
      assertOwnWallet(session, optionalString(body.walletAddress) ?? db.profile.walletAddress);
      db.profile = normalizeProfile({ ...db.profile, ...(body as Partial<ContractorProfileDto>), walletAddress: session.walletAddress, createdAt: now(), updatedAt: now() });
      validateProfile(db.profile);
      db.recommendations = scoreGigs(db, db.profile.walletAddress);
      db.notifications.unshift(makeNotification("level_unlocked", "Profile saved", "Your pseudonymous trusted work profile is ready for matching.", "profile", db.profile.walletAddress, "#mobile-profile"));
      return json(await persist(db));
    }

    if (method === "PATCH" && parts[0] === "profile" && parts[1] && parts.length === 2) {
      assertOwnWallet(session, parts[1]);
      if (db.profile.walletAddress !== parts[1]) return json(notFound("Profile not found"));
      db.profile = normalizeProfile(deepMerge(db.profile, body as Partial<ContractorProfileDto>));
      db.profile.updatedAt = now();
      validateProfile(db.profile);
      db.recommendations = scoreGigs(db, db.profile.walletAddress);
      db.notifications.unshift(makeNotification("level_unlocked", "Profile updated", "Trusted work profile changes were saved.", "profile", db.profile.walletAddress, "#mobile-profile", true));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts[2] === "public-preview") {
      if (db.profile.walletAddress !== parts[1]) return json(notFound("Profile not found"));
      return json(publicPreview(db.profile));
    }

    if (method === "POST" && parts[0] === "profile" && parts[1] && parts[2] === "disclosures") {
      assertOwnWallet(session, parts[1]);
      const fields = Array.isArray(body.disclosedFields) ? body.disclosedFields.map(String) as ContractorDisclosureField[] : [];
      const enabled = body.enabled !== false;
      const expiresAt = optionalString(body.expiresAt) ?? (enabled && body.temporary === true ? new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() : undefined);
      const agreementId = optionalString(body.agreementId) ?? db.agreement.id;
      if (fields.includes("preciseLocation") && enabled && agreementId !== db.agreement.id) throw new RouteError(403, "Exact location disclosure must be agreement scoped");
      fields.forEach((field) => {
        db.profile.privacySettings[field] = enabled;
      });
      db.disclosureAudit.unshift({
        id: newId("audit"),
        walletAddress: parts[1],
        recipientWallet: optionalString(body.recipientWallet) ?? employerWallet,
        disclosedFields: fields,
        purpose: optionalString(body.purpose) ?? (enabled ? "Selective disclosure granted" : "Selective disclosure revoked"),
        agreementId,
        createdAt: now(),
        revokedAt: enabled ? expiresAt : now()
      });
      db.notifications.unshift(makeNotification("disclosure_request", enabled ? "Disclosure granted" : "Disclosure revoked", "Disclosure setting updated.", "profile", parts[1], "#mobile-profile"));
      return json(await persist(db));
    }

    if (method === "GET" && parts[0] === "profile" && parts[1] && parts[2] === "disclosures") {
      assertOwnWallet(session, parts[1]);
      return json(db.disclosureAudit.filter((item) => item.walletAddress === parts[1]));
    }

    return NextResponse.json({ error: "Route not found", path: parts }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    const status = error instanceof AuthError ? error.status : error instanceof RouteError ? error.status : message.includes("permission denied") ? 403 : message.includes("required") ? 400 : 500;
    const code = error instanceof AuthError ? error.code : undefined;
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { "retry-after": String(error.retryAfterSeconds) } });
    }
    return NextResponse.json({ error: message, code }, { status });
  }
}

async function readDb(): Promise<Db> {
  return normalizeDb(await applyChainEscrowOverlay(await stateStore.read()));
}

async function persist(db: Db): Promise<Db> {
  return stateStore.write(normalizeDb(db));
}

function normalizeDb(db: Db): Db {
  db.profile = normalizeProfile(db.profile);
  db.employerProfiles = Array.isArray(db.employerProfiles) ? db.employerProfiles.map(normalizeEmployerProfile) : [normalizeEmployerProfile({ walletAddress: employerWallet })];
  db.gigs = db.gigs.map(normalizeGig);
  ensureEngagementCollections(db);
  ensureCoordinationRoomCollections(db);
  db.trustEndorsements = Array.isArray(db.trustEndorsements) ? db.trustEndorsements : [];
  db.moderationReports = Array.isArray(db.moderationReports) ? db.moderationReports : [];
  db.accountSecurity = Array.isArray(db.accountSecurity) ? db.accountSecurity : [];
  db.betaInvites = Array.isArray(db.betaInvites) ? db.betaInvites : seedBetaInvites(now());
  db.betaFeedback = Array.isArray(db.betaFeedback) ? db.betaFeedback : [];
  db.betaAnalyticsEvents = Array.isArray(db.betaAnalyticsEvents) ? db.betaAnalyticsEvents : [];
  db.recommendations = scoreGigs(db, db.profile.walletAddress);
  return db;
}

function ensureEngagementCollections(db: Db) {
  const timestamp = now();
  db.engagements = Array.isArray(db.engagements) ? db.engagements : [];
  db.engagementContributors = Array.isArray(db.engagementContributors) ? db.engagementContributors : [];

  for (const gig of db.gigs) {
    upsertEngagementForGig(db, gig);
  }

  if (db.agreement?.gigId && db.agreement.contractorWallet) {
    const existingAgreementContributor = db.engagementContributors.find((item) => item.engagementId === db.agreement.gigId && sameWallet(item.contributorWallet, db.agreement.contractorWallet));
    upsertEngagementContributor(db, {
      engagementId: db.agreement.gigId,
      contributorWallet: db.agreement.contractorWallet,
      assignedRole: existingAgreementContributor?.assignedRole ?? inferredRoleForGig(requireGig(db, db.agreement.gigId)),
      status: ["funded", "active", "arrived", "in_progress"].includes(db.agreement.status) ? "active" : "accepted",
      agreementId: db.agreement.id,
      joinedAt: db.agreement.acceptedAt ?? timestamp
    });
  }

  for (const gig of db.gigs) {
    for (const contributorWallet of gig.applicantWallets ?? []) {
      const existing = db.engagementContributors.find((item) => item.engagementId === gig.id && sameWallet(item.contributorWallet, contributorWallet));
      if (!existing && sameWallet(gig.contractorWallet ?? "", contributorWallet)) {
        upsertEngagementContributor(db, {
          engagementId: gig.id,
          contributorWallet,
          assignedRole: inferredRoleForGig(gig),
          status: "accepted",
          joinedAt: gig.updatedAt ?? timestamp
        });
      }
    }
  }

  syncEngagementContributorIds(db);
}

function upsertEngagementForGig(db: Db, gig: ContractorGigDto): EngagementDto {
  const existing = db.engagements?.find((item) => item.id === gig.id);
  const next: EngagementDto = {
    id: gig.id,
    employerWallet: gig.employerWallet,
    title: gig.title,
    operationalFocus: gig.verticals[0] ?? gig.category,
    descriptionPreview: gig.descriptionPreview,
    status: gig.status,
    visibilityMode: normalizeVisibilityMode(existing?.visibilityMode),
    contributorDmEnabled: existing?.contributorDmEnabled ?? false,
    rosterVisibilityLevel: existing?.rosterVisibilityLevel ?? "role_only",
    contributorIds: existing?.contributorIds ?? [],
    teamSize: existing?.teamSize ?? 0,
    createdAt: existing?.createdAt ?? gig.createdAt,
    updatedAt: gig.updatedAt ?? existing?.updatedAt ?? now()
  };
  db.engagements = [...(db.engagements ?? []).filter((item) => item.id !== gig.id), next];
  return next;
}

function upsertEngagementContributor(db: Db, input: Partial<EngagementContributorDto> & { engagementId: string; contributorWallet: string }): EngagementContributorDto {
  const gig = requireGig(db, input.engagementId);
  const timestamp = now();
  const existing = db.engagementContributors?.find((item) => item.engagementId === input.engagementId && sameWallet(item.contributorWallet, input.contributorWallet));
  const preview = sameWallet(input.contributorWallet, db.profile.walletAddress) ? publicPreview(db.profile) : undefined;
  const next: EngagementContributorDto = {
    id: existing?.id ?? `team_${input.engagementId}_${input.contributorWallet.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    engagementId: input.engagementId,
    contributorWallet: input.contributorWallet,
    contributorHandle: input.contributorHandle ?? existing?.contributorHandle ?? preview?.handle ?? "Pseudonymous contributor",
    assignedRole: input.assignedRole ?? existing?.assignedRole ?? inferredRoleForGig(gig),
    operationalFocus: input.operationalFocus ?? existing?.operationalFocus ?? gig.verticals[0] ?? gig.category,
    capabilities: input.capabilities ?? existing?.capabilities ?? (preview?.skills?.length ? preview.skills : gig.requiredSkills),
    status: input.status ?? existing?.status ?? "accepted",
    agreementId: input.agreementId ?? existing?.agreementId,
    joinedAt: input.joinedAt ?? existing?.joinedAt ?? timestamp,
    updatedAt: timestamp
  };
  db.engagementContributors = [...(db.engagementContributors ?? []).filter((item) => item.id !== next.id), next];
  syncEngagementContributorIds(db);
  return next;
}

function syncEngagementContributorIds(db: Db) {
  db.engagements = (db.engagements ?? []).map((engagement) => {
    const contributors = (db.engagementContributors ?? []).filter((item) => item.engagementId === engagement.id && !["removed", "rejected"].includes(item.status));
    return {
      ...engagement,
      contributorIds: contributors.map((item) => item.id),
      teamSize: contributors.length,
      updatedAt: contributors.reduce((latest, item) => item.updatedAt > latest ? item.updatedAt : latest, engagement.updatedAt)
    };
  });
}

function inferredRoleForGig(gig: ContractorGigDto) {
  const focus = gig.verticals[0] ?? gig.category;
  if (focus === "writing-reporting") return "Reporter";
  if (focus === "media-production") return "Production Support";
  if (focus === "research-analysis-advisory") return "Researcher";
  if (focus === "local-sourcing-fixer-work") return "Local Fixer";
  if (focus === "security-coordination") return "Security Coordinator";
  if (focus === "executive-assistance-coordination") return "Executive Assistant";
  if (focus === "events-staffing") return "Event Staff";
  if (focus === "technical-support-advisory") return "Technical Advisor";
  if (gig.requiredSkills.some((skill) => /driver|transport|route/i.test(skill))) return "Driver";
  return "Contributor";
}

function normalizeVisibilityMode(value: unknown): EngagementVisibilityMode {
  return value === "operational_team" || value === "full_collaboration" ? value : "compartmentalized";
}

function visibilityDefaults(mode: EngagementVisibilityMode): { rosterVisibilityLevel: ParticipantVisibilityLevel; contributorDmEnabled: boolean; visibilityLevel: ParticipantVisibilityLevel; dmPermission: ContributorMessagingPermission; disclosureState: DisclosureState } {
  if (mode === "full_collaboration") {
    return { rosterVisibilityLevel: "full_profile", contributorDmEnabled: true, visibilityLevel: "full_profile", dmPermission: "engagement_dm_enabled", disclosureState: "expanded" };
  }
  if (mode === "operational_team") {
    return { rosterVisibilityLevel: "limited_profile", contributorDmEnabled: false, visibilityLevel: "limited_profile", dmPermission: "room_only", disclosureState: "operational" };
  }
  return { rosterVisibilityLevel: "role_only", contributorDmEnabled: false, visibilityLevel: "role_only", dmPermission: "room_only", disclosureState: "minimal" };
}

function updateEngagementVisibility(db: Db, session: RelaiSession, engagementId: string, body: Record<string, unknown>) {
  const engagement = requireEmployerEngagement(db, session, engagementId);
  const visibilityMode = normalizeVisibilityMode(body.visibilityMode);
  const defaults = visibilityDefaults(visibilityMode);
  db.engagements = (db.engagements ?? []).map((item) => item.id === engagement.id ? {
    ...item,
    visibilityMode,
    contributorDmEnabled: defaults.contributorDmEnabled,
    rosterVisibilityLevel: defaults.rosterVisibilityLevel,
    updatedAt: now()
  } : item);
  syncCoordinationRoomParticipants(db, engagement.id);
  return db;
}

function requireEmployerEngagement(db: Db, session: RelaiSession, engagementId: string) {
  const engagement = db.engagements?.find((item) => item.id === engagementId) ?? upsertEngagementForGig(db, requireGig(db, engagementId));
  if (session.role !== "admin" && !sameWallet(engagement.employerWallet, session.walletAddress)) throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: employer engagement scope mismatch");
  return engagement;
}

function requireEmployerTeam(db: Db, session: RelaiSession, engagementId: string): EngagementTeamSummaryDto {
  const engagement = requireEmployerEngagement(db, session, engagementId);
  const contributors = (db.engagementContributors ?? [])
    .filter((item) => item.engagementId === engagementId && item.status !== "removed")
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return {
    engagementId,
    teamSize: contributors.filter((item) => !["rejected", "removed"].includes(item.status)).length,
    acceptedCount: contributors.filter((item) => ["accepted", "active", "completed"].includes(item.status)).length,
    activeCount: contributors.filter((item) => item.status === "active").length,
    pendingCount: contributors.filter((item) => ["invited", "applied"].includes(item.status)).length,
    visibilityMode: normalizeVisibilityMode(engagement.visibilityMode),
    contributorDmEnabled: engagement.contributorDmEnabled,
    rosterVisibilityLevel: engagement.rosterVisibilityLevel,
    contributors
  } as EngagementTeamSummaryDto & Pick<EngagementDto, "visibilityMode" | "contributorDmEnabled" | "rosterVisibilityLevel">;
}

function addEngagementContributor(db: Db, session: RelaiSession, engagementId: string, body: Record<string, unknown>) {
  const engagement = requireEmployerEngagement(db, session, engagementId);
  const gig = requireGig(db, engagement.id);
  const contributorWallet = stringBody(body.contributorWallet, "contributorWallet");
  const assignedRole = optionalString(body.assignedRole) ?? optionalString(body.role) ?? inferredRoleForGig(gig);
  const agreementId = optionalString(body.agreementId);
  if (agreementId) requireEmployerAgreement(db, session, agreementId);
  if (!gig.applicantWallets.some((item) => sameWallet(item, contributorWallet))) {
    db.gigs = db.gigs.map((item) => item.id === engagementId ? { ...item, applicantWallets: [...item.applicantWallets, contributorWallet], updatedAt: now() } : item);
  }
  upsertEngagementContributor(db, { engagementId, contributorWallet, assignedRole, agreementId, status: "accepted" });
  createCoordinationRoom(db, session, engagementId);
  syncCoordinationRoomParticipants(db, engagementId);
  return db;
}

function updateEngagementContributor(db: Db, session: RelaiSession, engagementId: string, contributorId: string, body: Record<string, unknown>) {
  requireEmployerEngagement(db, session, engagementId);
  const existing = (db.engagementContributors ?? []).find((item) => item.engagementId === engagementId && item.id === contributorId);
  if (!existing) throw new RouteError(404, "Engagement contributor not found");
  const status = optionalString(body.status) as EngagementContributorStatus | undefined;
  const validStatuses: EngagementContributorStatus[] = ["invited", "applied", "accepted", "rejected", "active", "removed", "completed"];
  if (status && !validStatuses.includes(status)) throw new RouteError(400, "Invalid engagement contributor status");
  upsertEngagementContributor(db, {
    ...existing,
    assignedRole: optionalString(body.assignedRole) ?? existing.assignedRole,
    status: status ?? existing.status
  });
  syncCoordinationRoomParticipants(db, engagementId);
  return db;
}

function removeEngagementContributor(db: Db, session: RelaiSession, engagementId: string, contributorId: string) {
  const engagement = requireEmployerEngagement(db, session, engagementId);
  if (["in_progress", "completed"].includes(engagement.status)) throw new RouteError(409, "Active engagement contributors cannot be removed through Phase 1 team management");
  const existing = (db.engagementContributors ?? []).find((item) => item.engagementId === engagementId && item.id === contributorId);
  if (!existing) throw new RouteError(404, "Engagement contributor not found");
  upsertEngagementContributor(db, { ...existing, status: "removed" });
  syncEngagementContributorIds(db);
  syncCoordinationRoomParticipants(db, engagementId);
  return db;
}

function listContributorEngagements(db: Db, contributorWallet: string) {
  return (db.engagementContributors ?? [])
    .filter((item) => sameWallet(item.contributorWallet, contributorWallet) && !["removed", "rejected"].includes(item.status))
    .map((assignment) => contributorSafeEngagement(db, assignment));
}

function requireContributorEngagement(db: Db, contributorWallet: string, engagementId: string) {
  const assignment = (db.engagementContributors ?? []).find((item) => item.engagementId === engagementId && sameWallet(item.contributorWallet, contributorWallet) && !["removed", "rejected"].includes(item.status));
  if (!assignment) throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: contributor engagement scope mismatch");
  return contributorSafeEngagement(db, assignment);
}

function contributorSafeEngagement(db: Db, assignment: EngagementContributorDto) {
  const engagement = db.engagements?.find((item) => item.id === assignment.engagementId) ?? upsertEngagementForGig(db, requireGig(db, assignment.engagementId));
  return {
    engagement: {
      id: engagement.id,
      title: engagement.title,
      operationalFocus: engagement.operationalFocus,
      descriptionPreview: engagement.descriptionPreview,
      status: engagement.status,
      employerWallet: engagement.employerWallet,
      teamSize: engagement.teamSize,
      multiContributor: engagement.teamSize > 1
    },
    assignment,
    visibility: {
      teamRosterVisible: false,
      guidance: "You are part of a multi-contributor engagement. Team coordination features will unlock later."
    }
  };
}

function ensureCoordinationRoomCollections(db: Db) {
  db.coordinationRooms = Array.isArray(db.coordinationRooms) ? db.coordinationRooms : [];
  db.coordinationRoomParticipants = Array.isArray(db.coordinationRoomParticipants) ? db.coordinationRoomParticipants : [];
  db.coordinationMessages = Array.isArray(db.coordinationMessages) ? db.coordinationMessages : [];
  for (const room of db.coordinationRooms) {
    syncCoordinationRoomParticipants(db, room.engagementId);
  }
}

function createCoordinationRoom(db: Db, session: RelaiSession, engagementId: string) {
  const engagement = requireEmployerEngagement(db, session, engagementId);
  const existing = db.coordinationRooms?.find((room) => room.engagementId === engagement.id && room.roomType === "engagement_group");
  if (existing) {
    syncCoordinationRoomParticipants(db, engagement.id);
    return { room: existing, roster: roomRoster(db, existing) };
  }
  const timestamp = now();
  const room: CoordinationRoomDto = {
    id: `room_${engagement.id}`,
    engagementId: engagement.id,
    employerWallet: engagement.employerWallet,
    roomType: "engagement_group",
    title: `${engagement.title} coordination`,
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp
  };
  db.coordinationRooms = [...(db.coordinationRooms ?? []), room];
  syncCoordinationRoomParticipants(db, engagement.id);
  return { room, roster: roomRoster(db, room) };
}

function syncCoordinationRoomParticipants(db: Db, engagementId: string) {
  if (!Array.isArray(db.coordinationRooms) || !Array.isArray(db.coordinationRoomParticipants)) return;
  const room = db.coordinationRooms.find((item) => item.engagementId === engagementId && item.roomType === "engagement_group");
  if (!room) return;
  const engagement = db.engagements?.find((item) => item.id === engagementId) ?? upsertEngagementForGig(db, requireGig(db, engagementId));
  const defaults = visibilityDefaults(normalizeVisibilityMode(engagement.visibilityMode));
  const timestamp = now();
  upsertCoordinationParticipant(db, {
    roomId: room.id,
    engagementId,
    walletAddress: engagement.employerWallet,
    handle: getEmployerProfile(db, engagement.employerWallet).employerHandle,
    participantType: "employer",
    assignedRole: "Hiring lead",
    status: "active",
    visibilityLevel: "full_profile",
    dmPermission: "engagement_dm_enabled",
    disclosureState: "expanded",
    joinedAt: room.createdAt
  });

  for (const contributor of db.engagementContributors ?? []) {
    if (contributor.engagementId !== engagementId) continue;
    const participantStatus = ["accepted", "active", "completed"].includes(contributor.status) ? "active" : contributor.status === "removed" || contributor.status === "rejected" ? "removed" : "pending";
    upsertCoordinationParticipant(db, {
      roomId: room.id,
      engagementId,
      walletAddress: contributor.contributorWallet,
      handle: contributor.contributorHandle,
      participantType: "contributor",
      assignedRole: contributor.assignedRole,
      status: participantStatus,
      visibilityLevel: defaults.visibilityLevel,
      dmPermission: defaults.dmPermission,
      disclosureState: defaults.disclosureState,
      joinedAt: contributor.joinedAt,
      removedAt: participantStatus === "removed" ? timestamp : undefined
    });
  }

  const validWallets = new Set([
    engagement.employerWallet.toLowerCase(),
    ...(db.engagementContributors ?? []).filter((item) => item.engagementId === engagementId).map((item) => item.contributorWallet.toLowerCase())
  ]);
  db.coordinationRoomParticipants = db.coordinationRoomParticipants.map((participant) =>
    participant.roomId === room.id && !validWallets.has(participant.walletAddress.toLowerCase())
      ? { ...participant, status: "removed", removedAt: participant.removedAt ?? timestamp }
      : participant
  );
  db.coordinationRooms = db.coordinationRooms.map((item) => item.id === room.id ? { ...item, updatedAt: timestamp } : item);
}

function upsertCoordinationParticipant(db: Db, input: Omit<CoordinationRoomParticipantDto, "id"> & { id?: string }) {
  const existing = db.coordinationRoomParticipants?.find((item) => item.roomId === input.roomId && sameWallet(item.walletAddress, input.walletAddress));
  const next: CoordinationRoomParticipantDto = {
    ...input,
    id: existing?.id ?? input.id ?? `rp_${input.roomId}_${input.walletAddress.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    visibilityLevel: input.visibilityLevel ?? existing?.visibilityLevel ?? "role_only",
    dmPermission: input.dmPermission ?? existing?.dmPermission ?? "room_only",
    disclosureState: input.disclosureState ?? existing?.disclosureState ?? "minimal",
    lastReadAt: existing?.lastReadAt ?? input.lastReadAt,
    removedAt: input.removedAt ?? (input.status === "removed" ? existing?.removedAt ?? now() : undefined)
  };
  db.coordinationRoomParticipants = [...(db.coordinationRoomParticipants ?? []).filter((item) => item.id !== next.id), next];
  return next;
}

function requireCoordinationRoomAccess(db: Db, session: RelaiSession, engagementId: string) {
  let room = db.coordinationRooms?.find((item) => item.engagementId === engagementId && item.roomType === "engagement_group");
  if (!room && (session.role === "employer" || session.role === "admin")) {
    room = createCoordinationRoom(db, session, engagementId).room;
  }
  if (!room) throw new RouteError(404, "Coordination room not found");
  return { room: requireCoordinationRoomById(db, session, room.id) };
}

function requireCoordinationRoomById(db: Db, session: RelaiSession, roomId: string) {
  const room = db.coordinationRooms?.find((item) => item.id === roomId);
  if (!room) throw new RouteError(404, "Coordination room not found");
  syncCoordinationRoomParticipants(db, room.engagementId);
  if (session.role === "admin") return room;
  if (sameWallet(room.employerWallet, session.walletAddress)) return room;
  const participant = (db.coordinationRoomParticipants ?? []).find((item) => item.roomId === room.id && sameWallet(item.walletAddress, session.walletAddress));
  if (!participant || participant.status !== "active") throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: coordination room scope mismatch");
  return room;
}

function roomRoster(db: Db, room: CoordinationRoomDto, session?: RelaiSession) {
  const engagement = db.engagements?.find((item) => item.id === room.engagementId);
  const mode = normalizeVisibilityMode(engagement?.visibilityMode);
  const allParticipants = (db.coordinationRoomParticipants ?? [])
    .filter((participant) => participant.roomId === room.id && participant.status === "active")
    .sort((a, b) => a.participantType === b.participantType ? a.joinedAt.localeCompare(b.joinedAt) : a.participantType === "employer" ? -1 : 1);
  const isEmployerView = !session || session.role === "admin" || sameWallet(room.employerWallet, session.walletAddress);
  const visibleParticipants = isEmployerView
    ? allParticipants
    : allParticipants.filter((participant) => {
        if (participant.participantType === "employer") return true;
        if (sameWallet(participant.walletAddress, session.walletAddress)) return true;
        return mode !== "compartmentalized";
      }).map((participant) => shapeParticipantForVisibility(participant, mode, session.walletAddress));
  return {
    roomId: room.id,
    engagementId: room.engagementId,
    visibilityMode: mode,
    dmEnabled: isEmployerView ? true : mode === "full_collaboration",
    participants: visibleParticipants,
    activeCount: visibleParticipants.length,
    contributorCount: visibleParticipants.filter((participant) => participant.participantType === "contributor").length
  };
}

function shapeParticipantForVisibility(participant: CoordinationRoomParticipantDto, mode: EngagementVisibilityMode, viewerWallet: string): CoordinationRoomParticipantDto {
  if (participant.participantType === "employer") return { ...participant, dmPermission: "room_only" };
  if (sameWallet(participant.walletAddress, viewerWallet) || mode === "full_collaboration") return participant;
  if (mode === "operational_team") {
    return {
      ...participant,
      handle: participant.aliasOverride ?? participant.handle,
      visibilityLevel: "limited_profile",
      dmPermission: "room_only",
      disclosureState: "operational"
    };
  }
  return {
    ...participant,
    walletAddress: "hidden",
    handle: participant.aliasOverride ?? "Engagement participant",
    visibilityLevel: "role_only",
    dmPermission: "disabled",
    disclosureState: "minimal"
  };
}

function sendCoordinationMessage(db: Db, session: RelaiSession, roomId: string, body: Record<string, unknown>) {
  const room = requireCoordinationRoomById(db, session, roomId);
  if (typeof body.text === "string" || typeof body.plaintext === "string" || typeof body.message === "string") throw new RouteError(400, "plaintext message body is not accepted");
  const encryptedPayload = stringBody(body.encryptedPayload, "encryptedPayload");
  if (!isEncryptedEnvelopeString(encryptedPayload)) throw new RouteError(400, "encryptedPayload must be a Relai encrypted envelope");
  const participant = (db.coordinationRoomParticipants ?? []).find((item) => item.roomId === room.id && sameWallet(item.walletAddress, session.walletAddress));
  if (!participant && !sameWallet(room.employerWallet, session.walletAddress) && session.role !== "admin") throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: coordination room sender scope mismatch");
  const senderHandle = participant?.handle ?? getEmployerProfile(db, session.walletAddress).employerHandle;
  const senderRole = participant?.assignedRole ?? "Hiring lead";
  const message: CoordinationMessageDto = {
    id: newId("room_msg"),
    roomId: room.id,
    engagementId: room.engagementId,
    senderWallet: session.walletAddress,
    senderHandle,
    senderRole,
    encryptedPayload,
    attachmentRefs: Array.isArray(body.attachmentRefs) ? body.attachmentRefs.map(String).filter((ref) => ref.startsWith("encrypted-attachment://") || ref.startsWith("local-attachment://mock")) : [],
    createdAt: now(),
    readReceipts: { [session.walletAddress]: now() }
  };
  db.coordinationMessages = [...(db.coordinationMessages ?? []), message];
  db.coordinationRooms = (db.coordinationRooms ?? []).map((item) => item.id === room.id ? { ...item, updatedAt: message.createdAt } : item);
  db.notifications.unshift(makeNotification("message_received", "Team message", "You have a new secure message.", "message", message.id, "#coordination-room", true));
  return { room, message, messages: db.coordinationMessages.filter((item) => item.roomId === room.id) };
}

function markCoordinationRoomRead(db: Db, session: RelaiSession, roomId: string) {
  const room = requireCoordinationRoomById(db, session, roomId);
  const timestamp = now();
  db.coordinationRoomParticipants = (db.coordinationRoomParticipants ?? []).map((participant) =>
    participant.roomId === room.id && sameWallet(participant.walletAddress, session.walletAddress) ? { ...participant, lastReadAt: timestamp } : participant
  );
  db.coordinationMessages = (db.coordinationMessages ?? []).map((message) =>
    message.roomId === room.id ? { ...message, readReceipts: { ...(message.readReceipts ?? {}), [session.walletAddress]: timestamp } } : message
  );
  return db;
}

function sendEngagementDm(db: Db, session: RelaiSession, engagementId: string, recipientWallet: string, body: Record<string, unknown>) {
  const engagement = db.engagements?.find((item) => item.id === engagementId) ?? upsertEngagementForGig(db, requireGig(db, engagementId));
  if (normalizeVisibilityMode(engagement.visibilityMode) !== "full_collaboration" || !engagement.contributorDmEnabled) {
    throw new AuthError("FORBIDDEN", 403, "FORBIDDEN: contributor DMs require full collaboration visibility");
  }
  const senderAssignment = (db.engagementContributors ?? []).find((item) => item.engagementId === engagementId && sameWallet(item.contributorWallet, session.walletAddress) && ["accepted", "active", "completed"].includes(item.status));
  const recipientAssignment = (db.engagementContributors ?? []).find((item) => item.engagementId === engagementId && sameWallet(item.contributorWallet, recipientWallet) && ["accepted", "active", "completed"].includes(item.status));
  if (!senderAssignment || !recipientAssignment) throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: engagement DM participant scope mismatch");
  if (typeof body.text === "string" || typeof body.plaintext === "string" || typeof body.message === "string") throw new RouteError(400, "plaintext message body is not accepted");
  const encryptedPayload = stringBody(body.encryptedPayload, "encryptedPayload");
  if (!isEncryptedEnvelopeString(encryptedPayload)) throw new RouteError(400, "encryptedPayload must be a Relai encrypted envelope");
  const sorted = [session.walletAddress, recipientWallet].map((item) => item.toLowerCase().replace(/[^a-z0-9]+/g, "_")).sort().join("_");
  const roomId = `dm_${engagementId}_${sorted}`;
  let room = db.coordinationRooms?.find((item) => item.id === roomId);
  if (!room) {
    const timestamp = now();
    room = {
      id: roomId,
      engagementId,
      employerWallet: engagement.employerWallet,
      roomType: "engagement_dm",
      title: `${senderAssignment.assignedRole} / ${recipientAssignment.assignedRole}`,
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    db.coordinationRooms = [...(db.coordinationRooms ?? []), room];
    upsertCoordinationParticipant(db, {
      roomId,
      engagementId,
      walletAddress: senderAssignment.contributorWallet,
      handle: senderAssignment.contributorHandle,
      participantType: "contributor",
      assignedRole: senderAssignment.assignedRole,
      status: "active",
      visibilityLevel: "full_profile",
      dmPermission: "engagement_dm_enabled",
      disclosureState: "expanded",
      joinedAt: timestamp
    });
    upsertCoordinationParticipant(db, {
      roomId,
      engagementId,
      walletAddress: recipientAssignment.contributorWallet,
      handle: recipientAssignment.contributorHandle,
      participantType: "contributor",
      assignedRole: recipientAssignment.assignedRole,
      status: "active",
      visibilityLevel: "full_profile",
      dmPermission: "engagement_dm_enabled",
      disclosureState: "expanded",
      joinedAt: timestamp
    });
  }
  const message: CoordinationMessageDto = {
    id: newId("dm_msg"),
    roomId,
    engagementId,
    senderWallet: session.walletAddress,
    senderHandle: senderAssignment.contributorHandle,
    senderRole: senderAssignment.assignedRole,
    encryptedPayload,
    attachmentRefs: Array.isArray(body.attachmentRefs) ? body.attachmentRefs.map(String).filter((ref) => ref.startsWith("encrypted-attachment://") || ref.startsWith("local-attachment://mock")) : [],
    createdAt: now(),
    readReceipts: { [session.walletAddress]: now() }
  };
  db.coordinationMessages = [...(db.coordinationMessages ?? []), message];
  return { room, message };
}

function seedDb(): Db {
  const timestamp = now();
  const profile: ContractorProfileDto = normalizeProfile({
    walletAddress: wallet,
    handle: "K-914",
    publicKey: "x25519_mock_api_k914",
    signingPublicKey: "ed25519_mock_api_k914",
    publicFields: {
      initials: "K",
      approximateRegion: "NYC-03",
      rating: 4.96,
      trustScore: 98,
      levelName: "Trusted contributor"
    },
    encryptedPrivateBlobRef: "local-encrypted-profile://k914",
    level: 5,
    xp: 8420,
    xpNext: 10000,
    streakDays: 19,
    trustScore: 98,
    verticals: ["logistics-transport", "executive-assistance-coordination"],
    skills: ["Transport", "Route planning", "Inventory movement", "Coordination", "Scheduling", "Photo proof"],
    engagementPreferences: [
      { structure: "day_rate", ratePreview: "$650/day", visibility: "after_application" },
      { structure: "flat_fee", ratePreview: "$800-$1,500/project", visibility: "agreement_only" },
      { structure: "open_proposal", ratePreview: "Depends on scope", visibility: "public" }
    ],
    rateVisibility: "after_application",
    customSkills: [],
    useCasePreferences: ["Transport coordination", "Inventory movement", "Route planning", "Operational administration"],
    categories: ["logistics-transport", "executive-assistance-coordination"],
    serviceCategories: ["logistics-transport", "executive-assistance-coordination"],
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
  });
  const gigs = seedGigs(timestamp);
  const agreement = seedAgreement(timestamp);
  const escrow = feeEscrow(agreement.id, gigs[0].pay, "funded", undefined, agreement);
  return {
    profile,
    gigs,
    recommendations: scoreGigs({ profile, gigs } as Db, wallet),
    threads: [{
      id: "thread_dock",
      participantWallets: [wallet, employerWallet],
      gigId: "dock",
      agreementId: "agr_dock",
      lastMessagePreview: makeServerEncryptedEnvelope("gate-details").slice(0, 28),
      unreadCount: 0,
      updatedAt: timestamp
    }],
    messages: [
      encryptedMessage("msg_employer_1", "thread_dock", employerWallet, makeServerEncryptedEnvelope("seed-message-employer")),
      encryptedMessage("msg_worker_1", "thread_dock", wallet, makeServerEncryptedEnvelope("seed-message-contractor"))
    ],
    agreement,
    escrow,
    payoutHistory: [{ id: "pay_seed", walletAddress: wallet, agreementId: agreement.id, label: "Prior payout", amount: 214, status: "released", createdAt: timestamp }],
    notifications: [
      makeNotification("gig_matched", "Priority gig nearby", "Inventory movement support is a 96% fit.", "gig", "dock", "#mobile-gigs"),
      makeNotification("escrow_funded", "Escrow funded", "$148 is locked for Harbor Supply.", "payment", agreement.id, "#mobile-pay")
    ],
    employerProfiles: [normalizeEmployerProfile({ walletAddress: employerWallet })],
    trustEndorsements: [{ id: "endorse_seed", fromWallet: employerWallet, toWallet: wallet, agreementId: agreement.id, encryptedNoteRef: "encrypted-endorsement://seed", createdAt: timestamp, visibility: "agreement_scoped" }],
    moderationReports: [],
    accountSecurity: [],
    betaInvites: seedBetaInvites(timestamp),
    betaFeedback: [],
    betaAnalyticsEvents: [],
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
    gig("dock", "Same-day inventory movement support", "Harbor Supply Node", "logistics-transport", ["logistics-transport"], "surge", 1.2, "21:00", 148, 4, ["Transport", "Inventory movement", "Coordination"], true, timestamp, "local", { engagementStructure: "day_rate", rateAmount: 650, ratePreview: "$650/day", estimatedDuration: "one_day" }),
    gig("fixture", "Executive office coordination support", "Northline Retail", "executive-assistance-coordination", ["executive-assistance-coordination"], "priority", 0.6, "18:30", 92, 3, ["Scheduling", "Operational administration", "Coordination"], true, timestamp, "local", { engagementStructure: "hourly", rateAmount: 75, ratePreview: "$75/hour", estimatedDuration: "several_days" }),
    gig("event", "Private event staffing lead", "Civic Hall Ops", "events-staffing", ["events-staffing"], "standard", 2.8, "23:15", 225, 6, ["Event operations", "Temporary staffing", "Coordination"], false, timestamp, "local", { engagementStructure: "day_rate", rateAmount: 525, ratePreview: "$525/day", estimatedDuration: "one_day" }),
    gig("model", "Confidential research and analysis review", "Private advisory desk", "research-analysis-advisory", ["research-analysis-advisory"], "priority", 0, "Remote", 420, 3, ["Research", "Analysis", "Financial modeling"], true, timestamp, "remote", { engagementStructure: "flat_fee", rateAmount: 420, ratePreview: "$420 flat fee", estimatedDuration: "single_task" })
  ];
}

function gig(id: string, title: string, client: string, category: string, verticals: string[], urgency: ContractorGigDto["urgency"], distanceMiles: number, timeWindow: string, pay: number, requiredLevel: number, requiredSkills: string[], escrowRequired: boolean, timestamp: string, locationMode: ContractorGigDto["locationMode"] = "local", engagement: Partial<ContractorGigDto> = {}): ContractorGigDto {
  return {
    id,
    title,
    client,
    employerWallet,
    category,
    verticals,
    descriptionPreview: `${title} for ${client}`,
    encryptedDetailsRef: `local-encrypted-gig://${id}`,
    pay,
    currency: "USD",
    engagementStructure: normalizeEngagementStructure(engagement.engagementStructure),
    rateAmount: typeof engagement.rateAmount === "number" ? engagement.rateAmount : pay,
    rateCurrency: "USD",
    ratePreview: engagement.ratePreview,
    estimatedDuration: engagement.estimatedDuration as ContractorGigDto["estimatedDuration"],
    proposalNotes: engagement.proposalNotes,
    distanceMiles,
    locationMode,
    coordinates: { lat: 40.72 + distanceMiles / 100, lng: -74.0 },
    timeWindow,
    urgency,
    requiredLevel,
    requiredSkills,
    status: "available",
    escrowRequired,
    applicantWallets: [],
    contractorWallet: undefined,
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
    engagementStructure: "day_rate",
    rateAmount: 650,
    rateCurrency: "USD",
    estimatedDuration: "one_day",
    paymentSchedule: "Single protected settlement",
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
  const profileSkills = new Set([...db.profile.skills, ...db.profile.customSkills].map((item) => item.toLowerCase()));
  const profileVerticals = new Set(db.profile.verticals.map((item) => normalizeOperationalFocusId(item)));
  return db.gigs.map((gig) => {
    const gigVerticals = (gig.verticals.length ? gig.verticals : [gig.category]).map((item) => normalizeOperationalFocusId(item));
    const matchedVertical = gigVerticals.find((vertical) => profileVerticals.has(vertical));
    const matchedSkills = gig.requiredSkills.filter((skill) => profileSkills.has(skill.toLowerCase()));
    const preferredStructures = new Set((db.profile.engagementPreferences ?? []).map((item) => normalizeEngagementStructure(item.structure)));
    const focusPreferredStructures = preferredEngagementStructuresForFocus(gigVerticals[0] ?? gig.category);
    const requestStructure = normalizeEngagementStructure(gig.engagementStructure);
    const engagementFit = preferredStructures.has(requestStructure) ? 8 : focusPreferredStructures.includes(requestStructure) ? 5 : 2;
    const missingSkills = gig.requiredSkills.filter((skill) => !profileSkills.has(skill.toLowerCase()));
    const verticalFit = matchedVertical ? 14 : 4;
    const skillFit = gig.requiredSkills.length ? Math.round((matchedSkills.length / gig.requiredSkills.length) * 22) : 10;
    const proximity = gig.locationMode === "remote" ? (db.profile.workPreference !== "local" ? 16 : 8) : gig.distanceMiles < 1 ? 16 : gig.distanceMiles < 3 ? 13 : 8;
    const levelEligibility = db.profile.level >= gig.requiredLevel ? 16 : 3;
    const rating = Math.min(10, Math.round(db.profile.publicFields.rating * 2));
    const availability = db.profile.availability === "ready_now" ? 10 : db.profile.availability === "available_today" ? 7 : 2;
    const completionHistory = Math.min(10, Math.round(db.profile.trustScore / 10));
    const priceFit = gig.pay >= 200 ? 10 : gig.pay >= 100 ? 8 : 6;
    const responseSpeed = db.profile.streakDays > 10 ? 8 : 5;
    const totalScore = Math.min(100, verticalFit + skillFit + proximity + levelEligibility + rating + availability + completionHistory + priceFit + responseSpeed + engagementFit);
    const missingRequirements = [
      ...(db.profile.level < gig.requiredLevel ? [`Requires Level ${gig.requiredLevel}`] : []),
      ...missingSkills.map((skill) => `Missing skill: ${skill}`),
      ...(gig.verticals.includes("private-security-risk") && db.profile.licenses.length === 0 ? ["Requires verified license later"] : [])
    ];
    const whyMatched = [
      ...(matchedVertical ? [`Matched because you selected ${operationalFocusLabel(matchedVertical)}.`] : []),
      ...(matchedSkills.length ? [`Matched skills: ${matchedSkills.slice(0, 3).join(", ")}.`] : []),
      ...(engagementFit >= 5 ? [`Engagement structure fits: ${engagementStructureLabel(requestStructure)}.`] : []),
      ...(gig.locationMode === "remote" && db.profile.workPreference !== "local" ? ["Matched because this is remote and fits your work preference."] : []),
      ...(db.profile.trustScore >= 90 ? ["Matched because your trust score qualifies you for private tasks."] : [])
    ];
    const suggestedUnlockActions = missingRequirements.length
      ? [
          ...(db.profile.level < gig.requiredLevel ? [`Complete ${Math.max(1, gig.requiredLevel - db.profile.level)} more verified request(s) to unlock Level ${gig.requiredLevel}.`] : []),
          ...missingSkills.slice(0, 2).map((skill) => `Add ${skill} to your skills or complete a verified proof.`),
          "Improve response time and complete profile verification when available."
        ]
      : ["Claim while escrow is funded", "Send ETA in encrypted chat"];
    const levelUnlockStatus: "eligible" | "locked" | "needs_profile_update" = db.profile.level >= gig.requiredLevel && missingSkills.length === 0 ? "eligible" : missingSkills.length ? "needs_profile_update" : "locked";
    return {
      gig,
      matchScore: {
        totalScore,
        confidenceScore: Math.min(98, totalScore + 4),
        scoreBreakdown: { verticalFit, skillFit, proximity, levelEligibility, rating, availability, completionHistory, priceFit, responseSpeed, engagementFit },
        whyMatched,
        explanation: whyMatched.length ? whyMatched.join(" ") : "Moderate fit based on availability, payout, and request proximity.",
        missingRequirements,
        suggestedActions: suggestedUnlockActions,
        suggestedUnlockActions,
        levelUnlockStatus,
        levelUnlock: db.profile.level < gig.requiredLevel ? { missingLevel: gig.requiredLevel, xpNeeded: Math.max(0, db.profile.xpNext - db.profile.xp), action: `Complete verified work to reach Level ${gig.requiredLevel}` } : undefined
      }
    };
  }).sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
}

function filterGigs(gigs: ContractorGigDto[], params: URLSearchParams, profile?: ContractorProfileDto) {
  const query = (params.get("keyword") ?? params.get("query") ?? "").toLowerCase();
  const minPay = Number(params.get("minPay") ?? 0);
  const maxPay = Number(params.get("maxPay") ?? Number.POSITIVE_INFINITY);
  const maxDistance = Number(params.get("distance") ?? Number.POSITIVE_INFINITY);
  const category = params.get("category") ?? "all";
  const vertical = params.get("vertical") ?? "all";
  const skill = (params.get("skill") ?? "").toLowerCase();
  const urgency = params.get("urgency") ?? "all";
  const locationMode = params.get("locationMode") ?? params.get("remoteLocal") ?? "all";
  const timeWindow = (params.get("timeWindow") ?? "").toLowerCase();
  const requiredLevel = Number(params.get("requiredLevel") ?? 0);
  const status = params.get("status") ?? "all";
  return gigs.filter((gig) => {
    const text = `${gig.title} ${gig.client} ${gig.requiredSkills.join(" ")} ${gig.verticals.join(" ")}`.toLowerCase();
    return (!query || text.includes(query)) &&
      (!skill || gig.requiredSkills.some((item) => item.toLowerCase().includes(skill))) &&
      gig.pay >= minPay && gig.pay <= maxPay &&
      gig.distanceMiles <= maxDistance &&
      (category === "all" || gig.category === category) &&
      (vertical === "all" || gig.verticals.includes(vertical)) &&
      (urgency === "all" || gig.urgency === urgency) &&
      (locationMode === "all" || gig.locationMode === locationMode) &&
      (!timeWindow || gig.timeWindow.toLowerCase().includes(timeWindow)) &&
      (!requiredLevel || gig.requiredLevel <= requiredLevel) &&
      (status === "all" ? !["closed", "cancelled"].includes(gig.status) : gig.status === status) &&
      (!profile || profile.level >= 0);
  });
}

function updateGigStatus(db: Db, gigId: string, status: ContractorGigStatus, walletAddress = wallet) {
  const validStatuses: ContractorGigStatus[] = ["available", "applied", "claimed", "in_progress", "completed", "disputed", "closed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new RouteError(400, "Invalid gig status");
  }
  const current = requireGig(db, gigId);
  const applicants = new Set(current.applicantWallets ?? []);
  if (status === "applied") {
    if (current.status !== "available" && current.status !== "applied") throw new RouteError(409, "Gig is not available for application");
    applicants.add(walletAddress);
  } else if (status === "claimed") {
    if (["in_progress", "completed", "disputed"].includes(current.status)) throw new RouteError(409, "Gig is not available to claim");
    if (current.contractorWallet && current.contractorWallet !== walletAddress) throw new RouteError(409, "Gig is already claimed by another contractor");
    applicants.add(walletAddress);
  } else if (status === "in_progress") {
    if (current.status !== "claimed" || current.contractorWallet !== walletAddress) throw new RouteError(409, "Gig must be claimed by this contractor before starting");
  } else if (status === "completed") {
    if (current.status !== "in_progress" || current.contractorWallet !== walletAddress) throw new RouteError(409, "Gig must be in progress before completion");
  } else if (status === "available" && current.status !== "available") {
    throw new RouteError(409, "Gig cannot return to available through contractor workflow");
  }
  const timestamp = now();
  db.gigs = db.gigs.map((gig) => gig.id === gigId ? {
    ...gig,
    status,
    applicantWallets: Array.from(applicants),
    contractorWallet: status === "claimed" || status === "in_progress" || status === "completed" ? walletAddress : gig.contractorWallet,
    updatedAt: timestamp
  } : gig);
  const gig = requireGig(db, gigId);
  db.escrow = feeEscrow(db.agreement.id, gig.pay, status === "completed" ? "pending_release" : "funded", db.escrow.fundedAt ?? timestamp, db.agreement);
  if (status === "completed" && !db.payoutHistory.some((item) => item.id === `pay_${db.agreement.id}_pending`)) {
    db.payoutHistory.unshift({ id: `pay_${db.agreement.id}_pending`, walletAddress, agreementId: db.agreement.id, label: "Pending payout", amount: db.escrow.netPayout, status: "pending_release", createdAt: timestamp });
  }
  db.notifications.unshift(makeNotification(status === "claimed" ? "agreement_ready" : "gig_matched", status === "claimed" ? "Agreement ready" : "Gig updated", `${gig.title} is now ${status.replace("_", " ")}.`, "gig", gigId, status === "claimed" ? "#mobile-agreement" : "#mobile-gigs"));
  db.recommendations = scoreGigs(db, walletAddress);
  return db;
}

function transitionAgreement(db: Db, agreementId: string, action: "accept" | "arrival" | "start" | "complete" | "approve", body: Record<string, unknown>) {
  if (db.agreement.id !== agreementId) throw new RouteError(404, "Agreement not found");
  const timestamp = optionalString(body.timestamp) ?? now();
  const walletAddress = optionalString(body.walletAddress) ?? db.profile.walletAddress;
  if (action === "accept") {
    if (db.agreement.status !== "draft" && db.agreement.status !== "accepted") throw new RouteError(409, "Agreement cannot be accepted from current state");
    db.agreement.status = "accepted";
    db.agreement.acceptedAt = timestamp;
    if (["available", "applied"].includes(requireGig(db, db.agreement.gigId).status)) updateGigStatus(db, db.agreement.gigId, "claimed", walletAddress);
  }
  if (action === "arrival") {
    if (db.agreement.status !== "accepted" && db.agreement.status !== "funded" && db.agreement.status !== "arrived") throw new RouteError(409, "Agreement must be accepted or funded before arrival");
    db.agreement.status = "arrived";
    db.agreement.arrivedAt = timestamp;
  }
  if (action === "start") {
    if (db.agreement.status !== "arrived" && db.agreement.status !== "in_progress") throw new RouteError(409, "Arrival must be recorded before work starts");
    db.agreement.status = "in_progress";
    db.agreement.startedAt = timestamp;
    if (requireGig(db, db.agreement.gigId).status !== "in_progress") updateGigStatus(db, db.agreement.gigId, "in_progress", walletAddress);
  }
  if (action === "complete") {
    return submitProof(db, agreementId, body);
  }
  if (action === "approve") {
    if (db.agreement.status !== "pending_employer_confirmation" && db.agreement.status !== "completion_submitted" && db.agreement.status !== "approved") throw new RouteError(409, "Agreement must be pending employer confirmation before approval");
    db.agreement.status = "approved";
    db.agreement.employerConfirmedAt = timestamp;
    db.escrow = feeEscrow(db.agreement.id, db.escrow.grossAmount, "released", db.escrow.fundedAt, db.agreement);
    db.payoutHistory = db.payoutHistory.map((item) => item.id === `pay_${db.agreement.id}_pending` ? { ...item, status: "released", label: "Released payout", amount: db.escrow.netPayout, releasedAt: timestamp } : item);
    if (!db.payoutHistory.some((item) => item.id === `pay_${db.agreement.id}_pending`)) db.payoutHistory.unshift({ id: `pay_${db.agreement.id}_pending`, walletAddress, agreementId: db.agreement.id, label: "Released payout", amount: db.escrow.netPayout, status: "released", createdAt: timestamp, releasedAt: timestamp } as any);
    db.notifications.unshift(makeNotification("payout_released", "Payout released", "Net payout and XP have been updated.", "payment", db.agreement.id, "#mobile-pay"));
    return db;
  }
  db.notifications.unshift(makeNotification("agreement_ready", "Agreement updated", `Agreement status is now ${db.agreement.status.replace("_", " ")}.`, "agreement", db.agreement.id, "#mobile-agreement"));
  return db;
}

function submitProof(db: Db, agreementId: string, body: Record<string, unknown>) {
  if (db.agreement.id !== agreementId) throw new RouteError(404, "Agreement not found");
  if (db.agreement.status !== "in_progress" && db.agreement.status !== "proof_submitted" && db.agreement.status !== "pending_employer_confirmation") throw new RouteError(409, "Work must be in progress before proof submission");
  const timestamp = optionalString(body.timestamp) ?? now();
  const walletAddress = optionalString(body.walletAddress) ?? db.profile.walletAddress;
  const proofRefs = Array.isArray(body.proofRefs) ? body.proofRefs.map(String) : [];
  const proofIds = Array.isArray(body.proofIds) ? body.proofIds.map(String) : [];
  const proofText = optionalString(body.proofText) ?? optionalString(body.proofNote) ?? makeServerEncryptedEnvelope("proof-submitted");
  if (!isEncryptedEnvelopeString(proofText)) throw new RouteError(400, "proofText must be a Relai encrypted envelope");
  const encryptedProof = normalizeEncryptedProof(body, walletAddress);
  const proofType = encryptedProof.proofType;
  const storedRefs = Array.from(new Set([...proofRefs, ...proofIds, encryptedProof.encryptedFileRef]));
  db.agreement.status = "pending_employer_confirmation";
  db.agreement.completedAt = timestamp;
  db.agreement.proofRefs.push(...(storedRefs.length ? storedRefs : [`local-proof://${proofType}/${newId("proof")}`]));
  db.agreement.proofNotes.push(proofText);
  updateGigStatus(db, db.agreement.gigId, "completed", walletAddress);
  db.escrow = feeEscrow(db.agreement.id, db.escrow.grossAmount, "pending_release", db.escrow.fundedAt, db.agreement);
  db.notifications.unshift(makeNotification("completion_approved", "Proof submitted", "Completion proof is waiting for employer confirmation.", "agreement", db.agreement.id, "#mobile-agreement"));
  return db;
}

function getEmployerProfile(db: Db, walletAddress: string) {
  return normalizeEmployerProfile(db.employerProfiles?.find((profile) => sameWallet(profile.walletAddress, walletAddress)) ?? { walletAddress });
}

function upsertEmployerProfile(db: Db, walletAddress: string, body: Record<string, unknown>) {
  const profile = normalizeEmployerProfile({ ...getEmployerProfile(db, walletAddress), ...(body as Partial<EmployerProfileDto>), walletAddress, updatedAt: now() });
  db.employerProfiles = [...(db.employerProfiles ?? []).filter((item) => !sameWallet(item.walletAddress, walletAddress)), profile];
  return db;
}

function normalizeEmployerProfile(profile: Partial<EmployerProfileDto>): EmployerProfileDto {
  const timestamp = now();
  const handle = optionalString(profile.employerHandle) ?? "harbor_supply";
  return {
    walletAddress: optionalString(profile.walletAddress) ?? employerWallet,
    employerHandle: handle,
    organizationName: optionalString(profile.organizationName) ?? "Harbor Supply Node",
    employerType: optionalString(profile.employerType) ?? "local_smb",
    region: optionalString(profile.region) ?? "NYC-03",
    disclosureSettings: typeof profile.disclosureSettings === "object" && profile.disclosureSettings ? profile.disclosureSettings : { showOrganization: true, showRegion: true, showSpendAuthority: true },
    trustScore: typeof profile.trustScore === "number" ? profile.trustScore : 97,
    createdAt: profile.createdAt ?? timestamp,
    updatedAt: profile.updatedAt ?? timestamp
  };
}

function createEmployerGig(db: Db, employer: string, body: Record<string, unknown>) {
  const timestamp = now();
  const engagementStructure = normalizeEngagementStructure(body.engagementStructure ?? body.compensationStructure);
  const pay = estimateEngagementGross(body, Number(body.rateAmount ?? body.compensation ?? body.pay ?? 148), engagementStructure);
  const title = stringBody(body.title, "title");
  const category = optionalString(body.category) ?? "logistics";
  const vertical = normalizeOperationalFocusId(optionalString(body.vertical) ?? category);
  const requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills.map(String) : ["Logistics"];
  const quote = dynamicPricingQuote({ ...body, compensation: pay, requiredSkills, engagementStructure });
  const employerProfile = getEmployerProfile(db, employer);
  const gig = {
    id: optionalString(body.id) ?? newId("gig"),
    title,
    client: employerProfile.organizationName ?? employerProfile.employerHandle,
    employerWallet: employer,
    category,
    verticals: [vertical],
    descriptionPreview: optionalString(body.descriptionPreview) ?? title,
    encryptedDetailsRef: optionalString(body.encryptedJobDetailsRef) ?? optionalString(body.encryptedDetailsRef) ?? "local-encrypted-gig://" + newId("details"),
    pay: pay || quote.suggestedCompensationRange.suggested,
    currency: "USD" as const,
    engagementStructure,
    rateAmount: Number(body.rateAmount ?? body.compensation ?? pay),
    rateCurrency: "USD" as const,
    ratePreview: optionalString(body.ratePreview) ?? engagementStructureLabel(engagementStructure),
    estimatedDuration: optionalString(body.estimatedDuration) as ContractorGigDto["estimatedDuration"],
    proposalNotes: optionalString(body.proposalNotes),
    distanceMiles: Number(body.distanceMiles ?? 1.2),
    locationMode: body.locationMode === "remote" ? "remote" as const : "local" as const,
    coordinates: { lat: 40.72, lng: -74.0 },
    timeWindow: optionalString(body.timeWindow) ?? "Flexible",
    urgency: body.urgency === "surge" || body.urgency === "priority" ? body.urgency : "standard" as const,
    requiredLevel: Number(body.requiredLevel ?? body.contractorLevel ?? 1),
    requiredSkills,
    status: body.lifecycleStatus === "draft" ? "draft" as const : "available" as const,
    escrowRequired: body.escrowRequired !== false,
    applicantWallets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    dynamicPricingQuote: quote,
    visibilityScope: optionalString(body.visibilityScope) ?? "minimal_public_metadata"
  };
  db.gigs.unshift(gig as ContractorGigDto);
  upsertEngagementForGig(db, gig as ContractorGigDto);
  return db;
}

function updateEmployerGig(db: Db, session: RelaiSession, gigId: string, body: Record<string, unknown>) {
  const current = requireEmployerGig(db, session, gigId);
  if (["closed", "cancelled"].includes(current.status)) throw new RouteError(409, "Closed or cancelled gigs cannot be edited");
  const nextPay = Number(body.compensation ?? body.pay ?? current.pay);
  const requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills.map(String) : current.requiredSkills;
  const engagementStructure = normalizeEngagementStructure(body.engagementStructure ?? current.engagementStructure);
  const quote = dynamicPricingQuote({ ...body, compensation: nextPay, requiredSkills, urgency: body.urgency ?? current.urgency, locationMode: body.locationMode ?? current.locationMode, requiredLevel: body.requiredLevel ?? current.requiredLevel, engagementStructure });
  db.gigs = db.gigs.map((gig) => gig.id === gigId ? normalizeGig({
    ...gig,
    title: optionalString(body.title) ?? gig.title,
    category: normalizeOperationalFocusId(optionalString(body.category) ?? gig.category),
    verticals: [normalizeOperationalFocusId(optionalString(body.vertical) ?? gig.verticals[0] ?? gig.category)],
    requiredSkills,
    pay: nextPay || quote.suggestedCompensationRange.suggested,
    engagementStructure,
    rateAmount: Number(body.rateAmount ?? current.rateAmount ?? nextPay),
    ratePreview: optionalString(body.ratePreview) ?? current.ratePreview,
    estimatedDuration: optionalString(body.estimatedDuration) as ContractorGigDto["estimatedDuration"] ?? current.estimatedDuration,
    proposalNotes: optionalString(body.proposalNotes) ?? current.proposalNotes,
    urgency: body.urgency === "surge" || body.urgency === "priority" || body.urgency === "standard" ? body.urgency : gig.urgency,
    locationMode: body.locationMode === "remote" ? "remote" : body.locationMode === "local" ? "local" : gig.locationMode,
    encryptedDetailsRef: optionalString(body.encryptedJobDetailsRef) ?? optionalString(body.encryptedDetailsRef) ?? gig.encryptedDetailsRef,
    updatedAt: now(),
    dynamicPricingQuote: quote
  } as ContractorGigDto) : gig);
  return db;
}

function setEmployerGigLifecycle(db: Db, session: RelaiSession, gigId: string, status: "closed" | "cancelled") {
  const gig = requireEmployerGig(db, session, gigId);
  if (["claimed", "in_progress", "completed"].includes(gig.status)) throw new RouteError(409, "Active gigs cannot be closed through this route");
  db.gigs = db.gigs.map((item) => item.id === gigId ? { ...item, status, updatedAt: now() } : item);
  return db;
}

function applicantSummary(db: Db, contractorWallet: string) {
  if (!sameWallet(contractorWallet, db.profile.walletAddress)) return { walletAddress: contractorWallet, handle: "Pseudonymous contributor", skills: [], verticals: [], trustScore: undefined };
  const preview = publicPreview(db.profile);
  return { walletAddress: contractorWallet, handle: preview.handle, skills: preview.skills, verticals: preview.verticals, trustScore: preview.trustScore, level: db.profile.level, availability: preview.availability };
}

function reviewApplicant(db: Db, session: RelaiSession, gigId: string, contractorWallet: string, action: "accept" | "reject") {
  const gig = requireEmployerGig(db, session, gigId);
  if (!gig.applicantWallets.some((walletAddress) => sameWallet(walletAddress, contractorWallet))) throw new RouteError(404, "Applicant not found");
  const existingPrimary = gig.contractorWallet;
  db.gigs = db.gigs.map((item) => item.id === gigId ? {
    ...item,
    status: action === "accept" ? "claimed" : item.status,
    contractorWallet: action === "accept" ? (existingPrimary ?? contractorWallet) : item.contractorWallet,
    applicantWallets: action === "reject" ? item.applicantWallets.filter((walletAddress) => !sameWallet(walletAddress, contractorWallet)) : item.applicantWallets,
    updatedAt: now()
  } : item);
  if (action === "accept") {
    createEmployerAgreement(db, session, gigId, { contractorWallet });
    upsertEngagementContributor(db, {
      engagementId: gigId,
      contributorWallet: contractorWallet,
      assignedRole: inferredRoleForGig(gig),
      status: "accepted",
      agreementId: db.agreement.id
    });
    createCoordinationRoom(db, session, gigId);
    syncCoordinationRoomParticipants(db, gigId);
  } else {
    const existing = db.engagementContributors?.find((item) => item.engagementId === gigId && sameWallet(item.contributorWallet, contractorWallet));
    if (existing) upsertEngagementContributor(db, { ...existing, status: "rejected" });
    syncCoordinationRoomParticipants(db, gigId);
  }
  return db;
}

function createEmployerAgreement(db: Db, session: RelaiSession, gigId: string, body: Record<string, unknown>) {
  const gig = requireEmployerGig(db, session, gigId);
  const contractorWallet = optionalString(body.contractorWallet) ?? gig.contractorWallet ?? gig.applicantWallets[0];
  if (!contractorWallet) throw new RouteError(400, "contractorWallet is required");
  if (gig.applicantWallets.length && !gig.applicantWallets.some((walletAddress) => sameWallet(walletAddress, contractorWallet))) throw new RouteError(409, "Contractor must be an applicant before agreement creation");
  db.agreement = {
    id: optionalString(body.agreementId) ?? "agr_" + gig.id,
    gigId: gig.id,
    employerWallet: session.walletAddress,
    contractorWallet,
    termsRef: optionalString(body.termsRef) ?? "local-encrypted-terms://agr_" + gig.id,
    termsPreview: Array.isArray(body.termsPreview) ? body.termsPreview.map(String) : ["Protected escrow required", "Completion proof required", "Employer review before release"],
    engagementStructure: normalizeEngagementStructure(body.engagementStructure ?? gig.engagementStructure),
    rateAmount: Number(body.rateAmount ?? gig.rateAmount ?? gig.pay),
    rateCurrency: "USD",
    estimatedDuration: optionalString(body.estimatedDuration) ?? gig.estimatedDuration,
    paymentSchedule: "Single protected settlement",
    proposalNotes: optionalString(body.proposalNotes) ?? gig.proposalNotes,
    status: "draft",
    proofRefs: [],
    proofNotes: []
  };
  db.escrow = feeEscrow(db.agreement.id, gig.pay, "not_funded", undefined, db.agreement);
  db.threads = db.threads.filter((thread) => thread.agreementId !== db.agreement.id);
  db.threads.unshift({ id: "thread_" + gig.id, participantWallets: [contractorWallet, session.walletAddress], gigId: gig.id, agreementId: db.agreement.id, lastMessagePreview: makeServerEncryptedEnvelope("agreement-created").slice(0, 28), unreadCount: 0, updatedAt: now() });
  upsertEngagementContributor(db, {
    engagementId: gig.id,
    contributorWallet: contractorWallet,
    assignedRole: optionalString(body.assignedRole) ?? inferredRoleForGig(gig),
    status: "accepted",
    agreementId: db.agreement.id
  });
  syncCoordinationRoomParticipants(db, gig.id);
  return db;
}


function createFundingIntent(db: Db, session: RelaiSession, agreementId: string) {
  const agreement = requireEmployerAgreement(db, session, agreementId);
  if (["funded", "pending_funding_tx"].includes(db.escrow.status)) throw new RouteError(409, "ESCROW_ALREADY_FUNDED");
  if (["cancelled", "disputed"].includes(agreement.status)) throw new RouteError(409, "INVALID_AGREEMENT_STATE");
  const contractAddress = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS ?? process.env.RELAI_ESCROW_CONTRACT_ADDRESS ?? "0xcE589bc7aDCc2Ca48Ac6B4683AF8f2B712FfC414";
  return {
    agreementId: agreement.id,
    chainAgreementId: process.env.RELAI_ESCROW_TEST_AGREEMENT_ID ?? chainAgreementIdFor(agreement.id),
    contractAddress,
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.CHAIN_ID ?? 84532),
    payee: process.env.NEXT_PUBLIC_ESCROW_TEST_PAYEE ?? process.env.ESCROW_TEST_PAYEE ?? "0x000000000000000000000000000000000000dEaD",
    amountEth: process.env.NEXT_PUBLIC_ESCROW_TEST_AMOUNT_ETH ?? process.env.ESCROW_TEST_AMOUNT_ETH ?? "0.00001"
  };
}

function recordFundingTxSubmitted(db: Db, session: RelaiSession, agreementId: string, body: Record<string, unknown>) {
  const agreement = requireEmployerAgreement(db, session, agreementId);
  const txHash = stringBody(body.txHash, "txHash");
  const walletAddress = stringBody(body.walletAddress, "walletAddress");
  if (!sameWallet(walletAddress, session.walletAddress)) throw new AuthError("FORBIDDEN", 403, "FORBIDDEN: funding wallet must match employer session");
  if (db.escrow.status === "funded" || db.escrow.status === "pending_funding_tx") throw new RouteError(409, "ESCROW_ALREADY_FUNDED");
  const timestamp = now();
  db.agreement = { ...agreement, status: agreement.status === "draft" ? "accepted" : agreement.status };
  db.escrow = {
    ...db.escrow,
    agreementId: agreement.id,
    status: "pending_funding_tx",
    chainId: Number(body.chainId ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.CHAIN_ID ?? db.escrow.chainId),
    txHash,
    updatedAt: timestamp
  };
  db.notifications.unshift(makeNotification("escrow_funded", "Escrow transaction submitted", "Base Sepolia transaction is waiting for indexer confirmation.", "payment", agreement.id, "#payments", true));
  return db;
}

function transitionEmployerAgreement(db: Db, session: RelaiSession, agreementId: string, action: string, body: Record<string, unknown>) {
  const agreement = requireEmployerAgreement(db, session, agreementId);
  const timestamp = now();
  if (action === "approve") {
    if (agreement.status !== "draft" && agreement.status !== "accepted") throw new RouteError(409, "Agreement cannot be approved from current state");
    agreement.status = "accepted";
    agreement.acceptedAt = agreement.acceptedAt ?? timestamp;
  } else if (action === "fund") {
    if (!["draft", "accepted", "funded"].includes(agreement.status)) throw new RouteError(409, "Agreement cannot be funded from current state");
    agreement.status = "funded";
    db.escrow = feeEscrow(agreement.id, Number(body.grossAmount ?? db.escrow.grossAmount), "funded", timestamp, agreement);
  } else if (action === "approve-completion") {
    if (!["pending_employer_confirmation", "pending_completion_approval", "proof_submitted", "completed"].includes(agreement.status)) throw new RouteError(409, "Completion is not ready for approval");
    agreement.status = "completed";
    agreement.employerConfirmedAt = timestamp;
    db.escrow = feeEscrow(agreement.id, db.escrow.grossAmount, "released", db.escrow.fundedAt, agreement);
  } else if (action === "request-revision") {
    if (!["pending_employer_confirmation", "pending_completion_approval", "proof_submitted", "revision_requested"].includes(agreement.status)) throw new RouteError(409, "Revision can only be requested after proof submission");
    agreement.status = "revision_requested";
    agreement.proofNotes.push(optionalString(body.note) && isEncryptedEnvelopeString(optionalString(body.note)) ? optionalString(body.note)! : makeServerEncryptedEnvelope("revision-requested"));
  } else if (action === "dispute") {
    agreement.status = "disputed";
    agreement.disputeId = agreement.disputeId ?? newId("dispute");
    db.escrow = feeEscrow(agreement.id, db.escrow.grossAmount, "disputed", db.escrow.fundedAt, agreement);
  } else {
    throw new RouteError(404, "Employer agreement action not found");
  }
  db.agreement = agreement;
  return db;
}

function requireEmployerGig(db: Db, session: RelaiSession, gigId: string) {
  const gig = requireGig(db, gigId);
  if (session.role !== "admin" && !sameWallet(gig.employerWallet, session.walletAddress)) throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: employer gig scope mismatch");
  return gig;
}

function requireEmployerAgreement(db: Db, session: RelaiSession, agreementId: string) {
  if (db.agreement.id !== agreementId) throw new RouteError(404, "Agreement not found");
  if (session.role !== "admin" && !sameWallet(db.agreement.employerWallet, session.walletAddress)) throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: employer agreement scope mismatch");
  return db.agreement;
}

function dynamicPricingQuote(input: Record<string, unknown>): DynamicPricingQuoteDto {
  const engagementStructure = normalizeEngagementStructure(input.engagementStructure);
  const base = Number(input.compensation ?? input.rateAmount ?? 120) || 120;
  const urgency = input.urgency === "surge" ? 1.35 : input.urgency === "priority" ? 1.18 : 1;
  const skills = Array.isArray(input.requiredSkills) ? input.requiredSkills.length : 1;
  const scarcity = Math.min(1.45, 1 + skills * 0.045 + Number(input.requiredLevel ?? input.contractorLevel ?? 1) * 0.025);
  const remote = input.locationMode === "remote" ? 0.96 : 1.04;
  const suggested = Math.round(base * urgency * scarcity * remote);
  const platformFee = Math.round(suggested * 0.082 * 100) / 100;
  return {
    suggestedCompensationRange: { minimum: Math.round(suggested * 0.82), suggested, premium: Math.round(suggested * 1.18) },
    urgencyMultiplier: urgency,
    scarcityMultiplier: Math.round(scarcity * 100) / 100,
    estimatedPlatformFee: platformFee,
    estimatedNetPayout: Math.round((suggested - platformFee) * 100) / 100,
    engagementStructure
  };
}

function sameWallet(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function feeEscrow(agreementId: string, grossAmount: number, status: PaymentEscrowDto["status"], fundedAt?: string, agreement?: Pick<AgreementDto, "engagementStructure" | "estimatedDuration">): PaymentEscrowDto {
  const timestamp = now();
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
    txHash: status === "funded" || status === "pending_release" || status === "released" ? "0xmockfunded" : undefined,
    engagementStructure: agreement?.engagementStructure,
    estimatedDuration: agreement?.estimatedDuration,
    fundedAt: fundedAt ?? (status === "not_funded" ? undefined : timestamp),
    releasedAt: status === "released" ? timestamp : undefined,
    updatedAt: timestamp
  };
}

function publicPreview(profile: ContractorProfileDto) {
  const visibility = profile.profileVisibility;
  return {
    handle: visibility.showHandle ? profile.handle : "Pseudonymous contributor",
    initials: profile.initials,
    skills: visibility.showSkills ? profile.skills : [],
    verticals: visibility.showSkills ? profile.verticals : [],
    customSkills: visibility.showSkills ? profile.customSkills : [],
    useCasePreferences: visibility.showSkills ? profile.useCasePreferences : [],
    categories: visibility.showSkills ? profile.categories : [],
    region: visibility.showRegion ? profile.publicFields.approximateRegion : "Approximate region hidden",
    availability: visibility.showAvailability ? profile.availability : "hidden",
    rating: visibility.showRating ? profile.publicFields.rating : undefined,
    trustScore: visibility.showRating ? profile.trustScore : undefined,
    level: profile.level,
    exactLocationShared: visibility.showExactLocation && profile.region.preciseLocationShared,
    sensitiveFields: {
      realName: visibility.showRealName && profile.privacySettings.realName,
      phone: visibility.showPhone && profile.privacySettings.phone,
      email: visibility.showEmail && profile.privacySettings.email
    },
    disclosed: profile.privacySettings
  };
}


function normalizeProfile(profile: Partial<ContractorProfileDto>): ContractorProfileDto {
  const timestamp = now();
  const verticals = Array.isArray(profile.verticals) && profile.verticals.length ? profile.verticals.map((item) => normalizeOperationalFocusId(String(item))) : (Array.isArray(profile.categories) && profile.categories.length ? profile.categories.map((item) => normalizeOperationalFocusId(String(item))) : ["logistics-transport"]);
  const customSkills = Array.isArray(profile.customSkills) ? profile.customSkills.map(String) : [];
  const skills = Array.isArray(profile.skills) && profile.skills.length ? profile.skills.map(String) : ["Driving", "Logistics", "Auditing"];
  const categories = verticals;
  const disclosureDefaults = { realName: false, phone: false, email: false, preciseLocation: false, portfolio: false, credentials: false };
  const privacySettings = { ...disclosureDefaults, ...(profile.privacySettings ?? {}) };
  const visibilityDefaults = {
    showHandle: true,
    showSkills: true,
    showRegion: true,
    showRating: true,
    showAvailability: true,
    showExactLocation: false,
    showRealName: false,
    showPhone: false,
    showEmail: false,
    requireConfirmationBeforeDisclosure: true
  };
  const region = {
    country: profile.region?.country ?? "US",
    state: profile.region?.state ?? "",
    city: profile.region?.city ?? "",
    metro: profile.region?.metro ?? profile.publicFields?.approximateRegion ?? "Remote",
    serviceRadiusMiles: profile.region?.serviceRadiusMiles ?? 10,
    locationMode: profile.region?.locationMode ?? profile.workPreference ?? "hybrid",
    approximateCoordinates: profile.region?.approximateCoordinates,
    preciseLocationShared: profile.region?.preciseLocationShared ?? false
  };
  const handle = (profile.handle || "K-914").trim();
  const initials = profile.initials || profile.publicFields?.initials || handle.replace(/^@/, "").slice(0, 1).toUpperCase() || "R";
  const slug = handle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    walletAddress: profile.walletAddress || wallet,
    handle,
    avatarUrl: profile.avatarUrl,
    initials,
    publicKey: profile.publicKey || "x25519_mock_api_k914",
    signingPublicKey: profile.signingPublicKey || "ed25519_mock_api_k914",
    publicFields: {
      initials,
      approximateRegion: region.locationMode === "remote" ? "Remote" : (region.metro || region.city || "Approximate region"),
      rating: profile.publicFields?.rating ?? 4.96,
      trustScore: profile.publicFields?.trustScore ?? profile.trustScore ?? 98,
      levelName: profile.publicFields?.levelName ?? "Trusted contributor"
    },
    encryptedPrivateBlobRef: profile.encryptedPrivateBlobRef || 'local-encrypted-profile://' + slug,
    level: profile.level ?? 5,
    xp: profile.xp ?? 8420,
    xpNext: profile.xpNext ?? 10000,
    streakDays: profile.streakDays ?? 19,
    trustScore: profile.trustScore ?? profile.publicFields?.trustScore ?? 98,
    verticals,
    skills,
    customSkills,
    useCasePreferences: Array.isArray(profile.useCasePreferences) ? profile.useCasePreferences.map(String) : [],
    engagementPreferences: normalizeEngagementPreferences(profile.engagementPreferences),
    rateVisibility: profile.rateVisibility === "public" || profile.rateVisibility === "agreement_only" || profile.rateVisibility === "private" ? profile.rateVisibility : "after_application",
    skillDetails: Array.isArray(profile.skillDetails) && profile.skillDetails.length ? profile.skillDetails : skills.map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label, category: categories[0] ?? "general", proficiencyLevel: "capable" as const })),
    categories,
    serviceCategories: categories,
    experienceLevel: profile.experienceLevel ?? "1_3",
    certifications: Array.isArray(profile.certifications) ? profile.certifications.map(String) : [],
    licenses: Array.isArray(profile.licenses) ? profile.licenses.map(String) : [],
    availability: profile.availability ?? (profile.availabilityDetails?.availableNow ? "ready_now" : "available_today"),
    availabilityDetails: {
      availableNow: profile.availabilityDetails?.availableNow ?? profile.availability === "ready_now",
      sameDay: profile.availabilityDetails?.sameDay ?? true,
      recurring: profile.availabilityDetails?.recurring ?? false,
      weeklySchedule: profile.availabilityDetails?.weeklySchedule ?? ["Mon PM", "Wed PM", "Sat AM"],
      timezone: profile.availabilityDetails?.timezone ?? "America/New_York"
    },
    region,
    workPreference: profile.workPreference ?? region.locationMode,
    privacySettings,
    profileVisibility: { ...visibilityDefaults, ...(profile.profileVisibility ?? {}) },
    disclosureSettings: { ...privacySettings, ...(profile.disclosureSettings ?? {}) },
    publicProfileFields: profile.publicProfileFields ?? ["handle", "skills", "region", "rating", "availability"],
    onboardingCompleted: profile.onboardingCompleted ?? false,
    createdAt: profile.createdAt ?? timestamp,
    updatedAt: profile.updatedAt ?? timestamp
  };
}

function validateProfile(profile: ContractorProfileDto) {
  if (!profile.handle || profile.handle.length < 3) throw new RouteError(400, "handle is required");
  if (!/^[a-zA-Z0-9_-]+$/.test(profile.handle.replace(/^@/, ""))) throw new RouteError(400, "handle may only include letters, numbers, underscore, and hyphen");
  if (!profile.verticals.length) throw new RouteError(400, "at least one operational focus is required");
  if (!profile.skills.length) throw new RouteError(400, "at least one skill is required");
  if (profile.region.locationMode !== "remote" && !profile.region.metro && !profile.region.city) throw new RouteError(400, "region or remote preference is required");
  if (!profile.profileVisibility) throw new RouteError(400, "privacy settings are required");
}

function deepMerge<T extends Record<string, any>>(base: T, patch: Partial<T>): T {
  const next: any = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value) && typeof next[key] === "object" && !Array.isArray(next[key])) {
      next[key] = deepMerge(next[key], value as any);
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next;
}

function normalizeGig(gig: ContractorGigDto): ContractorGigDto {
  return {
    ...gig,
    verticals: Array.isArray(gig.verticals) && gig.verticals.length ? gig.verticals.map((item) => normalizeOperationalFocusId(item)) : [normalizeOperationalFocusId(gig.category)],
    category: normalizeOperationalFocusId(gig.category),
    engagementStructure: normalizeEngagementStructure(gig.engagementStructure),
    applicantWallets: Array.isArray(gig.applicantWallets) ? gig.applicantWallets : [],
    contractorWallet: gig.contractorWallet
  };
}

function upsertThreadPreview(db: Db, threadId: string, encryptedPayload: string, senderWallet = wallet, recipientWallet = employerWallet) {
  const timestamp = now();
  const existing = db.threads.find((thread) => thread.id === threadId);
  if (!existing) {
    db.threads.push({ id: threadId, participantWallets: [senderWallet, recipientWallet], gigId: db.agreement.gigId, agreementId: db.agreement.id, lastMessagePreview: encryptedPayload.slice(0, 28), unreadCount: senderWallet === wallet ? 0 : 1, updatedAt: timestamp });
    return;
  }
  db.threads = db.threads.map((thread) =>
    thread.id === threadId ? { ...thread, lastMessagePreview: encryptedPayload.slice(0, 28), unreadCount: senderWallet === wallet ? thread.unreadCount : thread.unreadCount + 1, updatedAt: timestamp } : thread
  );
}

function makeNotification(type: ContractorNotificationType, title: string, body: string, relatedEntityType: NotificationDto["relatedEntityType"], relatedEntityId: string, target: string, read = false): NotificationDto {
  return { id: newId("note"), walletAddress: wallet, type, title: safeNotificationTitle(title), body: safeNotificationBody(type, body), relatedEntityType, relatedEntityId, target, read, createdAt: now() };
}

function safeNotificationTitle(title: string) {
  return title.length > 80 ? title.slice(0, 77) + "..." : title;
}

function safeNotificationBody(type: ContractorNotificationType, body?: string) {
  if (type === "message_received") return "You have a new secure message.";
  if (type === "disclosure_request") return "A disclosure setting changed.";
  if (body?.startsWith("relai-envelope:")) return "Encrypted update available.";
  return body && body.length <= 120 ? body : "Secure workflow update available.";
}

function requireThread(db: Pick<Db, "threads">, threadId: string) {
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread) throw new RouteError(404, "Thread not found");
  return thread;
}

function assertThreadAccess(session: RelaiSession, thread: MessageThreadDto) {
  if (session.role === "admin") return;
  if (!thread.participantWallets.some((walletAddress) => walletAddress.toLowerCase() === session.walletAddress.toLowerCase())) {
    throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: thread scope mismatch");
  }
}

function assertAgreementAccess(session: RelaiSession, agreement: AgreementDto) {
  if (session.role === "admin") return;
  const walletAddress = session.walletAddress.toLowerCase();
  if (agreement.contractorWallet.toLowerCase() !== walletAddress && agreement.employerWallet.toLowerCase() !== walletAddress) {
    throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: agreement scope mismatch");
  }
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

function actorWallet(session: RelaiSession, value: unknown, fallback: string) {
  const walletAddress = optionalString(value) ?? fallback;
  assertOwnWallet(session, walletAddress);
  return walletAddress;
}

function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

function json(data: unknown) {
  if (data instanceof NextResponse) return data;
  return NextResponse.json(data);
}


function enforceRateLimit(request: NextRequest, parts: string[], method: string) {
  const key = parts.slice(0, 3).join(":") || "root";
  if (parts[0] === "auth" && ["login", "register", "check-username"].includes(parts[1] ?? "")) {
    assertRateLimit(request, { key: `auth:${parts[1]}`, limit: parts[1] === "check-username" ? 45 : 8, windowMs: 60_000 });
    return;
  }
  if (parts[0] === "auth" && parts[1] === "session" && method !== "GET") {
    assertRateLimit(request, { key: "auth:session", limit: 30, windowMs: 60_000 });
    return;
  }
  if (parts[0] === "messages" && parts[1] === "send") {
    assertRateLimit(request, { key: "messages:send", limit: 40, windowMs: 60_000 });
    return;
  }
  if (method !== "GET") {
    assertRateLimit(request, { key: `mutation:${key}`, limit: 90, windowMs: 60_000 });
  }
}


function trustSummary(db: Db, walletAddress: string) {
  const completed = db.gigs.filter((gig) => sameWallet(gig.contractorWallet ?? "", walletAddress) && ["completed", "closed"].includes(gig.status)).length;
  const successfulSettlements = db.payoutHistory.filter((item) => sameWallet(item.walletAddress, walletAddress) && item.status === "released").length;
  const repeatEngagements = db.gigs.filter((gig) => sameWallet(gig.contractorWallet ?? "", walletAddress) && sameWallet(gig.employerWallet, employerWallet)).length;
  const privateEndorsements = (db.trustEndorsements ?? []).filter((endorsement) => sameWallet(endorsement.toWallet, walletAddress)).length;
  const disputeCount = db.gigs.filter((gig) => sameWallet(gig.contractorWallet ?? "", walletAddress) && gig.status === "disputed").length + (db.agreement.status === "disputed" && sameWallet(db.agreement.contractorWallet, walletAddress) ? 1 : 0);
  const inviteTrustWeight = 1;
  const score = Math.max(0, Math.min(100, 70 + successfulSettlements * 6 + repeatEngagements * 4 + privateEndorsements * 5 - disputeCount * 15 + inviteTrustWeight));
  return {
    walletAddress,
    trustScore: score,
    completedEngagements: completed,
    successfulSettlements,
    repeatEngagements,
    privateEndorsements,
    disputeCount,
    inviteLineage: { available: true, public: false, trustWeight: inviteTrustWeight },
    visibility: "private_summary",
    relationshipGraph: "hidden"
  };
}

function portableReputationExport(db: Db, walletAddress: string, scope: string) {
  const summary = trustSummary(db, walletAddress);
  return {
    id: newId("trust_export"),
    walletAddress,
    scope,
    encryptedExportRef: makeServerEncryptedEnvelope(JSON.stringify({ completedEngagements: summary.completedEngagements, successfulSettlements: summary.successfulSettlements, scope })),
    signedSummary: {
      issuer: "relai.private-beta",
      subject: walletAddress,
      claims: {
        completedEngagements: summary.completedEngagements,
        successfulSettlements: summary.successfulSettlements,
        privateEndorsements: summary.privateEndorsements
      },
      counterpartiesIncluded: false,
      fullHistoryIncluded: false
    },
    createdAt: now()
  };
}

function createTrustEndorsement(db: Db, session: RelaiSession, body: Record<string, unknown>): TrustEndorsementDto {
  const toWallet = stringBody(body.toWallet, "toWallet");
  const agreementId = optionalString(body.agreementId);
  if (agreementId) assertAgreementAccess(session, db.agreement);
  if (!isEncryptedEnvelopeString(stringBody(body.encryptedNoteRef, "encryptedNoteRef"))) throw new RouteError(400, "encryptedNoteRef must be a Relai encrypted envelope");
  const endorsement: TrustEndorsementDto = {
    id: newId("endorse"),
    fromWallet: session.walletAddress,
    toWallet,
    agreementId,
    encryptedNoteRef: stringBody(body.encryptedNoteRef, "encryptedNoteRef"),
    createdAt: now(),
    visibility: "private"
  };
  db.trustEndorsements = [endorsement, ...(db.trustEndorsements ?? [])];
  return endorsement;
}

function createModerationReport(db: Db, session: RelaiSession, body: Record<string, unknown>): ModerationReportDto {
  const encryptedReportRef = stringBody(body.encryptedReportRef, "encryptedReportRef");
  if (!isEncryptedEnvelopeString(encryptedReportRef)) throw new RouteError(400, "encryptedReportRef must be a Relai encrypted envelope");
  const report: ModerationReportDto = {
    id: newId("report"),
    reporterWallet: session.walletAddress,
    targetWallet: optionalString(body.targetWallet),
    agreementId: optionalString(body.agreementId),
    category: optionalString(body.category) ?? "workflow_safety",
    encryptedReportRef,
    status: "open",
    createdAt: now(),
    limitedVisibility: true
  };
  db.moderationReports = [report, ...(db.moderationReports ?? [])];
  return report;
}

function adminReportPreview(report: ModerationReportDto) {
  return {
    id: report.id,
    category: report.category,
    status: report.status,
    agreementId: report.agreementId,
    createdAt: report.createdAt,
    limitedVisibility: true,
    encryptedReportAvailable: Boolean(report.encryptedReportRef)
  };
}

function freezeAccount(db: Db, session: RelaiSession, reason: string): AccountSecurityDto {
  const security: AccountSecurityDto = {
    walletAddress: session.walletAddress,
    frozen: true,
    frozenAt: now(),
    recoveryDelayUntil: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    reason
  };
  db.accountSecurity = [security, ...(db.accountSecurity ?? []).filter((item) => !sameWallet(item.walletAddress, session.walletAddress))];
  return security;
}

function getAccountSecurity(db: Db, walletAddress: string): AccountSecurityDto {
  return (db.accountSecurity ?? []).find((item) => sameWallet(item.walletAddress, walletAddress)) ?? { walletAddress, frozen: false };
}


function seedBetaInvites(timestamp: string): BetaInviteDto[] {
  return [
    { code: "RELAI-BETA", ownerWallet: "founder", status: "active", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString(), maxUses: 25, acceptedBy: [], note: "Private beta access for trusted work pilots.", createdAt: timestamp },
    { code: "RELAI-PRIVATE", ownerWallet: "founder", status: "active", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(), maxUses: 10, acceptedBy: [], note: "Founder testing cohort.", createdAt: timestamp }
  ];
}

function publicInviteStatus(db: Db, code: string) {
  const invite = (db.betaInvites ?? []).find((item) => item.code.toLowerCase() === code.trim().toLowerCase());
  if (!invite) throw new RouteError(404, "Invite not found");
  const expired = new Date(invite.expiresAt).getTime() <= Date.now();
  const remainingUses = Math.max(0, invite.maxUses - invite.acceptedBy.length);
  return {
    code: invite.code,
    status: expired ? "expired" : invite.status,
    expiresAt: invite.expiresAt,
    remainingUses,
    note: invite.note,
    intentionalGrowth: true
  };
}

function acceptInvite(db: Db, code: string, walletAddress?: string) {
  const invite = (db.betaInvites ?? []).find((item) => item.code.toLowerCase() === code.trim().toLowerCase());
  if (!invite) throw new RouteError(404, "Invite not found");
  const status = publicInviteStatus(db, invite.code);
  if (status.status !== "active" || status.remainingUses <= 0) throw new RouteError(409, "Invite is no longer available");
  const acceptedWallet = walletAddress ?? "pending-account";
  if (!invite.acceptedBy.some((item) => sameWallet(item, acceptedWallet))) invite.acceptedBy.push(acceptedWallet);
  return db;
}

const contactDisclosureGuidance = "Contact sharing becomes available once your agreement is active and protected settlement is ready.";
const allowedBetaEvents = new Set(["invite_accepted", "signup_completed", "onboarding_completed", "operational_focus_selected", "engagement_structure_selected", "request_created", "application_submitted", "agreement_created", "secure_thread_opened", "contact_sharing_guided", "disclosure_revealed", "escrow_activated", "engagement_completed", "repeat_engagement_started", "feedback_submitted"]);

function recordBetaAnalytics(db: Db, session: RelaiSession, body: Record<string, unknown>) {
  const eventName = stringBody(body.eventName, "eventName");
  if (!allowedBetaEvents.has(eventName)) throw new RouteError(400, "Unsupported beta analytics event");
  const operationalFocus = optionalString(body.operationalFocus) ? normalizeOperationalFocusId(optionalString(body.operationalFocus)) : undefined;
  db.betaAnalyticsEvents = [
    { id: newId("beta_evt"), walletAddress: session.walletAddress, eventName, operationalFocus, role: session.role, createdAt: now() },
    ...(db.betaAnalyticsEvents ?? [])
  ].slice(0, 500);
  return db;
}

function recordBetaFeedback(db: Db, session: RelaiSession, body: Record<string, unknown>) {
  const encryptedFeedbackRef = optionalString(body.encryptedFeedbackRef);
  const feedbackText = optionalString(body.feedback);
  const category = optionalString(body.category) ?? "general";
  const context = optionalString(body.context) ?? "private_beta";
  const rating = typeof body.rating === "number" ? Math.max(1, Math.min(5, Math.round(body.rating))) : undefined;
  db.betaFeedback = [
    {
      id: newId("feedback"),
      walletAddress: session.walletAddress,
      category,
      context,
      rating,
      encryptedFeedbackRef: encryptedFeedbackRef && isEncryptedEnvelopeString(encryptedFeedbackRef) ? encryptedFeedbackRef : undefined,
      feedbackPreview: encryptedFeedbackRef ? undefined : feedbackText?.slice(0, 180),
      createdAt: now()
    },
    ...(db.betaFeedback ?? [])
  ].slice(0, 200);
  return db;
}

function betaAnalyticsSummary(db: Db) {
  const events = db.betaAnalyticsEvents ?? [];
  const byEvent = events.reduce<Record<string, number>>((acc, event) => {
    acc[event.eventName] = (acc[event.eventName] ?? 0) + 1;
    return acc;
  }, {});
  const byOperationalFocus = events.reduce<Record<string, number>>((acc, event) => {
    if (event.operationalFocus) acc[event.operationalFocus] = (acc[event.operationalFocus] ?? 0) + 1;
    return acc;
  }, {});
  return {
    totalEvents: events.length,
    byEvent,
    byOperationalFocus,
    retention: "minimal beta event log; no message plaintext, exact location, attachments, or public relationship graph"
  };
}


function normalizeEngagementPreferences(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      { structure: "flat_fee" as const, ratePreview: "$800-$1,500/project", visibility: "agreement_only" as const },
      { structure: "day_rate" as const, ratePreview: "$650/day", visibility: "after_application" as const },
      { structure: "open_proposal" as const, ratePreview: "Depends on scope", visibility: "public" as const }
    ];
  }
  return value.map((item) => {
    const entry = typeof item === "object" && item ? item as Record<string, unknown> : {};
    const visibility: "public" | "after_application" | "agreement_only" | "private" = entry.visibility === "public" || entry.visibility === "agreement_only" || entry.visibility === "private" ? entry.visibility : "after_application";
    return {
      structure: normalizeEngagementStructure(entry.structure),
      ratePreview: optionalString(entry.ratePreview),
      visibility,
      notes: optionalString(entry.notes)
    };
  });
}

function estimateEngagementGross(body: Record<string, unknown>, base: number, structure: string) {
  if (structure === "hourly") return Math.max(1, Number(body.maxApprovedHours ?? body.estimatedHours ?? 1)) * base;
  if (structure === "day_rate") return Math.max(1, Number(body.estimatedDays ?? 1)) * base;
  if (structure === "weekly_retainer") return Math.max(1, Number(body.estimatedWeeks ?? 1)) * base;
  return base;
}
