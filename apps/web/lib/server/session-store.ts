import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { Pool } from "pg";
import { getStateStoreMode } from "@/lib/server/relai-state-store";

export type RelaiRole = "contractor" | "employer" | "admin";
export type RelaiAuthMethod = "wallet_placeholder" | "future_siwe" | "admin_internal";
export type DeviceTrustState = "new" | "trusted" | "suspicious" | "revoked";
export type SecurityEventType =
  | "login"
  | "logout"
  | "session_revoked"
  | "all_sessions_revoked"
  | "device_trust_changed"
  | "recovery_initiated"
  | "agreement_transition"
  | "escrow_transition"
  | "admin_action"
  | "suspicious_login";

export type StoredRelaiSession = {
  sessionId: string;
  tokenHash: string;
  walletAddress: string;
  role: RelaiRole;
  issuedAt: string;
  expiresAt: string;
  authMethod: RelaiAuthMethod;
  permissions: string[];
  sessionVersion: number;
  revokedAt?: string;
  lastActiveAt: string;
  deviceName: string;
  deviceFingerprintHash: string;
  approximateRegion: string;
  trustState: DeviceTrustState;
};

export type RelaiSecurityEvent = {
  id: string;
  sessionId?: string;
  eventType: SecurityEventType;
  walletAddress?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

const sessionFile = path.join(process.cwd(), ".relai-dev", "sessions.json");
const eventFile = path.join(process.cwd(), ".relai-dev", "security-events.json");
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;
let pool: Pool | undefined;

export async function createStoredSession(input: { walletAddress: string; role?: RelaiRole; authMethod?: RelaiAuthMethod; device?: Partial<Pick<StoredRelaiSession, "deviceName" | "deviceFingerprintHash" | "approximateRegion" | "trustState">> }) {
  const token = randomUUID() + "." + randomUUID();
  const issuedAt = new Date();
  const role = input.role ?? "contractor";
  const session: StoredRelaiSession = {
    sessionId: randomUUID(),
    tokenHash: hashToken(token),
    walletAddress: input.walletAddress,
    role,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + sessionTtlMs).toISOString(),
    authMethod: input.authMethod ?? "wallet_placeholder",
    permissions: permissionsForRole(role),
    sessionVersion: 2,
    lastActiveAt: issuedAt.toISOString(),
    deviceName: input.device?.deviceName || "Current browser",
    deviceFingerprintHash: input.device?.deviceFingerprintHash || hashToken("unknown-device"),
    approximateRegion: input.device?.approximateRegion || "Approximate region unavailable",
    trustState: input.device?.trustState || "new"
  };
  await upsertSession(session);
  await appendSecurityEvent({ sessionId: session.sessionId, eventType: "login", walletAddress: session.walletAddress, metadata: { role, deviceName: session.deviceName, trustState: session.trustState } });
  return { token, session: publicSession(session) };
}

export async function getStoredSession(token: string | undefined | null) {
  if (!token) return undefined;
  const tokenHash = hashToken(token);
  const session = getStateStoreMode() === "postgres" ? await readPostgresSession(tokenHash) : await readFileSession(tokenHash);
  if (!session || session.revokedAt) return undefined;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return undefined;
  const next = { ...session, lastActiveAt: new Date().toISOString() };
  await upsertSession(next);
  return publicSession(next);
}

export async function revokeStoredSession(token: string | undefined | null) {
  if (!token) return;
  const tokenHash = hashToken(token);
  const session = getStateStoreMode() === "postgres" ? await readPostgresSession(tokenHash) : await readFileSession(tokenHash);
  if (getStateStoreMode() === "postgres") await revokePostgresSession(tokenHash);
  else await revokeFileSession(tokenHash);
  if (session) await appendSecurityEvent({ sessionId: session.sessionId, eventType: "logout", walletAddress: session.walletAddress, metadata: { deviceName: session.deviceName } });
}

export async function listStoredSessions(walletAddress: string) {
  const sessions = getStateStoreMode() === "postgres" ? await listPostgresSessions(walletAddress) : (await readFileSessions()).filter((session) => sameWallet(session.walletAddress, walletAddress));
  return sessions.map(publicSession).sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
}

export async function revokeStoredSessionById(walletAddress: string, sessionId: string) {
  const sessions = getStateStoreMode() === "postgres" ? await listPostgresSessions(walletAddress) : await readFileSessions();
  const target = sessions.find((session) => session.sessionId === sessionId && sameWallet(session.walletAddress, walletAddress));
  if (!target) return false;
  const revoked = { ...target, trustState: "revoked" as const, revokedAt: new Date().toISOString() };
  await upsertSession(revoked);
  await appendSecurityEvent({ sessionId, eventType: "session_revoked", walletAddress, metadata: { deviceName: target.deviceName } });
  return true;
}

export async function revokeAllStoredSessions(walletAddress: string, exceptSessionId?: string) {
  const sessions = getStateStoreMode() === "postgres" ? await listPostgresSessions(walletAddress) : await readFileSessions();
  let count = 0;
  for (const session of sessions) {
    if (!sameWallet(session.walletAddress, walletAddress) || session.sessionId === exceptSessionId || session.revokedAt) continue;
    await upsertSession({ ...session, trustState: "revoked", revokedAt: new Date().toISOString() });
    count += 1;
  }
  await appendSecurityEvent({ sessionId: exceptSessionId, eventType: "all_sessions_revoked", walletAddress, metadata: { count } });
  return count;
}

export async function updateStoredDeviceTrust(walletAddress: string, sessionId: string, trustState: DeviceTrustState) {
  const sessions = getStateStoreMode() === "postgres" ? await listPostgresSessions(walletAddress) : await readFileSessions();
  const target = sessions.find((session) => session.sessionId === sessionId && sameWallet(session.walletAddress, walletAddress));
  if (!target) return undefined;
  const next = { ...target, trustState };
  await upsertSession(next);
  await appendSecurityEvent({ sessionId, eventType: "device_trust_changed", walletAddress, metadata: { trustState } });
  return publicSession(next);
}

export async function appendSecurityEvent(input: { sessionId?: string; eventType: SecurityEventType; walletAddress?: string; metadata?: Record<string, unknown> }) {
  const event: RelaiSecurityEvent = {
    id: randomUUID(),
    sessionId: input.sessionId,
    eventType: input.eventType,
    walletAddress: input.walletAddress,
    createdAt: new Date().toISOString(),
    metadata: redactEventMetadata(input.metadata ?? {})
  };
  if (getStateStoreMode() === "postgres") await insertPostgresSecurityEvent(event);
  else {
    const events = await readFileSecurityEvents();
    events.unshift(event);
    await writeFileSecurityEvents(events.slice(0, 500));
  }
  return event;
}

export async function listSecurityEvents(walletAddress: string, limit = 50) {
  const events = getStateStoreMode() === "postgres" ? await listPostgresSecurityEvents(walletAddress, limit) : (await readFileSecurityEvents()).filter((event) => !event.walletAddress || sameWallet(event.walletAddress, walletAddress)).slice(0, limit);
  return events;
}

export function permissionsForRole(role: RelaiRole) {
  if (role === "admin") return ["admin:*", "profile:*", "gig:*", "agreement:*", "message:*", "payment:*", "notification:*", "security:*"];
  if (role === "employer") return ["gig:own", "agreement:employer", "message:own", "payment:own", "notification:own", "security:own"];
  return ["profile:own", "gig:apply", "gig:claim", "agreement:contractor", "message:own", "payment:own", "notification:own", "security:own"];
}

function publicSession(session: StoredRelaiSession) {
  const { tokenHash: _tokenHash, ...safe } = session;
  return safe;
}

async function upsertSession(session: StoredRelaiSession) {
  if (getStateStoreMode() === "postgres") return upsertPostgresSession(session);
  const sessions = await readFileSessions();
  const next = sessions.filter((item) => item.sessionId !== session.sessionId && item.tokenHash !== session.tokenHash);
  next.push(session);
  await writeFileSessions(next);
}

async function readFileSession(tokenHash: string) {
  return (await readFileSessions()).find((session) => session.tokenHash === tokenHash);
}

async function revokeFileSession(tokenHash: string) {
  const sessions = await readFileSessions();
  await writeFileSessions(sessions.map((session) => session.tokenHash === tokenHash ? { ...session, trustState: "revoked", revokedAt: new Date().toISOString() } : session));
}

async function readFileSessions() {
  try {
    return (JSON.parse(await readFile(sessionFile, "utf8")) as StoredRelaiSession[]).map(normalizeStoredSession);
  } catch {
    return [];
  }
}

async function writeFileSessions(sessions: StoredRelaiSession[]) {
  await mkdir(path.dirname(sessionFile), { recursive: true });
  await writeFile(sessionFile, JSON.stringify(sessions.map(normalizeStoredSession), null, 2));
}

async function readFileSecurityEvents() {
  try {
    return JSON.parse(await readFile(eventFile, "utf8")) as RelaiSecurityEvent[];
  } catch {
    return [];
  }
}

async function writeFileSecurityEvents(events: RelaiSecurityEvent[]) {
  await mkdir(path.dirname(eventFile), { recursive: true });
  await writeFile(eventFile, JSON.stringify(events, null, 2));
}

async function upsertPostgresSession(session: StoredRelaiSession) {
  await ensureSessionTables();
  await getPool().query(
    "INSERT INTO sessions (session_id, token_hash, wallet_address, role, issued_at, expires_at, auth_method, permissions, session_version, revoked_at, last_active_at, device_name, device_fingerprint_hash, approximate_region, trust_state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (session_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, wallet_address = EXCLUDED.wallet_address, role = EXCLUDED.role, expires_at = EXCLUDED.expires_at, permissions = EXCLUDED.permissions, revoked_at = EXCLUDED.revoked_at, last_active_at = EXCLUDED.last_active_at, device_name = EXCLUDED.device_name, device_fingerprint_hash = EXCLUDED.device_fingerprint_hash, approximate_region = EXCLUDED.approximate_region, trust_state = EXCLUDED.trust_state",
    [session.sessionId, session.tokenHash, session.walletAddress, session.role, session.issuedAt, session.expiresAt, session.authMethod, JSON.stringify(session.permissions), session.sessionVersion, session.revokedAt ?? null, session.lastActiveAt, session.deviceName, session.deviceFingerprintHash, session.approximateRegion, session.trustState]
  );
}

async function readPostgresSession(tokenHash: string) {
  await ensureSessionTables();
  const result = await getPool().query("SELECT * FROM sessions WHERE token_hash = $1", [tokenHash]);
  return result.rows[0] ? rowToSession(result.rows[0]) : undefined;
}

async function listPostgresSessions(walletAddress: string) {
  await ensureSessionTables();
  const result = await getPool().query("SELECT * FROM sessions WHERE lower(wallet_address) = lower($1) ORDER BY last_active_at DESC", [walletAddress]);
  return result.rows.map(rowToSession);
}

async function revokePostgresSession(tokenHash: string) {
  await ensureSessionTables();
  await getPool().query("UPDATE sessions SET revoked_at = now(), trust_state = 'revoked' WHERE token_hash = $1", [tokenHash]);
}

async function insertPostgresSecurityEvent(event: RelaiSecurityEvent) {
  await ensureSessionTables();
  await getPool().query("INSERT INTO session_events (id, session_id, event_type, wallet_address, created_at, metadata) VALUES ($1, $2, $3, $4, $5, $6::jsonb)", [event.id, event.sessionId ?? null, event.eventType, event.walletAddress ?? null, event.createdAt, JSON.stringify(event.metadata)]);
}

async function listPostgresSecurityEvents(walletAddress: string, limit: number) {
  await ensureSessionTables();
  const result = await getPool().query("SELECT id, session_id, event_type, wallet_address, created_at, metadata FROM session_events WHERE wallet_address IS NULL OR lower(wallet_address) = lower($1) ORDER BY created_at DESC LIMIT $2", [walletAddress, limit]);
  return result.rows.map((row) => ({ id: row.id, sessionId: row.session_id ?? undefined, eventType: row.event_type, walletAddress: row.wallet_address ?? undefined, createdAt: row.created_at.toISOString(), metadata: row.metadata ?? {} })) as RelaiSecurityEvent[];
}

function rowToSession(row: any): StoredRelaiSession {
  return normalizeStoredSession({
    sessionId: row.session_id,
    tokenHash: row.token_hash,
    walletAddress: row.wallet_address,
    role: row.role,
    issuedAt: row.issued_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    authMethod: row.auth_method,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    sessionVersion: row.session_version,
    revokedAt: row.revoked_at?.toISOString(),
    lastActiveAt: row.last_active_at?.toISOString(),
    deviceName: row.device_name,
    deviceFingerprintHash: row.device_fingerprint_hash,
    approximateRegion: row.approximate_region,
    trustState: row.trust_state
  } as StoredRelaiSession);
}

function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required when RELAI_STORAGE_MODE=postgres");
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureSessionTables() {
  const pool = getPool();
  await pool.query("CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, wallet_address TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('contractor', 'employer', 'admin')), issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, auth_method TEXT NOT NULL, permissions JSONB NOT NULL DEFAULT '[]'::jsonb, session_version INTEGER NOT NULL DEFAULT 2, revoked_at TIMESTAMPTZ)");
  await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_name TEXT");
  await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS device_fingerprint_hash TEXT");
  await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS approximate_region TEXT");
  await pool.query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS trust_state TEXT");
  await pool.query("CREATE TABLE IF NOT EXISTS session_events (id TEXT PRIMARY KEY, session_id TEXT, event_type TEXT NOT NULL, wallet_address TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), metadata JSONB NOT NULL DEFAULT '{}'::jsonb)");
}

function normalizeStoredSession(session: StoredRelaiSession): StoredRelaiSession {
  return {
    ...session,
    sessionVersion: session.sessionVersion ?? 2,
    lastActiveAt: session.lastActiveAt ?? session.issuedAt ?? new Date().toISOString(),
    deviceName: session.deviceName ?? "Current browser",
    deviceFingerprintHash: session.deviceFingerprintHash ?? hashToken(session.sessionId || "unknown-device"),
    approximateRegion: session.approximateRegion ?? "Approximate region unavailable",
    trustState: session.revokedAt ? "revoked" : session.trustState ?? "new"
  };
}

function redactEventMetadata(metadata: Record<string, unknown>) {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/password|secret|payload|message|proof|ciphertext|private/i.test(key)) {
      redacted[key] = "[redacted]";
    } else if (typeof value === "string" && value.startsWith("relai-envelope:")) {
      redacted[key] = "[encrypted-envelope]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sameWallet(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}
