"use client";

import { encryptEnvelopeString } from "./crypto-envelope";

export type ClientEncryptedAttachment = {
  encryptedFileRef: string;
  encryptedMetadata: string;
  encryptedSize: number;
  mimeType: string;
  status: "encrypting" | "uploading" | "uploaded" | "failed_to_decrypt" | "unauthorized";
};

export async function encryptAttachmentMetadata(file: File, context: { threadId?: string; agreementId?: string } = {}): Promise<ClientEncryptedAttachment> {
  const metadata = await encryptEnvelopeString(JSON.stringify({
    name: file.name,
    size: file.size,
    type: file.type,
    threadId: context.threadId,
    agreementId: context.agreementId
  }), { conversationId: context.threadId ?? context.agreementId });
  return {
    encryptedFileRef: "encrypted-attachment://" + crypto.randomUUID(),
    encryptedMetadata: metadata,
    encryptedSize: file.size,
    mimeType: file.type || "application/octet-stream",
    status: "uploaded"
  };
}
