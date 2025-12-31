# OpenBook API

REST API for OpenBook Protocol. Provides read-only access to indexed blockchain data.

**Author:** Yetse
**License:** MIT

## Philosophy

**Read-First Architecture:**
- API provides read access to derived views only
- All write operations (contributions, votes, task creation) happen directly on-chain via Solana programs
- API never touches money or modifies blockchain state

## Architecture

```
Client ’ API Server ’ PostgreSQL (derived views from indexer)
                    “
                  Redis (caching)
```

## Features

### Anti-Sybil Discovery

All discovery endpoints use anti-Sybil algorithms:

**Trending Score:**
```
trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)
```

**Wallet Age Weighting:**
- < 7 days old: 10% weight
- < 30 days old: 50% weight
- < 180 days old: 80% weight
- 180+ days old: 100% weight

This prevents fake wallets from gaming trending/discovery.

### Transparent Ledgers

Every task has a public ledger showing:
- All contributions (wallet + amount + timestamp)
- Wallet age at contribution time
- Total contributions vs finalized budget
- Payout/refund history

## Endpoints

### Campaigns

**GET /campaigns**
```
Query params:
  - category: Filter by category
  - state: Filter by state (Draft, Published, Active, etc.)
  - sort: Sort by (created_at, trending_score, total_contributions_usd)
  - order: asc or desc
  - limit: Results per page (default: 20)
  - offset: Pagination offset

Response:
{
  "campaigns": [...],
  "pagination": { "limit": 20, "offset": 0, "total": 45 }
}
```

**GET /campaigns/:id**
```
Get campaign by campaign_id or pubkey
Includes all tasks in the campaign

Response:
{
  "campaign": { ... },
  "tasks": [ ... ]
}
```

**GET /campaigns/:id/tasks**
```
Get all tasks for a campaign

Response:
{
  "tasks": [ ... ]
}
```

### Tasks

**GET /tasks/:id**
```
Get task by task_id or pubkey

Response:
{
  "task": {
    "pubkey": "...",
    "task_id": "...",
    "state": "FundingOpen",
    "finalized_budget": "50000000",
    "total_contributed": "35000000",
    "percent_funded": 70,
    ...
  }
}
```

**GET /tasks/:id/ledger**
```
Get transparent ledger for task

Response:
{
  "task_id": "...",
  "finalized_budget": "50000000",
  "total_contributed": "35000000",
  "unique_contributors": 12,
  "ledger": {
    "contributions": [
      {
        "contributor": "wallet_address",
        "amount": "10000000",
        "wallet_age_days": 45,
        "timestamp": "2025-01-15T12:00:00Z"
      },
      ...
    ]
  }
}
```

**GET /tasks/:id/votes**
```
Get budget and approval votes for a task

Response:
{
  "task_id": "...",
  "state": "BudgetFinalized",
  "budget_votes": [ ... ],
  "approval_votes": [ ... ]
}
```

**GET /tasks/:id/proof**
```
Get proof submission for a task

Response:
{
  "proof": {
    "pubkey": "...",
    "recipient": "...",
    "proof_hash": "sha256:...",
    "proof_uri": "ipfs://...",
    "submitted_at": "..."
  }
}
```

**GET /tasks/:id/dispute**
```
Get dispute information if exists

Response:
{
  "dispute": {
    "pubkey": "...",
    "initiator": "...",
    "reason": "...",
    "status": "Pending",
    ...
  }
}
```

### Discovery

**GET /discovery/trending**
```
Trending campaigns (anti-Sybil weighted)

Query params:
  - limit: Results per page (default: 20)
  - offset: Pagination offset

Response:
{
  "campaigns": [ ... ],
  "algorithm": "trending_score = (total_usdc_contributed * 0.7) + (weighted_contributor_count * 0.3)",
  "pagination": { ... }
}
```

**GET /discovery/top**
```
Top campaigns by total contributions

Response:
{
  "campaigns": [ ... ],
  "pagination": { ... }
}
```

**GET /discovery/new**
```
Recently published campaigns

Response:
{
  "campaigns": [ ... ],
  "pagination": { ... }
}
```

**GET /discovery/near-goal**
```
Tasks that are 70-99% funded

Response:
{
  "tasks": [ ... ],
  "pagination": { ... }
}
```

**GET /discovery/tasks/trending**
```
Trending tasks (anti-Sybil weighted)

Response:
{
  "tasks": [ ... ],
  "algorithm": "...",
  "pagination": { ... }
}
```

**GET /search?q=query**
```
Full-text search across campaigns and tasks

Query params:
  - q: Search query (required)
  - type: all, campaigns, or tasks (default: all)
  - limit: Results per page
  - offset: Pagination offset

Response:
{
  "query": "solana",
  "campaigns": [ ... ],
  "tasks": [ ... ]
}
```

### Wallets

**GET /wallets/:address**
```
Get wallet profile and statistics

Response:
{
  "wallet": {
    "wallet_address": "...",
    "first_seen_at": "...",
    "age_days": 120,
    "total_contributed": "100000000",
    "total_campaigns_created": 2,
    "total_tasks_created": 5
  },
  "governance_tokens": "5000000000",
  "contributions": [ ... ],
  "campaigns_created": [ ... ],
  "tasks_created": [ ... ]
}
```

**GET /wallets/:address/contributions**
```
Get all contributions by a wallet

Response:
{
  "contributions": [ ... ],
  "pagination": { ... }
}
```

### Statistics

**GET /stats/global**
```
Global platform statistics

Response:
{
  "campaigns": {
    "total_campaigns": 150,
    "published_campaigns": 120,
    "active_campaigns": 45,
    "completed_campaigns": 30
  },
  "tasks": { ... },
  "contributions": {
    "total_usdc": "5000000000",
    "unique_contributors": 1250
  },
  "governance": {
    "total_tokens_distributed": "20000000000000",
    "unique_recipients": 450
  }
}
```

**GET /stats/categories**
```
Campaign statistics by category

Response:
{
  "categories": [
    {
      "category": "Education",
      "campaign_count": 45,
      "task_count": 123,
      "total_contributions": "1500000000"
    },
    ...
  ]
}
```

**GET /health**
```
Health check endpoint

Response:
{
  "status": "healthy",
  "timestamp": "...",
  "indexer": {
    "last_processed_slot": 123456789,
    "last_update": "...",
    "lag_ms": 1234
  }
}
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (with indexed data from indexer)
- Redis 7+ (optional, for caching)

### Installation

```bash
cd services/api
npm install
```

### Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update values as needed.

### Start API

Production:
```bash
npm run build
npm start
```

Development (with auto-reload):
```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Rate Limiting

Default rate limits:
- Anonymous requests: 60 requests/minute
- Authenticated requests: 300 requests/minute

Configure via `.env`:
```
RATE_LIMIT_ANONYMOUS=60
RATE_LIMIT_AUTHENTICATED=300
```

## CORS

Default: Allow all origins (`*`)

For production, set specific domains:
```
CORS_ORIGIN=https://app.openbook.example.com,https://openbook.example.com
```

## Caching (TODO)

Future enhancement: Redis caching for frequently accessed data
- Campaign details: 5 minute TTL
- Task details: 1 minute TTL
- Trending lists: 30 second TTL

## Monitoring

The API logs:
- Request/response times
- Error rates
- Database query performance
- Rate limit violations

Use the `/health` endpoint to monitor:
- Database connectivity
- Indexer lag (how far behind blockchain)

## Security

**Read-Only Database User:**

For production, create a read-only PostgreSQL user:

```sql
CREATE USER api_readonly WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE openbook TO api_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO api_readonly;
```

Use this user for the API's `DATABASE_URL`.

**No Sensitive Data:**

The API never accesses:
- Private keys
- Wallet secrets
- Personal identifying information (except on-chain public addresses)

All financial data is public on Solana blockchain.

## Error Handling

Standard HTTP status codes:
- `200 OK`: Success
- `400 Bad Request`: Invalid query parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Database connection failed

Error response format:
```json
{
  "error": "Campaign not found"
}
```

## Integration with Frontend

The web frontend (in `../web/`) consumes this API for:
- Discovery page (trending, top, new)
- Campaign detail pages
- Task detail pages with ledger
- Wallet dashboards
- Search functionality

The frontend also connects directly to Solana RPC for:
- Wallet connection
- Transaction signing
- Contribution submissions
- Vote submissions

See `../web/README.md` for frontend integration details.

---

**Built by Yetse**
**For the Community**
**Judge me by my code** =€
