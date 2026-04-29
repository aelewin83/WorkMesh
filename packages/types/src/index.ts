export type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type WorkMeshId = Brand<string, "WorkMeshId">;
export type ISODateTime = Brand<string, "ISODateTime">;
export type CurrencyCode = Brand<string, "CurrencyCode">;
export type Base64UrlString = Brand<string, "Base64UrlString">;
export type Sha256HexDigest = Brand<string, "Sha256HexDigest">;
export type SkillTag = Brand<string, "SkillTag">;

export type AvailabilityStatus =
  | "available"
  | "limited"
  | "busy"
  | "offline";

export type UrgencyLevel = "low" | "normal" | "high" | "critical";
export type ComplexityLevel = "simple" | "standard" | "complex" | "expert";
export type WorkLocationMode = "remote" | "hybrid" | "onsite";
export type ProfileType = "worker" | "client";

export interface GeoPoint {
  readonly country: string;
  readonly region?: string;
  readonly city?: string;
  readonly timeZone?: string;
  readonly latitude?: number;
  readonly longitude?: number;
}

export interface ReputationStats {
  readonly completedJobs: number;
  readonly averageRating: number;
  readonly responseRate: number;
  readonly disputeRate: number;
  readonly onTimeRate: number;
}

export interface VerificationState {
  readonly identity: "unverified" | "pending" | "verified";
  readonly backgroundCheck?: "not_required" | "pending" | "passed" | "failed";
  readonly credentials?: readonly string[];
}

export interface RateCard {
  readonly currency: CurrencyCode;
  readonly hourlyRate: number;
  readonly minimumEngagementHours?: number;
  readonly rushMultiplier?: number;
}

export interface AvailabilityWindow {
  readonly status: AvailabilityStatus;
  readonly weeklyHours: number;
  readonly nextStartAt?: ISODateTime;
}

export interface PublicKeyBundle {
  readonly version: 1;
  readonly keyId: string;
  readonly agreementAlgorithm: "X25519" | "ECDH-P256" | "WEBCRYPTO_PLACEHOLDER";
  readonly signingAlgorithm: "Ed25519" | "ECDSA-P256" | "WEBCRYPTO_PLACEHOLDER";
  readonly agreementPublicKeyJwk: JsonWebKey;
  readonly signingPublicKeyJwk?: JsonWebKey;
  readonly createdAt: ISODateTime;
}

export interface WorkerProfile {
  readonly id: WorkMeshId;
  readonly displayName: string;
  readonly headline?: string;
  readonly skills: readonly SkillTag[];
  readonly domains: readonly string[];
  readonly languages: readonly string[];
  readonly location: GeoPoint;
  readonly workModes: readonly WorkLocationMode[];
  readonly availability: AvailabilityWindow;
  readonly rateCard: RateCard;
  readonly reputation: ReputationStats;
  readonly verification: VerificationState;
  readonly publicKeys?: PublicKeyBundle;
  readonly encryptedProfileRef?: StoragePointer;
  readonly updatedAt: ISODateTime;
}

export interface ClientProfile {
  readonly id: WorkMeshId;
  readonly displayName: string;
  readonly organizationName?: string;
  readonly domains: readonly string[];
  readonly location?: GeoPoint;
  readonly publicKeys?: PublicKeyBundle;
  readonly encryptedProfileRef?: StoragePointer;
  readonly updatedAt: ISODateTime;
}

export interface WorkBudget {
  readonly currency: CurrencyCode;
  readonly maxHourlyRate?: number;
  readonly maxTotal?: number;
  readonly targetHours?: number;
}

export interface WorkTiming {
  readonly urgency: UrgencyLevel;
  readonly desiredStartAt?: ISODateTime;
  readonly deadlineAt?: ISODateTime;
}

export interface WorkRequest {
  readonly id: WorkMeshId;
  readonly clientId: WorkMeshId;
  readonly title: string;
  readonly requiredSkills: readonly SkillTag[];
  readonly optionalSkills?: readonly SkillTag[];
  readonly domain?: string;
  readonly locationMode: WorkLocationMode;
  readonly locationPreference?: GeoPoint;
  readonly timing: WorkTiming;
  readonly budget: WorkBudget;
  readonly complexity: ComplexityLevel;
  readonly encryptedDetailsRef?: StoragePointer;
  readonly createdAt: ISODateTime;
}

export interface MarketSnapshot {
  readonly currency: CurrencyCode;
  readonly medianHourlyRate: number;
  readonly p75HourlyRate?: number;
  readonly supplyDemandRatio?: number;
  readonly scarceSkills?: readonly SkillTag[];
  readonly capturedAt: ISODateTime;
}

export interface MatchScoreComponents {
  readonly requiredSkillCoverage: number;
  readonly optionalSkillCoverage: number;
  readonly availabilityFit: number;
  readonly budgetFit: number;
  readonly reputationFit: number;
  readonly locationFit: number;
  readonly freshnessFit: number;
}

export interface MatchResult {
  readonly formulaVersion: string;
  readonly requestId: WorkMeshId;
  readonly workerId: WorkMeshId;
  readonly rank: number | null;
  readonly eligible: boolean;
  readonly decision: "strong" | "review" | "weak" | "ineligible";
  readonly score: number;
  readonly normalizedScore: number;
  readonly components: MatchScoreComponents;
  readonly matchedRequiredSkills: readonly SkillTag[];
  readonly missingRequiredSkills: readonly SkillTag[];
  readonly matchedOptionalSkills: readonly SkillTag[];
  readonly explanations: readonly string[];
}

export interface PriceBreakdown {
  readonly baseHourlyRate: number;
  readonly skillPremium: number;
  readonly urgencyMultiplier: number;
  readonly complexityMultiplier: number;
  readonly scarcityMultiplier: number;
  readonly reputationMultiplier: number;
  readonly adjustedHourlyRate: number;
  readonly estimatedHours: number;
  readonly subtotal: number;
  readonly platformFeeRate: number;
  readonly platformFee: number;
  readonly riskReserveRate: number;
  readonly riskReserve: number;
}

export interface PriceQuote {
  readonly formulaVersion: string;
  readonly requestId: WorkMeshId;
  readonly workerId?: WorkMeshId;
  readonly currency: CurrencyCode;
  readonly total: number;
  readonly withinBudget: boolean;
  readonly minChargeApplied: boolean;
  readonly breakdown: PriceBreakdown;
  readonly explanations: readonly string[];
}

export interface EncryptedBlob {
  readonly version: 1;
  readonly algorithm: "AES-GCM";
  readonly keyId?: string;
  readonly iv: Base64UrlString;
  readonly ciphertext: Base64UrlString;
  readonly aad?: Base64UrlString;
  readonly createdAt: ISODateTime;
}

export interface StoragePointer {
  readonly provider: "ipfs" | "local" | string;
  readonly key: string;
  readonly cid?: string;
  readonly url?: string;
  readonly sha256: Sha256HexDigest;
  readonly bytes: number;
  readonly encryption: {
    readonly algorithm: "AES-GCM";
    readonly keyId?: string;
  };
  readonly createdAt: ISODateTime;
}

export interface EncryptedProfile<PublicProfile = unknown> {
  readonly ownerId: WorkMeshId;
  readonly profileType: ProfileType;
  readonly publicProfile: PublicProfile;
  readonly encryptedBlob: EncryptedBlob;
  readonly updatedAt: ISODateTime;
}

export interface EncryptedMessage {
  readonly id: WorkMeshId;
  readonly conversationId: WorkMeshId;
  readonly senderId: WorkMeshId;
  readonly recipientId: WorkMeshId;
  readonly encryptedBlob: EncryptedBlob;
  readonly senderPublicKey?: PublicKeyBundle;
  readonly recipientPublicKey?: PublicKeyBundle;
  readonly signature?: Base64UrlString;
  readonly sentAt: ISODateTime;
}

export interface StorageWriteOptions {
  readonly key?: string;
  readonly pin?: boolean;
  readonly contentType?: "application/workmesh.encrypted+json";
}

export interface StorageProvider {
  readonly id: string;
  putEncryptedBlob(
    blob: EncryptedBlob,
    options?: StorageWriteOptions,
  ): Promise<StoragePointer>;
  getEncryptedBlob(pointer: StoragePointer): Promise<EncryptedBlob>;
  deleteEncryptedBlob?(pointer: StoragePointer): Promise<void>;
}

export const WORKMESH_ENCRYPTED_CONTENT_TYPE =
  "application/workmesh.encrypted+json" as const;

export function workMeshId(value: string): WorkMeshId {
  return value as WorkMeshId;
}

export function isoDateTime(value: string): ISODateTime {
  return value as ISODateTime;
}

export function currencyCode(value: string): CurrencyCode {
  return value.toUpperCase() as CurrencyCode;
}

export function skillTag(value: string): SkillTag {
  return value.trim().toLowerCase() as SkillTag;
}

export function base64Url(value: string): Base64UrlString {
  return value as Base64UrlString;
}

export function sha256Hex(value: string): Sha256HexDigest {
  return value as Sha256HexDigest;
}
