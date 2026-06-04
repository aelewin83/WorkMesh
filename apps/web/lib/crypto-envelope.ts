"use client";

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
const localKeyMaterial = "relai.crypto.local-envelope-key.v2";
const localKeyMeta = "relai.crypto.local-envelope-key-meta.v2";

export async function encryptEnvelopeString(plainText: string, options: { keyId?: string; senderPublicKey?: string; recipientPublicKey?: string; conversationId?: string } = {}) {
  const key = await getOrCreateAesKey();
  const nonce = getCrypto().getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(plainText);
  const encrypted = await getCrypto().subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, payload);
  const meta = getKeyMetadata();
  const envelope: EncryptedEnvelope = {
    version: 2,
    algorithm: "AES-256-GCM",
    suite: "relai-local-aes-gcm-v1",
    conversationId: options.conversationId,
    rotationCounter: meta.rotationCounter,
    previousKeyId: meta.previousKeyId,
    keyId: options.keyId ?? meta.keyId,
    nonce: bytesToBase64Url(nonce),
    ciphertext: bytesToBase64Url(new Uint8Array(encrypted)),
    createdAt: new Date().toISOString(),
    senderPublicKey: options.senderPublicKey,
    recipientPublicKey: options.recipientPublicKey
  };
  return encryptedEnvelopePrefix + stringToBase64Url(JSON.stringify(envelope));
}

export async function decryptEnvelopeString(value: string) {
  if (value.startsWith("encrypted:")) return value.replace("encrypted:", "");
  if (!value.startsWith(encryptedEnvelopePrefix)) return decryptLegacyCipherText(value);
  try {
    const envelope = parseEncryptedEnvelope(value);
    if (!envelope || envelope.algorithm !== "AES-256-GCM") return "[Unable to decrypt]";
    const key = await getOrCreateAesKey();
    const decrypted = await getCrypto().subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(envelope.nonce) },
      key,
      base64UrlToBytes(envelope.ciphertext)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Unable to decrypt]";
  }
}

export function parseEncryptedEnvelope(value: string): EncryptedEnvelope | null {
  if (!value.startsWith(encryptedEnvelopePrefix)) return null;
  try {
    const parsed = JSON.parse(base64UrlToString(value.slice(encryptedEnvelopePrefix.length))) as Partial<EncryptedEnvelope>;
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

async function getOrCreateAesKey() {
  const crypto = getCrypto();
  const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(localKeyMaterial);
  if (stored) return crypto.subtle.importKey("jwk", JSON.parse(stored), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(localKeyMaterial, JSON.stringify(await crypto.subtle.exportKey("jwk", key)));
    localStorage.setItem(localKeyMeta, JSON.stringify({ keyId: "local-device-key-v2", rotationCounter: 0 }));
  }
  return key;
}

export async function rotateLocalEnvelopeKey() {
  if (typeof localStorage === "undefined") return { keyId: "memory-only", rotationCounter: 0 };
  const crypto = getCrypto();
  const previous = getKeyMetadata();
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const next = { keyId: "local-device-key-v2-" + crypto.randomUUID().slice(0, 8), rotationCounter: previous.rotationCounter + 1, previousKeyId: previous.keyId };
  localStorage.setItem(localKeyMaterial, JSON.stringify(await crypto.subtle.exportKey("jwk", key)));
  localStorage.setItem(localKeyMeta, JSON.stringify(next));
  return next;
}

function getKeyMetadata(): { keyId: string; rotationCounter: number; previousKeyId?: string } {
  if (typeof localStorage === "undefined") return { keyId: "memory-only", rotationCounter: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(localKeyMeta) || "{}");
    return { keyId: parsed.keyId || "local-device-key-v2", rotationCounter: Number(parsed.rotationCounter || 0), previousKeyId: parsed.previousKeyId };
  } catch {
    return { keyId: "local-device-key-v2", rotationCounter: 0 };
  }
}

async function decryptLegacyCipherText(cipherText: string) {
  try {
    const [ivPart, dataPart] = cipherText.split(".");
    if (!ivPart || !dataPart) return "[Unable to decrypt]";
    const key = await getOrCreateAesKey();
    const decrypted = await getCrypto().subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(ivPart) }, key, base64ToBytes(dataPart));
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Unable to decrypt]";
  }
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required for Relai encryption");
  return globalThis.crypto;
}

function bytesToBase64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
