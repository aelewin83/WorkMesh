import type {
  Base64UrlString,
  EncryptedBlob,
  EncryptedMessage,
  EncryptedProfile,
  ISODateTime,
  ProfileType,
  PublicKeyBundle,
  WorkMeshId,
} from "@workmesh/types";

export const AES_GCM_ALGORITHM = "AES-GCM";
export const X25519_ALGORITHM = "X25519";
export const ED25519_ALGORITHM = "Ed25519";
export const WEBCRYPTO_PLACEHOLDER_ALGORITHM = "WEBCRYPTO_PLACEHOLDER";
export const CRYPTO_FORMAT_VERSION = 1;

export interface CryptoRuntime {
  readonly subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

export interface LocalOnlyKeyPair {
  readonly algorithm: "X25519" | "Ed25519";
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey;
  readonly localOnly: true;
}

export interface WorkMeshKeyRing {
  readonly keyId: string;
  readonly agreement: LocalOnlyKeyPair;
  readonly signing?: LocalOnlyKeyPair;
  readonly publicKeys: PublicKeyBundle;
  readonly localOnly: true;
}

export interface GenerateKeyRingOptions {
  readonly keyId?: string;
  readonly includeSigning?: boolean;
  readonly createdAt?: Date | string;
  readonly runtime?: CryptoRuntime;
}

export interface AesGcmOptions {
  readonly keyId?: string;
  readonly aad?: Uint8Array | string;
  readonly createdAt?: Date | string;
  readonly runtime?: CryptoRuntime;
}

export interface SharedAesKeyOptions {
  readonly privateKey: CryptoKey;
  readonly peerPublicKey: CryptoKey;
  readonly salt?: Uint8Array | string;
  readonly info?: Uint8Array | string;
  readonly runtime?: CryptoRuntime;
}

export interface EncryptProfileInput<PublicProfile, PrivateProfile> {
  readonly ownerId: WorkMeshId;
  readonly profileType: ProfileType;
  readonly publicProfile: PublicProfile;
  readonly privateProfile: PrivateProfile;
  readonly contentKey?: CryptoKey;
  readonly keyId?: string;
  readonly createdAt?: Date | string;
  readonly runtime?: CryptoRuntime;
}

export interface EncryptProfileResult<PublicProfile> {
  readonly profile: EncryptedProfile<PublicProfile>;
  readonly contentKey: CryptoKey;
}

export interface EncryptMessageInput<Payload> {
  readonly id: WorkMeshId;
  readonly conversationId: WorkMeshId;
  readonly senderId: WorkMeshId;
  readonly recipientId: WorkMeshId;
  readonly payload: Payload;
  readonly senderAgreementPrivateKey: CryptoKey;
  readonly recipientAgreementPublicKey: CryptoKey;
  readonly senderSigningPrivateKey?: CryptoKey;
  readonly senderPublicKeyBundle?: PublicKeyBundle;
  readonly recipientPublicKeyBundle?: PublicKeyBundle;
  readonly keyId?: string;
  readonly sentAt?: Date | string;
  readonly runtime?: CryptoRuntime;
}

export interface DecryptMessageInput {
  readonly message: EncryptedMessage;
  readonly recipientAgreementPrivateKey: CryptoKey;
  readonly senderAgreementPublicKey: CryptoKey;
  readonly senderSigningPublicKey?: CryptoKey;
  readonly runtime?: CryptoRuntime;
}

export class UnsupportedCryptoAlgorithmError extends Error {
  constructor(algorithm: string, cause?: unknown) {
    super(`WebCrypto algorithm is not supported by this runtime: ${algorithm}`);
    this.name = "UnsupportedCryptoAlgorithmError";
    if (cause) {
      this.cause = cause;
    }
  }
}

export function getCryptoRuntime(runtime?: CryptoRuntime): CryptoRuntime {
  if (runtime) {
    return runtime;
  }
  const cryptoImpl = globalThis.crypto;
  if (!cryptoImpl?.subtle || !cryptoImpl.getRandomValues) {
    throw new Error("A WebCrypto-compatible runtime is required.");
  }
  return {
    subtle: cryptoImpl.subtle,
    getRandomValues: cryptoImpl.getRandomValues.bind(cryptoImpl),
  };
}

export async function isAsymmetricAlgorithmSupported(
  algorithm: "X25519" | "Ed25519",
  runtime?: CryptoRuntime,
): Promise<boolean> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  try {
    if (algorithm === "X25519") {
      await cryptoRuntime.subtle.generateKey(
        { name: X25519_ALGORITHM } as Algorithm,
        false,
        ["deriveBits"],
      );
    } else {
      await cryptoRuntime.subtle.generateKey(
        { name: ED25519_ALGORITHM } as Algorithm,
        false,
        ["sign", "verify"],
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function generateAgreementKeyPair(
  runtime?: CryptoRuntime,
): Promise<LocalOnlyKeyPair> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  try {
    const pair = (await cryptoRuntime.subtle.generateKey(
      { name: X25519_ALGORITHM } as Algorithm,
      false,
      ["deriveBits"],
    )) as CryptoKeyPair;
    return {
      algorithm: "X25519",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      localOnly: true,
    };
  } catch (error) {
    throw new UnsupportedCryptoAlgorithmError(X25519_ALGORITHM, error);
  }
}

export async function generateSigningKeyPair(
  runtime?: CryptoRuntime,
): Promise<LocalOnlyKeyPair> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  try {
    const pair = (await cryptoRuntime.subtle.generateKey(
      { name: ED25519_ALGORITHM } as Algorithm,
      false,
      ["sign", "verify"],
    )) as CryptoKeyPair;
    return {
      algorithm: "Ed25519",
      publicKey: pair.publicKey,
      privateKey: pair.privateKey,
      localOnly: true,
    };
  } catch (error) {
    throw new UnsupportedCryptoAlgorithmError(ED25519_ALGORITHM, error);
  }
}

export async function generateWorkMeshKeyRing(
  options: GenerateKeyRingOptions = {},
): Promise<WorkMeshKeyRing> {
  const runtime = getCryptoRuntime(options.runtime);
  const keyId = options.keyId ?? randomKeyId(runtime);
  const agreement = await generateAgreementKeyPair(runtime);
  const signing =
    options.includeSigning === false ? undefined : await generateSigningKeyPair(runtime);
  const publicKeys = await publicKeyBundleFromLocalKeys({
    keyId,
    agreementPublicKey: agreement.publicKey,
    runtime,
    ...(options.createdAt !== undefined ? { createdAt: options.createdAt } : {}),
    ...(signing ? { signingPublicKey: signing.publicKey } : {}),
  });
  return {
    keyId,
    agreement,
    publicKeys,
    localOnly: true,
    ...(signing ? { signing } : {}),
  };
}

export async function publicKeyBundleFromLocalKeys(input: {
  readonly keyId: string;
  readonly agreementPublicKey: CryptoKey;
  readonly signingPublicKey?: CryptoKey;
  readonly createdAt?: Date | string;
  readonly runtime?: CryptoRuntime;
}): Promise<PublicKeyBundle> {
  const runtime = getCryptoRuntime(input.runtime);
  return {
    version: CRYPTO_FORMAT_VERSION,
    keyId: input.keyId,
    agreementAlgorithm: "X25519",
    signingAlgorithm: input.signingPublicKey ? "Ed25519" : "WEBCRYPTO_PLACEHOLDER",
    agreementPublicKeyJwk: await exportPublicJwk(input.agreementPublicKey, runtime),
    createdAt: toIsoDateTime(input.createdAt),
    ...(input.signingPublicKey
      ? { signingPublicKeyJwk: await exportPublicJwk(input.signingPublicKey, runtime) }
      : {}),
  };
}

export function placeholderPublicKeyBundle(input: {
  readonly keyId: string;
  readonly createdAt?: Date | string;
  readonly reason?: string;
}): PublicKeyBundle {
  return {
    version: CRYPTO_FORMAT_VERSION,
    keyId: input.keyId,
    agreementAlgorithm: WEBCRYPTO_PLACEHOLDER_ALGORITHM,
    signingAlgorithm: WEBCRYPTO_PLACEHOLDER_ALGORITHM,
    agreementPublicKeyJwk: {
      kty: "oct",
      key_ops: [],
      ext: true,
      alg: "placeholder",
      use: input.reason ?? "unsupported-runtime",
    },
    createdAt: toIsoDateTime(input.createdAt),
  };
}

export async function exportPublicJwk(
  publicKey: CryptoKey,
  runtime?: CryptoRuntime,
): Promise<JsonWebKey> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  return cryptoRuntime.subtle.exportKey("jwk", publicKey);
}

export async function importAgreementPublicKey(
  jwk: JsonWebKey,
  runtime?: CryptoRuntime,
): Promise<CryptoKey> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  return cryptoRuntime.subtle.importKey(
    "jwk",
    jwk,
    { name: X25519_ALGORITHM } as Algorithm,
    false,
    [],
  );
}

export async function importSigningPublicKey(
  jwk: JsonWebKey,
  runtime?: CryptoRuntime,
): Promise<CryptoKey> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  return cryptoRuntime.subtle.importKey(
    "jwk",
    jwk,
    { name: ED25519_ALGORITHM } as Algorithm,
    false,
    ["verify"],
  );
}

export async function generateAesGcmKey(
  runtime?: CryptoRuntime,
): Promise<CryptoKey> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  return cryptoRuntime.subtle.generateKey(
    { name: AES_GCM_ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveSharedAesGcmKey(
  options: SharedAesKeyOptions,
): Promise<CryptoKey> {
  const runtime = getCryptoRuntime(options.runtime);
  const sharedSecret = await runtime.subtle.deriveBits(
    { name: X25519_ALGORITHM, public: options.peerPublicKey } as Algorithm,
    options.privateKey,
    256,
  );
  const hkdfMaterial = await runtime.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return runtime.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asBufferSource(toBytes(options.salt ?? "workmesh-x25519-aes-gcm-v1")),
      info: asBufferSource(toBytes(options.info ?? "workmesh-content-key-v1")),
    },
    hkdfMaterial,
    { name: AES_GCM_ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(
  plaintext: Uint8Array,
  key: CryptoKey,
  options: AesGcmOptions = {},
): Promise<EncryptedBlob> {
  const runtime = getCryptoRuntime(options.runtime);
  const iv = randomBytes(12, runtime);
  const aadBytes = options.aad === undefined ? undefined : toBytes(options.aad);
  const params: AesGcmParams = {
    name: AES_GCM_ALGORITHM,
    iv: asBufferSource(iv),
    ...(aadBytes ? { additionalData: asBufferSource(aadBytes) } : {}),
  };
  const ciphertext = await runtime.subtle.encrypt(
    params,
    key,
    asBufferSource(plaintext),
  );
  return {
    version: CRYPTO_FORMAT_VERSION,
    algorithm: AES_GCM_ALGORITHM,
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
    createdAt: toIsoDateTime(options.createdAt),
    ...(options.keyId ? { keyId: options.keyId } : {}),
    ...(aadBytes ? { aad: bytesToBase64Url(aadBytes) } : {}),
  };
}

export async function decryptBytes(
  blob: EncryptedBlob,
  key: CryptoKey,
  runtime?: CryptoRuntime,
): Promise<Uint8Array> {
  assertEncryptedBlob(blob);
  const cryptoRuntime = getCryptoRuntime(runtime);
  const aadBytes = blob.aad ? base64UrlToBytes(blob.aad) : undefined;
  const params: AesGcmParams = {
    name: AES_GCM_ALGORITHM,
    iv: asBufferSource(base64UrlToBytes(blob.iv)),
    ...(aadBytes ? { additionalData: asBufferSource(aadBytes) } : {}),
  };
  const plaintext = await cryptoRuntime.subtle.decrypt(
    params,
    key,
    asBufferSource(base64UrlToBytes(blob.ciphertext)),
  );
  return new Uint8Array(plaintext);
}

export async function encryptJson<T>(
  value: T,
  key: CryptoKey,
  options: AesGcmOptions = {},
): Promise<EncryptedBlob> {
  return encryptBytes(utf8Encode(stableJson(value)), key, options);
}

export async function decryptJson<T>(
  blob: EncryptedBlob,
  key: CryptoKey,
  runtime?: CryptoRuntime,
): Promise<T> {
  const bytes = await decryptBytes(blob, key, runtime);
  return JSON.parse(utf8Decode(bytes)) as T;
}

export async function signBytes(
  privateKey: CryptoKey,
  bytes: Uint8Array,
  runtime?: CryptoRuntime,
): Promise<Base64UrlString> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  const signature = await cryptoRuntime.subtle.sign(
    { name: ED25519_ALGORITHM } as Algorithm,
    privateKey,
    asBufferSource(bytes),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function verifyBytes(
  publicKey: CryptoKey,
  signature: Base64UrlString,
  bytes: Uint8Array,
  runtime?: CryptoRuntime,
): Promise<boolean> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  return cryptoRuntime.subtle.verify(
    { name: ED25519_ALGORITHM } as Algorithm,
    publicKey,
    asBufferSource(base64UrlToBytes(signature)),
    asBufferSource(bytes),
  );
}

export async function encryptProfile<PublicProfile, PrivateProfile>(
  input: EncryptProfileInput<PublicProfile, PrivateProfile>,
): Promise<EncryptProfileResult<PublicProfile>> {
  const contentKey = input.contentKey ?? (await generateAesGcmKey(input.runtime));
  const aad = stableJson({
    ownerId: input.ownerId,
    profileType: input.profileType,
    publicProfile: input.publicProfile,
  });
  const encryptedBlob = await encryptJson(input.privateProfile, contentKey, {
    aad,
    ...(input.keyId ? { keyId: input.keyId } : {}),
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : {}),
    ...(input.runtime ? { runtime: input.runtime } : {}),
  });
  return {
    profile: {
      ownerId: input.ownerId,
      profileType: input.profileType,
      publicProfile: input.publicProfile,
      encryptedBlob,
      updatedAt: toIsoDateTime(input.createdAt),
    },
    contentKey,
  };
}

export async function decryptProfile<PrivateProfile>(
  profile: EncryptedProfile,
  contentKey: CryptoKey,
  runtime?: CryptoRuntime,
): Promise<PrivateProfile> {
  return decryptJson<PrivateProfile>(profile.encryptedBlob, contentKey, runtime);
}

export async function encryptMessageForRecipient<Payload>(
  input: EncryptMessageInput<Payload>,
): Promise<EncryptedMessage> {
  const runtime = getCryptoRuntime(input.runtime);
  const salt = stableJson({
    conversationId: input.conversationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
  });
  const contentKey = await deriveSharedAesGcmKey({
    privateKey: input.senderAgreementPrivateKey,
    peerPublicKey: input.recipientAgreementPublicKey,
    salt,
    runtime,
  });
  const sentAt = toIsoDateTime(input.sentAt);
  const aad = stableJson({
    id: input.id,
    conversationId: input.conversationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    sentAt,
  });
  const encryptedBlob = await encryptJson(input.payload, contentKey, {
    aad,
    createdAt: sentAt,
    runtime,
    ...(input.keyId ? { keyId: input.keyId } : {}),
  });
  const signature = input.senderSigningPrivateKey
    ? await signBytes(
        input.senderSigningPrivateKey,
        messageSigningBytes({
          id: input.id,
          conversationId: input.conversationId,
          senderId: input.senderId,
          recipientId: input.recipientId,
          encryptedBlob,
          sentAt,
        }),
        runtime,
      )
    : undefined;
  return {
    id: input.id,
    conversationId: input.conversationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    encryptedBlob,
    sentAt,
    ...(input.senderPublicKeyBundle ? { senderPublicKey: input.senderPublicKeyBundle } : {}),
    ...(input.recipientPublicKeyBundle
      ? { recipientPublicKey: input.recipientPublicKeyBundle }
      : {}),
    ...(signature ? { signature } : {}),
  };
}

export async function decryptMessageFromSender<Payload>(
  input: DecryptMessageInput,
): Promise<Payload> {
  const runtime = getCryptoRuntime(input.runtime);
  if (input.message.signature && input.senderSigningPublicKey) {
    const valid = await verifyBytes(
      input.senderSigningPublicKey,
      input.message.signature,
      messageSigningBytes(input.message),
      runtime,
    );
    if (!valid) {
      throw new Error("Encrypted message signature verification failed.");
    }
  }
  const salt = stableJson({
    conversationId: input.message.conversationId,
    senderId: input.message.senderId,
    recipientId: input.message.recipientId,
  });
  const contentKey = await deriveSharedAesGcmKey({
    privateKey: input.recipientAgreementPrivateKey,
    peerPublicKey: input.senderAgreementPublicKey,
    salt,
    runtime,
  });
  return decryptJson<Payload>(input.message.encryptedBlob, contentKey, runtime);
}

export function assertEncryptedBlob(blob: EncryptedBlob): void {
  if (
    blob.version !== CRYPTO_FORMAT_VERSION ||
    blob.algorithm !== AES_GCM_ALGORITHM ||
    !blob.iv ||
    !blob.ciphertext
  ) {
    throw new Error("Expected a WorkMesh AES-GCM encrypted blob.");
  }
}

export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<EncryptedBlob>;
  return (
    candidate.version === CRYPTO_FORMAT_VERSION &&
    candidate.algorithm === AES_GCM_ALGORITHM &&
    typeof candidate.iv === "string" &&
    typeof candidate.ciphertext === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export async function sha256Hex(
  data: Uint8Array | string,
  runtime?: CryptoRuntime,
): Promise<string> {
  const cryptoRuntime = getCryptoRuntime(runtime);
  const digest = await cryptoRuntime.subtle.digest("SHA-256", asBufferSource(toBytes(data)));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToBase64Url(bytes: Uint8Array): Base64UrlString {
  const base64 =
    typeof btoa === "function"
      ? btoa(binaryStringFromBytes(bytes))
      : nodeBufferFrom(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") as Base64UrlString;
}

export function base64UrlToBytes(value: Base64UrlString | string): Uint8Array {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  if (typeof atob === "function") {
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  }
  return new Uint8Array(nodeBufferFrom(padded, "base64"));
}

function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function messageSigningBytes(input: {
  readonly id: WorkMeshId;
  readonly conversationId: WorkMeshId;
  readonly senderId: WorkMeshId;
  readonly recipientId: WorkMeshId;
  readonly encryptedBlob: EncryptedBlob;
  readonly sentAt: ISODateTime;
}): Uint8Array {
  return utf8Encode(
    stableJson({
      id: input.id,
      conversationId: input.conversationId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      encryptedBlob: input.encryptedBlob,
      sentAt: input.sentAt,
    }),
  );
}

function randomKeyId(runtime: CryptoRuntime): string {
  return `wmk_${bytesToBase64Url(randomBytes(16, runtime))}`;
}

function randomBytes(length: number, runtime: CryptoRuntime): Uint8Array {
  const bytes = new Uint8Array(length);
  runtime.getRandomValues(bytes);
  return bytes;
}

function toBytes(value: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof value === "string") {
    return utf8Encode(value);
  }
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
}

function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function utf8Decode(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function binaryStringFromBytes(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return binary;
}

function toIsoDateTime(value?: Date | string): ISODateTime {
  if (value instanceof Date) {
    return value.toISOString() as ISODateTime;
  }
  if (value) {
    return new Date(value).toISOString() as ISODateTime;
  }
  return new Date().toISOString() as ISODateTime;
}

function nodeBufferFrom(
  value: Uint8Array | string,
  encoding?: "base64",
): { toString(encoding: "base64"): string } & Uint8Array {
  const maybeBuffer = (
    globalThis as unknown as {
      Buffer?: {
        from(input: Uint8Array | string, encoding?: "base64"): Uint8Array & {
          toString(encoding: "base64"): string;
        };
      };
    }
  ).Buffer;
  if (!maybeBuffer) {
    throw new Error("Base64 conversion requires btoa/atob or Node Buffer.");
  }
  return maybeBuffer.from(value, encoding);
}
