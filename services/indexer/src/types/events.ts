import { PublicKey } from '@solana/web3.js';

// ============================================================================
// CAMPAIGN EVENTS
// ============================================================================

export interface CampaignCreatedEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  creator: PublicKey;
  title: string;
  category: string;
  createdAt: bigint;
}

export interface CampaignUpdatedEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  updatedBy: PublicKey;
  updatedAt: bigint;
}

export interface CampaignPublishedEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  creator: PublicKey;
  publishedAt: bigint;
}

export interface CampaignStateChangedEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  oldState: CampaignState;
  newState: CampaignState;
  changedAt: bigint;
}

export interface CampaignArchivedEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  archivedBy: PublicKey;
  archivedAt: bigint;
}

export interface TaskAddedToCampaignEvent {
  campaignPubkey: PublicKey;
  campaignId: string;
  taskPubkey: PublicKey;
  tasksCount: number;
  addedAt: bigint;
}

export enum CampaignState {
  Draft = 0,
  Published = 1,
  Active = 2,
  Completed = 3,
  Archived = 4,
}

// ============================================================================
// TASK EVENTS
// ============================================================================

export interface TaskCreatedEvent {
  taskPubkey: PublicKey;
  taskId: string;
  campaignPubkey: PublicKey;
  creator: PublicKey;
  title: string;
  createdAt: bigint;
}

export interface TaskStateChangedEvent {
  taskPubkey: PublicKey;
  taskId: string;
  oldState: TaskState;
  newState: TaskState;
  changedAt: bigint;
}

export interface TaskUpdatedEvent {
  taskPubkey: PublicKey;
  taskId: string;
  updatedBy: PublicKey;
  updatedAt: bigint;
}

export interface RecipientAssignedEvent {
  taskPubkey: PublicKey;
  taskId: string;
  recipient: PublicKey;
  assignedAt: bigint;
}

export enum TaskState {
  Draft = 0,
  VotingBudget = 1,
  BudgetFinalized = 2,
  FundingOpen = 3,
  Funded = 4,
  InProgress = 5,
  SubmittedForReview = 6,
  Approved = 7,
  PaidOut = 8,
  Rejected = 9,
  Refunding = 10,
  Refunded = 11,
  Disputed = 12,
}

// ============================================================================
// BUDGET VOTE EVENTS
// ============================================================================

export interface BudgetVoteCastEvent {
  taskPubkey: PublicKey;
  voter: PublicKey;
  proposedBudget: bigint;
  voteWeight: bigint;
  votedAt: bigint;
}

export interface BudgetFinalizedEvent {
  taskPubkey: PublicKey;
  finalizedBudget: bigint;
  totalVotes: number;
  totalWeight: bigint;
  finalizedAt: bigint;
}

// ============================================================================
// ESCROW EVENTS
// ============================================================================

export interface ContributionMadeEvent {
  taskPubkey: PublicKey;
  contributor: PublicKey;
  amount: bigint;
  totalContributed: bigint;
  contributedAt: bigint;
}

export interface TaskFundedEvent {
  taskPubkey: PublicKey;
  totalContributed: bigint;
  fundedAt: bigint;
}

export interface PayoutExecutedEvent {
  taskPubkey: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  paidAt: bigint;
}

export interface RefundExecutedEvent {
  taskPubkey: PublicKey;
  contributor: PublicKey;
  amount: bigint;
  refundedAt: bigint;
}

export interface EscrowFrozenEvent {
  taskPubkey: PublicKey;
  frozenAt: bigint;
}

export interface EscrowUnfrozenEvent {
  taskPubkey: PublicKey;
  unfrozenAt: bigint;
}

// ============================================================================
// PROOF EVENTS
// ============================================================================

export interface ProofSubmittedEvent {
  proofPubkey: PublicKey;
  taskPubkey: PublicKey;
  recipient: PublicKey;
  proofHash: string;
  proofUri: string;
  submittedAt: bigint;
}

// ============================================================================
// APPROVAL VOTE EVENTS
// ============================================================================

export interface ApprovalVoteCastEvent {
  taskPubkey: PublicKey;
  voter: PublicKey;
  approved: boolean;
  voteWeight: bigint;
  votedAt: bigint;
}

export interface TaskApprovedEvent {
  taskPubkey: PublicKey;
  approvalPercent: number;
  approvedAt: bigint;
}

export interface TaskRejectedEvent {
  taskPubkey: PublicKey;
  rejectionPercent: number;
  rejectedAt: bigint;
}

// ============================================================================
// DISPUTE EVENTS
// ============================================================================

export interface DisputeInitiatedEvent {
  disputePubkey: PublicKey;
  taskPubkey: PublicKey;
  initiator: PublicKey;
  reason: string;
  initiatedAt: bigint;
}

export interface DisputeResolvedEvent {
  disputePubkey: PublicKey;
  taskPubkey: PublicKey;
  resolution: DisputeResolution;
  payoutPercent: number;
  resolvedAt: bigint;
}

export enum DisputeResolution {
  PayoutToRecipient = 0,
  RefundToDonors = 1,
  PartialPayoutPartialRefund = 2,
}

// ============================================================================
// GOVERNANCE EVENTS
// ============================================================================

export interface TokensDistributedEvent {
  distributionPubkey: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  recipientType: RecipientType;
  distributedAt: bigint;
}

export enum RecipientType {
  EarlyContributor = 0,
  CommunityAirdrop = 1,
  DaoTreasury = 2,
  EcosystemFund = 3,
  FutureContributor = 4,
}

// ============================================================================
// INDEXED EVENT WRAPPER
// ============================================================================

export interface IndexedEvent {
  signature: string;
  slot: number;
  blockTime: number;
  programId: string;
  eventType: string;
  eventData: any;
}
