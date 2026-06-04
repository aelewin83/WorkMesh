import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { createStoredSession, getStoredSession, revokeAllStoredSessions, revokeStoredSession, revokeStoredSessionById, listSecurityEvents, listStoredSessions, permissionsForRole, updateStoredDeviceTrust, type DeviceTrustState, type RelaiAuthMethod, type RelaiRole } from "@/lib/server/session-store";

export type { RelaiRole, RelaiAuthMethod };

export type RelaiSession = {
  sessionId: string;
  walletAddress: string;
  role: RelaiRole;
  issuedAt: string;
  expiresAt: string;
  authMethod: RelaiAuthMethod;
  permissions: string[];
  sessionVersion: number;
  lastActiveAt?: string;
  deviceName?: string;
  deviceFingerprintHash?: string;
  approximateRegion?: string;
  trustState?: DeviceTrustState;
  revokedAt?: string;
  isDevelopmentFallback: boolean;
};

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_SESSION" | "RESOURCE_NOT_OWNED", public readonly status: number, message: string) {
    super(message);
  }
}

export const sessionCookieName = "relai_session";
const defaultWallet = "0xK914...7F21";

export async function getRelaiSession(request: NextRequest): Promise<RelaiSession> {
  const token = getSessionToken(request);
  const stored = await getStoredSession(token);
  if (stored) return { ...stored, isDevelopmentFallback: false };

  if (token && process.env.RELAI_REQUIRE_AUTH === "true") {
    throw new AuthError("INVALID_SESSION", 401, "Invalid or expired session");
  }

  if (process.env.RELAI_REQUIRE_AUTH === "true") {
    throw new AuthError("UNAUTHORIZED", 401, "Authentication required");
  }

  return developmentFallbackSession(request);
}

export async function createRelaiSession(input: { walletAddress: string; role?: RelaiRole; authMethod?: RelaiAuthMethod; request?: NextRequest; deviceName?: string }) {
  const walletAddress = normalizeWallet(input.walletAddress);
  if (!walletAddress) throw new AuthError("UNAUTHORIZED", 401, "walletAddress is required");
  return createStoredSession({ walletAddress, role: input.role ?? "contractor", authMethod: input.authMethod ?? "wallet_placeholder", device: deviceMetadata(input.request, input.deviceName) });
}

export async function listRelaiSessions(session: RelaiSession) {
  return listStoredSessions(session.walletAddress);
}

export async function revokeRelaiSessionById(session: RelaiSession, sessionId: string) {
  return revokeStoredSessionById(session.walletAddress, sessionId);
}

export async function revokeAllRelaiSessions(session: RelaiSession, keepCurrent = true) {
  return revokeAllStoredSessions(session.walletAddress, keepCurrent ? session.sessionId : undefined);
}

export async function updateRelaiDeviceTrust(session: RelaiSession, sessionId: string, trustState: DeviceTrustState) {
  return updateStoredDeviceTrust(session.walletAddress, sessionId, trustState);
}

export async function listRelaiSecurityEvents(session: RelaiSession) {
  return listSecurityEvents(session.walletAddress);
}

export async function revokeRelaiSession(request: NextRequest) {
  await revokeStoredSession(getSessionToken(request));
}

export function getSessionToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : undefined;
  return request.cookies.get(sessionCookieName)?.value ?? request.headers.get("x-relai-session") ?? bearer;
}

export function assertOwnWallet(session: RelaiSession, walletAddress: string) {
  if (session.role === "admin") return;
  if (session.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new AuthError("RESOURCE_NOT_OWNED", 403, "RESOURCE_NOT_OWNED: wallet scope mismatch");
  }
}

export function assertRole(session: RelaiSession, allowed: RelaiRole[]) {
  if (!allowed.includes(session.role)) {
    throw new AuthError("FORBIDDEN", 403, "FORBIDDEN: role not authorized");
  }
}

export function requireAdmin(session: RelaiSession) {
  assertRole(session, ["admin"]);
}

export function requireSession(session: RelaiSession) {
  if (!session?.walletAddress) throw new AuthError("UNAUTHORIZED", 401, "Authentication required");
  return session;
}

export function normalizeRole(value: unknown): RelaiRole {
  return value === "employer" || value === "admin" ? value : "contractor";
}

function developmentFallbackSession(request: NextRequest): RelaiSession {
  const allowDevHeaders = process.env.RELAI_ALLOW_DEV_AUTH_HEADERS === "true";
  const walletAddress = allowDevHeaders ? normalizeWallet(request.headers.get("x-relai-wallet")) || defaultWallet : defaultWallet;
  const role = allowDevHeaders ? normalizeRole(request.headers.get("x-relai-role")) : "contractor";
  const issuedAt = new Date(0).toISOString();
  return {
    sessionId: "dev-fallback-session",
    walletAddress,
    role,
    issuedAt,
    expiresAt: new Date("2999-01-01T00:00:00.000Z").toISOString(),
    authMethod: "wallet_placeholder",
    permissions: permissionsForRole(role),
    sessionVersion: 1,
    lastActiveAt: new Date().toISOString(),
    deviceName: "Development fallback",
    deviceFingerprintHash: "dev-fallback",
    approximateRegion: "Local development",
    trustState: "trusted",
    isDevelopmentFallback: true
  };
}

function normalizeWallet(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}


function deviceMetadata(request?: NextRequest, deviceName?: string) {
  const userAgent = request?.headers.get("user-agent") ?? "unknown";
  const acceptLanguage = request?.headers.get("accept-language") ?? "unknown";
  const ipHint = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request?.headers.get("x-real-ip") || request?.headers.get("cf-connecting-ip") || "local";
  return {
    deviceName: deviceName || summarizeDevice(userAgent),
    deviceFingerprintHash: createHash("sha256").update(`${userAgent}|${acceptLanguage}`).digest("hex"),
    approximateRegion: ipHint === "local" ? "Local development" : "Approximate network region",
    trustState: "new" as const
  };
}

function summarizeDevice(userAgent: string) {
  if (/iPhone/i.test(userAgent)) return "iPhone browser";
  if (/Android/i.test(userAgent)) return "Android browser";
  if (/iPad/i.test(userAgent)) return "iPad browser";
  if (/Chrome/i.test(userAgent)) return "Chrome browser";
  if (/Safari/i.test(userAgent)) return "Safari browser";
  return "Current browser";
}
