import { randomUUID } from "node:crypto";

export type EncryptedProofMetadata = {
  encryptedFileRef: string;
  mimeType: string;
  encryptedSize: number;
  uploadedAt: string;
  uploadedByWallet: string;
  proofType: string;
};

export function normalizeEncryptedProof(input: Record<string, unknown>, uploadedByWallet: string): EncryptedProofMetadata {
  const encryptedFileRef = stringValue(input.encryptedFileRef) ?? stringValue(input.proofRef) ?? `encrypted-proof://${randomUUID()}`;
  return {
    encryptedFileRef,
    mimeType: stringValue(input.mimeType) ?? "application/octet-stream",
    encryptedSize: numberValue(input.encryptedSize) ?? numberValue(input.size) ?? 0,
    uploadedAt: stringValue(input.timestamp) ?? new Date().toISOString(),
    uploadedByWallet,
    proofType: stringValue(input.proofType) ?? "text_note"
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : undefined;
}
