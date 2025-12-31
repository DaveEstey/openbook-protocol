-- OpenBook Protocol Database Schema
-- Author: Yetse
-- Description: Derived views from on-chain events

-- ============================================================================
-- RAW EVENTS TABLE (for idempotency and replay)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    signature TEXT NOT NULL UNIQUE,
    slot BIGINT NOT NULL,
    block_time BIGINT NOT NULL,
    program_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_slot ON events(slot);
CREATE INDEX idx_events_program_id ON events(program_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_signature ON events(signature);

-- ============================================================================
-- CAMPAIGNS (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id BIGSERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL UNIQUE,
    campaign_id TEXT NOT NULL UNIQUE,
    creator TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    metadata_uri TEXT,
    category TEXT NOT NULL,
    state TEXT NOT NULL, -- Draft, Published, Active, Completed, Archived
    tasks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_creator ON campaigns(creator);
CREATE INDEX idx_campaigns_state ON campaigns(state);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Full-text search on title and description
CREATE INDEX idx_campaigns_search ON campaigns USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- TASKS (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL UNIQUE,
    task_id TEXT NOT NULL UNIQUE,
    campaign_pubkey TEXT NOT NULL REFERENCES campaigns(pubkey),
    creator TEXT NOT NULL,
    recipient TEXT,
    title TEXT NOT NULL,
    description TEXT,
    metadata_uri TEXT,
    state TEXT NOT NULL, -- Draft, VotingBudget, BudgetFinalized, etc (12 states)
    finalized_budget BIGINT, -- in USDC (6 decimals)
    total_contributed BIGINT DEFAULT 0,
    total_refunded BIGINT DEFAULT 0,
    total_paid_out BIGINT DEFAULT 0,
    deadline BIGINT,
    created_at TIMESTAMPTZ NOT NULL,
    budget_finalized_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_campaign ON tasks(campaign_pubkey);
CREATE INDEX idx_tasks_creator ON tasks(creator);
CREATE INDEX idx_tasks_recipient ON tasks(recipient);
CREATE INDEX idx_tasks_state ON tasks(state);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

-- Full-text search
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- CONTRIBUTIONS (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contributions (
    id BIGSERIAL PRIMARY KEY,
    task_pubkey TEXT NOT NULL REFERENCES tasks(pubkey),
    contributor TEXT NOT NULL,
    amount BIGINT NOT NULL, -- USDC amount (6 decimals)
    wallet_age_days INTEGER, -- calculated at contribution time
    contributed_at TIMESTAMPTZ NOT NULL,

    UNIQUE(task_pubkey, contributor)
);

CREATE INDEX idx_contributions_task ON contributions(task_pubkey);
CREATE INDEX idx_contributions_contributor ON contributions(contributor);
CREATE INDEX idx_contributions_amount ON contributions(amount DESC);
CREATE INDEX idx_contributions_contributed_at ON contributions(contributed_at DESC);

-- ============================================================================
-- BUDGET VOTES (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_votes (
    id BIGSERIAL PRIMARY KEY,
    task_pubkey TEXT NOT NULL REFERENCES tasks(pubkey),
    voter TEXT NOT NULL,
    proposed_budget BIGINT NOT NULL, -- USDC (6 decimals)
    vote_weight BIGINT NOT NULL, -- voter's contribution amount
    voted_at TIMESTAMPTZ NOT NULL,

    UNIQUE(task_pubkey, voter)
);

CREATE INDEX idx_budget_votes_task ON budget_votes(task_pubkey);
CREATE INDEX idx_budget_votes_voter ON budget_votes(voter);

-- ============================================================================
-- APPROVAL VOTES (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_votes (
    id BIGSERIAL PRIMARY KEY,
    task_pubkey TEXT NOT NULL REFERENCES tasks(pubkey),
    voter TEXT NOT NULL,
    approved BOOLEAN NOT NULL,
    vote_weight BIGINT NOT NULL, -- voter's contribution amount
    voted_at TIMESTAMPTZ NOT NULL,

    UNIQUE(task_pubkey, voter)
);

CREATE INDEX idx_approval_votes_task ON approval_votes(task_pubkey);
CREATE INDEX idx_approval_votes_voter ON approval_votes(voter);

-- ============================================================================
-- PROOFS (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS proofs (
    id BIGSERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL UNIQUE,
    task_pubkey TEXT NOT NULL REFERENCES tasks(pubkey),
    recipient TEXT NOT NULL,
    proof_hash TEXT NOT NULL,
    proof_uri TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_proofs_task ON proofs(task_pubkey);
CREATE INDEX idx_proofs_recipient ON proofs(recipient);

-- ============================================================================
-- DISPUTES (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS disputes (
    id BIGSERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL UNIQUE,
    task_pubkey TEXT NOT NULL REFERENCES tasks(pubkey),
    initiator TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence_uri TEXT,
    status TEXT NOT NULL, -- Pending, Resolved
    resolution TEXT, -- PayoutToRecipient, RefundToDonors, PartialPayoutPartialRefund
    payout_percent INTEGER, -- 0-100 (for partial resolution)
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_disputes_task ON disputes(task_pubkey);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================================
-- GOVERNANCE TOKEN DISTRIBUTIONS (derived view)
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_distributions (
    id BIGSERIAL PRIMARY KEY,
    pubkey TEXT NOT NULL UNIQUE,
    recipient TEXT NOT NULL,
    amount BIGINT NOT NULL, -- OBOOK tokens (6 decimals)
    recipient_type TEXT NOT NULL, -- EarlyContributor, CommunityAirdrop, etc
    distributed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_governance_distributions_recipient ON governance_distributions(recipient);
CREATE INDEX idx_governance_distributions_type ON governance_distributions(recipient_type);

-- ============================================================================
-- WALLET METADATA (for anti-Sybil)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_metadata (
    wallet_address TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL,
    age_days INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (NOW() - first_seen_at))::INTEGER
    ) STORED,
    total_contributed BIGINT DEFAULT 0,
    total_campaigns_created INTEGER DEFAULT 0,
    total_tasks_created INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DERIVED METRICS (for discovery/ranking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_metrics (
    campaign_pubkey TEXT PRIMARY KEY REFERENCES campaigns(pubkey),
    total_tasks INTEGER DEFAULT 0,
    total_contributions_usd BIGINT DEFAULT 0, -- sum of all task contributions
    unique_contributors INTEGER DEFAULT 0,
    weighted_contributor_count NUMERIC DEFAULT 0, -- wallet_age_weight applied
    trending_score NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaign_metrics_trending ON campaign_metrics(trending_score DESC);
CREATE INDEX idx_campaign_metrics_contributions ON campaign_metrics(total_contributions_usd DESC);

CREATE TABLE IF NOT EXISTS task_metrics (
    task_pubkey TEXT PRIMARY KEY REFERENCES tasks(pubkey),
    unique_contributors INTEGER DEFAULT 0,
    weighted_contributor_count NUMERIC DEFAULT 0,
    percent_funded NUMERIC DEFAULT 0, -- (total_contributed / finalized_budget) * 100
    trending_score NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_metrics_trending ON task_metrics(trending_score DESC);
CREATE INDEX idx_task_metrics_percent_funded ON task_metrics(percent_funded DESC);

-- ============================================================================
-- INDEXER STATE (for tracking progress)
-- ============================================================================

CREATE TABLE IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_processed_slot BIGINT NOT NULL DEFAULT 0,
    last_processed_signature TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial state
INSERT INTO indexer_state (id, last_processed_slot) VALUES (1, 0) ON CONFLICT DO NOTHING;
