import { PoolClient } from 'pg';
import pino from 'pino';
import { IndexedEvent } from '../types/events';

const logger = pino({ name: 'event-processor' });

export class EventProcessor {
  /**
   * Process a single event idempotently
   * Returns true if event was processed, false if already processed
   */
  async processEvent(client: PoolClient, event: IndexedEvent): Promise<boolean> {
    // Check if event already processed (idempotency)
    const existingEvent = await client.query(
      'SELECT id FROM events WHERE signature = $1',
      [event.signature]
    );

    if (existingEvent.rows.length > 0) {
      logger.debug({ signature: event.signature }, 'Event already processed, skipping');
      return false;
    }

    // Insert raw event
    await client.query(
      `INSERT INTO events (signature, slot, block_time, program_id, event_type, event_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.signature,
        event.slot,
        event.blockTime,
        event.programId,
        event.eventType,
        JSON.stringify(event.eventData),
      ]
    );

    // Route to appropriate handler
    await this.routeEvent(client, event);

    logger.info(
      { signature: event.signature, type: event.eventType },
      'Event processed'
    );

    return true;
  }

  private async routeEvent(client: PoolClient, event: IndexedEvent): Promise<void> {
    const { eventType, eventData } = event;

    // Campaign events
    if (eventType === 'CampaignCreated') {
      await this.handleCampaignCreated(client, eventData);
    } else if (eventType === 'CampaignUpdated') {
      await this.handleCampaignUpdated(client, eventData);
    } else if (eventType === 'CampaignPublished') {
      await this.handleCampaignPublished(client, eventData);
    } else if (eventType === 'CampaignStateChanged') {
      await this.handleCampaignStateChanged(client, eventData);
    } else if (eventType === 'CampaignArchived') {
      await this.handleCampaignArchived(client, eventData);
    } else if (eventType === 'TaskAddedToCampaign') {
      await this.handleTaskAddedToCampaign(client, eventData);
    }

    // Task events
    else if (eventType === 'TaskCreated') {
      await this.handleTaskCreated(client, eventData);
    } else if (eventType === 'TaskStateChanged') {
      await this.handleTaskStateChanged(client, eventData);
    } else if (eventType === 'TaskUpdated') {
      await this.handleTaskUpdated(client, eventData);
    } else if (eventType === 'RecipientAssigned') {
      await this.handleRecipientAssigned(client, eventData);
    }

    // Budget vote events
    else if (eventType === 'BudgetVoteCast') {
      await this.handleBudgetVoteCast(client, eventData);
    } else if (eventType === 'BudgetFinalized') {
      await this.handleBudgetFinalized(client, eventData);
    }

    // Escrow events
    else if (eventType === 'ContributionMade') {
      await this.handleContributionMade(client, eventData);
    } else if (eventType === 'TaskFunded') {
      await this.handleTaskFunded(client, eventData);
    } else if (eventType === 'PayoutExecuted') {
      await this.handlePayoutExecuted(client, eventData);
    } else if (eventType === 'RefundExecuted') {
      await this.handleRefundExecuted(client, eventData);
    }

    // Proof events
    else if (eventType === 'ProofSubmitted') {
      await this.handleProofSubmitted(client, eventData);
    }

    // Approval vote events
    else if (eventType === 'ApprovalVoteCast') {
      await this.handleApprovalVoteCast(client, eventData);
    } else if (eventType === 'TaskApproved') {
      await this.handleTaskApproved(client, eventData);
    } else if (eventType === 'TaskRejected') {
      await this.handleTaskRejected(client, eventData);
    }

    // Dispute events
    else if (eventType === 'DisputeInitiated') {
      await this.handleDisputeInitiated(client, eventData);
    } else if (eventType === 'DisputeResolved') {
      await this.handleDisputeResolved(client, eventData);
    }

    // Governance events
    else if (eventType === 'TokensDistributed') {
      await this.handleTokensDistributed(client, eventData);
    } else {
      logger.warn({ eventType }, 'Unknown event type');
    }
  }

  // ============================================================================
  // CAMPAIGN EVENT HANDLERS
  // ============================================================================

  private async handleCampaignCreated(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO campaigns (pubkey, campaign_id, creator, title, category, state, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Draft', to_timestamp($6))
       ON CONFLICT (pubkey) DO NOTHING`,
      [
        data.campaignPubkey,
        data.campaignId,
        data.creator,
        data.title,
        data.category,
        Number(data.createdAt),
      ]
    );

    // Ensure wallet metadata exists
    await this.ensureWalletMetadata(client, data.creator);
    await client.query(
      'UPDATE wallet_metadata SET total_campaigns_created = total_campaigns_created + 1 WHERE wallet_address = $1',
      [data.creator]
    );

    // Initialize campaign metrics
    await client.query(
      `INSERT INTO campaign_metrics (campaign_pubkey)
       VALUES ($1)
       ON CONFLICT (campaign_pubkey) DO NOTHING`,
      [data.campaignPubkey]
    );
  }

  private async handleCampaignUpdated(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE campaigns SET updated_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.updatedAt), data.campaignPubkey]
    );
  }

  private async handleCampaignPublished(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE campaigns SET state = 'Published', published_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.publishedAt), data.campaignPubkey]
    );
  }

  private async handleCampaignStateChanged(client: PoolClient, data: any): Promise<void> {
    const stateMap = ['Draft', 'Published', 'Active', 'Completed', 'Archived'];
    await client.query(
      `UPDATE campaigns SET state = $1, updated_at = to_timestamp($2) WHERE pubkey = $3`,
      [stateMap[data.newState], Number(data.changedAt), data.campaignPubkey]
    );
  }

  private async handleCampaignArchived(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE campaigns SET state = 'Archived', archived_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.archivedAt), data.campaignPubkey]
    );
  }

  private async handleTaskAddedToCampaign(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE campaigns SET tasks_count = $1 WHERE pubkey = $2`,
      [data.tasksCount, data.campaignPubkey]
    );

    await client.query(
      `UPDATE campaign_metrics SET total_tasks = $1 WHERE campaign_pubkey = $2`,
      [data.tasksCount, data.campaignPubkey]
    );
  }

  // ============================================================================
  // TASK EVENT HANDLERS
  // ============================================================================

  private async handleTaskCreated(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO tasks (pubkey, task_id, campaign_pubkey, creator, title, state, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Draft', to_timestamp($6))
       ON CONFLICT (pubkey) DO NOTHING`,
      [
        data.taskPubkey,
        data.taskId,
        data.campaignPubkey,
        data.creator,
        data.title,
        Number(data.createdAt),
      ]
    );

    await this.ensureWalletMetadata(client, data.creator);
    await client.query(
      'UPDATE wallet_metadata SET total_tasks_created = total_tasks_created + 1 WHERE wallet_address = $1',
      [data.creator]
    );

    // Initialize task metrics
    await client.query(
      `INSERT INTO task_metrics (task_pubkey)
       VALUES ($1)
       ON CONFLICT (task_pubkey) DO NOTHING`,
      [data.taskPubkey]
    );
  }

  private async handleTaskStateChanged(client: PoolClient, data: any): Promise<void> {
    const stateMap = [
      'Draft',
      'VotingBudget',
      'BudgetFinalized',
      'FundingOpen',
      'Funded',
      'InProgress',
      'SubmittedForReview',
      'Approved',
      'PaidOut',
      'Rejected',
      'Refunding',
      'Refunded',
      'Disputed',
    ];

    await client.query(
      `UPDATE tasks SET state = $1, updated_at = to_timestamp($2) WHERE pubkey = $3`,
      [stateMap[data.newState], Number(data.changedAt), data.taskPubkey]
    );

    // Update timestamps based on state
    if (data.newState === 2) {
      // BudgetFinalized
      await client.query(
        `UPDATE tasks SET budget_finalized_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    } else if (data.newState === 4) {
      // Funded
      await client.query(
        `UPDATE tasks SET funded_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    } else if (data.newState === 5) {
      // InProgress
      await client.query(
        `UPDATE tasks SET started_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    } else if (data.newState === 6) {
      // SubmittedForReview
      await client.query(
        `UPDATE tasks SET submitted_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    } else if (data.newState === 7) {
      // Approved
      await client.query(
        `UPDATE tasks SET approved_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    } else if (data.newState === 8) {
      // PaidOut
      await client.query(
        `UPDATE tasks SET completed_at = to_timestamp($1) WHERE pubkey = $2`,
        [Number(data.changedAt), data.taskPubkey]
      );
    }
  }

  private async handleTaskUpdated(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET updated_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.updatedAt), data.taskPubkey]
    );
  }

  private async handleRecipientAssigned(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET recipient = $1 WHERE pubkey = $2`,
      [data.recipient, data.taskPubkey]
    );
  }

  // ============================================================================
  // BUDGET VOTE EVENT HANDLERS
  // ============================================================================

  private async handleBudgetVoteCast(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO budget_votes (task_pubkey, voter, proposed_budget, vote_weight, voted_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT (task_pubkey, voter) DO UPDATE
       SET proposed_budget = $3, vote_weight = $4, voted_at = to_timestamp($5)`,
      [
        data.taskPubkey,
        data.voter,
        data.proposedBudget.toString(),
        data.voteWeight.toString(),
        Number(data.votedAt),
      ]
    );
  }

  private async handleBudgetFinalized(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET finalized_budget = $1, budget_finalized_at = to_timestamp($2) WHERE pubkey = $3`,
      [data.finalizedBudget.toString(), Number(data.finalizedAt), data.taskPubkey]
    );
  }

  // ============================================================================
  // ESCROW EVENT HANDLERS
  // ============================================================================

  private async handleContributionMade(client: PoolClient, data: any): Promise<void> {
    const amount = data.amount.toString();
    const contributor = data.contributor;
    const taskPubkey = data.taskPubkey;

    // Ensure wallet metadata
    await this.ensureWalletMetadata(client, contributor);

    // Get wallet age
    const walletResult = await client.query(
      'SELECT age_days FROM wallet_metadata WHERE wallet_address = $1',
      [contributor]
    );
    const walletAgeDays = walletResult.rows[0]?.age_days || 0;

    // Insert or update contribution
    await client.query(
      `INSERT INTO contributions (task_pubkey, contributor, amount, wallet_age_days, contributed_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT (task_pubkey, contributor) DO UPDATE
       SET amount = contributions.amount + $3, contributed_at = to_timestamp($5)`,
      [taskPubkey, contributor, amount, walletAgeDays, Number(data.contributedAt)]
    );

    // Update task totals
    await client.query(
      `UPDATE tasks SET total_contributed = $1 WHERE pubkey = $2`,
      [data.totalContributed.toString(), taskPubkey]
    );

    // Update wallet metadata
    await client.query(
      `UPDATE wallet_metadata SET total_contributed = total_contributed + $1 WHERE wallet_address = $2`,
      [amount, contributor]
    );

    // Update task metrics
    await this.updateTaskMetrics(client, taskPubkey);

    // Update campaign metrics
    const task = await client.query('SELECT campaign_pubkey FROM tasks WHERE pubkey = $1', [taskPubkey]);
    if (task.rows.length > 0) {
      await this.updateCampaignMetrics(client, task.rows[0].campaign_pubkey);
    }
  }

  private async handleTaskFunded(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET funded_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.fundedAt), data.taskPubkey]
    );
  }

  private async handlePayoutExecuted(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET total_paid_out = $1 WHERE pubkey = $2`,
      [data.amount.toString(), data.taskPubkey]
    );
  }

  private async handleRefundExecuted(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET total_refunded = total_refunded + $1 WHERE pubkey = $2`,
      [data.amount.toString(), data.taskPubkey]
    );
  }

  // ============================================================================
  // PROOF EVENT HANDLERS
  // ============================================================================

  private async handleProofSubmitted(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO proofs (pubkey, task_pubkey, recipient, proof_hash, proof_uri, submitted_at)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6))
       ON CONFLICT (pubkey) DO NOTHING`,
      [
        data.proofPubkey,
        data.taskPubkey,
        data.recipient,
        data.proofHash,
        data.proofUri,
        Number(data.submittedAt),
      ]
    );
  }

  // ============================================================================
  // APPROVAL VOTE EVENT HANDLERS
  // ============================================================================

  private async handleApprovalVoteCast(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO approval_votes (task_pubkey, voter, approved, vote_weight, voted_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT (task_pubkey, voter) DO UPDATE
       SET approved = $3, vote_weight = $4, voted_at = to_timestamp($5)`,
      [
        data.taskPubkey,
        data.voter,
        data.approved,
        data.voteWeight.toString(),
        Number(data.votedAt),
      ]
    );
  }

  private async handleTaskApproved(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `UPDATE tasks SET approved_at = to_timestamp($1) WHERE pubkey = $2`,
      [Number(data.approvedAt), data.taskPubkey]
    );
  }

  private async handleTaskRejected(client: PoolClient, data: any): Promise<void> {
    // State is already updated by TaskStateChanged event
    // This is just for logging
  }

  // ============================================================================
  // DISPUTE EVENT HANDLERS
  // ============================================================================

  private async handleDisputeInitiated(client: PoolClient, data: any): Promise<void> {
    await client.query(
      `INSERT INTO disputes (pubkey, task_pubkey, initiator, reason, status, created_at)
       VALUES ($1, $2, $3, $4, 'Pending', to_timestamp($5))
       ON CONFLICT (pubkey) DO NOTHING`,
      [
        data.disputePubkey,
        data.taskPubkey,
        data.initiator,
        data.reason,
        Number(data.initiatedAt),
      ]
    );
  }

  private async handleDisputeResolved(client: PoolClient, data: any): Promise<void> {
    const resolutionMap = [
      'PayoutToRecipient',
      'RefundToDonors',
      'PartialPayoutPartialRefund',
    ];

    await client.query(
      `UPDATE disputes
       SET status = 'Resolved',
           resolution = $1,
           payout_percent = $2,
           resolved_at = to_timestamp($3)
       WHERE pubkey = $4`,
      [
        resolutionMap[data.resolution],
        data.payoutPercent,
        Number(data.resolvedAt),
        data.disputePubkey,
      ]
    );
  }

  // ============================================================================
  // GOVERNANCE EVENT HANDLERS
  // ============================================================================

  private async handleTokensDistributed(client: PoolClient, data: any): Promise<void> {
    const typeMap = [
      'EarlyContributor',
      'CommunityAirdrop',
      'DaoTreasury',
      'EcosystemFund',
      'FutureContributor',
    ];

    await client.query(
      `INSERT INTO governance_distributions (pubkey, recipient, amount, recipient_type, distributed_at)
       VALUES ($1, $2, $3, $4, to_timestamp($5))
       ON CONFLICT (pubkey) DO NOTHING`,
      [
        data.distributionPubkey,
        data.recipient,
        data.amount.toString(),
        typeMap[data.recipientType],
        Number(data.distributedAt),
      ]
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async ensureWalletMetadata(client: PoolClient, walletAddress: string): Promise<void> {
    await client.query(
      `INSERT INTO wallet_metadata (wallet_address, first_seen_at)
       VALUES ($1, NOW())
       ON CONFLICT (wallet_address) DO NOTHING`,
      [walletAddress]
    );
  }

  private async updateTaskMetrics(client: PoolClient, taskPubkey: string): Promise<void> {
    // Calculate unique contributors and weighted count
    const contributorsResult = await client.query(
      `SELECT
         COUNT(DISTINCT contributor) as unique_contributors,
         SUM(CASE
           WHEN wallet_age_days < 7 THEN 0.1
           WHEN wallet_age_days < 30 THEN 0.5
           WHEN wallet_age_days < 180 THEN 0.8
           ELSE 1.0
         END) as weighted_count
       FROM contributions
       WHERE task_pubkey = $1`,
      [taskPubkey]
    );

    // Get task budget and total contributed
    const taskResult = await client.query(
      `SELECT finalized_budget, total_contributed FROM tasks WHERE pubkey = $1`,
      [taskPubkey]
    );

    const uniqueContributors = contributorsResult.rows[0].unique_contributors || 0;
    const weightedCount = contributorsResult.rows[0].weighted_count || 0;
    const finalizedBudget = BigInt(taskResult.rows[0]?.finalized_budget || 0);
    const totalContributed = BigInt(taskResult.rows[0]?.total_contributed || 0);

    let percentFunded = 0;
    if (finalizedBudget > 0n) {
      percentFunded = Number((totalContributed * 100n) / finalizedBudget);
    }

    // Trending score: weighted by contribution amount (70%) and contributor diversity (30%)
    const trendingScore = Number(totalContributed) * 0.7 + Number(weightedCount) * 0.3;

    await client.query(
      `UPDATE task_metrics
       SET unique_contributors = $1,
           weighted_contributor_count = $2,
           percent_funded = $3,
           trending_score = $4,
           updated_at = NOW()
       WHERE task_pubkey = $5`,
      [uniqueContributors, weightedCount, percentFunded, trendingScore, taskPubkey]
    );
  }

  private async updateCampaignMetrics(client: PoolClient, campaignPubkey: string): Promise<void> {
    // Aggregate from tasks
    const metricsResult = await client.query(
      `SELECT
         COUNT(DISTINCT t.pubkey) as total_tasks,
         COALESCE(SUM(t.total_contributed), 0) as total_contributions,
         COUNT(DISTINCT c.contributor) as unique_contributors,
         COALESCE(SUM(CASE
           WHEN c.wallet_age_days < 7 THEN 0.1
           WHEN c.wallet_age_days < 30 THEN 0.5
           WHEN c.wallet_age_days < 180 THEN 0.8
           ELSE 1.0
         END), 0) as weighted_count
       FROM tasks t
       LEFT JOIN contributions c ON c.task_pubkey = t.pubkey
       WHERE t.campaign_pubkey = $1`,
      [campaignPubkey]
    );

    const row = metricsResult.rows[0];
    const trendingScore = Number(row.total_contributions) * 0.7 + Number(row.weighted_count) * 0.3;

    await client.query(
      `UPDATE campaign_metrics
       SET total_tasks = $1,
           total_contributions_usd = $2,
           unique_contributors = $3,
           weighted_contributor_count = $4,
           trending_score = $5,
           updated_at = NOW()
       WHERE campaign_pubkey = $6`,
      [
        row.total_tasks,
        row.total_contributions.toString(),
        row.unique_contributors,
        row.weighted_count,
        trendingScore,
        campaignPubkey,
      ]
    );
  }
}
