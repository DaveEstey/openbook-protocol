-- Performance Indexes for OpenBook Protocol
-- Author: Yetse
-- Purpose: Optimize common query patterns

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Discovery queries: filter by state + sort by metrics
CREATE INDEX IF NOT EXISTS idx_campaigns_state_trending
ON campaigns(state, created_at DESC)
WHERE state IN ('Published', 'Active');

CREATE INDEX IF NOT EXISTS idx_tasks_state_created
ON tasks(state, created_at DESC)
WHERE state IN ('FundingOpen', 'Funded', 'InProgress');

-- Campaign tasks lookup (very common)
CREATE INDEX IF NOT EXISTS idx_tasks_campaign_created
ON tasks(campaign_pubkey, created_at DESC);

-- Contribution lookups by contributor
CREATE INDEX IF NOT EXISTS idx_contributions_contributor_task
ON contributions(contributor, task_pubkey);

-- Contribution aggregations by task
CREATE INDEX IF NOT EXISTS idx_contributions_task_amount
ON contributions(task_pubkey, amount DESC);

-- Vote lookups
CREATE INDEX IF NOT EXISTS idx_budget_votes_task_voted
ON budget_votes(task_pubkey, voted_at DESC);

CREATE INDEX IF NOT EXISTS idx_approval_votes_task_voted
ON approval_votes(task_pubkey, voted_at DESC);

-- ============================================================================
-- PARTIAL INDEXES (for specific states)
-- ============================================================================

-- Only active/published campaigns need trending scores
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_trending_active
ON campaign_metrics(trending_score DESC)
WHERE trending_score > 0;

-- Only open tasks need percent_funded lookups
CREATE INDEX IF NOT EXISTS idx_task_metrics_percent_funded
ON task_metrics(percent_funded DESC)
WHERE percent_funded >= 70 AND percent_funded < 100;

-- ============================================================================
-- COVERING INDEXES (avoid table lookups)
-- ============================================================================

-- Discovery trending query - include all displayed fields
CREATE INDEX IF NOT EXISTS idx_campaigns_discovery_trending
ON campaigns(state, created_at DESC)
INCLUDE (pubkey, campaign_id, title, category)
WHERE state IN ('Published', 'Active');

-- Task discovery - include key fields
CREATE INDEX IF NOT EXISTS idx_tasks_discovery_funding
ON tasks(state, created_at DESC)
INCLUDE (pubkey, task_id, title, finalized_budget, total_contributed)
WHERE state = 'FundingOpen';

-- ============================================================================
-- SEARCH PERFORMANCE
-- ============================================================================

-- GIN indexes for full-text search are already created in 001_initial_schema.sql
-- Adding composite for category + search
CREATE INDEX IF NOT EXISTS idx_campaigns_category_search
ON campaigns USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')))
WHERE category IS NOT NULL;

-- ============================================================================
-- WALLET QUERIES
-- ============================================================================

-- Wallet dashboard - contributions with task details
CREATE INDEX IF NOT EXISTS idx_contributions_contributor_time
ON contributions(contributor, contributed_at DESC);

-- Wallet creation history
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_time
ON campaigns(creator, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_time
ON tasks(creator, created_at DESC);

-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- Category statistics
CREATE INDEX IF NOT EXISTS idx_campaigns_category_state
ON campaigns(category, state);

-- Time-series analysis
CREATE INDEX IF NOT EXISTS idx_contributions_time
ON contributions(contributed_at DESC);

-- ============================================================================
-- GOVERNANCE TOKEN TRACKING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_governance_recipient_type
ON governance_distributions(recipient, recipient_type);

CREATE INDEX IF NOT EXISTS idx_governance_type_distributed
ON governance_distributions(recipient_type, distributed_at DESC);

-- ============================================================================
-- STATISTICS
-- ============================================================================

-- Update statistics to help query planner
ANALYZE campaigns;
ANALYZE tasks;
ANALYZE contributions;
ANALYZE campaign_metrics;
ANALYZE task_metrics;
ANALYZE budget_votes;
ANALYZE approval_votes;
