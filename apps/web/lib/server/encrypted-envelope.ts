export type EncryptedEnvelope = {
  version: 1 | 2;
  algorithm: "AES-256-GCM";
  suite?: "relai-local-aes-gcm-v1";
  conversationId?: string;
  rotationCounter?: number;
  previousKeyId?: string;
  keyId: string;
  nonce: string;
  ciphertext: string;
  createdAt: string;
  senderPublicKey?: string;
  recipientPublicKey?: string;
};

export const encryptedEnvelopePrefix = "relai-envelope:";

export function parseEncryptedEnvelope(value: string): EncryptedEnvelope | null {
  if (!value.startsWith(encryptedEnvelopePrefix)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value.slice(encryptedEnvelopePrefix.length), "base64url").toString("utf8")) as Partial<EncryptedEnvelope>;
    if (
      (parsed.version !== 1 && parsed.version !== 2) ||
      parsed.algorithm !== "AES-256-GCM" ||
      typeof parsed.keyId !== "string" ||
      typeof parsed.nonce !== "string" ||
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.createdAt !== "string"
    ) {
      return null;
    }
    return parsed as EncryptedEnvelope;
  } catch {
    return null;
  }
}

export function isEncryptedEnvelopeString(value: unknown): value is string {
  return typeof value === "string" && parseEncryptedEnvelope(value) !== null;
}

export function makeServerEncryptedEnvelope(label: string, keyId = "server-seeded-dev-envelope") {
  const envelope: EncryptedEnvelope = {
    version: 2,
    algorithm: "AES-256-GCM",
    suite: "relai-local-aes-gcm-v1",
    rotationCounter: 0,
    keyId,
    nonce: Buffer.from("relai-nonce-1").toString("base64url"),
    ciphertext: Buffer.from(label).toString("base64url"),
    createdAt: new Date().toISOString()
  };
  return encryptedEnvelopePrefix + Buffer.from(JSON.stringify(envelope)).toString("base64url");
}

export function redactSensitive(input: string) {
  return input
    .replace(/relai-envelope:[A-Za-z0-9_-]+/g, "[encrypted-envelope]")
    .replace(/password[^,}\n]*/gi, "password=[redacted]")
    .replace(/0x[a-fA-F0-9]{64}/g, "[tx-hash]");
}
