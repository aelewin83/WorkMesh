import assert from "node:assert/strict";
import test from "node:test";

import { encryptJson, generateAesGcmKey } from "@workmesh/crypto";
import type { EncryptedBlob } from "@workmesh/types";

import { LocalStorageProvider } from "../src/index.js";

test("local provider stores and retrieves encrypted blobs only", async () => {
  const key = await generateAesGcmKey();
  const blob = await encryptJson({ secret: "details" }, key, {
    createdAt: "2026-04-28T00:00:00.000Z",
  });
  const provider = new LocalStorageProvider();

  const pointer = await provider.putEncryptedBlob(blob);
  const stored = await provider.getEncryptedBlob(pointer);

  assert.deepEqual(stored, blob);
  assert.equal(pointer.provider, "local");
  assert.equal(pointer.encryption.algorithm, "AES-GCM");
  assert.ok(pointer.sha256);
});

test("local provider rejects plaintext payloads", async () => {
  const provider = new LocalStorageProvider();
  const plaintext = {
    version: 1,
    algorithm: "plaintext",
    value: "do not store",
  } as unknown as EncryptedBlob;

  await assert.rejects(() => provider.putEncryptedBlob(plaintext), /encrypted blob/i);
});
