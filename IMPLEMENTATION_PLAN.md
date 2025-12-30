# OpenBook Protocol - V0 Implementation Plan

This document outlines the complete technical implementation plan for building OpenBook Protocol v0. This plan will be executed once the QUESTIONNAIRE.md is completed.

---

## Phase 0: Foundation & Decisions (Week 1)

### 0.1 Lock All Scope Decisions
- Review and finalize answers from QUESTIONNAIRE.md
- Document all decisions in docs/03_SCOPE_DECISIONS.md
- Get stakeholder sign-off on critical choices:
  - Funding model (task-only vs campaign pools)
  - Budget vote weighting
  - Approval mechanism
  - Receipt token approach
  - Dispute resolution model

### 0.2 Set Up Development Environment
- Initialize monorepo structure
- Configure workspace dependencies
- Set up Solana localnet
- Install Anchor framework
- Configure development tools (Rust, Node.js, etc.)
- Set up Git workflow and branch protection

---

## Phase 1: Solana Programs (Weeks 2-6)

### 1.1 Program: Campaign Registry (Week 2)

**File Structure:**
```
programs/
├── campaign-registry/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   └── campaign.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── create_campaign.rs
│   │   │   ├── update_campaign.rs
│   │   │   ├── publish_campaign.rs
│   │   │   └── archive_campaign.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- Campaign PDA
  - Seeds: ["campaign", creator_pubkey, campaign_id]
  - Fields: id, creator, title, description, metadata_uri, state, created_at, updated_at, tasks_count

**Instructions:**
1. `create_campaign` - Initialize new campaign in DRAFT state
2. `update_campaign` - Modify campaign metadata (only in DRAFT)
3. `publish_campaign` - Move campaign to PUBLISHED state
4. `archive_campaign` - Archive completed campaigns

**Events to Emit:**
- CampaignCreated
- CampaignUpdated
- CampaignPublished
- CampaignArchived

**Tests:**
- Unit tests for each instruction
- State transition tests
- Access control tests
- Event emission verification

### 1.2 Program: Task Manager (Week 2-3)

**File Structure:**
```
programs/
├── task-manager/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   ├── task.rs
│   │   │   └── task_state_machine.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── create_task.rs
│   │   │   ├── open_for_funding.rs
│   │   │   ├── start_task.rs
│   │   │   ├── submit_proof.rs
│   │   │   ├── approve_task.rs
│   │   │   ├── reject_task.rs
│   │   │   └── complete_task.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- Task PDA
  - Seeds: ["task", campaign_pubkey, task_id]
  - Fields: id, campaign, creator, recipient, title, deliverables, deadline, target_budget, finalized_budget, state, created_at, proof_hash, proof_submitted_at

**State Machine Implementation:**
- DRAFT → VOTING_BUDGET → BUDGET_FINALIZED → FUNDING_OPEN → FUNDED → IN_PROGRESS → SUBMITTED_FOR_REVIEW → APPROVED → PAID_OUT
- Alternative paths: REJECTED, REFUNDING, REFUNDED, DISPUTED

**Instructions:**
1. `create_task` - Initialize task in DRAFT state
2. `open_budget_voting` - Move to VOTING_BUDGET
3. `finalize_budget` - Compute weighted median, move to BUDGET_FINALIZED
4. `open_for_funding` - Move to FUNDING_OPEN
5. `start_task` - Move to IN_PROGRESS (after fully funded)
6. `submit_proof` - Submit deliverable proof, move to SUBMITTED_FOR_REVIEW
7. `approve_task` - Approve completion (based on chosen approval model)
8. `reject_task` - Reject and initiate refunds
9. `complete_payout` - Finalize after payout

**Events:**
- TaskCreated
- TaskStateChanged
- ProofSubmitted
- TaskApproved
- TaskRejected

**Tests:**
- State machine transition tests (all valid paths)
- Invalid transition rejection tests
- Deadline enforcement tests
- Access control tests

### 1.3 Program: Budget Vote (Week 3)

**File Structure:**
```
programs/
├── budget-vote/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   ├── budget_vote.rs
│   │   │   └── vote_record.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── submit_vote.rs
│   │   │   ├── update_vote.rs
│   │   │   └── finalize_budget.rs
│   │   ├── weighted_median.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- BudgetVote PDA
  - Seeds: ["budget_vote", task_pubkey, voter_pubkey]
  - Fields: task, voter, proposed_budget, vote_weight, voted_at
- BudgetAggregate PDA (per task)
  - Seeds: ["budget_aggregate", task_pubkey]
  - Fields: task, total_voters, total_weight, votes_array (or merkle root if too large)

**Weighted Median Algorithm:**
```rust
fn calculate_weighted_median(votes: Vec<(u64, u64)>) -> u64 {
    // votes: Vec<(budget_amount, weight)>
    // Sort by budget amount
    // Accumulate weights
    // Find value where cumulative weight >= 50% total weight
}
```

**Instructions:**
1. `submit_vote` - Submit budget vote (weight based on contribution)
2. `update_vote` - Update existing vote (before finalization)
3. `finalize_budget` - Calculate weighted median, lock budget

**Events:**
- BudgetVoteSubmitted
- BudgetVoteUpdated
- BudgetFinalized

**Tests:**
- Weighted median calculation tests (various distributions)
- Vote weight calculation tests
- Finalization conditions tests
- Quorum enforcement tests (based on questionnaire)

### 1.4 Program: Task Escrow (Week 4)

**File Structure:**
```
programs/
├── task-escrow/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   ├── escrow.rs
│   │   │   └── contribution.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── initialize_escrow.rs
│   │   │   ├── contribute.rs
│   │   │   ├── payout.rs
│   │   │   └── refund.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- Escrow PDA (USDC vault)
  - Seeds: ["escrow", task_pubkey]
  - Token account holding USDC
  - Fields: task, total_contributed, total_refunded, total_paid_out, is_locked
- Contribution PDA
  - Seeds: ["contribution", task_pubkey, contributor_pubkey]
  - Fields: task, contributor, amount, contributed_at, refunded, refund_amount

**USDC Integration:**
- Use SPL Token program
- Token mint: USDC mint address (different for devnet/mainnet)
- Transfer USDC from contributor → escrow vault
- Transfer USDC from escrow vault → recipient (on payout)
- Transfer USDC from escrow vault → contributor (on refund)

**Instructions:**
1. `initialize_escrow` - Create escrow vault for task
2. `contribute` - Transfer USDC to escrow, record contribution
3. `execute_payout` - Transfer USDC to recipient (requires approval + KYC)
4. `execute_refund` - Transfer USDC back to contributors (pro-rata)
5. `freeze_escrow` - Lock funds (during disputes)
6. `unfreeze_escrow` - Unlock funds (after dispute resolution)

**Invariants to Enforce:**
```rust
// Total USDC in vault must equal:
escrow.total_contributed - escrow.total_refunded - escrow.total_paid_out

// Cannot payout more than contributed
assert!(payout_amount <= escrow.total_contributed - escrow.total_paid_out);

// Refunds are pro-rata
refund_amount = contribution.amount * (total_refund / escrow.total_contributed)
```

**Events:**
- EscrowInitialized
- ContributionMade
- PayoutExecuted
- RefundExecuted
- EscrowFrozen
- EscrowUnfrozen

**Tests:**
- Contribution flow tests
- Payout tests (with KYC check)
- Refund calculation tests (pro-rata)
- Invariant tests (balance checks)
- Freeze/unfreeze tests

### 1.5 Program: Proof Registry (Week 4)

**File Structure:**
```
programs/
├── proof-registry/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   └── proof.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── submit_proof.rs
│   │   │   └── update_proof.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- Proof PDA
  - Seeds: ["proof", task_pubkey]
  - Fields: task, recipient, proof_hash, proof_uri, submitted_at, updated_at

**Instructions:**
1. `submit_proof` - Store proof hash/URI
2. `update_proof` - Update proof (if rejection allows resubmission)

**Events:**
- ProofSubmitted
- ProofUpdated

**Tests:**
- Proof submission tests
- Access control (only recipient can submit)
- Hash verification tests

### 1.6 Program: Dispute Module (Week 5)

**File Structure:**
```
programs/
├── dispute-module/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state/
│   │   │   ├── mod.rs
│   │   │   └── dispute.rs
│   │   ├── instructions/
│   │   │   ├── mod.rs
│   │   │   ├── open_dispute.rs
│   │   │   ├── vote_on_dispute.rs (if using vote-based)
│   │   │   └── resolve_dispute.rs
│   │   ├── events.rs
│   │   └── error.rs
```

**State Accounts:**
- Dispute PDA
  - Seeds: ["dispute", task_pubkey]
  - Fields: task, initiator, reason, opened_at, resolution_deadline, status, resolution

**Instructions:**
1. `open_dispute` - Initiate dispute, freeze escrow
2. `submit_evidence` - Add evidence to dispute
3. `resolve_dispute` - Apply resolution (payout or refund)
4. `vote_on_dispute` - If using vote-based resolution (based on questionnaire)

**Events:**
- DisputeOpened
- EvidenceSubmitted
- DisputeResolved

**Tests:**
- Dispute opening tests
- Escrow freeze verification
- Resolution execution tests
- Timeline enforcement tests

### 1.7 Cross-Program Invocations (Week 5-6)

**Integration Points:**
1. Task Manager ←→ Budget Vote
   - Task state changes trigger budget vote opening/closing
2. Task Manager ←→ Escrow
   - Task approval triggers payout
   - Task rejection triggers refund
3. Task Manager ←→ Proof Registry
   - Proof submission updates task state
4. Dispute Module ←→ Escrow
   - Dispute freezes escrow
   - Resolution unfreezes and executes payout/refund
5. All Programs → Event Emission
   - Consistent event schema across all programs

**CPI Implementation:**
```rust
// Example: Task Manager calling Escrow for payout
pub fn approve_task(ctx: Context<ApproveTask>) -> Result<()> {
    let task = &mut ctx.accounts.task;
    task.state = TaskState::Approved;

    // CPI to escrow for payout
    let cpi_accounts = ExecutePayout {
        escrow: ctx.accounts.escrow.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        // ... other accounts
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.escrow_program.to_account_info(), cpi_accounts);
    task_escrow::cpi::execute_payout(cpi_ctx, task.finalized_budget)?;

    emit!(TaskApproved { task_id: task.id, ... });
    Ok(())
}
```

### 1.8 Program Testing Suite (Week 6)

**Test Categories:**
1. Unit tests (per instruction)
2. Integration tests (cross-program scenarios)
3. Invariant tests (property-based testing)
4. Fuzzing tests (random input validation)
5. Upgrade tests (program upgrade scenarios)

**Test Scenarios:**
- Happy path: Campaign → Task → Contribute → Vote → Approve → Payout
- Refund path: Campaign → Task → Contribute → Vote → Reject → Refund
- Dispute path: ... → Dispute → Resolve → Payout/Refund
- Edge cases: Zero contributions, single voter, tied votes, etc.

**Test Infrastructure:**
```
tests/
├── integration/
│   ├── test_full_flow.rs
│   ├── test_refund_flow.rs
│   ├── test_dispute_flow.rs
│   └── fixtures/
│       ├── campaigns.rs
│       ├── tasks.rs
│       └── users.rs
├── invariant/
│   ├── escrow_invariants.rs
│   └── state_machine_invariants.rs
└── utils/
    ├── setup.rs
    └── helpers.rs
```

---

## Phase 2: Indexer Service (Weeks 7-9)

### 2.1 Indexer Architecture (Week 7)

**Technology Stack:**
- Language: Rust or TypeScript (based on questionnaire)
- Database: PostgreSQL (confirmed via questionnaire)
- Queue: Redis for job processing
- RPC: Solana RPC connection (provider based on questionnaire)

**File Structure:**
```
services/indexer/
├── Cargo.toml or package.json
├── src/
│   ├── main.rs / index.ts
│   ├── rpc/
│   │   ├── client.rs
│   │   ├── event_parser.rs
│   │   └── retry.rs
│   ├── db/
│   │   ├── schema.sql
│   │   ├── migrations/
│   │   ├── models/
│   │   │   ├── campaign.rs
│   │   │   ├── task.rs
│   │   │   ├── contribution.rs
│   │   │   ├── vote.rs
│   │   │   └── event_log.rs
│   │   └── queries/
│   │       ├── campaign_queries.rs
│   │       ├── task_queries.rs
│   │       └── analytics_queries.rs
│   ├── ingestion/
│   │   ├── event_listener.rs
│   │   ├── event_processor.rs
│   │   └── deduplication.rs
│   ├── views/
│   │   ├── campaign_view.rs
│   │   ├── trending_view.rs
│   │   └── metrics_view.rs
│   └── config.rs
```

**Database Schema:**

```sql
-- Core tables
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    campaign_pubkey TEXT UNIQUE NOT NULL,
    creator_pubkey TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata_uri TEXT,
    state TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP,
    total_tasks INTEGER DEFAULT 0,
    total_raised_usdc BIGINT DEFAULT 0
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    task_pubkey TEXT UNIQUE NOT NULL,
    campaign_id UUID REFERENCES campaigns(id),
    campaign_pubkey TEXT NOT NULL,
    creator_pubkey TEXT NOT NULL,
    recipient_pubkey TEXT,
    title TEXT NOT NULL,
    deliverables TEXT,
    deadline TIMESTAMP,
    target_budget BIGINT,
    finalized_budget BIGINT,
    state TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    proof_hash TEXT,
    proof_submitted_at TIMESTAMP,
    total_contributed BIGINT DEFAULT 0,
    total_contributors INTEGER DEFAULT 0
);

CREATE TABLE contributions (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    contributor_pubkey TEXT NOT NULL,
    amount BIGINT NOT NULL,
    contributed_at TIMESTAMP NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    refunded BOOLEAN DEFAULT FALSE,
    refund_amount BIGINT DEFAULT 0
);

CREATE TABLE budget_votes (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    voter_pubkey TEXT NOT NULL,
    proposed_budget BIGINT NOT NULL,
    vote_weight BIGINT NOT NULL,
    voted_at TIMESTAMP NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL,
    UNIQUE(task_id, voter_pubkey)
);

CREATE TABLE proofs (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    recipient_pubkey TEXT NOT NULL,
    proof_hash TEXT NOT NULL,
    proof_uri TEXT,
    submitted_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE payouts (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    recipient_pubkey TEXT NOT NULL,
    amount BIGINT NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    contributor_pubkey TEXT NOT NULL,
    amount BIGINT NOT NULL,
    executed_at TIMESTAMP NOT NULL,
    tx_signature TEXT UNIQUE NOT NULL
);

CREATE TABLE disputes (
    id UUID PRIMARY KEY,
    task_id UUID REFERENCES tasks(id),
    task_pubkey TEXT NOT NULL,
    initiator_pubkey TEXT NOT NULL,
    reason TEXT,
    opened_at TIMESTAMP NOT NULL,
    resolution_deadline TIMESTAMP,
    status TEXT NOT NULL,
    resolution TEXT,
    resolved_at TIMESTAMP
);

-- Event log for idempotency and replay
CREATE TABLE event_log (
    id UUID PRIMARY KEY,
    program_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    campaign_pubkey TEXT,
    task_pubkey TEXT,
    actor_pubkey TEXT,
    tx_signature TEXT UNIQUE NOT NULL,
    slot BIGINT NOT NULL,
    block_time TIMESTAMP NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaigns_creator ON campaigns(creator_pubkey);
CREATE INDEX idx_campaigns_state ON campaigns(state);
CREATE INDEX idx_tasks_campaign ON tasks(campaign_id);
CREATE INDEX idx_tasks_state ON tasks(state);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_contributions_task ON contributions(task_id);
CREATE INDEX idx_contributions_contributor ON contributions(contributor_pubkey);
CREATE INDEX idx_budget_votes_task ON budget_votes(task_id);
CREATE INDEX idx_event_log_slot ON event_log(slot);
CREATE INDEX idx_event_log_processed ON event_log(processed);
CREATE INDEX idx_event_log_tx ON event_log(tx_signature);

-- Derived views for discovery
CREATE MATERIALIZED VIEW trending_campaigns AS
SELECT
    c.*,
    COUNT(DISTINCT cont.contributor_pubkey) as recent_contributors,
    SUM(cont.amount) as recent_contributions,
    (COUNT(DISTINCT cont.contributor_pubkey) * 0.4 +
     SUM(cont.amount) / 1000000 * 0.6) as trending_score
FROM campaigns c
LEFT JOIN tasks t ON t.campaign_id = c.id
LEFT JOIN contributions cont ON cont.task_id = t.id
    AND cont.contributed_at > NOW() - INTERVAL '7 days'
WHERE c.state IN ('PUBLISHED', 'ACTIVE')
GROUP BY c.id
ORDER BY trending_score DESC;

CREATE INDEX idx_trending_score ON trending_campaigns(trending_score DESC);
```

### 2.2 Event Ingestion Pipeline (Week 7-8)

**Event Listener:**
```rust
// Pseudocode for event listener
pub struct EventListener {
    rpc_client: RpcClient,
    db: Database,
    last_processed_slot: u64,
}

impl EventListener {
    pub async fn start(&mut self) {
        loop {
            // Get latest slot from chain
            let latest_slot = self.rpc_client.get_slot().await?;

            // Process blocks from last_processed_slot to latest_slot
            for slot in self.last_processed_slot..latest_slot {
                let block = self.rpc_client.get_block(slot).await?;
                self.process_block(block).await?;
            }

            // Update checkpoint
            self.last_processed_slot = latest_slot;
            self.db.update_checkpoint(latest_slot).await?;

            // Sleep briefly before next iteration
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }

    async fn process_block(&self, block: Block) {
        for tx in block.transactions {
            if let Some(events) = self.parse_openbook_events(&tx) {
                for event in events {
                    self.process_event(event, &tx).await?;
                }
            }
        }
    }

    async fn process_event(&self, event: OpenbookEvent, tx: &Transaction) {
        // Idempotency check
        if self.db.event_exists(&tx.signature).await? {
            return Ok(());
        }

        // Store raw event
        self.db.insert_event_log(&event, &tx.signature, tx.slot).await?;

        // Process based on event type
        match event.event_name.as_str() {
            "CampaignCreated" => self.handle_campaign_created(event).await?,
            "TaskCreated" => self.handle_task_created(event).await?,
            "ContributionMade" => self.handle_contribution_made(event).await?,
            // ... other events
        }

        // Mark as processed
        self.db.mark_event_processed(&tx.signature).await?;
    }
}
```

**Idempotency Guarantees:**
- Use tx_signature as unique constraint
- Process events in order (by slot)
- Support full replay from genesis
- Checkpoint tracking for recovery

### 2.3 Derived Views & Analytics (Week 8-9)

**View Builders:**
1. Trending campaigns (weighted score based on recent activity)
2. Top campaigns (by total raised)
3. New campaigns (sorted by created_at)
4. Near goal tasks (funded percentage)
5. Campaign analytics (contribution over time, donor breakdown)

**Refresh Strategy:**
- Real-time: Update on each event
- Materialized views: Refresh every N minutes (based on load)
- Analytics queries: Pre-computed and cached

### 2.4 Search Integration (Week 9)

**Search Index:**
- If using Elasticsearch: Sync campaigns and tasks to ES index
- If using PostgreSQL: Use full-text search with tsvector
- Fields: title, description, creator

**Search Features:**
- Fuzzy matching
- Filters: state, funding range, category
- Sorting: relevance, date, funding amount

---

## Phase 3: API Service (Weeks 10-11)

### 3.1 API Architecture (Week 10)

**Technology Stack:**
- Framework: Express.js / Fastify / NestJS (based on questionnaire)
- Language: TypeScript
- Database: PostgreSQL (read from indexer DB)
- Cache: Redis (based on questionnaire)
- Validation: Zod or Joi

**File Structure:**
```
services/api/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── server.ts
│   ├── routes/
│   │   ├── campaigns.ts
│   │   ├── tasks.ts
│   │   ├── discovery.ts
│   │   ├── metrics.ts
│   │   └── search.ts
│   ├── controllers/
│   │   ├── campaign_controller.ts
│   │   ├── task_controller.ts
│   │   ├── discovery_controller.ts
│   │   └── search_controller.ts
│   ├── services/
│   │   ├── database.ts
│   │   ├── cache.ts
│   │   └── rpc.ts
│   ├── middleware/
│   │   ├── auth.ts (wallet signature verification)
│   │   ├── rate_limit.ts
│   │   ├── error_handler.ts
│   │   └── logger.ts
│   ├── types/
│   │   ├── campaign.ts
│   │   ├── task.ts
│   │   └── api_responses.ts
│   └── config.ts
```

### 3.2 Core Endpoints (Week 10)

**Campaigns:**
```typescript
GET    /v1/campaigns
       Query: ?state=PUBLISHED&category=tech&page=1&limit=20
       Response: { campaigns: [...], pagination: {...} }

GET    /v1/campaigns/:id
       Response: { campaign: {...}, tasks: [...] }

GET    /v1/campaigns/:id/tasks
       Response: { tasks: [...] }

GET    /v1/campaigns/:id/analytics
       Response: { total_raised, contributors_count, contribution_timeline, ... }
```

**Tasks:**
```typescript
GET    /v1/tasks/:id
       Response: { task: {...} }

GET    /v1/tasks/:id/ledger
       Response: { contributions: [...], payouts: [...], refunds: [...] }

GET    /v1/tasks/:id/votes
       Response: { votes: [...], finalized_budget, weighted_median }

GET    /v1/tasks/:id/proof
       Response: { proof: {...} }
```

**Discovery:**
```typescript
GET    /v1/discovery/trending
       Response: { campaigns: [...] }

GET    /v1/discovery/top
       Query: ?timeframe=week|month|all
       Response: { campaigns: [...] }

GET    /v1/discovery/new
       Response: { campaigns: [...] }

GET    /v1/discovery/near-goal
       Query: ?min_funded=80&max_funded=95
       Response: { tasks: [...] }
```

**Metrics:**
```typescript
GET    /v1/metrics/platform
       Response: { total_campaigns, total_raised, total_backers, ... }
```

**Search:**
```typescript
GET    /v1/search
       Query: ?q=climate&type=campaign&state=ACTIVE
       Response: { results: [...], facets: {...} }
```

### 3.3 Caching Strategy (Week 11)

**Cache Layers:**
```typescript
// L1: In-memory cache (Node.js)
const inMemoryCache = new Map();

// L2: Redis cache
const redisCache = new Redis(config.redis_url);

// Cache decorators
async function getCampaign(id: string) {
    // Check L1
    if (inMemoryCache.has(id)) return inMemoryCache.get(id);

    // Check L2
    const cached = await redisCache.get(`campaign:${id}`);
    if (cached) {
        inMemoryCache.set(id, cached);
        return JSON.parse(cached);
    }

    // Fetch from DB
    const campaign = await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);

    // Cache it
    await redisCache.setex(`campaign:${id}`, 300, JSON.stringify(campaign)); // 5 min TTL
    inMemoryCache.set(id, campaign);

    return campaign;
}
```

**Cache Invalidation:**
- Invalidate on write (if API has write endpoints, but v0 is read-only)
- Time-based expiration (TTL)
- Event-driven invalidation (listen to indexer updates)

### 3.4 Rate Limiting & Security (Week 11)

**Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // based on questionnaire
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/v1/', limiter);
```

**CORS:**
```typescript
app.use(cors({
    origin: config.allowed_origins,
    credentials: true,
}));
```

**Input Validation:**
```typescript
import { z } from 'zod';

const campaignQuerySchema = z.object({
    state: z.enum(['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED']).optional(),
    category: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

app.get('/v1/campaigns', async (req, res) => {
    const params = campaignQuerySchema.parse(req.query);
    // ... rest of handler
});
```

---

## Phase 4: KYC Service (Week 12)

### 4.1 KYC Provider Integration

**File Structure:**
```
services/kyc/
├── package.json
├── src/
│   ├── index.ts
│   ├── providers/
│   │   ├── civic.ts (or chosen provider)
│   │   ├── interface.ts
│   │   └── mock.ts (for testing)
│   ├── routes/
│   │   ├── verification.ts
│   │   └── attestation.ts
│   ├── controllers/
│   │   ├── kyc_controller.ts
│   │   └── attestation_controller.ts
│   ├── db/
│   │   ├── schema.sql
│   │   └── queries.ts
│   └── config.ts
```

**Database Schema:**
```sql
CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY,
    wallet_pubkey TEXT UNIQUE NOT NULL,
    provider TEXT NOT NULL,
    provider_verification_id TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, verified, rejected, expired
    verification_level TEXT, -- basic, enhanced
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    attestation_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_wallet ON kyc_verifications(wallet_pubkey);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);
```

**Endpoints:**
```typescript
POST   /v1/kyc/initiate
       Body: { wallet_pubkey, verification_level }
       Response: { verification_id, redirect_url }

GET    /v1/kyc/status/:wallet_pubkey
       Response: { status, verified_at, expires_at }

POST   /v1/kyc/webhook
       Body: { verification_id, status, ... } (from provider)
       Response: { success: true }

GET    /v1/kyc/attestation/:wallet_pubkey
       Response: { attestation_hash, signature, expires_at }
```

**Attestation Generation:**
```typescript
async function generateAttestation(wallet: string, verification: Verification) {
    const attestation = {
        wallet_pubkey: wallet,
        verified: true,
        verification_level: verification.level,
        verified_at: verification.verified_at,
        expires_at: verification.expires_at,
    };

    // Sign attestation (server keypair)
    const message = JSON.stringify(attestation);
    const hash = sha256(message);
    const signature = sign(hash, config.kyc_private_key);

    return {
        attestation_hash: hash,
        signature,
        expires_at: verification.expires_at,
    };
}
```

**On-chain Verification:**
```rust
// In payout instruction
pub fn execute_payout(ctx: Context<ExecutePayout>, attestation_hash: [u8; 32], signature: [u8; 64]) -> Result<()> {
    // Verify attestation signature
    let kyc_pubkey = /* KYC service public key */;
    require!(verify_signature(kyc_pubkey, attestation_hash, signature), ErrorCode::InvalidKYCAttestation);

    // Check expiration (if stored on-chain)
    // ...

    // Execute payout
    // ...
}
```

---

## Phase 5: Web Frontend (Weeks 13-17)

### 5.1 Frontend Architecture (Week 13)

**Technology Stack:**
- Framework: Next.js 14 (App Router) or based on questionnaire
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui (or based on questionnaire)
- State: React Context + Zustand/Jotai
- Wallet: @solana/wallet-adapter-react

**File Structure:**
```
web/
├── package.json
├── next.config.js
├── tailwind.config.js
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (home/discovery)
│   │   ├── campaigns/
│   │   │   ├── page.tsx (list)
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx (detail)
│   │   │   │   └── edit/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── tasks/
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx (detail)
│   │   │   │   ├── contribute/page.tsx
│   │   │   │   └── submit-proof/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx (user dashboard)
│   │   │   ├── contributions/page.tsx
│   │   │   └── campaigns/page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   └── api/ (Next.js API routes if needed)
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── WalletButton.tsx
│   │   ├── campaign/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignDetail.tsx
│   │   │   ├── CampaignForm.tsx
│   │   │   └── TaskList.tsx
│   │   ├── task/
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── ContributeForm.tsx
│   │   │   ├── BudgetVoteForm.tsx
│   │   │   ├── ProofSubmitForm.tsx
│   │   │   └── TaskLedger.tsx
│   │   ├── discovery/
│   │   │   ├── TrendingList.tsx
│   │   │   ├── TopList.tsx
│   │   │   └── FilterBar.tsx
│   │   └── common/
│   │       ├── ConnectWallet.tsx
│   │       ├── TransactionStatus.tsx
│   │       └── LoadingSpinner.tsx
│   ├── lib/
│   │   ├── solana/
│   │   │   ├── connection.ts
│   │   │   ├── programs.ts (generated from IDL)
│   │   │   └── transactions.ts
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   ├── campaigns.ts
│   │   │   ├── tasks.ts
│   │   │   └── discovery.ts
│   │   ├── hooks/
│   │   │   ├── useCampaign.ts
│   │   │   ├── useTask.ts
│   │   │   ├── useContribute.ts
│   │   │   ├── useWallet.ts
│   │   │   └── useProgram.ts
│   │   └── utils/
│   │       ├── format.ts
│   │       ├── validation.ts
│   │       └── constants.ts
│   ├── contexts/
│   │   ├── WalletContext.tsx
│   │   └── ProgramContext.tsx
│   ├── stores/
│   │   ├── campaignStore.ts
│   │   └── userStore.ts
│   └── types/
│       ├── campaign.ts
│       ├── task.ts
│       └── api.ts
```

### 5.2 Wallet Integration (Week 13)

**Setup:**
```typescript
// src/app/layout.tsx
import { WalletProvider } from '@/contexts/WalletContext';
import '@solana/wallet-adapter-react-ui/styles.css';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

// src/contexts/WalletContext.tsx
'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

export function WalletProvider({ children }) {
  const network = WalletAdapterNetwork.Devnet; // or Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### 5.3 Core Pages (Weeks 14-16)

**5.3.1 Discovery/Home Page (Week 14)**
```typescript
// src/app/page.tsx
export default function HomePage() {
  return (
    <>
      <Hero />
      <DiscoveryTabs>
        <TrendingList />
        <TopList />
        <NewList />
        <NearGoalList />
      </DiscoveryTabs>
      <SearchBar />
    </>
  );
}

// src/components/discovery/TrendingList.tsx
export function TrendingList() {
  const { data: campaigns, isLoading } = useTrending();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {campaigns.map(campaign => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
```

**5.3.2 Campaign Creation (Week 14)**
```typescript
// src/app/campaigns/new/page.tsx
export default function NewCampaignPage() {
  const { publicKey } = useWallet();
  const { createCampaign } = useProgram();

  const handleSubmit = async (data: CampaignFormData) => {
    if (!publicKey) {
      toast.error('Please connect wallet');
      return;
    }

    // Upload media to IPFS/Arweave
    const metadataUri = await uploadMetadata(data);

    // Call on-chain program
    const signature = await createCampaign({
      title: data.title,
      description: data.description,
      metadataUri,
    });

    toast.success('Campaign created!');
    router.push(`/campaigns/${signature}`);
  };

  return <CampaignForm onSubmit={handleSubmit} />;
}
```

**5.3.3 Campaign Detail (Week 14)**
```typescript
// src/app/campaigns/[id]/page.tsx
export default function CampaignDetailPage({ params }) {
  const { data: campaign } = useCampaign(params.id);
  const { data: tasks } = useCampaignTasks(params.id);

  return (
    <>
      <CampaignHeader campaign={campaign} />
      <CampaignStats campaign={campaign} />
      <TaskList tasks={tasks} />
      <CampaignUpdates campaign={campaign} />
    </>
  );
}
```

**5.3.4 Task Detail & Contribution (Week 15)**
```typescript
// src/app/tasks/[id]/page.tsx
export default function TaskDetailPage({ params }) {
  const { data: task } = useTask(params.id);
  const { publicKey } = useWallet();

  return (
    <>
      <TaskHeader task={task} />
      <TaskStats task={task} />

      {task.state === 'VOTING_BUDGET' && (
        <BudgetVoteForm taskId={task.id} />
      )}

      {task.state === 'FUNDING_OPEN' && (
        <ContributeForm taskId={task.id} />
      )}

      {task.state === 'SUBMITTED_FOR_REVIEW' && publicKey && (
        <ApprovalInterface task={task} userPublicKey={publicKey} />
      )}

      <TaskLedger taskId={task.id} />
    </>
  );
}

// src/components/task/ContributeForm.tsx
export function ContributeForm({ taskId }) {
  const { publicKey } = useWallet();
  const { contribute } = useProgram();
  const [amount, setAmount] = useState('');

  const handleContribute = async () => {
    const signature = await contribute(taskId, parseFloat(amount) * 1_000_000); // USDC has 6 decimals
    toast.success('Contribution successful!');
  };

  return (
    <form>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in USDC"
      />
      <button onClick={handleContribute}>Contribute</button>
    </form>
  );
}
```

**5.3.5 Proof Submission (Week 15)**
```typescript
// src/app/tasks/[id]/submit-proof/page.tsx
export default function SubmitProofPage({ params }) {
  const { publicKey } = useWallet();
  const { submitProof } = useProgram();
  const [proofUri, setProofUri] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async () => {
    // Upload proof document
    const uri = await uploadToIPFS(file);
    const hash = sha256(file);

    // Submit to on-chain program
    const signature = await submitProof(params.id, hash, uri);
    toast.success('Proof submitted!');
    router.push(`/tasks/${params.id}`);
  };

  return <ProofSubmitForm onSubmit={handleSubmit} />;
}
```

**5.3.6 User Dashboard (Week 16)**
```typescript
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  const { publicKey } = useWallet();
  const { data: myContributions } = useMyContributions(publicKey);
  const { data: myCampaigns } = useMyCampaigns(publicKey);
  const { data: myTasks } = useMyTasks(publicKey);

  return (
    <>
      <DashboardStats user={publicKey} />
      <Tabs>
        <TabPanel label="My Contributions">
          <ContributionsList contributions={myContributions} />
        </TabPanel>
        <TabPanel label="My Campaigns">
          <CampaignsList campaigns={myCampaigns} />
        </TabPanel>
        <TabPanel label="My Tasks">
          <TasksList tasks={myTasks} />
        </TabPanel>
      </Tabs>
    </>
  );
}
```

**5.3.7 Search Page (Week 16)**
```typescript
// src/app/search/page.tsx
export default function SearchPage({ searchParams }) {
  const { data: results } = useSearch(searchParams.q);

  return (
    <>
      <SearchBar defaultValue={searchParams.q} />
      <FilterBar />
      <SearchResults results={results} />
    </>
  );
}
```

### 5.4 Transaction Handling (Week 17)

**Transaction Builder:**
```typescript
// src/lib/solana/transactions.ts
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';

export function useProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const provider = new AnchorProvider(connection, wallet, {});
  const campaignProgram = new Program(CampaignRegistryIDL, provider);
  const taskProgram = new Program(TaskManagerIDL, provider);
  const escrowProgram = new Program(TaskEscrowIDL, provider);

  const createCampaign = async (data: CampaignData) => {
    const [campaignPda] = await findCampaignAddress(wallet.publicKey, data.id);

    const tx = await campaignProgram.methods
      .createCampaign(data.title, data.description, data.metadataUri)
      .accounts({
        campaign: campaignPda,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  };

  const contribute = async (taskId: string, amount: number) => {
    const [taskPda] = await findTaskAddress(taskId);
    const [escrowPda] = await findEscrowAddress(taskPda);
    const [contributionPda] = await findContributionAddress(taskPda, wallet.publicKey);

    const tx = await escrowProgram.methods
      .contribute(new BN(amount))
      .accounts({
        task: taskPda,
        escrow: escrowPda,
        contribution: contributionPda,
        contributor: wallet.publicKey,
        contributorTokenAccount: await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey),
        escrowTokenAccount: await getAssociatedTokenAddress(USDC_MINT, escrowPda, true),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  };

  return {
    createCampaign,
    createTask,
    contribute,
    submitBudgetVote,
    submitProof,
    approveTask,
    // ... other methods
  };
}
```

**Transaction Status UI:**
```typescript
// src/components/common/TransactionStatus.tsx
export function TransactionStatus({ signature }: { signature: string }) {
  const { connection } = useConnection();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'finalized'>('pending');

  useEffect(() => {
    const checkStatus = async () => {
      const result = await connection.getSignatureStatus(signature);
      if (result.value?.confirmationStatus === 'finalized') {
        setStatus('finalized');
      } else if (result.value?.confirmationStatus === 'confirmed') {
        setStatus('confirmed');
      }
    };

    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [signature]);

  return (
    <div>
      Transaction: {signature}
      Status: {status}
    </div>
  );
}
```

---

## Phase 6: Infrastructure & DevOps (Weeks 18-19)

### 6.1 Local Development Setup

**Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: openbook
      POSTGRES_USER: openbook
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  indexer:
    build: ./services/indexer
    environment:
      DATABASE_URL: postgres://openbook:dev_password@postgres:5432/openbook
      REDIS_URL: redis://redis:6379
      SOLANA_RPC_URL: https://api.devnet.solana.com
    depends_on:
      - postgres
      - redis

  api:
    build: ./services/api
    environment:
      DATABASE_URL: postgres://openbook:dev_password@postgres:5432/openbook
      REDIS_URL: redis://redis:6379
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  web:
    build: ./web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_SOLANA_RPC_URL: https://api.devnet.solana.com
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

**Makefile:**
```makefile
.PHONY: dev build test deploy-devnet deploy-mainnet

dev:
	docker-compose up

build-programs:
	cd programs && anchor build

test-programs:
	cd programs && anchor test

deploy-devnet:
	cd programs && anchor deploy --provider.cluster devnet

deploy-mainnet:
	cd programs && anchor deploy --provider.cluster mainnet

migrate-db:
	cd services/indexer && npm run migrate

seed-db:
	cd services/indexer && npm run seed
```

### 6.2 CI/CD Pipeline

**GitHub Actions:**
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-programs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Rust
        uses: actions-rs/toolchain@v1
      - name: Install Anchor
        run: cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
      - name: Build programs
        run: cd programs && anchor build
      - name: Run tests
        run: cd programs && anchor test

  test-services:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: |
          cd services/indexer && npm install
          cd ../api && npm install
      - name: Run tests
        run: |
          cd services/indexer && npm test
          cd ../api && npm test

  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install and test
        run: cd web && npm install && npm test
```

### 6.3 Monitoring Setup

**Prometheus + Grafana:**
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3002:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards
```

**Metrics to Track:**
- Indexer sync lag (current_slot vs chain_slot)
- RPC request latency and error rate
- API request latency (p50, p95, p99)
- Database query performance
- Transaction confirmation rate
- Active campaigns/tasks count
- Total value locked (TVL)

---

## Phase 7: Testing & Security (Weeks 20-22)

### 7.1 Program Testing

**Test Coverage:**
- Unit tests: 100% coverage
- Integration tests: All user flows
- Invariant tests: Critical properties
- Fuzzing: Random inputs

**Security Checklist:**
- [ ] No integer overflow/underflow
- [ ] No reentrancy vulnerabilities
- [ ] Proper account validation
- [ ] Signer checks on all critical operations
- [ ] PDA derivation correctness
- [ ] No fund extraction exploits
- [ ] Upgrade authority properly set
- [ ] No privilege escalation paths

### 7.2 Professional Audit

**Pre-audit Preparation:**
- Freeze code
- Document all assumptions
- Prepare test suite
- Write formal specifications

**Audit Deliverables:**
- Security report
- Recommended fixes
- Re-audit after fixes

### 7.3 Bug Bounty

**Program Setup:**
- Launch on Immunefi or similar platform
- Define scope: smart contracts, critical services
- Severity levels: Critical, High, Medium, Low
- Payout structure based on questionnaire

---

## Phase 8: Deployment & Launch (Weeks 23-24)

### 8.1 Devnet Deployment

1. Deploy programs to devnet
2. Deploy indexer, API, KYC services
3. Deploy web frontend (staging.openbook.xyz)
4. Conduct internal testing
5. Invite beta testers
6. Gather feedback and iterate

### 8.2 Mainnet Deployment

**Pre-launch Checklist:**
- [ ] Audit completed and fixes implemented
- [ ] All tests passing
- [ ] Monitoring and alerts configured
- [ ] Multisig setup for program upgrades
- [ ] KYC provider integration tested
- [ ] Documentation complete
- [ ] Legal review (if applicable)
- [ ] Community communication plan

**Deployment Steps:**
1. Deploy programs to mainnet (via multisig)
2. Deploy and configure all services
3. Deploy web frontend
4. Verify all integrations
5. Soft launch with caps (based on questionnaire)
6. Monitor closely for first 48 hours
7. Gradually increase caps
8. Public announcement

### 8.3 Post-Launch

- Monitor metrics and alerts
- Respond to community feedback
- Plan v1 features (delegation, reputation, etc.)
- Regular security reviews
- Community governance setup

---

## Development Guidelines

### Code Quality Standards
- TypeScript strict mode enabled
- Rust clippy with no warnings
- Comprehensive error handling
- Logging at appropriate levels
- Code review required for all PRs
- Automated testing in CI/CD

### Documentation Requirements
- Inline code comments for complex logic
- README for each service
- API documentation (OpenAPI/Swagger)
- Architecture decision records (ADRs)
- Deployment runbooks
- User guides and tutorials

### Git Workflow
- Feature branches from main
- PR reviews required
- Squash and merge
- Semantic versioning
- Changelog maintenance

---

## Risk Mitigation

### Technical Risks
- **Smart contract bugs:** Comprehensive testing + audit
- **RPC reliability:** Multiple providers with fallback
- **Database failure:** Regular backups + replica
- **Indexer lag:** Monitoring + auto-scaling

### Business Risks
- **Low adoption:** Focus on UX, marketing, community
- **Regulatory issues:** KYC integration, legal review
- **Competition:** Differentiate on transparency and neutrality

### Security Risks
- **Exploit:** Bug bounty, audit, monitoring
- **Fraud:** Content moderation, stake requirements
- **Sybil attacks:** Contribution minimums, pattern detection

---

## Success Metrics (V0)

**Technical Metrics:**
- 99.9% uptime
- < 5 second indexer lag
- < 100ms API p95 latency
- Zero critical security incidents

**Product Metrics:**
- Number of campaigns created
- Total value locked (TVL)
- Number of unique contributors
- Task completion rate
- User retention (return contributors)

**Community Metrics:**
- Discord/community size
- Developer integrations
- Media mentions
- User satisfaction (NPS)

---

This plan will be executed once the questionnaire is completed and decisions are locked.
