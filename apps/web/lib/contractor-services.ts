"use client";

import type {
  AgreementDto,
  ContractorCommandApiStateDto,
  ContractorGigDto,
  ContractorGigStatus,
  ContractorProfileDto,
  ContractorProfileInputDto,
  DisclosureAuditDto,
  MessageDto,
  NotificationDto,
  PaymentEscrowDto,
  PayoutHistoryDto,
  RecommendedGigDto
} from "./contractor-dtos";
import { getApiBaseUrl, getDataMode } from "./config";
import { decryptEnvelopeString, encryptEnvelopeString } from "./crypto-envelope";
import { connectBrowserWallet } from "./wallet-service";
import { normalizeOperationalFocusId } from "./operational-focus";
import { engagementStructureLabel, normalizeEngagementStructure, preferredEngagementStructuresForFocus } from "./engagement-structure";

export type GigStatus = "available" | "applied" | "claimed" | "in_progress" | "completed" | "disputed";
export type DisclosureField = "realName" | "phone" | "email" | "preciseLocation" | "portfolio" | "credentials";

export type ContractorProfile = {
  walletAddress: string;
  publicHandle: string;
  initials: string;
  publicKey: string;
  signingPublicKey: string;
  avatarUrl?: string;
  encryptedPrivateProfile: string;
  verticals: string[];
  skillTags: string[];
  customSkills: string[];
  useCasePreferences: string[];
  engagementPreferences?: ContractorProfileDto["engagementPreferences"];
  rateVisibility?: ContractorProfileDto["rateVisibility"];
  serviceCategories: string[];
  categories: string[];
  skillDetails: ContractorProfileDto["skillDetails"];
  certifications: string[];
  licenses: string[];
  experienceLevel: ContractorProfileDto["experienceLevel"];
  approximateRegion: string;
  availability: "ready_now" | "available_today" | "offline";
  availabilityDetails: ContractorProfileDto["availabilityDetails"];
  region: ContractorProfileDto["region"];
  workPreference: "local" | "remote" | "hybrid";
  level: number;
  levelName: string;
  rating: number;
  publicReputation: number;
  xp: number;
  xpNext: number;
  streakDays: number;
  disclosures: Record<DisclosureField, boolean>;
  profileVisibility: ContractorProfileDto["profileVisibility"];
  disclosureSettings: ContractorProfileDto["disclosureSettings"];
  publicProfileFields: string[];
  onboardingCompleted: boolean;
};

export type ContractorGig = {
  id: string;
  title: string;
  client: string;
  category: string;
  urgency: "standard" | "priority" | "surge";
  remoteLocal: "local" | "remote";
  distanceMiles: number;
  window: string;
  pay: number;
  engagementStructure?: ContractorGigDto["engagementStructure"];
  ratePreview?: string;
  estimatedDuration?: ContractorGigDto["estimatedDuration"];
  requiredLevel: number;
  requiredSkills: string[];
  coordinates: { lat: number; lng: number };
  status: GigStatus;
  escrowRequired: boolean;
};

export type MatchScore = {
  gigId: string;
  totalScore: number;
  confidenceScore: number;
  explanation: string;
  missingRequirements: string[];
  suggestedActions: string[];
  breakdown: {
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
};

export type Message = {
  id: string;
  threadId: string;
  from: "worker" | "employer";
  cipherText: string;
  decryptedText: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  createdAt: string;
};

export type AgreementStatus = "draft" | "accepted" | "active" | "arrived" | "in_progress" | "completion_submitted" | "proof_submitted" | "pending_employer_confirmation" | "employer_review" | "approved" | "funded" | "revision_requested" | "pending_completion_approval" | "completed" | "disputed";

export type Agreement = {
  id: string;
  gigId: string;
  status: AgreementStatus;
  terms: string[];
  proofNotes: string[];
  engagementStructure?: ContractorGigDto["engagementStructure"];
  rateAmount?: number;
  rateCurrency?: string;
  estimatedDuration?: string;
  paymentSchedule?: string;
  proposalNotes?: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
};

export type PaymentState = {
  agreementId: string;
  walletConnected: boolean;
  walletAddress: string;
  escrowStatus: "not_funded" | "pending_funding_tx" | "funded" | "pending_release" | "completion_submitted" | "released" | "refunded" | "disputed";
  gross: number;
  platformFeeBps: number;
  gasEstimate: number;
  history: Array<{ id: string; label: string; amount: number; status: string; createdAt: string }>;
};

export type ReputationState = {
  xp: number;
  xpNext: number;
  level: number;
  levelName: string;
  badges: string[];
  rating: number;
  completionRate: number;
};

export type NotificationItem = {
  id: string;
  type: "gig_matched" | "escrow_funded" | "message_received" | "agreement_ready" | "completion_approved" | "payout_released" | "level_unlocked" | "disclosure_request";
  title: string;
  body: string;
  target: string;
  read: boolean;
  createdAt: string;
};

export type DisclosureAudit = {
  id: string;
  disclosedField: DisclosureField;
  recipientWallet: string;
  timestamp: string;
  purpose: string;
  agreementId?: string;
  revokedAt?: string;
};

export type ContractorFilters = {
  query: string;
  minPay: number;
  category: string;
  urgency: string;
  remoteLocal: string;
};

export type ContractorCommandState = {
  profile: ContractorProfile;
  gigs: ContractorGig[];
  matches: MatchScore[];
  selectedGigId: string;
  messages: Message[];
  agreement: Agreement;
  payment: PaymentState;
  reputation: ReputationState;
  notifications: NotificationItem[];
  disclosureAudit: DisclosureAudit[];
  filters: ContractorFilters;
};

export interface CryptoService {
  generateIdentity(): Promise<Pick<ContractorProfile, "publicKey" | "signingPublicKey" | "encryptedPrivateProfile">>;
  encryptText(plainText: string): Promise<string>;
  decryptText(cipherText: string): Promise<string>;
}

export interface GigService {
  search(filters: ContractorFilters, state: ContractorCommandState): Promise<ContractorGig[]>;
  updateStatus(gigId: string, status: GigStatus, state: ContractorCommandState): Promise<ContractorCommandState>;
}

export interface MatchingService {
  recommended(walletAddress: string, state: ContractorCommandState): Promise<MatchScore[]>;
}

export interface ChatService {
  send(threadId: string, text: string, state: ContractorCommandState): Promise<ContractorCommandState>;
  markRead(threadId: string, state: ContractorCommandState): Promise<ContractorCommandState>;
}

export interface AgreementService {
  transition(action: "accept" | "arrival" | "start" | "complete" | "approve", state: ContractorCommandState, proofNote?: string): Promise<ContractorCommandState>;
}

export interface PaymentService {
  connectWallet(state: ContractorCommandState): Promise<ContractorCommandState>;
  syncEscrow(state: ContractorCommandState): Promise<ContractorCommandState>;
}

const storageKey = "relai.contractor.command.v1";
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export class MockCryptoService implements CryptoService {
  async generateIdentity() {
    return {
      publicKey: `x25519_local_${crypto.randomUUID().slice(0, 8)}`,
      signingPublicKey: `ed25519_local_${crypto.randomUUID().slice(0, 8)}`,
      encryptedPrivateProfile: await this.encryptText(JSON.stringify({
        realName: "Hidden",
        phone: "Hidden",
        email: "Hidden",
        preciseLocation: "Hidden until explicit disclosure"
      }))
    };
  }

  async encryptText(plainText: string) {
    return encryptEnvelopeString(plainText);
  }

  async decryptText(cipherText: string) {
    return decryptEnvelopeString(cipherText);
  }
}

export class MockGigService implements GigService {
  async search(filters: ContractorFilters, state: ContractorCommandState) {
    const query = filters.query.toLowerCase().trim();
    return state.gigs.filter((gig) => {
      const matchesQuery = !query || `${gig.title} ${gig.client} ${gig.requiredSkills.join(" ")}`.toLowerCase().includes(query);
      const matchesPay = gig.pay >= filters.minPay;
      const matchesCategory = filters.category === "all" || gig.category === filters.category;
      const matchesUrgency = filters.urgency === "all" || gig.urgency === filters.urgency;
      const matchesLocation = filters.remoteLocal === "all" || gig.remoteLocal === filters.remoteLocal;
      return matchesQuery && matchesPay && matchesCategory && matchesUrgency && matchesLocation;
    });
  }

  async updateStatus(gigId: string, status: GigStatus, state: ContractorCommandState) {
    const gigs = state.gigs.map((gig) => (gig.id === gigId ? { ...gig, status } : gig));
    const selectedGig = gigs.find((gig) => gig.id === gigId) ?? gigs[0];
    return persistState({
      ...state,
      gigs,
      selectedGigId: gigId,
      payment: {
        ...state.payment,
        gross: selectedGig.pay,
        escrowStatus: status === "completed" ? "completion_submitted" : status === "disputed" ? "disputed" : "funded"
      },
      notifications: [
        makeNotification(
          status === "completed" ? "completion_approved" : status === "claimed" ? "agreement_ready" : "gig_matched",
          status === "completed" ? "Completion submitted" : status === "claimed" ? "Agreement ready" : "Gig updated",
          status === "completed" ? "Proof is queued for employer confirmation." : `${selectedGig.title} is now ${status.replace("_", " ")}.`,
          status === "completed" ? "#mobile-agreement" : "#mobile-gigs"
        ),
        ...state.notifications
      ]
    });
  }
}

export class MockMatchingService implements MatchingService {
  async recommended(_walletAddress: string, state: ContractorCommandState) {
    return state.gigs.map((gig) => scoreGig(gig, state.profile));
  }
}

export class MockChatService implements ChatService {
  constructor(private cryptoService: CryptoService) {}

  async send(threadId: string, text: string, state: ContractorCommandState) {
    const cipherText = await this.cryptoService.encryptText(text);
    const message: Message = {
      id: id("msg"),
      threadId,
      from: "worker",
      cipherText,
      decryptedText: text,
      status: "delivered",
      createdAt: now()
    };
    return persistState({
      ...state,
      messages: [...state.messages, message],
      notifications: [
        makeNotification("message_received", "Message delivered", "Encrypted reply delivered to Harbor Supply.", "#mobile-chat", true),
        ...state.notifications
      ]
    });
  }

  async markRead(threadId: string, state: ContractorCommandState) {
    return persistState({
      ...state,
      messages: state.messages.map((message) => (message.threadId === threadId ? { ...message, status: "read" } : message))
    });
  }
}

export class MockAgreementService implements AgreementService {
  async transition(action: "accept" | "arrival" | "start" | "complete" | "approve", state: ContractorCommandState, proofNote?: string) {
    const agreement = { ...state.agreement };
    if (action === "accept") {
      agreement.status = "accepted";
      agreement.acceptedAt = now();
    }
    if (action === "arrival") {
      agreement.status = "arrived";
      agreement.arrivedAt = now();
    }
    if (action === "start") {
      agreement.status = "in_progress";
      agreement.startedAt = now();
    }
    if (action === "complete") {
      agreement.status = "completion_submitted";
      agreement.completedAt = now();
      agreement.proofNotes = [...agreement.proofNotes, proofNote || "Checklist, timestamp, and mock location ping submitted."];
    }
    if (action === "approve") {
      agreement.status = "approved";
    }

    const status: GigStatus =
      action === "accept" ? "claimed" : action === "start" ? "in_progress" : action === "complete" || action === "approve" ? "completed" : "claimed";

    const gigs = state.gigs.map((gig) => (gig.id === state.selectedGigId ? { ...gig, status } : gig));
    return persistState({
      ...state,
      agreement,
      gigs,
      payment: {
        ...state.payment,
        escrowStatus: action === "complete" ? "completion_submitted" : action === "approve" ? "released" : state.payment.escrowStatus
      },
      reputation: action === "approve"
        ? {
            ...state.reputation,
            xp: Math.min(state.reputation.xp + 180, state.reputation.xpNext),
            badges: state.reputation.badges.includes("Clean close") ? state.reputation.badges : [...state.reputation.badges, "Clean close"]
          }
        : state.reputation,
      notifications: [
        makeNotification(
          action === "approve" ? "payout_released" : "agreement_ready",
          action === "approve" ? "Payout released" : "Agreement updated",
          action === "approve" ? "Net payout and XP have been updated." : `Agreement status is now ${agreement.status.replace("_", " ")}.`,
          action === "approve" ? "#mobile-pay" : "#mobile-agreement"
        ),
        ...state.notifications
      ]
    });
  }
}

export class MockPaymentService implements PaymentService {
  async connectWallet(state: ContractorCommandState) {
    return persistState({
      ...state,
      payment: { ...state.payment, walletConnected: true },
      notifications: [makeNotification("escrow_funded", "Wallet connected", "Escrow status can now sync from the selected rail.", "#mobile-pay"), ...state.notifications]
    });
  }

  async syncEscrow(state: ContractorCommandState) {
    const fee = platformFee(state.payment.gross, state.payment.platformFeeBps);
    const released = state.payment.escrowStatus === "released";
    return persistState({
      ...state,
      payment: {
        ...state.payment,
        history: released
          ? state.payment.history
          : [
              {
                id: id("pay"),
                label: "Escrow funded",
                amount: state.payment.gross - fee,
                status: "pending completion",
                createdAt: now()
              },
              ...state.payment.history
            ]
      }
    });
  }
}

export class ApiGigService implements GigService {
  async search(filters: ContractorFilters, _state?: ContractorCommandState) {
    const params = new URLSearchParams({
      keyword: filters.query,
      query: filters.query,
      minPay: String(filters.minPay),
      category: filters.category,
      urgency: filters.urgency,
      locationMode: filters.remoteLocal,
      remoteLocal: filters.remoteLocal,
      walletAddress: _state?.profile.walletAddress ?? ""
    });
    const gigs = await apiFetch<ContractorGigDto[]>(`/api/gigs/search?${params.toString()}`);
    return gigs.map(fromGigDto);
  }

  async updateStatus(gigId: string, status: GigStatus, state: ContractorCommandState) {
    const endpoint =
      status === "applied"
        ? `/api/gigs/${gigId}/apply`
        : status === "claimed"
          ? `/api/gigs/${gigId}/claim`
          : `/api/gigs/${gigId}/status`;
    const method = status === "applied" || status === "claimed" ? "POST" : "PATCH";
    await apiFetch(endpoint, { method, body: JSON.stringify({ walletAddress: state.profile.walletAddress, status }) });
    return loadApiContractorCommandState();
  }
}

export class ApiMatchingService implements MatchingService {
  async recommended(walletAddress: string) {
    const recommendations = await apiFetch<RecommendedGigDto[]>(`/api/gigs/recommended/${encodeURIComponent(walletAddress)}`);
    return recommendations.map(fromRecommendationDto);
  }
}

export class ApiChatService implements ChatService {
  constructor(private cryptoService: CryptoService) {}

  async send(threadId: string, text: string, state: ContractorCommandState) {
    const encryptedPayload = await this.cryptoService.encryptText(text);
    await apiFetch("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({
        threadId,
        senderWallet: state.profile.walletAddress,
        encryptedPayload,
        attachmentRefs: []
      })
    });
    return loadApiContractorCommandState(this.cryptoService);
  }

  async markRead(threadId: string, state: ContractorCommandState) {
    const message = state.messages.find((item) => item.threadId === threadId && item.status !== "read");
    if (message) {
      await apiFetch(`/api/messages/${message.id}/read`, { method: "PATCH", body: JSON.stringify({}) });
    }
    return loadApiContractorCommandState(this.cryptoService);
  }
}

export class ApiAgreementService implements AgreementService {
  constructor(private cryptoService: CryptoService = new MockCryptoService()) {}

  async transition(action: "accept" | "arrival" | "start" | "complete" | "approve", _state: ContractorCommandState, proofNote?: string) {
    if (action === "approve") {
      await apiFetch(`/api/agreements/agr_dock/approve`, {
        method: "POST",
        body: JSON.stringify({ walletAddress: _state.profile.walletAddress, timestamp: new Date().toISOString() })
      });
      return loadApiContractorCommandState();
    }
    await apiFetch(`/api/agreements/agr_dock/${action}`, {
      method: "POST",
      body: JSON.stringify({ walletAddress: _state.profile.walletAddress, timestamp: new Date().toISOString(), proofType: "text_note", proofText: proofNote ? await this.cryptoService.encryptText(proofNote) : undefined, proofRefs: [], proofIds: proofNote ? ["encrypted-proof://note"] : [] })
    });
    return loadApiContractorCommandState();
  }
}

export class ApiPaymentService implements PaymentService {
  async connectWallet() {
    const wallet = process.env.NEXT_PUBLIC_ENABLE_TESTNET_PAYMENTS === "true" ? await connectBrowserWallet() : { connected: false as const, status: "unavailable" as const };
    await apiFetch("/api/payments/wallet-connect", { method: "POST", body: JSON.stringify({ walletAddress: wallet.walletAddress, chainId: wallet.chainId, status: wallet.status }) });
    const next = await loadApiContractorCommandState();
    return { ...next, payment: { ...next.payment, walletConnected: wallet.connected || true, walletAddress: wallet.walletAddress ?? next.payment.walletAddress } };
  }

  async syncEscrow() {
    return loadApiContractorCommandState();
  }
}

export class ApiProfileService {
  async getProfile(walletAddress: string) {
    return apiFetch<ContractorProfileDto>(`/api/profile/${encodeURIComponent(walletAddress)}`);
  }

  async createProfile(profileInput: ContractorProfileInputDto) {
    return apiFetch<ContractorCommandApiStateDto>("/api/profile", {
      method: "POST",
      body: JSON.stringify(profileInput)
    });
  }

  async updateProfile(walletAddress: string, patch: Partial<ContractorProfileDto>) {
    await apiFetch<ContractorCommandApiStateDto>(`/api/profile/${encodeURIComponent(walletAddress)}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
    return loadApiContractorCommandState();
  }

  async getPublicPreview(walletAddress: string) {
    return apiFetch(`/api/profile/${encodeURIComponent(walletAddress)}/public-preview`);
  }

  async createDisclosure(walletAddress: string, disclosureInput: Record<string, unknown>) {
    return apiFetch<ContractorCommandApiStateDto>(`/api/profile/${encodeURIComponent(walletAddress)}/disclosures`, {
      method: "POST",
      body: JSON.stringify(disclosureInput)
    });
  }

  async getDisclosures(walletAddress: string) {
    return apiFetch<DisclosureAuditDto[]>(`/api/profile/${encodeURIComponent(walletAddress)}/disclosures`);
  }

  async updateDisclosure(state: ContractorCommandState, field: DisclosureField, enabled: boolean) {
    await apiFetch(`/api/profile/${encodeURIComponent(state.profile.walletAddress)}/disclosures`, {
      method: "POST",
      body: JSON.stringify({
        disclosedFields: [field],
        enabled,
        recipientWallet: "0xHarbor...9910",
        purpose: enabled ? "Contractor approved selective disclosure for active agreement" : "Contractor revoked selective disclosure",
        agreementId: state.agreement.id
      })
    });
    return loadApiContractorCommandState();
  }
}

export class ApiNotificationService {
  async markRead(state: ContractorCommandState, notificationId: string) {
    await apiFetch(`/api/notifications/${notificationId}/read`, { method: "PATCH", body: JSON.stringify({}) });
    return loadApiContractorCommandState();
  }

  async markAllRead(_state: ContractorCommandState) {
    await apiFetch("/api/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) });
    return loadApiContractorCommandState();
  }
}

export async function loadContractorCommandState(cryptoService = new MockCryptoService()) {
  if (getDataMode() === "api") {
    return loadApiContractorCommandState(cryptoService);
  }

  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(storageKey);
    if (stored) return JSON.parse(stored) as ContractorCommandState;
  }

  const identity = await cryptoService.generateIdentity();
  const state: ContractorCommandState = {
    profile: {
      walletAddress: "0xK914...7F21",
      publicHandle: "K-914",
      initials: "K",
      ...identity,
      avatarUrl: undefined,
      verticals: ["logistics-transport", "executive-assistance-coordination"],
      skillTags: ["Driving", "Logistics", "Auditing", "Inspection", "Property management"],
      customSkills: [],
      useCasePreferences: ["Pickups/drop-offs", "Inventory checks", "Field audits", "Inspections"],
      engagementPreferences: [
        { structure: "day_rate", ratePreview: "$650/day", visibility: "after_application" },
        { structure: "flat_fee", ratePreview: "$800-$1,500/project", visibility: "agreement_only" },
        { structure: "open_proposal", ratePreview: "Depends on scope", visibility: "public" }
      ],
      rateVisibility: "after_application",
      serviceCategories: ["logistics-transport", "executive-assistance-coordination"],
      categories: ["logistics-transport", "executive-assistance-coordination"],
      skillDetails: [
        { id: "driving", label: "Driving", category: "logistics-transport", proficiencyLevel: "expert" },
        { id: "logistics-transport", label: "Logistics", category: "logistics-transport", proficiencyLevel: "expert" },
        { id: "auditing", label: "Auditing", category: "logistics-transport", proficiencyLevel: "advanced" },
        { id: "inspection", label: "Inspection", category: "executive-assistance-coordination", proficiencyLevel: "advanced" },
        { id: "property-management", label: "Property management", category: "executive-assistance-coordination", proficiencyLevel: "capable" }
      ],
      experienceLevel: "5_plus",
      certifications: [],
      licenses: [],
      approximateRegion: "NYC-03",
      availability: "ready_now",
      availabilityDetails: { availableNow: true, sameDay: true, recurring: true, weeklySchedule: ["Mon AM", "Tue PM", "Wed PM", "Thu PM", "Sat AM"], timezone: "America/New_York" },
      region: { country: "US", state: "NY", city: "New York", metro: "NYC-03", serviceRadiusMiles: 12, locationMode: "local", approximateCoordinates: { lat: 40.72, lng: -74 }, preciseLocationShared: false },
      workPreference: "local",
      level: 5,
      levelName: "Trusted contributor",
      rating: 4.96,
      publicReputation: 98,
      xp: 8420,
      xpNext: 10000,
      streakDays: 19,
      disclosures: {
        realName: false,
        phone: false,
        email: false,
        preciseLocation: false,
        portfolio: false,
        credentials: true
      },
      profileVisibility: { showHandle: true, showSkills: true, showRegion: true, showRating: true, showAvailability: true, showExactLocation: false, showRealName: false, showPhone: false, showEmail: false, requireConfirmationBeforeDisclosure: true },
      disclosureSettings: { realName: false, phone: false, email: false, preciseLocation: false, portfolio: false, credentials: true },
      publicProfileFields: ["handle", "skills", "region", "rating", "availability"],
      onboardingCompleted: true
    },
    gigs: seedGigs(),
    matches: [],
    selectedGigId: "dock",
    messages: [
      {
        id: "msg_employer_1",
        threadId: "thread_dock",
        from: "employer",
        cipherText: await cryptoService.encryptText("Escrow is locked. Gate code is visible to your device."),
        decryptedText: "Escrow is locked. Gate code is visible to your device.",
        status: "read",
        createdAt: now()
      },
      {
        id: "msg_worker_1",
        threadId: "thread_dock",
        from: "worker",
        cipherText: await cryptoService.encryptText("On site in 18 minutes."),
        decryptedText: "On site in 18 minutes.",
        status: "delivered",
        createdAt: now()
      }
    ],
    agreement: {
      id: "agr_dock",
      gigId: "dock",
      status: "draft",
      terms: ["Protected escrow required", "Arrival ping required", "Photo/checklist proof required", "Employer review before release"],
      proofNotes: []
    },
    payment: {
      agreementId: "agr_dock",
      walletConnected: false,
      walletAddress: "0xK914...7F21",
      escrowStatus: "funded",
      gross: 148,
      platformFeeBps: 820,
      gasEstimate: 3.44,
      history: [{ id: "pay_seed", label: "Prior payout", amount: 214, status: "released", createdAt: now() }]
    },
    reputation: {
      xp: 8420,
      xpNext: 10000,
      level: 5,
      levelName: "Trusted contributor",
      badges: ["Trusted repeat contributor", "Fast response", "19 day streak"],
      rating: 4.96,
      completionRate: 97
    },
    notifications: [
      makeNotification("gig_matched", "Priority gig nearby", "Inventory movement support is a 96% fit.", "#mobile-gigs"),
      makeNotification("escrow_funded", "Escrow funded", "$148 is locked for Harbor Supply.", "#mobile-pay")
    ],
    disclosureAudit: [
      {
        id: "audit_seed",
        disclosedField: "credentials",
        recipientWallet: "0xHarbor...9910",
        timestamp: now(),
        purpose: "Verified skill proof for dock work",
        agreementId: "agr_dock"
      }
    ],
    filters: {
      query: "",
      minPay: 0,
      category: "all",
      urgency: "all",
      remoteLocal: "all"
    }
  };

  state.matches = await new MockMatchingService().recommended(state.profile.walletAddress, state);
  return persistState(state);
}

export async function loadApiContractorCommandState(cryptoService: CryptoService = new MockCryptoService()) {
  const apiState = await apiFetch<ContractorCommandApiStateDto>("/api/contractor/state");
  return apiStateToCommandState(apiState, cryptoService);
}

export function createContractorServices(cryptoService: CryptoService = new MockCryptoService()) {
  if (getDataMode() === "api") {
    return {
      cryptoService,
      gigService: new ApiGigService(),
      matchingService: new ApiMatchingService(),
      chatService: new ApiChatService(cryptoService),
      agreementService: new ApiAgreementService(cryptoService),
      paymentService: new ApiPaymentService(),
      profileService: new ApiProfileService(),
      notificationService: new ApiNotificationService()
    };
  }

  return {
    cryptoService,
    gigService: new MockGigService(),
    matchingService: new MockMatchingService(),
    chatService: new MockChatService(cryptoService),
    agreementService: new MockAgreementService(),
    paymentService: new MockPaymentService(),
    profileService: null,
    notificationService: null
  };
}

export function persistState(state: ContractorCommandState) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }
  return state;
}

export function resetContractorCommandState() {
  localStorage.removeItem(storageKey);
  localStorage.removeItem("relai.crypto.local-envelope-key.v1");
}

export function updateDisclosure(state: ContractorCommandState, field: DisclosureField, enabled: boolean) {
  const profile = {
    ...state.profile,
    disclosures: { ...state.profile.disclosures, [field]: enabled }
  };
  const auditEntry: DisclosureAudit = {
    id: id("audit"),
    disclosedField: field,
    recipientWallet: "0xHarbor...9910",
    timestamp: now(),
    purpose: enabled ? "Contractor approved selective disclosure for active agreement" : "Contractor revoked selective disclosure",
    agreementId: state.agreement.id,
    revokedAt: enabled ? undefined : now()
  };
  return persistState({
    ...state,
    profile,
    disclosureAudit: [auditEntry, ...state.disclosureAudit],
    notifications: [
      makeNotification("disclosure_request", enabled ? "Disclosure granted" : "Disclosure revoked", `${fieldLabel(field)} privacy state changed.`, "#mobile-profile"),
      ...state.notifications
    ]
  });
}

export async function updateDisclosureWithActiveService(state: ContractorCommandState, field: DisclosureField, enabled: boolean) {
  const services = createContractorServices();
  if (services.profileService) {
    return services.profileService.updateDisclosure(state, field, enabled);
  }
  return updateDisclosure(state, field, enabled);
}

export function markNotificationRead(state: ContractorCommandState, notificationId: string) {
  return persistState({
    ...state,
    notifications: state.notifications.map((item) => (item.id === notificationId ? { ...item, read: true } : item))
  });
}

export async function markNotificationReadWithActiveService(state: ContractorCommandState, notificationId: string) {
  const services = createContractorServices();
  if (services.notificationService) {
    return services.notificationService.markRead(state, notificationId);
  }
  return markNotificationRead(state, notificationId);
}

export function markAllNotificationsRead(state: ContractorCommandState) {
  return persistState({
    ...state,
    notifications: state.notifications.map((item) => ({ ...item, read: true }))
  });
}

export async function markAllNotificationsReadWithActiveService(state: ContractorCommandState) {
  const services = createContractorServices();
  if (services.notificationService) {
    return services.notificationService.markAllRead(state);
  }
  return markAllNotificationsRead(state);
}

export function fieldLabel(field: DisclosureField) {
  return {
    realName: "Real name",
    phone: "Phone relay",
    email: "Email relay",
    preciseLocation: "Precise location",
    portfolio: "Portfolio",
    credentials: "Verified credentials"
  }[field];
}

export function platformFee(gross: number, bps: number) {
  return Math.round(gross * (bps / 10000) * 100) / 100;
}

function seedGigs(): ContractorGig[] {
  return [
    {
      id: "dock",
      title: "Same-day inventory movement support",
      client: "Harbor Supply Node",
      category: "logistics-transport",
      urgency: "surge",
      remoteLocal: "local",
      distanceMiles: 1.2,
      window: "21:00",
      pay: 148,
      requiredLevel: 4,
      requiredSkills: ["Transport", "Inventory movement", "Coordination"],
      engagementStructure: "day_rate",
      ratePreview: "$650/day",
      estimatedDuration: "one_day",
      coordinates: { lat: 40.724, lng: -74.01 },
      status: "available",
      escrowRequired: true
    },
    {
      id: "fixture",
      title: "Executive office coordination support",
      client: "Northline Retail",
      category: "executive-assistance-coordination",
      urgency: "priority",
      remoteLocal: "local",
      distanceMiles: 0.6,
      window: "18:30",
      pay: 92,
      requiredLevel: 3,
      requiredSkills: ["Scheduling", "Operational administration", "Coordination"],
      engagementStructure: "hourly",
      ratePreview: "$75/hour",
      estimatedDuration: "several_days",
      coordinates: { lat: 40.733, lng: -73.99 },
      status: "available",
      escrowRequired: true
    },
    {
      id: "event",
      title: "Private event staffing lead",
      client: "Civic Hall Ops",
      category: "events-staffing",
      urgency: "standard",
      remoteLocal: "local",
      distanceMiles: 2.8,
      window: "23:15",
      pay: 225,
      requiredLevel: 6,
      requiredSkills: ["Event operations", "Temporary staffing", "Coordination"],
      engagementStructure: "day_rate",
      ratePreview: "$525/day",
      estimatedDuration: "one_day",
      coordinates: { lat: 40.712, lng: -74.004 },
      status: "available",
      escrowRequired: false
    }
  ];
}

function scoreGig(gig: ContractorGig, profile: ContractorProfile): MatchScore {
  const focus = normalizeOperationalFocusId(gig.category);
  const profileFocuses = new Set([...profile.verticals, ...profile.serviceCategories].map(normalizeOperationalFocusId));
  const verticalFit = profileFocuses.has(focus) ? 12 : 4;
  const matchedSkills = gig.requiredSkills.filter((skill) => profile.skillTags.includes(skill)).length;
  const preferredStructures = new Set((profile.engagementPreferences ?? []).map((item) => normalizeEngagementStructure(item.structure)));
  const structure = normalizeEngagementStructure(gig.engagementStructure);
  const engagementFit = preferredStructures.has(structure) ? 8 : preferredEngagementStructuresForFocus(focus).includes(structure) ? 5 : 2;
  const skillFit = Math.round((matchedSkills / gig.requiredSkills.length) * 20);
  const proximity = gig.distanceMiles < 1 ? 18 : gig.distanceMiles < 2 ? 16 : 12;
  const levelEligibility = profile.level >= gig.requiredLevel ? 16 : 4;
  const rating = Math.round(profile.rating * 2);
  const availability = profile.availability === "ready_now" ? 12 : 6;
  const completionHistory = Math.round(profile.publicReputation / 10);
  const priceFit = gig.pay >= 120 ? 10 : 8;
  const responseSpeed = profile.streakDays > 10 ? 10 : 7;
  const totalScore = verticalFit + skillFit + proximity + levelEligibility + rating + availability + completionHistory + priceFit + responseSpeed + engagementFit;
  const missingRequirements = [
    ...(profile.level < gig.requiredLevel ? [`Level ${gig.requiredLevel} required`] : []),
    ...gig.requiredSkills.filter((skill) => !profile.skillTags.includes(skill)).map((skill) => `${skill} skill proof`)
  ];
  return {
    gigId: gig.id,
    totalScore,
    confidenceScore: Math.min(98, totalScore + 4),
    explanation: missingRequirements.length
      ? "Strong nearby opportunity, but eligibility needs one more proof or level unlock."
      : "High fit based on proximity, skills, trust score, availability, and payout fit.",
    missingRequirements,
    suggestedActions: missingRequirements.length
      ? ["Complete one verified proof", "Maintain streak to unlock higher-value work", "Add engagement preferences to improve matching"]
      : ["Claim while escrow is funded", "Send ETA in encrypted chat"],
    breakdown: {
      verticalFit,
      skillFit,
      proximity,
      levelEligibility,
      rating,
      availability,
      completionHistory,
      priceFit,
      responseSpeed,
      engagementFit
    }
  };
}

function makeNotification(type: NotificationItem["type"], title: string, body: string, target: string, read = false): NotificationItem {
  return {
    id: id("note"),
    type,
    title,
    body,
    target,
    read,
    createdAt: now()
  };
}

function toBase64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${url}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === "string" ? body.error : `API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiStateToCommandState(apiState: ContractorCommandApiStateDto, cryptoService: CryptoService): Promise<ContractorCommandState> {
  const selectedGigId = apiState.gigs[0]?.id ?? "dock";
  const messages = await Promise.all(apiState.messages.map((message) => fromMessageDto(message, cryptoService)));
  const selectedGig = apiState.gigs.find((gig) => gig.id === selectedGigId) ?? apiState.gigs[0];
  return {
    profile: fromProfileDto(apiState.profile),
    gigs: apiState.gigs.map(fromGigDto),
    matches: apiState.recommendations.map(fromRecommendationDto),
    selectedGigId,
    messages,
    agreement: fromAgreementDto(apiState.agreement),
    payment: fromEscrowDto(apiState.escrow, apiState.payoutHistory, selectedGig?.pay ?? apiState.escrow.grossAmount),
    reputation: {
      xp: apiState.profile.xp,
      xpNext: apiState.profile.xpNext,
      level: apiState.profile.level,
      levelName: apiState.profile.publicFields.levelName,
      badges: ["Trust shield", "Platinum response", `${apiState.profile.streakDays} day streak`],
      rating: apiState.profile.publicFields.rating,
      completionRate: 97
    },
    notifications: apiState.notifications.map(fromNotificationDto),
    disclosureAudit: apiState.disclosureAudit.map(fromDisclosureAuditDto),
    filters: {
      query: "",
      minPay: 0,
      category: "all",
      urgency: "all",
      remoteLocal: "all"
    }
  };
}

function fromProfileDto(profile: ContractorProfileDto): ContractorProfile {
  return {
    walletAddress: profile.walletAddress,
    publicHandle: profile.handle,
    initials: profile.publicFields.initials,
    publicKey: profile.publicKey,
    signingPublicKey: profile.signingPublicKey,
    avatarUrl: profile.avatarUrl,
    encryptedPrivateProfile: profile.encryptedPrivateBlobRef,
    verticals: profile.verticals,
    skillTags: profile.skills,
    engagementPreferences: profile.engagementPreferences,
    rateVisibility: profile.rateVisibility,
    customSkills: profile.customSkills,
    useCasePreferences: profile.useCasePreferences,
    serviceCategories: profile.serviceCategories,
    categories: profile.categories,
    skillDetails: profile.skillDetails,
    certifications: profile.certifications,
    licenses: profile.licenses,
    experienceLevel: profile.experienceLevel,
    approximateRegion: profile.publicFields.approximateRegion,
    availability: profile.availability,
    availabilityDetails: profile.availabilityDetails,
    region: profile.region,
    workPreference: profile.workPreference,
    level: profile.level,
    levelName: profile.publicFields.levelName,
    rating: profile.publicFields.rating,
    publicReputation: profile.trustScore,
    xp: profile.xp,
    xpNext: profile.xpNext,
    streakDays: profile.streakDays,
    disclosures: profile.privacySettings,
    profileVisibility: profile.profileVisibility,
    disclosureSettings: profile.disclosureSettings,
    publicProfileFields: profile.publicProfileFields,
    onboardingCompleted: profile.onboardingCompleted
  };
}

function fromGigDto(gig: ContractorGigDto): ContractorGig {
  return {
    id: gig.id,
    title: gig.title,
    client: gig.client,
    category: gig.category,
    urgency: gig.urgency,
    remoteLocal: gig.locationMode,
    distanceMiles: gig.distanceMiles,
    window: gig.timeWindow,
    pay: gig.pay,
    requiredLevel: gig.requiredLevel,
    requiredSkills: gig.requiredSkills,
    engagementStructure: gig.engagementStructure,
    ratePreview: gig.ratePreview ?? engagementStructureLabel(gig.engagementStructure),
    estimatedDuration: gig.estimatedDuration,
    coordinates: gig.coordinates,
    status: gig.status as GigStatus,
    escrowRequired: gig.escrowRequired
  };
}

function fromRecommendationDto(recommendation: RecommendedGigDto): MatchScore {
  return {
    gigId: recommendation.gig.id,
    totalScore: recommendation.matchScore.totalScore,
    confidenceScore: recommendation.matchScore.confidenceScore,
    explanation: recommendation.matchScore.explanation,
    missingRequirements: recommendation.matchScore.missingRequirements,
    suggestedActions: recommendation.matchScore.suggestedActions,
    breakdown: recommendation.matchScore.scoreBreakdown
  };
}

async function fromMessageDto(message: MessageDto, cryptoService: CryptoService): Promise<Message> {
  const decryptedText = await cryptoService.decryptText(message.encryptedPayload);
  return {
    id: message.id,
    threadId: message.threadId,
    from: message.senderWallet === "0xK914...7F21" ? "worker" : "employer",
    cipherText: message.encryptedPayload,
    decryptedText,
    status: message.status,
    createdAt: message.createdAt
  };
}

function fromAgreementDto(agreement: AgreementDto): Agreement {
  return {
    id: agreement.id,
    gigId: agreement.gigId,
    status: agreement.status,
    terms: agreement.termsPreview,
    proofNotes: agreement.proofNotes,
    acceptedAt: agreement.acceptedAt,
    arrivedAt: agreement.arrivedAt,
    startedAt: agreement.startedAt,
    completedAt: agreement.completedAt
  };
}

function fromEscrowDto(escrow: PaymentEscrowDto, history: PayoutHistoryDto[], gross: number): PaymentState {
  return {
    agreementId: escrow.agreementId,
    walletConnected: false,
    walletAddress: "0xK914...7F21",
    escrowStatus: escrow.status === "pending_release" ? "completion_submitted" : escrow.status,
    gross,
    platformFeeBps: Math.round((escrow.platformFee / Math.max(escrow.grossAmount, 1)) * 10000),
    gasEstimate: escrow.gasEstimate,
    history: history.map((item) => ({
      id: item.id,
      label: item.label,
      amount: item.amount,
      status: item.status,
      createdAt: item.createdAt
    }))
  };
}

function fromNotificationDto(notification: NotificationDto): NotificationItem {
  return {
    id: notification.id,
    type: notification.type === "application_accepted" ? "agreement_ready" : notification.type === "review_received" ? "completion_approved" : notification.type === "dispute_opened" ? "disclosure_request" : notification.type,
    title: notification.title,
    body: notification.body,
    target: notification.target,
    read: notification.read,
    createdAt: notification.createdAt
  };
}

function fromDisclosureAuditDto(audit: DisclosureAuditDto): DisclosureAudit {
  return {
    id: audit.id,
    disclosedField: audit.disclosedFields[0] ?? "credentials",
    recipientWallet: audit.recipientWallet,
    timestamp: audit.createdAt,
    purpose: audit.purpose,
    agreementId: audit.agreementId,
    revokedAt: audit.revokedAt
  };
}
