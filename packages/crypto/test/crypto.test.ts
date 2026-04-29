import assert from "node:assert/strict";
import test from "node:test";

import { workMeshId } from "@workmesh/types";

import {
  decryptJson,
  decryptMessageFromSender,
  encryptJson,
  encryptMessageForRecipient,
  generateAesGcmKey,
  generateWorkMeshKeyRing,
  importAgreementPublicKey,
  importSigningPublicKey,
} from "../src/index.js";

test("encrypts and decrypts JSON with AES-GCM", async () => {
  const key = await generateAesGcmKey();
  const blob = await encryptJson({ secret: "profile details" }, key, {
    aad: "profile:worker-1",
    createdAt: "2026-04-28T00:00:00.000Z",
  });
  const plaintext = await decryptJson<{ secret: string }>(blob, key);

  assert.equal(blob.algorithm, "AES-GCM");
  assert.notEqual(blob.ciphertext, "profile details");
  assert.equal(plaintext.secret, "profile details");
});

test("exports server-safe public key bundles without private keys", async () => {
  const keyRing = await generateWorkMeshKeyRing({
    keyId: "key-1",
    createdAt: "2026-04-28T00:00:00.000Z",
  });

  assert.equal(keyRing.publicKeys.keyId, "key-1");
  assert.equal(keyRing.publicKeys.agreementAlgorithm, "X25519");
  assert.equal(keyRing.publicKeys.signingAlgorithm, "Ed25519");
  assert.equal("privateKey" in keyRing.publicKeys, false);
});

test("encrypts, signs, verifies, and decrypts a recipient message", async () => {
  const alice = await generateWorkMeshKeyRing({
    keyId: "alice-key",
    createdAt: "2026-04-28T00:00:00.000Z",
  });
  const bob = await generateWorkMeshKeyRing({
    keyId: "bob-key",
    createdAt: "2026-04-28T00:00:00.000Z",
  });
  const bobAgreementPublicKey = await importAgreementPublicKey(
    bob.publicKeys.agreementPublicKeyJwk,
  );
  const aliceAgreementPublicKey = await importAgreementPublicKey(
    alice.publicKeys.agreementPublicKeyJwk,
  );
  const aliceSigningPublicKey = await importSigningPublicKey(
    alice.publicKeys.signingPublicKeyJwk!,
  );

  const message = await encryptMessageForRecipient({
    id: workMeshId("message-1"),
    conversationId: workMeshId("conversation-1"),
    senderId: workMeshId("alice"),
    recipientId: workMeshId("bob"),
    payload: { body: "hello" },
    senderAgreementPrivateKey: alice.agreement.privateKey,
    recipientAgreementPublicKey: bobAgreementPublicKey,
    senderSigningPrivateKey: alice.signing!.privateKey,
    senderPublicKeyBundle: alice.publicKeys,
    recipientPublicKeyBundle: bob.publicKeys,
    sentAt: "2026-04-28T00:00:00.000Z",
  });
  const plaintext = await decryptMessageFromSender<{ body: string }>({
    message,
    recipientAgreementPrivateKey: bob.agreement.privateKey,
    senderAgreementPublicKey: aliceAgreementPublicKey,
    senderSigningPublicKey: aliceSigningPublicKey,
  });

  assert.equal(plaintext.body, "hello");
  assert.ok(message.signature);
});
