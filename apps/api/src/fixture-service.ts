import { createHash, randomUUID } from "node:crypto";
import type {
  Achievement,
  AgreementIndex,
  FeeLedger,
  FeeStatus,
  GigIndex,
  MatchScore,
  Message,
  MessageThread,
  Notification,
  PaymentRail,
  PriceQuote,
  ReputationIndex,
  ReviewIndex,
  ScoredGig,
  SkillTag,
  TreasuryRevenue,
  UserIndex,
  UserLevel,
  UserProfile
} from "./domain.js";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

type RegisterUserInput = {
  wallet?: unknown;
  handle?: unknown;
  displayName?: unknown;
  bio?: unknown;
  skills?: unknown;
};

type SearchGigsInput = {
  q?: unknown;
  skill?: unknown;
  minBudget?: unknown;
  maxBudget?: unknown;
  remote?: unknown;
  status?: unknown;
  limit?: unknown;
};

type CreateGigInput = {
  title?: unknown;
  description?: unknown;
  buyerWallet?: unknown;
  budgetMin?: unknown;
  budgetMax?: unknown;
  currency?: unknown;
  requiredSkills?: unknown;
  remote?: unknown;
  region?: unknown;
  requiredLevel?: unknown;
  urgency?: unknown;
};

type MatchScoreInput = {
  wallet?: unknown;
  gigId?: unknown;
};

type PriceQuoteInput = {
  wallet?: unknown;
  gigId?: unknown;
  scope?: unknown;
  skills?: unknown;
  budgetMin?: unknown;
  budgetMax?: unknown;
  timelineDays?: unknown;
  complexity?: unknown;
  paymentRail?: unknown;
};

type SendMessageInput = {
  threadId?: unknown;
  fromWallet?: unknown;
  toWallet?: unknown;
  encryptedPayload?: unknown;
  body?: unknown;
  text?: unknown;
};

type CreateReviewInput = {
  agreementId?: unknown;
  reviewerWallet?: unknown;
  revieweeWallet?: unknown;
  rating?: unknown;
  comment?: unknown;
  skillSlugs?: unknown;
};

const now = () => new Date().toISOString();

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const toWallet = (value: unknown, field = "wallet") => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${field} is required`);
  }

  return value.trim().toLowerCase();
};

const optionalString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const toNumber = (value: unknown, fallback: number) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const PAYMENT_RAILS: PaymentRail[] = ["protected_escrow", "ach", "card", "wallet_processor", "stablecoin_escrow"];

export class FixtureService {
  private skillTags: SkillTag[] = [];
  private users: UserIndex[] = [];
  private gigs: GigIndex[] = [];
  private agreements: AgreementIndex[] = [];
  private reputations: ReputationIndex[] = [];
  private levels: UserLevel[] = [];
  private matchScores: MatchScore[] = [];
  private priceQuotes: PriceQuote[] = [];
  private notifications: Notification[] = [];
  private achievements: Achievement[] = [];
  private treasuryRevenue: TreasuryRevenue[] = [];
  private feeLedger: FeeLedger[] = [];
  private threads: MessageThread[] = [];
  private reviews: ReviewIndex[] = [];

  constructor() {
    this.seed();
  }

  registerUser(input: RegisterUserInput) {
    const wallet = toWallet(input.wallet);
    const timestamp = now();
    const skills = this.resolveSkills(input.skills);
    const existing = this.users.find((user) => user.wallet === wallet);

    if (existing) {
      existing.handle = optionalString(input.handle) ?? existing.handle;
      existing.displayName = optionalString(input.displayName) ?? existing.displayName;
      existing.bio = optionalString(input.bio) ?? existing.bio;
      existing.skills = skills.length > 0 ? skills : existing.skills;
      existing.updatedAt = timestamp;
      return this.getUserProfile(wallet);
    }

    const user: UserIndex = {
      id: randomUUID(),
      wallet,
      handle: optionalString(input.handle) ?? `wm-${wallet.slice(2, 8)}`,
      displayName: optionalString(input.displayName) ?? `Builder ${wallet.slice(2, 6).toUpperCase()}`,
      bio: optionalString(input.bio),
      skills,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.users.push(user);
    this.reputations.push({
      wallet,
      completedGigs: 0,
      averageRating: 0,
      onTimeRate: 1,
      disputeRate: 0,
      endorsedSkills: skills.map((skill) => skill.slug),
      updatedAt: timestamp
    });
    this.levels.push({
      wallet,
      level: 1,
      xp: 0,
      nextLevelXp: 500,
      tier: "Bronze",
      updatedAt: timestamp
    });
    this.notifications.push({
      id: randomUUID(),
      wallet,
      type: "system",
      title: "Welcome to WorkMesh",
      body: "Your worker profile is indexed and ready for matching.",
      read: false,
      createdAt: timestamp
    });

    return this.getUserProfile(wallet);
  }

  getUserProfile(walletInput: string): UserProfile {
    const wallet = toWallet(walletInput);
    const user = this.users.find((candidate) => candidate.wallet === wallet);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return {
      user,
      reputation: this.requireReputation(wallet),
      level: this.requireLevel(wallet),
      achievements: this.achievements.filter((achievement) => achievement.wallet === wallet),
      notifications: this.notifications.filter((notification) => notification.wallet === wallet),
      agreements: this.agreements.filter(
        (agreement) => agreement.buyerWallet === wallet || agreement.workerWallet === wallet
      )
    };
  }

  searchGigs(input: SearchGigsInput) {
    const q = optionalString(input.q)?.toLowerCase();
    const skill = optionalString(input.skill)?.toLowerCase();
    const minBudget = toNumber(input.minBudget, 0);
    const maxBudget = toNumber(input.maxBudget, Number.MAX_SAFE_INTEGER);
    const remote = input.remote === undefined ? undefined : String(input.remote) === "true";
    const status = optionalString(input.status);
    const limit = clamp(Math.trunc(toNumber(input.limit, 20)), 1, 100);

    return this.gigs
      .filter((gig) => {
        const matchesText =
          !q ||
          gig.title.toLowerCase().includes(q) ||
          gig.description.toLowerCase().includes(q) ||
          gig.requiredSkills.some((tag) => tag.slug.includes(q) || tag.name.toLowerCase().includes(q));
        const matchesSkill =
          !skill ||
          gig.requiredSkills.some((tag) => tag.slug === slugify(skill) || tag.name.toLowerCase() === skill);
        const matchesBudget = gig.budgetMax >= minBudget && gig.budgetMin <= maxBudget;
        const matchesRemote = remote === undefined || gig.remote === remote;
        const matchesStatus = !status || gig.status === status;
        return matchesText && matchesSkill && matchesBudget && matchesRemote && matchesStatus;
      })
      .slice(0, limit);
  }

  createGig(input: CreateGigInput) {
    const buyerWallet = toWallet(input.buyerWallet, "buyerWallet");
    this.getUserProfile(buyerWallet);

    const timestamp = now();
    const budgetMin = roundMoney(toNumber(input.budgetMin, 100));
    const budgetMax = roundMoney(Math.max(budgetMin, toNumber(input.budgetMax, budgetMin)));
    const gig: GigIndex = {
      id: `gig-${randomUUID()}`,
      title: this.requireString(input.title, "title"),
      description: this.requireString(input.description, "description"),
      buyerWallet,
      budgetMin,
      budgetMax,
      currency: optionalString(input.currency)?.toUpperCase() ?? "USDC",
      requiredSkills: this.resolveSkills(input.requiredSkills),
      status: "open",
      remote: input.remote === undefined ? true : String(input.remote) === "true",
      region: optionalString(input.region) ?? "local",
      requiredLevel: clamp(Math.trunc(toNumber(input.requiredLevel, 1)), 1, 5),
      urgency: this.resolveUrgency(input.urgency),
      encryptedDetailsRef: `ipfs://encrypted/gigs/${randomUUID()}`,
      publicDiscoveryMetadata: [
        `category:${this.resolveSkills(input.requiredSkills)[0]?.category ?? "general"}`,
        `region:${optionalString(input.region) ?? "local"}`,
        `budget_band:${Math.round(budgetMin / 100) * 100}-${Math.round(budgetMax / 100) * 100}`,
        `level:${clamp(Math.trunc(toNumber(input.requiredLevel, 1)), 1, 5)}`
      ],
      protectedPaymentRequired: true,
      directSettlementEligible: false,
      allowedPaymentRails: PAYMENT_RAILS,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.gigs.unshift(gig);
    this.notifications.push({
      id: randomUUID(),
      wallet: buyerWallet,
      type: "system",
      title: "Gig indexed",
      body: "Your encrypted gig brief is live in the WorkMesh matching index.",
      read: false,
      createdAt: timestamp
    });

    return gig;
  }

  recommendedGigs(walletInput: string): ScoredGig[] {
    const wallet = toWallet(walletInput);
    this.getUserProfile(wallet);

    return this.gigs
      .filter((gig) => gig.status === "open")
      .map((gig) => ({ gig, match: this.calculateMatch(wallet, gig.id) }))
      .sort((left, right) => right.match.score - left.match.score)
      .slice(0, 10);
  }

  scoreMatch(input: MatchScoreInput) {
    const wallet = toWallet(input.wallet);
    const gigId = this.requireString(input.gigId, "gigId");
    const score = this.calculateMatch(wallet, gigId);
    const existingIndex = this.matchScores.findIndex((match) => match.wallet === wallet && match.gigId === gigId);

    if (existingIndex >= 0) {
      this.matchScores[existingIndex] = score;
    } else {
      this.matchScores.push(score);
    }

    return {
      match: score,
      gig: this.requireGig(gigId),
      user: this.getUserProfile(wallet).user
    };
  }

  createPriceQuote(input: PriceQuoteInput) {
    const gig = optionalString(input.gigId) ? this.requireGig(String(input.gigId)) : undefined;
    const wallet = input.wallet ? toWallet(input.wallet) : undefined;
    const scope = optionalString(input.scope) ?? gig?.title ?? "Custom WorkMesh engagement";
    const requestedMin = toNumber(input.budgetMin, gig?.budgetMin ?? 500);
    const requestedMax = toNumber(input.budgetMax, gig?.budgetMax ?? requestedMin * 1.8);
    const timelineDays = clamp(toNumber(input.timelineDays, 14), 1, 120);
    const complexity = clamp(toNumber(input.complexity, 3), 1, 5);
    const skillCount = this.resolveSkillSlugs(input.skills).length || gig?.requiredSkills.length || 1;
    const selectedRail = this.resolvePaymentRail(input.paymentRail);
    const complexityMultiplier = 1 + (complexity - 3) * 0.12;
    const urgencyMultiplier = timelineDays <= 5 ? 1.25 : timelineDays <= 10 ? 1.1 : 1;
    const recommendedMin = roundMoney(Math.max(150, requestedMin * complexityMultiplier));
    const recommendedMax = roundMoney(Math.max(recommendedMin, requestedMax * complexityMultiplier * urgencyMultiplier));
    const platformFee = roundMoney(recommendedMax * 0.05);
    const requiresProtectedPayment = this.requiresProtectedPayment({
      gig,
      requestedMax: recommendedMax,
      complexity,
      timelineDays
    });
    const marketPressure = this.marketPressureFor({
      urgencyMultiplier,
      skillCount,
      timelineDays
    });
    const factors = {
      baseTaskRate: roundMoney((requestedMin + requestedMax) / 2),
      urgencyMultiplier,
      supplyDemandMultiplier: marketPressure === "surge" ? 1.22 : marketPressure === "high" ? 1.12 : 1,
      skillScarcityMultiplier: roundMoney(1 + Math.min(skillCount, 6) * 0.025),
      timeWindowMultiplier: timelineDays <= 2 ? 1.35 : timelineDays <= 5 ? 1.18 : 1,
      locationMultiplier: gig?.remote === false ? 1.08 : 1
    };
    const quote: PriceQuote = {
      id: randomUUID(),
      gigId: gig?.id,
      wallet,
      scope,
      currency: gig?.currency ?? "USDC",
      recommendedMin,
      recommendedMax,
      platformFee,
      workerReceives: roundMoney(recommendedMax - platformFee),
      buyerPays: recommendedMax,
      suggestedPrice: recommendedMax,
      minimumPrice: recommendedMin,
      premiumPrice: roundMoney(recommendedMax * 1.18),
      marketPressure,
      estimatedGasFee: 0.42,
      paymentRails: selectedRail === "direct" && !requiresProtectedPayment ? ["direct"] : PAYMENT_RAILS,
      settlementPolicy: requiresProtectedPayment
        ? "protected_required"
        : selectedRail === "direct"
          ? "direct_allowed"
          : "direct_locked",
      protectedPaymentReason: requiresProtectedPayment
        ? [
            "first-time or unproven counterparty",
            "high value, remote, urgent, or low-trust task",
            "release history has not unlocked direct settlement"
          ]
        : [],
      directSettlementUnlocks: [
        "5+ positive completed engagements with the same counterparty",
        "low dispute ratio and fast response reputation milestone",
        "category and jurisdiction approved for direct settlement"
      ],
      explanation:
        "Suggested price blends base task rate, urgency, local supply/demand, skill scarcity, time window, and location pressure. Protected payment is required until trust, category, value, and jurisdiction rules allow direct settlement. Platform fee applies to escrow releases, while monetization can also come from verification, priority placement, team tools, and compliance services.",
      factors,
      confidence: clamp(0.68 + skillCount * 0.04 - Math.abs(complexity - 3) * 0.03, 0.52, 0.94),
      createdAt: now()
    };

    this.priceQuotes.push(quote);
    this.feeLedger.push({
      id: randomUUID(),
      quoteId: quote.id,
      payerWallet: wallet ?? gig?.buyerWallet ?? "unassigned",
      payeeWallet: "workmesh-treasury",
      feeType: "platform",
      amount: quote.platformFee,
      currency: quote.currency,
      status: "quoted",
      createdAt: quote.createdAt
    });

    return quote;
  }

  private resolvePaymentRail(value: unknown): PaymentRail {
    const rail = optionalString(value) as PaymentRail | undefined;
    if (rail && [...PAYMENT_RAILS, "direct"].includes(rail)) {
      return rail;
    }
    return "protected_escrow";
  }

  private requiresProtectedPayment(input: {
    gig?: GigIndex;
    requestedMax: number;
    complexity: number;
    timelineDays: number;
  }) {
    if (input.gig?.protectedPaymentRequired !== undefined) {
      return input.gig.protectedPaymentRequired;
    }

    return Boolean(
      input.requestedMax >= 500 ||
        input.complexity >= 4 ||
        input.timelineDays <= 5 ||
        input.gig?.remote
    );
  }

  sendMessage(input: SendMessageInput) {
    const fromWallet = toWallet(input.fromWallet, "fromWallet");
    const toWalletValue = toWallet(input.toWallet, "toWallet");
    const encryptedPayload = this.normalizeEncryptedPayload(input.encryptedPayload, input.body ?? input.text);

    const thread = this.resolveThread(optionalString(input.threadId), fromWallet, toWalletValue);
    const message: Message = {
      id: randomUUID(),
      threadId: thread.id,
      fromWallet,
      toWallet: toWalletValue,
      encryptedPayload,
      plaintextRejected: Boolean(input.body ?? input.text),
      createdAt: now()
    };

    thread.messages.push(message);
    thread.lastMessageAt = message.createdAt;
    this.notifications.push({
      id: randomUUID(),
      wallet: toWalletValue,
      type: "message",
      title: "New message",
      body: `${fromWallet} sent you a message.`,
      read: false,
      createdAt: message.createdAt
    });

    return { thread, message };
  }

  getMessageThread(threadId: string) {
    const thread = this.threads.find((candidate) => candidate.id === threadId);

    if (!thread) {
      throw new ApiError(404, "Message thread not found");
    }

    return thread;
  }

  getLevel(walletInput: string) {
    const wallet = toWallet(walletInput);
    return {
      level: this.requireLevel(wallet),
      achievements: this.achievements.filter((achievement) => achievement.wallet === wallet)
    };
  }

  createReview(input: CreateReviewInput) {
    const reviewerWallet = toWallet(input.reviewerWallet, "reviewerWallet");
    const revieweeWallet = toWallet(input.revieweeWallet, "revieweeWallet");
    const rating = clamp(Math.trunc(toNumber(input.rating, 0)), 1, 5);
    const timestamp = now();
    const review: ReviewIndex = {
      id: randomUUID(),
      agreementId: optionalString(input.agreementId),
      reviewerWallet,
      revieweeWallet,
      rating,
      comment: optionalString(input.comment),
      skillSlugs: this.resolveSkillSlugs(input.skillSlugs),
      createdAt: timestamp
    };

    this.getUserProfile(reviewerWallet);
    this.getUserProfile(revieweeWallet);
    this.reviews.push(review);

    const reputation = this.requireReputation(revieweeWallet);
    const previousTotal = reputation.averageRating * reputation.completedGigs;
    reputation.completedGigs += 1;
    reputation.averageRating = Math.round(((previousTotal + rating) / reputation.completedGigs) * 100) / 100;
    reputation.endorsedSkills = Array.from(new Set([...reputation.endorsedSkills, ...review.skillSlugs]));
    reputation.updatedAt = timestamp;

    const level = this.addXp(revieweeWallet, 125 + rating * 25);
    if (rating === 5) {
      this.awardAchievement(revieweeWallet, "five-star-review", "Five Star Delivery", "Earned a five star review.");
    }

    this.notifications.push({
      id: randomUUID(),
      wallet: revieweeWallet,
      type: "review",
      title: "Review received",
      body: `You received a ${rating} star review.`,
      read: false,
      createdAt: timestamp
    });

    return { review, reputation, level };
  }

  getMarketSignals() {
    const openGigs = this.gigs.filter((gig) => gig.status === "open");
    const skillDemand = new Map<string, number>();

    for (const gig of openGigs) {
      for (const skill of gig.requiredSkills) {
        skillDemand.set(skill.slug, (skillDemand.get(skill.slug) ?? 0) + 1);
      }
    }

    const topSkills = [...skillDemand.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([slug, demand]) => ({
        skill: this.skillTags.find((tag) => tag.slug === slug)?.name ?? slug,
        slug,
        demand
      }));
    const avgBudget =
      openGigs.reduce((total, gig) => total + (gig.budgetMin + gig.budgetMax) / 2, 0) / Math.max(openGigs.length, 1);
    const capturedFees = this.feeLedger.filter((fee) => fee.status === "captured");

    return {
      openGigCount: openGigs.length,
      activeAgreementCount: this.agreements.filter((agreement) => agreement.status === "active").length,
      averageOpenGigBudget: roundMoney(avgBudget),
      topSkills,
      feeRunRate: roundMoney(capturedFees.reduce((total, fee) => total + fee.amount, 0)),
      generatedAt: now()
    };
  }

  getAdminRevenue() {
    const totals = this.treasuryRevenue.reduce<Record<string, number>>((summary, revenue) => {
      const key = `${revenue.period}:${revenue.currency}`;
      summary[key] = roundMoney((summary[key] ?? 0) + revenue.amount);
      return summary;
    }, {});

    return {
      totals,
      revenue: this.treasuryRevenue
    };
  }

  getAdminFees(statusInput?: unknown) {
    const status = optionalString(statusInput) as FeeStatus | undefined;
    const ledger = status ? this.feeLedger.filter((fee) => fee.status === status) : this.feeLedger;
    const totals = ledger.reduce<Record<string, number>>((summary, fee) => {
      const key = `${fee.status}:${fee.currency}`;
      summary[key] = roundMoney((summary[key] ?? 0) + fee.amount);
      return summary;
    }, {});

    return { totals, ledger };
  }

  private seed() {
    const createdAt = "2026-04-28T12:00:00.000Z";
    this.skillTags = [
      this.tag("Solidity", "protocol"),
      this.tag("TypeScript", "engineering"),
      this.tag("React", "frontend"),
      this.tag("Data Analysis", "analytics"),
      this.tag("Smart Contract Audit", "security"),
      this.tag("Brand Strategy", "creative"),
      this.tag("Tokenomics", "strategy")
    ];
    const skill = (slug: string) => this.requireSkill(slug);

    this.users = [
      {
        id: randomUUID(),
        wallet: "0xalice",
        handle: "alice-protocol",
        displayName: "Alice Morgan",
        bio: "Protocol engineer focused on escrow and marketplace systems.",
        skills: [skill("solidity"), skill("typescript"), skill("smart-contract-audit")],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: randomUUID(),
        wallet: "0xbob",
        handle: "bob-design",
        displayName: "Bob Singh",
        bio: "Product strategist for crypto-native launches.",
        skills: [skill("brand-strategy"), skill("tokenomics"), skill("data-analysis")],
        createdAt,
        updatedAt: createdAt
      },
      {
        id: randomUUID(),
        wallet: "0xcarol",
        handle: "carol-ui",
        displayName: "Carol Tan",
        bio: "Frontend builder for dashboards and worker tools.",
        skills: [skill("react"), skill("typescript"), skill("data-analysis")],
        createdAt,
        updatedAt: createdAt
      }
    ];

    this.reputations = [
      {
        wallet: "0xalice",
        completedGigs: 18,
        averageRating: 4.9,
        onTimeRate: 0.94,
        disputeRate: 0.01,
        endorsedSkills: ["solidity", "typescript", "smart-contract-audit"],
        updatedAt: createdAt
      },
      {
        wallet: "0xbob",
        completedGigs: 11,
        averageRating: 4.7,
        onTimeRate: 0.9,
        disputeRate: 0.02,
        endorsedSkills: ["brand-strategy", "tokenomics"],
        updatedAt: createdAt
      },
      {
        wallet: "0xcarol",
        completedGigs: 9,
        averageRating: 4.8,
        onTimeRate: 0.97,
        disputeRate: 0,
        endorsedSkills: ["react", "typescript"],
        updatedAt: createdAt
      }
    ];

    this.levels = [
      {
        wallet: "0xalice",
        level: 5,
        title: "Elite Priority Contractor",
        xp: 3820,
        nextLevelXp: 4500,
        tier: "Platinum",
        unlockables: ["highest-paying gigs", "urgent premium gigs", "priority ranking"],
        updatedAt: createdAt
      },
      {
        wallet: "0xbob",
        level: 3,
        title: "Skilled Contractor",
        xp: 2080,
        nextLevelXp: 2600,
        tier: "Silver",
        unlockables: ["higher-paying gigs", "recurring contracts"],
        updatedAt: createdAt
      },
      {
        wallet: "0xcarol",
        level: 3,
        title: "Skilled Contractor",
        xp: 1680,
        nextLevelXp: 2100,
        tier: "Silver",
        unlockables: ["higher-paying gigs", "recurring contracts"],
        updatedAt: createdAt
      }
    ];

    this.gigs = [
      {
        id: "gig-escrow-audit",
        title: "Audit escrow release contract",
        description: "Review a milestone escrow contract and produce actionable security findings.",
        buyerWallet: "0xbob",
        budgetMin: 2400,
        budgetMax: 4200,
        currency: "USDC",
        requiredSkills: [skill("solidity"), skill("smart-contract-audit")],
        status: "open",
        remote: true,
        region: "global",
        requiredLevel: 4,
        urgency: "priority",
        encryptedDetailsRef: "ipfs://encrypted/gigs/gig-escrow-audit",
        publicDiscoveryMetadata: ["category:protocol", "region:global", "budget_band:2400-4200", "level:4"],
        protectedPaymentRequired: true,
        directSettlementEligible: false,
        allowedPaymentRails: PAYMENT_RAILS,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "gig-worker-dashboard",
        title: "Build worker reputation dashboard",
        description: "Create a React dashboard for reputation, levels, notifications, and match quality.",
        buyerWallet: "0xalice",
        budgetMin: 1800,
        budgetMax: 3100,
        currency: "USDC",
        requiredSkills: [skill("react"), skill("typescript"), skill("data-analysis")],
        status: "open",
        remote: true,
        region: "americas",
        requiredLevel: 3,
        urgency: "standard",
        encryptedDetailsRef: "ipfs://encrypted/gigs/gig-worker-dashboard",
        publicDiscoveryMetadata: ["category:frontend", "region:americas", "budget_band:1800-3100", "level:3"],
        protectedPaymentRequired: true,
        directSettlementEligible: false,
        allowedPaymentRails: PAYMENT_RAILS,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: "gig-market-model",
        title: "Tokenomics market signal model",
        description: "Model fee flows, treasury revenue, and worker incentives for a marketplace launch.",
        buyerWallet: "0xcarol",
        budgetMin: 3200,
        budgetMax: 5500,
        currency: "USDC",
        requiredSkills: [skill("tokenomics"), skill("data-analysis")],
        status: "open",
        remote: true,
        region: "global",
        requiredLevel: 3,
        urgency: "urgent",
        encryptedDetailsRef: "ipfs://encrypted/gigs/gig-market-model",
        publicDiscoveryMetadata: ["category:strategy", "region:global", "budget_band:3200-5500", "level:3"],
        protectedPaymentRequired: true,
        directSettlementEligible: false,
        allowedPaymentRails: PAYMENT_RAILS,
        createdAt,
        updatedAt: createdAt
      }
    ];

    this.agreements = [
      {
        id: "agreement-dashboard-1",
        gigId: "gig-worker-dashboard",
        buyerWallet: "0xalice",
        workerWallet: "0xcarol",
        status: "active",
        escrowAmount: 2400,
        currency: "USDC",
        startedAt: createdAt
      }
    ];

    this.achievements = [
      {
        id: randomUUID(),
        wallet: "0xalice",
        key: "trusted-auditor",
        title: "Trusted Auditor",
        description: "Completed more than ten security-focused gigs.",
        awardedAt: createdAt
      }
    ];

    this.notifications = [
      {
        id: randomUUID(),
        wallet: "0xalice",
        type: "match",
        title: "High quality match",
        body: "A new escrow audit gig matches your security profile.",
        read: false,
        createdAt
      }
    ];

    this.treasuryRevenue = [
      {
        id: randomUUID(),
        source: "platform_fee",
        amount: 420,
        currency: "USDC",
        period: "2026-04",
        createdAt
      },
      {
        id: randomUUID(),
        source: "referral_fee",
        amount: 90,
        currency: "USDC",
        period: "2026-04",
        createdAt
      }
    ];

    this.feeLedger = [
      {
        id: randomUUID(),
        agreementId: "agreement-dashboard-1",
        payerWallet: "0xalice",
        payeeWallet: "workmesh-treasury",
        feeType: "platform",
        amount: 120,
        currency: "USDC",
        status: "captured",
        createdAt
      }
    ];

    this.threads = [
      {
        id: "thread-alice-carol",
        participants: ["0xalice", "0xcarol"],
        lastMessageAt: createdAt,
        messages: [
          {
            id: randomUUID(),
            threadId: "thread-alice-carol",
            fromWallet: "0xalice",
            toWallet: "0xcarol",
            encryptedPayload: {
              algorithm: "AES-GCM",
              ciphertext: "fixture-ciphertext-only-7f2c5ab1",
              nonce: "fixture-nonce"
            },
            plaintextRejected: false,
            createdAt
          }
        ]
      }
    ];
  }

  private calculateMatch(walletInput: string, gigId: string): MatchScore {
    const wallet = toWallet(walletInput);
    const profile = this.getUserProfile(wallet);
    const gig = this.requireGig(gigId);
    const userSkillSlugs = new Set(profile.user.skills.map((skill) => skill.slug));
    const requiredSlugs = gig.requiredSkills.map((skill) => skill.slug);
    const overlapCount = requiredSlugs.filter((slug) => userSkillSlugs.has(slug)).length;
    const overlap = requiredSlugs.length ? overlapCount / requiredSlugs.length : 0;
    const missingRequirements = requiredSlugs.filter((slug) => !userSkillSlugs.has(slug));
    const requiredLevel = gig.requiredLevel ?? 1;
    const reputationSignal = profile.reputation.averageRating ? profile.reputation.averageRating / 5 : 0.55;
    const reliabilitySignal = 1 - profile.reputation.disputeRate;
    const tierEligibilitySignal =
      profile.level.level >= requiredLevel ? 1 : clamp(profile.level.level / requiredLevel, 0.1, 1);
    const availabilitySignal = 0.84;
    const completionHistorySignal = clamp(profile.reputation.completedGigs / 25, 0.1, 1);
    const priceFitSignal = clamp((gig.budgetMax - gig.budgetMin) / Math.max(gig.budgetMax, 1), 0.15, 0.75);
    const responseSignal = clamp(0.92 - profile.reputation.disputeRate, 0.5, 1);
    const proximitySignal = gig.remote ? 1 : gig.region === "local" ? 0.82 : 0.62;
    const raw =
      overlap * 30 +
      proximitySignal * 12 +
      tierEligibilitySignal * 12 +
      reputationSignal * 12 +
      availabilitySignal * 10 +
      completionHistorySignal * 10 +
      priceFitSignal * 8 +
      responseSignal * 6;
    const totalScore = Math.round(clamp(raw, 0, 100) * 10) / 10;
    const confidenceScore = clamp(
      0.56 + overlap * 0.22 + completionHistorySignal * 0.12 + reputationSignal * 0.1,
      0.42,
      0.96
    );
    const suggestedActions = [
      ...missingRequirements.map((slug) => `Verify or add skill: ${slug}`),
      ...(profile.level.level < requiredLevel ? [`Reach Level ${requiredLevel} to unlock this task tier`] : []),
      ...(priceFitSignal < 0.3 ? ["Negotiate scope or rate before agreement creation"] : [])
    ];

    return {
      id: randomUUID(),
      wallet,
      gigId,
      score: totalScore,
      totalScore,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      signals: {
        skillFitWeight: Math.round(overlap * 100) / 100,
        proximityWeight: Math.round(proximitySignal * 100) / 100,
        tierEligibilityWeight: Math.round(tierEligibilitySignal * 100) / 100,
        ratingWeight: Math.round(reputationSignal * 100) / 100,
        availabilityWeight: Math.round(availabilitySignal * 100) / 100,
        completionHistoryWeight: Math.round(completionHistorySignal * 100) / 100,
        priceFitWeight: Math.round(priceFitSignal * 100) / 100,
        responseWeight: Math.round(responseSignal * 100) / 100,
        reliability: Math.round(reliabilitySignal * 100) / 100
      },
      explanation: `Score ${totalScore}/100 from skill fit, proximity, tier eligibility, rating, availability, completion history, price fit, and response speed.`,
      missingRequirements,
      suggestedActions,
      createdAt: now()
    };
  }

  private resolveSkills(input: unknown) {
    return this.resolveSkillSlugs(input).map((slug) => this.requireSkill(slug));
  }

  private resolveSkillSlugs(input: unknown) {
    if (!input) {
      return [];
    }

    const values = Array.isArray(input) ? input : String(input).split(",");
    return Array.from(
      new Set(
        values
          .map((value) => (typeof value === "string" ? value : String(value)))
          .map((value) => slugify(value))
          .filter(Boolean)
      )
    );
  }

  private resolveThread(threadId: string | undefined, fromWallet: string, toWalletValue: string) {
    if (threadId) {
      return this.getMessageThread(threadId);
    }

    const participants = [fromWallet, toWalletValue].sort();
    const existing = this.threads.find(
      (thread) =>
        thread.participants.length === participants.length &&
        thread.participants.every((participant) => participants.includes(participant))
    );

    if (existing) {
      return existing;
    }

    const thread: MessageThread = {
      id: randomUUID(),
      participants,
      lastMessageAt: now(),
      messages: []
    };
    this.threads.push(thread);
    return thread;
  }

  private normalizeEncryptedPayload(encryptedPayload: unknown, plaintextAttempt: unknown): Message["encryptedPayload"] {
    if (encryptedPayload && typeof encryptedPayload === "object") {
      const candidate = encryptedPayload as Partial<Message["encryptedPayload"]>;
      if (typeof candidate.algorithm === "string" && typeof candidate.ciphertext === "string") {
        return {
          algorithm: candidate.algorithm,
          ciphertext: candidate.ciphertext,
          ...(candidate.nonce ? { nonce: String(candidate.nonce) } : {}),
          ...(candidate.aad ? { aad: String(candidate.aad) } : {})
        };
      }
    }

    const plaintext = optionalString(plaintextAttempt);
    if (!plaintext) {
      throw new ApiError(400, "encryptedPayload is required");
    }

    return {
      algorithm: "PLAINTEXT_REJECTED_SHA256_REDACTION",
      ciphertext: createHash("sha256").update(plaintext).digest("hex")
    };
  }

  private resolveUrgency(value: unknown): GigIndex["urgency"] {
    const urgency = optionalString(value);
    if (urgency === "priority" || urgency === "urgent") {
      return urgency;
    }
    return "standard";
  }

  private marketPressureFor(input: {
    urgencyMultiplier: number;
    skillCount: number;
    timelineDays: number;
  }): PriceQuote["marketPressure"] {
    if (input.urgencyMultiplier >= 1.2 || input.timelineDays <= 2) {
      return "surge";
    }
    if (input.skillCount >= 4 || input.timelineDays <= 5) {
      return "high";
    }
    if (input.skillCount <= 1 && input.timelineDays >= 21) {
      return "low";
    }
    return "balanced";
  }

  private requireString(value: unknown, field: string) {
    if (typeof value !== "string" || !value.trim()) {
      throw new ApiError(400, `${field} is required`);
    }

    return value.trim();
  }

  private requireGig(gigId: string) {
    const gig = this.gigs.find((candidate) => candidate.id === gigId);

    if (!gig) {
      throw new ApiError(404, "Gig not found");
    }

    return gig;
  }

  private requireReputation(wallet: string) {
    const reputation = this.reputations.find((candidate) => candidate.wallet === wallet);

    if (!reputation) {
      throw new ApiError(404, "Reputation not found");
    }

    return reputation;
  }

  private requireLevel(wallet: string) {
    const level = this.levels.find((candidate) => candidate.wallet === wallet);

    if (!level) {
      throw new ApiError(404, "User level not found");
    }

    return level;
  }

  private requireSkill(slug: string) {
    const existing = this.skillTags.find((tag) => tag.slug === slug);

    if (existing) {
      return existing;
    }

    const created = this.tag(slug, "custom");
    this.skillTags.push(created);
    return created;
  }

  private tag(name: string, category: string): SkillTag {
    const slug = slugify(name);
    return {
      id: randomUUID(),
      name: name
        .split(/[-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
      slug,
      category,
      createdAt: "2026-04-28T12:00:00.000Z"
    };
  }

  private addXp(wallet: string, xp: number) {
    const level = this.requireLevel(wallet);
    level.xp += xp;

    while (level.xp >= level.nextLevelXp) {
      level.level = Math.min(5, level.level + 1);
      level.nextLevelXp += 500 + level.level * 75;
    }

    level.tier = level.level >= 5 ? "Platinum" : level.level >= 4 ? "Gold" : level.level >= 3 ? "Silver" : "Bronze";
    level.title = this.levelTitle(level.level);
    level.unlockables = this.levelUnlockables(level.level);
    level.updatedAt = now();
    return level;
  }

  private levelTitle(level: number) {
    const titles = [
      "Basic Tasks",
      "Reliable Operator",
      "Skilled Contractor",
      "Trusted Specialist",
      "Elite Priority Contractor"
    ];
    return titles[Math.trunc(clamp(level, 1, 5)) - 1] ?? "Basic Tasks";
  }

  private levelUnlockables(level: number) {
    const unlockables = [
      "basic local gigs",
      "higher-paying gigs",
      "urgent premium gigs",
      "recurring contracts",
      "priority ranking",
      "lower escrow friction",
      "bonus rewards"
    ];
    return unlockables.slice(0, Math.min(unlockables.length, level + 2));
  }

  private awardAchievement(wallet: string, key: string, title: string, description: string) {
    if (this.achievements.some((achievement) => achievement.wallet === wallet && achievement.key === key)) {
      return;
    }

    this.achievements.push({
      id: randomUUID(),
      wallet,
      key,
      title,
      description,
      awardedAt: now()
    });
  }
}
