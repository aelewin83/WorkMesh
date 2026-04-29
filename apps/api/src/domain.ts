export type GigStatus = "open" | "in_progress" | "completed" | "cancelled";
export type AgreementStatus = "proposed" | "active" | "completed" | "disputed" | "cancelled";
export type NotificationType = "system" | "match" | "message" | "payment" | "review";
export type FeeType = "platform" | "treasury" | "referral";
export type FeeStatus = "quoted" | "pending" | "captured" | "refunded";
export type PaymentRail = "protected_escrow" | "ach" | "card" | "wallet_processor" | "stablecoin_escrow" | "direct";
export type SettlementPolicy = "protected_required" | "direct_allowed" | "direct_locked";

export interface SkillTag {
  id: string;
  name: string;
  slug: string;
  category: string;
  createdAt: string;
}

export interface UserIndex {
  id: string;
  wallet: string;
  handle?: string;
  displayName: string;
  bio?: string;
  skills: SkillTag[];
  createdAt: string;
  updatedAt: string;
}

export interface GigIndex {
  id: string;
  title: string;
  description: string;
  buyerWallet: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  requiredSkills: SkillTag[];
  status: GigStatus;
  remote: boolean;
  region?: string;
  requiredLevel?: number;
  urgency?: "standard" | "priority" | "urgent";
  encryptedDetailsRef?: string;
  publicDiscoveryMetadata: string[];
  protectedPaymentRequired: boolean;
  directSettlementEligible: boolean;
  allowedPaymentRails: PaymentRail[];
  createdAt: string;
  updatedAt: string;
}

export interface AgreementIndex {
  id: string;
  gigId: string;
  buyerWallet: string;
  workerWallet: string;
  status: AgreementStatus;
  escrowAmount: number;
  currency: string;
  startedAt: string;
  completedAt?: string;
}

export interface ReputationIndex {
  wallet: string;
  completedGigs: number;
  averageRating: number;
  onTimeRate: number;
  disputeRate: number;
  endorsedSkills: string[];
  updatedAt: string;
}

export interface UserLevel {
  wallet: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  title?: string;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  unlockables?: string[];
  updatedAt: string;
}

export interface MatchScore {
  id: string;
  wallet: string;
  gigId: string;
  score: number;
  totalScore: number;
  confidenceScore: number;
  signals: Record<string, number>;
  explanation: string;
  missingRequirements: string[];
  suggestedActions: string[];
  createdAt: string;
}

export interface PriceQuote {
  id: string;
  gigId?: string;
  wallet?: string;
  scope: string;
  currency: string;
  recommendedMin: number;
  recommendedMax: number;
  platformFee: number;
  workerReceives: number;
  buyerPays: number;
  suggestedPrice: number;
  minimumPrice: number;
  premiumPrice: number;
  marketPressure: "low" | "balanced" | "high" | "surge";
  estimatedGasFee: number;
  paymentRails: PaymentRail[];
  settlementPolicy: SettlementPolicy;
  protectedPaymentReason: string[];
  directSettlementUnlocks: string[];
  explanation: string;
  factors: {
    baseTaskRate: number;
    urgencyMultiplier: number;
    supplyDemandMultiplier: number;
    skillScarcityMultiplier: number;
    timeWindowMultiplier: number;
    locationMultiplier: number;
  };
  confidence: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  wallet: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  wallet: string;
  key: string;
  title: string;
  description: string;
  awardedAt: string;
}

export interface TreasuryRevenue {
  id: string;
  source: string;
  amount: number;
  currency: string;
  period: string;
  createdAt: string;
}

export interface FeeLedger {
  id: string;
  agreementId?: string;
  quoteId?: string;
  payerWallet: string;
  payeeWallet: string;
  feeType: FeeType;
  amount: number;
  currency: string;
  status: FeeStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  fromWallet: string;
  toWallet: string;
  encryptedPayload: {
    algorithm: string;
    ciphertext: string;
    nonce?: string;
    aad?: string;
  };
  plaintextRejected: boolean;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  participants: string[];
  lastMessageAt: string;
  messages: Message[];
}

export interface ReviewIndex {
  id: string;
  agreementId?: string;
  reviewerWallet: string;
  revieweeWallet: string;
  rating: number;
  comment?: string;
  skillSlugs: string[];
  createdAt: string;
}

export interface UserProfile {
  user: UserIndex;
  reputation: ReputationIndex;
  level: UserLevel;
  achievements: Achievement[];
  notifications: Notification[];
  agreements: AgreementIndex[];
}

export interface ScoredGig {
  gig: GigIndex;
  match: MatchScore;
}
