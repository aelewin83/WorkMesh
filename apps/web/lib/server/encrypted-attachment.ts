import { isEncryptedEnvelopeString } from "@/lib/server/encrypted-envelope";

export type EncryptedAttachmentMetadata = {
  id: string;
  threadId?: string;
  agreementId?: string;
  encryptedFileRef: string;
  encryptedMetadata: string;
  mimeType: string;
  encryptedSize: number;
  uploadedByWallet: string;
  createdAt: string;
  status: "uploaded" | "deleted";
};

export function normalizeEncryptedAttachment(input: Record<string, unknown>, uploadedByWallet: string): EncryptedAttachmentMetadata {
  const encryptedMetadata = stringValue(input.encryptedMetadata);
  if (!encryptedMetadata || !isEncryptedEnvelopeString(encryptedMetadata)) throw new Error("encryptedMetadata must be a Relai encrypted envelope");
  const encryptedFileRef = stringValue(input.encryptedFileRef) ?? `encrypted-attachment://${cryptoRandomId()}`;
  if (!encryptedFileRef.startsWith("encrypted-attachment://")) throw new Error("encryptedFileRef must be an encrypted attachment ref");
  return {
    id: cryptoRandomId(),
    threadId: stringValue(input.threadId),
    agreementId: stringValue(input.agreementId),
    encryptedFileRef,
    encryptedMetadata,
    mimeType: stringValue(input.mimeType) ?? "application/octet-stream",
    encryptedSize: numberValue(input.encryptedSize) ?? 0,
    uploadedByWallet,
    createdAt: new Date().toISOString(),
    status: "uploaded"
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
