import {
  assertEncryptedBlob,
  isEncryptedBlob,
  sha256Hex,
  stableJson,
} from "@workmesh/crypto";
import type {
  EncryptedBlob,
  EncryptedMessage,
  EncryptedProfile,
  ISODateTime,
  Sha256HexDigest,
  StoragePointer,
  StorageProvider,
  StorageWriteOptions,
} from "@workmesh/types";

export type { StorageProvider } from "@workmesh/types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageProviderOptions {
  readonly namespace?: string;
  readonly storage?: StorageLike;
}

export interface IPFSStorageProviderOptions {
  readonly endpoint: string;
  readonly gatewayUrl?: string;
  readonly fetch?: typeof fetch;
  readonly id?: string;
}

export class LocalStorageProvider implements StorageProvider {
  readonly id = "local";
  private readonly namespace: string;
  private readonly storage: StorageLike;

  constructor(options: LocalStorageProviderOptions = {}) {
    this.namespace = options.namespace ?? "workmesh:encrypted:";
    this.storage = options.storage ?? getDefaultStorage();
  }

  async putEncryptedBlob(
    blob: EncryptedBlob,
    options: StorageWriteOptions = {},
  ): Promise<StoragePointer> {
    assertEncryptedBlob(blob);
    const serialized = serializeEncryptedBlob(blob);
    const digest = (await sha256Hex(serialized)) as Sha256HexDigest;
    const key = options.key ?? digest;
    this.storage.setItem(this.storageKey(key), serialized);
    return pointerFor({
      provider: this.id,
      key,
      blob,
      serialized,
      digest,
    });
  }

  async getEncryptedBlob(pointer: StoragePointer): Promise<EncryptedBlob> {
    const serialized = this.storage.getItem(this.storageKey(pointer.key));
    if (!serialized) {
      throw new Error(`Encrypted blob not found for local key ${pointer.key}.`);
    }
    const digest = await sha256Hex(serialized);
    if (digest !== pointer.sha256) {
      throw new Error("Encrypted blob digest mismatch.");
    }
    return parseEncryptedBlob(serialized);
  }

  async deleteEncryptedBlob(pointer: StoragePointer): Promise<void> {
    this.storage.removeItem(this.storageKey(pointer.key));
  }

  private storageKey(key: string): string {
    return `${this.namespace}${key}`;
  }
}

export class IPFSStorageProvider implements StorageProvider {
  readonly id: string;
  private readonly endpoint: string;
  private readonly gatewayUrl: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: IPFSStorageProviderOptions) {
    this.id = options.id ?? "ipfs";
    this.endpoint = options.endpoint.replace(/\/+$/g, "");
    this.gatewayUrl = options.gatewayUrl?.replace(/\/+$/g, "");
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error("IPFSStorageProvider requires fetch.");
    }
    this.fetchImpl = fetchImpl;
  }

  async putEncryptedBlob(
    blob: EncryptedBlob,
    options: StorageWriteOptions = {},
  ): Promise<StoragePointer> {
    assertEncryptedBlob(blob);
    if (typeof FormData === "undefined" || typeof Blob === "undefined") {
      throw new Error("IPFSStorageProvider requires FormData and Blob support.");
    }
    const serialized = serializeEncryptedBlob(blob);
    const digest = (await sha256Hex(serialized)) as Sha256HexDigest;
    const form = new FormData();
    form.append(
      "file",
      new Blob([serialized], {
        type: options.contentType ?? "application/workmesh.encrypted+json",
      }),
      options.key ?? `${digest}.json`,
    );
    const response = await this.fetchImpl(
      `${this.endpoint}/api/v0/add?pin=${options.pin === false ? "false" : "true"}`,
      {
        method: "POST",
        body: form,
      },
    );
    if (!response.ok) {
      throw new Error(`IPFS add failed with HTTP ${response.status}.`);
    }
    const json = (await response.json()) as IPFSAddResponse;
    const cid = readCid(json);
    if (!cid) {
      throw new Error("IPFS add response did not include a CID.");
    }
    return pointerFor({
      provider: this.id,
      key: options.key ?? cid,
      cid,
      blob,
      serialized,
      digest,
      ...(this.gatewayUrl ? { url: `${this.gatewayUrl}/ipfs/${cid}` } : {}),
    });
  }

  async getEncryptedBlob(pointer: StoragePointer): Promise<EncryptedBlob> {
    const cid = pointer.cid ?? pointer.key;
    const response = await this.fetchImpl(`${this.endpoint}/api/v0/cat?arg=${cid}`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`IPFS cat failed with HTTP ${response.status}.`);
    }
    const serialized = await response.text();
    const digest = await sha256Hex(serialized);
    if (digest !== pointer.sha256) {
      throw new Error("Encrypted blob digest mismatch.");
    }
    return parseEncryptedBlob(serialized);
  }
}

export async function storeEncryptedProfileBlob(
  provider: StorageProvider,
  profile: EncryptedProfile,
  options?: StorageWriteOptions,
): Promise<StoragePointer> {
  return provider.putEncryptedBlob(profile.encryptedBlob, options);
}

export async function storeEncryptedMessageBlob(
  provider: StorageProvider,
  message: EncryptedMessage,
  options?: StorageWriteOptions,
): Promise<StoragePointer> {
  return provider.putEncryptedBlob(message.encryptedBlob, options);
}

export function serializeEncryptedBlob(blob: EncryptedBlob): string {
  assertEncryptedBlob(blob);
  return stableJson(blob);
}

export function parseEncryptedBlob(serialized: string): EncryptedBlob {
  const value = JSON.parse(serialized) as unknown;
  if (!isEncryptedBlob(value)) {
    throw new Error("Stored payload is not a WorkMesh encrypted blob.");
  }
  return value;
}

interface IPFSAddResponse {
  readonly Hash?: string;
  readonly Cid?: {
    readonly "/": string;
  };
  readonly cid?: string;
}

function pointerFor(input: {
  readonly provider: string;
  readonly key: string;
  readonly cid?: string;
  readonly url?: string;
  readonly blob: EncryptedBlob;
  readonly serialized: string;
  readonly digest: Sha256HexDigest;
}): StoragePointer {
  return {
    provider: input.provider,
    key: input.key,
    sha256: input.digest,
    bytes: new TextEncoder().encode(input.serialized).byteLength,
    encryption: {
      algorithm: input.blob.algorithm,
      ...(input.blob.keyId ? { keyId: input.blob.keyId } : {}),
    },
    createdAt: new Date().toISOString() as ISODateTime,
    ...(input.cid ? { cid: input.cid } : {}),
    ...(input.url ? { url: input.url } : {}),
  };
}

function readCid(response: IPFSAddResponse): string | undefined {
  return response.Hash ?? response.Cid?.["/"] ?? response.cid;
}

function getDefaultStorage(): StorageLike {
  const candidate = (globalThis as unknown as { localStorage?: StorageLike }).localStorage;
  return candidate ?? new MemoryStorage();
}

class MemoryStorage implements StorageLike {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}
