export type ContractorGigStatus = "available" | "applied" | "claimed" | "in_progress" | "completed" | "disputed";
export type ContractorAgreementStatus =
  | "draft"
  | "accepted"
  | "arrived"
  | "in_progress"
  | "completion_submitted"
  | "employer_review"
  | "approved"
  | "disputed";

export type ContractorNotificationType =
  | "gig_matched"
  | "application_accepted"
  | "escrow_funded"
  | "message_received"
  | "agreement_ready"
  | "completion_approved"
  | "payout_released"
  | "review_received"
  | "level_unlocked"
  | "disclosure_request"
  | "dispute_opened";

export type ContractorDisclosureField =
  | "realName"
  | "phone"
  | "email"
  | "preciseLocation"
  | "portfolio"
  | "credentials";

export type ContractorProfileDto = {
  walletAddress: string;
  handle: string;
  publicKey: string;
  signingPublicKey: string;
  publicFields: {
    initials: string;
    approximateRegion: string;
    rating: number;
    trustScore: number;
    levelName: string;
  };
  encryptedPrivateBlobRef: string;
  level: number;
  xp: number;
  xpNext: number;
  streakDays: number;
  trustScore: number;
  skills: string[];
  serviceCategories: string[];
  availability: "ready_now" | "available_today" | "offline";
  workPreference: "local" | "remote" | "hybrid";
  privacySettings: Record<ContractorDisclosureField, boolean>;
  createdAt: string;
  updatedAt: string;
};

export type ContractorGigDto = {
  id: string;
  title: string;
  client: string;
  employerWallet: string;
  category: string;
  descriptionPreview: string;
  encryptedDetailsRef: string;
  pay: number;
  currency: "USD" | "USDC";
  distanceMiles: number;
  locationMode: "local" | "remote";
  coordinates: { lat: number; lng: number };
  timeWindow: string;
  urgency: "standard" | "priority" | "surge";
  requiredLevel: number;
  requiredSkills: string[];
  status: ContractorGigStatus;
  escrowRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecommendedGigDto = {
  gig: ContractorGigDto;
  matchScore: {
    totalScore: number;
    confidenceScore: number;
    scoreBreakdown: {
      skillFit: number;
      proximity: number;
      levelEligibility: number;
      rating: number;
      availability: number;
      completionHistory: number;
      priceFit: number;
      responseSpeed: number;
    };
    explanation: string;
    missingRequirements: string[];
    suggestedActions: string[];
    levelUnlock?: {
      missingLevel: number;
      xpNeeded: number;
      action: string;
    };
  };
};

export type MessageThreadDto = {
  id: string;
  participantWallets: string[];
  gigId: string;
  agreementId: string;
  lastMessagePreview: string;
  unreadCount: number;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  threadId: string;
  senderWallet: string;
  encryptedPayload: string;
  attachmentRefs: string[];
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  readAt?: string;
};

export type AgreementDto = {
  id: string;
  gigId: string;
  employerWallet: string;
  contractorWallet: string;
  termsRef: string;
  termsPreview: string[];
  status: ContractorAgreementStatus;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  proofRefs: string[];
  proofNotes: string[];
  employerConfirmedAt?: string;
  disputeId?: string;
};

export type PaymentEscrowDto = {
  agreementId: string;
  status: "not_funded" | "funded" | "completion_submitted" | "released" | "refunded" | "disputed";
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  gasEstimate: number;
  treasuryWallet: string;
  chainId: number;
  txHash?: string;
  updatedAt: string;
};

export type PayoutHistoryDto = {
  id: string;
  walletAddress: string;
  agreementId: string;
  label: string;
  amount: number;
  status: string;
  createdAt: string;
};

export type NotificationDto = {
  id: string;
  walletAddress: string;
  type: ContractorNotificationType;
  title: string;
  body: string;
  relatedEntityType: "gig" | "message" | "agreement" | "payment" | "profile";
  relatedEntityId: string;
  target: string;
  read: boolean;
  createdAt: string;
};

export type DisclosureAuditDto = {
  id: string;
  walletAddress: string;
  recipientWallet: string;
  disclosedFields: ContractorDisclosureField[];
  purpose: string;
  agreementId?: string;
  createdAt: string;
  revokedAt?: string;
};

export type ContractorCommandApiStateDto = {
  profile: ContractorProfileDto;
  gigs: ContractorGigDto[];
  recommendations: RecommendedGigDto[];
  threads: MessageThreadDto[];
  messages: MessageDto[];
  agreement: AgreementDto;
  escrow: PaymentEscrowDto;
  payoutHistory: PayoutHistoryDto[];
  notifications: NotificationDto[];
  disclosureAudit: DisclosureAuditDto[];
};
