# OpenBook Indexer

Event ingestion service for OpenBook Protocol. Listens to on-chain events from all 7 Solana programs and builds derived views in PostgreSQL.

**Author:** Yetse
**License:** MIT

## Architecture

```
Solana RPC ’ Event Listener ’ Event Parser ’ Event Processor ’ PostgreSQL
                                                               “
                                                          Derived Views
                                                          (campaigns, tasks,
                                                           contributions, etc.)
```

## Guarantees

- **Idempotent ingestion**: Events are processed exactly once (de-duplicated by transaction signature)
- **No mutation of source truth**: Only reads from blockchain, writes to local database
- **Fully reconstructable**: Can replay from any slot to rebuild entire database
- **Crash-resistant**: Tracks last processed slot, resumes on restart

## Features

### Anti-Sybil Metrics

The indexer calculates wallet age weighting for discovery/ranking:

```sql
wallet_age_weight = CASE
    WHEN wallet_age < 7 days THEN 0.1
    WHEN wallet_age < 30 days THEN 0.5
    WHEN wallet_age < 180 days THEN 0.8
    ELSE 1.0
END
```

### Trending Scores

**Campaign Trending:**
```
trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)
```

**Task Trending:**
```
trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)
```

This prevents Sybil attacks by weighting USDC contribution amount higher than wallet count.

## Database Schema

See `src/migrations/001_initial_schema.sql` for complete schema.

### Core Tables

- `events`: Raw event log (for idempotency and replay)
- `campaigns`: Campaign derived view
- `tasks`: Task derived view
- `contributions`: Contribution records
- `budget_votes`: Budget vote records
- `approval_votes`: Approval vote records
- `proofs`: Proof submissions
- `disputes`: Dispute records
- `governance_distributions`: Token distribution records

### Metrics Tables

- `campaign_metrics`: Aggregated campaign statistics
- `task_metrics`: Aggregated task statistics
- `wallet_metadata`: Wallet age and contribution history

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional, for future caching)
- Access to Solana RPC (devnet or mainnet)

### Installation

```bash
cd services/indexer
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Update with your values:
- `SOLANA_RPC_URL`: Your RPC endpoint (Helius, QuickNode, or public)
- `DATABASE_URL`: PostgreSQL connection string
- `PROGRAM_ID_*`: Update after deploying programs to devnet

### Run Migrations

```bash
npm run migrate
```

Or in development:
```bash
npm run migrate:dev
```

### Start Indexer

Production:
```bash
npm run build
npm start
```

Development (with auto-reload):
```bash
npm run dev
```

## Monitoring

The indexer logs key metrics:

- Events processed per second
- Last processed slot
- Database query performance
- RPC connection status

**Log Levels:**
- `debug`: All events and queries
- `info`: Event processing summary
- `warn`: Failed RPC calls (with fallback)
- `error`: Failed event processing (with retry)

## IDL Loading

**IMPORTANT**: Before running the indexer, you must build the Solana programs to generate IDL files:

```bash
# From repository root
cd programs
anchor build

# IDLs will be generated at:
# ../../target/idl/campaign_registry.json
# ../../target/idl/task_manager.json
# ... etc
```

Then update `src/index.ts` to load the IDL files:

```typescript
import IDL_CAMPAIGN from '../../../target/idl/campaign_registry.json';
import IDL_TASK from '../../../target/idl/task_manager.json';
// ... etc
```

## Replay from Slot

To rebuild the database from a specific slot:

1. Truncate all derived tables (keeps schema)
2. Set `START_SLOT` in `.env`
3. Restart indexer

```bash
# Example: Replay from slot 100000
echo "START_SLOT=100000" >> .env
npm start
```

## Performance

**Expected throughput:**
- ~100 events/second on standard hardware
- ~1000 events/second with optimized RPC and database

**Bottlenecks:**
- RPC rate limits (use paid provider for production)
- Database write speed (use connection pooling)
- Network latency (run indexer near RPC endpoint)

## Troubleshooting

### Indexer falls behind

**Symptoms:** `last_processed_slot` lags far behind current slot

**Solutions:**
1. Increase `BATCH_SIZE` in `.env` (default: 100)
2. Decrease `POLL_INTERVAL_MS` (default: 1000ms)
3. Use faster RPC provider
4. Scale database (connection pool, SSD storage)

### RPC rate limiting

**Symptoms:** Errors like "429 Too Many Requests"

**Solutions:**
1. Use paid RPC provider (Helius, QuickNode)
2. Set `SOLANA_RPC_FALLBACK_URL` for redundancy
3. Increase `POLL_INTERVAL_MS` to reduce request rate

### Database connection errors

**Symptoms:** "Too many connections" or connection timeouts

**Solutions:**
1. Check PostgreSQL `max_connections` setting
2. Reduce connection pool size in `src/db/client.ts`
3. Ensure database has enough resources

## Anti-Sybil Implementation

The indexer implements several anti-Sybil measures:

### 1. Wallet Age Tracking

Every wallet's first contribution timestamp is recorded in `wallet_metadata.first_seen_at`. Age is calculated automatically:

```sql
age_days = EXTRACT(DAY FROM (NOW() - first_seen_at))
```

### 2. Weighted Contributor Counts

New wallets contribute less to trending scores:
- < 7 days old: 10% weight
- < 30 days old: 50% weight
- < 180 days old: 80% weight
- 180+ days old: 100% weight

### 3. USDC-Weighted Metrics

All trending/discovery algorithms weight by **contribution amount**, not wallet count:

```sql
-- BAD (Sybil vulnerable)
SELECT campaign_id, COUNT(DISTINCT contributor) as score
FROM contributions
GROUP BY campaign_id
ORDER BY score DESC;

-- GOOD (Sybil resistant)
SELECT campaign_id, SUM(amount) as score
FROM contributions
GROUP BY campaign_id
ORDER BY score DESC;
```

## Integration with API

The API service (in `../api/`) reads from these derived views:

- Discovery page: Queries `campaign_metrics` (trending_score)
- Task details: Queries `tasks` and `contributions`
- Wallet dashboard: Queries `contributions` filtered by wallet

See `../api/README.md` for API implementation.

---

**Built by Yetse**
**For the Community**
**Judge me by my code** =€
