export type ContractorGigStatus = "available" | "applied" | "claimed" | "in_progress" | "completed" | "disputed" | "closed" | "cancelled";
export type EngagementContributorStatus = "invited" | "applied" | "accepted" | "rejected" | "active" | "removed" | "completed";
export type EngagementVisibilityMode = "compartmentalized" | "operational_team" | "full_collaboration";
export type ParticipantVisibilityLevel = "hidden" | "alias_only" | "role_only" | "limited_profile" | "full_profile";
export type ContributorMessagingPermission = "disabled" | "room_only" | "engagement_dm_enabled";
export type DisclosureState = "minimal" | "operational" | "expanded";
export type CoordinationRoomType = "engagement_group" | "engagement_dm";
export type CoordinationRoomStatus = "active" | "closed";
export type CoordinationParticipantType = "employer" | "contributor";
export type CoordinationParticipantStatus = "active" | "removed" | "pending" | "muted";
export type ContractorAgreementStatus =
  | "draft"
  | "accepted"
  | "active"
  | "arrived"
  | "in_progress"
  | "completion_submitted"
  | "proof_submitted"
  | "pending_employer_confirmation"
  | "employer_review"
  | "approved"
  | "funded"
  | "revision_requested"
  | "pending_completion_approval"
  | "completed"
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

export type EngagementStructureDto = "flat_fee" | "hourly" | "day_rate" | "weekly_retainer" | "open_proposal";

export type EngagementPreferenceDto = {
  structure: EngagementStructureDto;
  ratePreview?: string;
  visibility: "public" | "after_application" | "agreement_only" | "private";
  notes?: string;
};

export type ContractorDisclosureField =
  | "realName"
  | "phone"
  | "email"
  | "preciseLocation"
  | "portfolio"
  | "credentials";

export type ContractorSkillDto = {
  id: string;
  label: string;
  category: string;
  proficiencyLevel: "learning" | "capable" | "advanced" | "expert";
};

export type ContractorAvailabilityDto = {
  availableNow: boolean;
  sameDay: boolean;
  recurring: boolean;
  weeklySchedule: string[];
  timezone: string;
};

export type ContractorRegionDto = {
  country: string;
  state: string;
  city: string;
  metro: string;
  serviceRadiusMiles: number;
  locationMode: "local" | "remote" | "hybrid";
  approximateCoordinates?: { lat: number; lng: number };
  preciseLocationShared: boolean;
};

export type ContractorPrivacySettingsDto = {
  showHandle: boolean;
  showSkills: boolean;
  showRegion: boolean;
  showRating: boolean;
  showAvailability: boolean;
  showExactLocation: boolean;
  showRealName: boolean;
  showPhone: boolean;
  showEmail: boolean;
  requireConfirmationBeforeDisclosure: boolean;
};

export type ContractorDisclosureSettingsDto = Record<ContractorDisclosureField, boolean>;

export type ContractorProfileDto = {
  walletAddress: string;
  handle: string;
  avatarUrl?: string;
  initials: string;
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
  verticals: string[];
  skills: string[];
  customSkills: string[];
  useCasePreferences: string[];
  engagementPreferences?: EngagementPreferenceDto[];
  rateVisibility?: "public" | "after_application" | "agreement_only" | "private";
  skillDetails: ContractorSkillDto[];
  categories: string[];
  serviceCategories: string[];
  experienceLevel: "0_1" | "1_3" | "3_5" | "5_plus";
  certifications: string[];
  licenses: string[];
  availability: "ready_now" | "available_today" | "offline";
  availabilityDetails: ContractorAvailabilityDto;
  region: ContractorRegionDto;
  workPreference: "local" | "remote" | "hybrid";
  privacySettings: ContractorDisclosureSettingsDto;
  profileVisibility: ContractorPrivacySettingsDto;
  disclosureSettings: ContractorDisclosureSettingsDto;
  publicProfileFields: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContractorProfileInputDto = Partial<ContractorProfileDto> & {
  walletAddress: string;
  handle: string;
};

export type ContractorGigDto = {
  id: string;
  title: string;
  client: string;
  employerWallet: string;
  category: string;
  verticals: string[];
  descriptionPreview: string;
  encryptedDetailsRef: string;
  pay: number;
  currency: "USD" | "USDC";
  engagementStructure?: EngagementStructureDto;
  rateAmount?: number;
  rateCurrency?: "USD" | "USDC";
  ratePreview?: string;
  estimatedDuration?: "single_task" | "one_day" | "several_days" | "one_week" | "ongoing" | "flexible";
  proposalNotes?: string;
  distanceMiles: number;
  locationMode: "local" | "remote";
  coordinates: { lat: number; lng: number };
  timeWindow: string;
  urgency: "standard" | "priority" | "surge";
  requiredLevel: number;
  requiredSkills: string[];
  status: ContractorGigStatus;
  escrowRequired: boolean;
  applicantWallets: string[];
  contractorWallet?: string;
  createdAt: string;
  updatedAt: string;
};

export type SimpleTeamRoleDto = {
  label: string;
  description?: string;
};

export type EngagementDto = {
  id: string;
  employerWallet: string;
  title: string;
  operationalFocus: string;
  descriptionPreview: string;
  status: ContractorGigStatus;
  visibilityMode: EngagementVisibilityMode;
  contributorDmEnabled: boolean;
  rosterVisibilityLevel: ParticipantVisibilityLevel;
  contributorIds: string[];
  teamSize: number;
  createdAt: string;
  updatedAt: string;
};

export type EngagementContributorDto = {
  id: string;
  engagementId: string;
  contributorWallet: string;
  contributorHandle: string;
  assignedRole: string;
  operationalFocus: string;
  capabilities: string[];
  status: EngagementContributorStatus;
  agreementId?: string;
  joinedAt: string;
  updatedAt: string;
};

export type EngagementTeamSummaryDto = {
  engagementId: string;
  teamSize: number;
  acceptedCount: number;
  activeCount: number;
  pendingCount: number;
  contributors: EngagementContributorDto[];
};

export type RecommendedGigDto = {
  gig: ContractorGigDto;
  matchScore: {
    totalScore: number;
    confidenceScore: number;
    scoreBreakdown: {
      verticalFit: number;
      skillFit: number;
      proximity: number;
      levelEligibility: number;
      rating: number;
      availability: number;
      completionHistory: number;
      priceFit: number;
      responseSpeed: number;
      engagementFit?: number;
    };
    whyMatched: string[];
    explanation: string;
    missingRequirements: string[];
    suggestedActions: string[];
    suggestedUnlockActions: string[];
    levelUnlockStatus: "eligible" | "locked" | "needs_profile_update";
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

export type CoordinationRoomDto = {
  id: string;
  engagementId: string;
  employerWallet: string;
  roomType: CoordinationRoomType;
  title: string;
  status: CoordinationRoomStatus;
  createdAt: string;
  updatedAt: string;
};

export type CoordinationRoomParticipantDto = {
  id: string;
  roomId: string;
  engagementId: string;
  walletAddress: string;
  handle: string;
  participantType: CoordinationParticipantType;
  assignedRole: string;
  status: CoordinationParticipantStatus;
  visibilityLevel: ParticipantVisibilityLevel;
  dmPermission: ContributorMessagingPermission;
  aliasOverride?: string;
  disclosureState: DisclosureState;
  joinedAt: string;
  lastReadAt?: string;
  removedAt?: string;
};

export type CoordinationMessageDto = {
  id: string;
  roomId: string;
  engagementId: string;
  senderWallet: string;
  senderHandle: string;
  senderRole: string;
  encryptedPayload: string;
  attachmentRefs: string[];
  createdAt: string;
  readReceipts?: Record<string, string>;
};

export type RoomRosterSummaryDto = {
  roomId: string;
  engagementId: string;
  participants: CoordinationRoomParticipantDto[];
  activeCount: number;
  contributorCount: number;
};

export type AgreementDto = {
  id: string;
  gigId: string;
  employerWallet: string;
  contractorWallet: string;
  termsRef: string;
  termsPreview: string[];
  status: ContractorAgreementStatus;
  activationState?: "negotiating" | "proposed" | "awaiting_acceptance" | "awaiting_escrow" | "active" | "in_progress" | "completed" | "closed" | "disputed";
  contactDisclosureUnlocked?: boolean;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  proofRefs: string[];
  proofNotes: string[];
  employerConfirmedAt?: string;
  disputeId?: string;
  engagementStructure?: EngagementStructureDto;
  rateAmount?: number;
  rateCurrency?: "USD" | "USDC";
  estimatedDuration?: string;
  overtimeTerms?: string;
  paymentSchedule?: string;
  proposalNotes?: string;
};

export type PaymentEscrowDto = {
  agreementId: string;
  status: "not_funded" | "pending_funding_tx" | "funded" | "pending_release" | "released" | "refunded" | "disputed";
  grossAmount: number;
  platformFee: number;
  netPayout: number;
  gasEstimate: number;
  treasuryWallet: string;
  chainId: number;
  txHash?: string;
  engagementStructure?: EngagementStructureDto;
  estimatedDuration?: string;
  fundedAt?: string;
  releasedAt?: string;
  updatedAt: string;
};

export type ContactDisclosureDecisionDto = {
  allowed: boolean;
  agreementId?: string;
  activationState: AgreementDto["activationState"];
  guidance: string;
  availableFields: ContractorDisclosureField[];
};

export type PayoutHistoryDto = {
  id: string;
  walletAddress: string;
  agreementId: string;
  label: string;
  amount: number;
  status: string;
  createdAt: string;
  releasedAt?: string;
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
  engagements?: EngagementDto[];
  engagementContributors?: EngagementContributorDto[];
  coordinationRooms?: CoordinationRoomDto[];
  coordinationRoomParticipants?: CoordinationRoomParticipantDto[];
  coordinationMessages?: CoordinationMessageDto[];
  recommendations: RecommendedGigDto[];
  threads: MessageThreadDto[];
  messages: MessageDto[];
  agreement: AgreementDto;
  escrow: PaymentEscrowDto;
  payoutHistory: PayoutHistoryDto[];
  notifications: NotificationDto[];
  disclosureAudit: DisclosureAuditDto[];
};
