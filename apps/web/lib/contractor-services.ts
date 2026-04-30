"use client";

import type {
  AgreementDto,
  ContractorCommandApiStateDto,
  ContractorGigDto,
  ContractorGigStatus,
  ContractorProfileDto,
  DisclosureAuditDto,
  MessageDto,
  NotificationDto,
  PaymentEscrowDto,
  PayoutHistoryDto,
  RecommendedGigDto
} from "./contractor-dtos";
import { getApiBaseUrl, getDataMode } from "./config";

export type GigStatus = "available" | "applied" | "claimed" | "in_progress" | "completed" | "disputed";
export type DisclosureField = "realName" | "phone" | "email" | "preciseLocation" | "portfolio" | "credentials";

export type ContractorProfile = {
  walletAddress: string;
  publicHandle: string;
  initials: string;
  publicKey: string;
  signingPublicKey: string;
  encryptedPrivateProfile: string;
  skillTags: string[];
  serviceCategories: string[];
  approximateRegion: string;
  availability: "ready_now" | "available_today" | "offline";
  workPreference: "local" | "remote" | "hybrid";
  level: number;
  levelName: string;
  rating: number;
  publicReputation: number;
  xp: number;
  xpNext: number;
  streakDays: number;
  disclosures: Record<DisclosureField, boolean>;
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
    skillFit: number;
    proximity: number;
    levelEligibility: number;
    rating: number;
    availability: number;
    completionHistory: number;
    priceFit: number;
    responseSpeed: number;
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

export type AgreementStatus = "draft" | "accepted" | "arrived" | "in_progress" | "completion_submitted" | "employer_review" | "approved" | "disputed";

export type Agreement = {
  id: string;
  gigId: string;
  status: AgreementStatus;
  terms: string[];
  proofNotes: string[];
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
};

export type PaymentState = {
  agreementId: string;
  walletConnected: boolean;
  walletAddress: string;
  escrowStatus: "not_funded" | "funded" | "completion_submitted" | "released" | "refunded" | "disputed";
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

const storageKey = "workmesh.contractor.command.v1";
const localKeyMaterial = "workmesh.contractor.crypto.v1";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export class MockCryptoService implements CryptoService {
  async generateIdentity() {
    const key = await this.getOrCreateAesKey();
    const exported = await crypto.subtle.exportKey("jwk", key);
    localStorage.setItem(localKeyMaterial, JSON.stringify(exported));
    return {
      publicKey: `x25519_mock_${crypto.randomUUID().slice(0, 8)}`,
      signingPublicKey: `ed25519_mock_${crypto.randomUUID().slice(0, 8)}`,
      encryptedPrivateProfile: await this.encryptText(JSON.stringify({
        realName: "Adam Lewin",
        phone: "Hidden",
        email: "Hidden",
        preciseLocation: "Hidden until job acceptance"
      }))
    };
  }

  async encryptText(plainText: string) {
    const key = await this.getOrCreateAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const payload = new TextEncoder().encode(plainText);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
    return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
  }

  async decryptText(cipherText: string) {
    try {
      const [ivPart, dataPart] = cipherText.split(".");
      const key = await this.getOrCreateAesKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(ivPart) },
        key,
        fromBase64(dataPart)
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return "[Unable to decrypt]";
    }
  }

  private async getOrCreateAesKey() {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(localKeyMaterial);
    if (stored) {
      return crypto.subtle.importKey("jwk", JSON.parse(stored), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
    }
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
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
  async search(filters: ContractorFilters) {
    const params = new URLSearchParams({
      query: filters.query,
      minPay: String(filters.minPay),
      category: filters.category,
      urgency: filters.urgency,
      remoteLocal: filters.remoteLocal
    });
    const gigs = await apiFetch<ContractorGigDto[]>(`/api/gigs/search?${params.toString()}`);
    return gigs.map(fromGigDto);
  }

  async updateStatus(gigId: string, status: GigStatus) {
    const endpoint =
      status === "applied"
        ? `/api/gigs/${gigId}/apply`
        : status === "claimed"
          ? `/api/gigs/${gigId}/claim`
          : `/api/gigs/${gigId}/status`;
    const method = status === "applied" || status === "claimed" ? "POST" : "PATCH";
    await apiFetch(endpoint, { method, body: JSON.stringify({ status }) });
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
  async transition(action: "accept" | "arrival" | "start" | "complete" | "approve", _state: ContractorCommandState, proofNote?: string) {
    if (action === "approve") {
      await apiFetch("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          type: "payout_released",
          title: "Payout release queued",
          body: "Mock employer approval recorded for API mode.",
          target: "#mobile-pay",
          relatedEntityId: "agr_dock"
        })
      });
      return loadApiContractorCommandState();
    }
    await apiFetch(`/api/agreements/agr_dock/${action}`, {
      method: "POST",
      body: JSON.stringify({ proofNote })
    });
    return loadApiContractorCommandState();
  }
}

export class ApiPaymentService implements PaymentService {
  async connectWallet() {
    await apiFetch("/api/payments/wallet-connect", { method: "POST", body: JSON.stringify({}) });
    const next = await loadApiContractorCommandState();
    return { ...next, payment: { ...next.payment, walletConnected: true } };
  }

  async syncEscrow() {
    return loadApiContractorCommandState();
  }
}

export class ApiProfileService {
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
      publicHandle: "Operator K-914",
      initials: "K",
      ...identity,
      skillTags: ["Lift", "Dock", "Scan", "Tools", "Photo proof"],
      serviceCategories: ["logistics", "facilities"],
      approximateRegion: "NYC-03",
      availability: "ready_now",
      workPreference: "local",
      level: 5,
      levelName: "Elite Operator",
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
      }
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
      levelName: "Elite Operator",
      badges: ["Trust shield", "Platinum response", "19 day streak"],
      rating: 4.96,
      completionRate: 97
    },
    notifications: [
      makeNotification("gig_matched", "Priority gig nearby", "Night dock unload is a 96% fit.", "#mobile-gigs"),
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
      agreementService: new ApiAgreementService(),
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
  localStorage.removeItem(localKeyMaterial);
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
      title: "Night dock unload, aisle 4-6",
      client: "Harbor Supply Node",
      category: "logistics",
      urgency: "surge",
      remoteLocal: "local",
      distanceMiles: 1.2,
      window: "21:00",
      pay: 148,
      requiredLevel: 4,
      requiredSkills: ["Lift", "Dock", "Scan"],
      coordinates: { lat: 40.724, lng: -74.01 },
      status: "available",
      escrowRequired: true
    },
    {
      id: "fixture",
      title: "Emergency fixture swap",
      client: "Northline Retail",
      category: "facilities",
      urgency: "priority",
      remoteLocal: "local",
      distanceMiles: 0.6,
      window: "18:30",
      pay: 92,
      requiredLevel: 3,
      requiredSkills: ["Tools", "Photo proof"],
      coordinates: { lat: 40.733, lng: -73.99 },
      status: "available",
      escrowRequired: true
    },
    {
      id: "event",
      title: "Event teardown lead",
      client: "Civic Hall Ops",
      category: "events",
      urgency: "standard",
      remoteLocal: "local",
      distanceMiles: 2.8,
      window: "23:15",
      pay: 225,
      requiredLevel: 6,
      requiredSkills: ["Crew", "Van", "Lead"],
      coordinates: { lat: 40.712, lng: -74.004 },
      status: "available",
      escrowRequired: false
    }
  ];
}

function scoreGig(gig: ContractorGig, profile: ContractorProfile): MatchScore {
  const matchedSkills = gig.requiredSkills.filter((skill) => profile.skillTags.includes(skill)).length;
  const skillFit = Math.round((matchedSkills / gig.requiredSkills.length) * 24);
  const proximity = gig.distanceMiles < 1 ? 18 : gig.distanceMiles < 2 ? 16 : 12;
  const levelEligibility = profile.level >= gig.requiredLevel ? 16 : 4;
  const rating = Math.round(profile.rating * 2);
  const availability = profile.availability === "ready_now" ? 12 : 6;
  const completionHistory = Math.round(profile.publicReputation / 10);
  const priceFit = gig.pay >= 120 ? 10 : 8;
  const responseSpeed = profile.streakDays > 10 ? 10 : 7;
  const totalScore = skillFit + proximity + levelEligibility + rating + availability + completionHistory + priceFit + responseSpeed;
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
      ? ["Complete one verified proof", "Maintain streak to unlock higher-value work"]
      : ["Claim while escrow is funded", "Send ETA in encrypted chat"],
    breakdown: {
      skillFit,
      proximity,
      levelEligibility,
      rating,
      availability,
      completionHistory,
      priceFit,
      responseSpeed
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
    encryptedPrivateProfile: profile.encryptedPrivateBlobRef,
    skillTags: profile.skills,
    serviceCategories: profile.serviceCategories,
    approximateRegion: profile.publicFields.approximateRegion,
    availability: profile.availability,
    workPreference: profile.workPreference,
    level: profile.level,
    levelName: profile.publicFields.levelName,
    rating: profile.publicFields.rating,
    publicReputation: profile.trustScore,
    xp: profile.xp,
    xpNext: profile.xpNext,
    streakDays: profile.streakDays,
    disclosures: profile.privacySettings
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
  const decryptedText = message.encryptedPayload.startsWith("encrypted:")
    ? message.encryptedPayload.replace("encrypted:", "")
    : await cryptoService.decryptText(message.encryptedPayload);
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
    escrowStatus: escrow.status,
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
