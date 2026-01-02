# OpenBook Protocol - Solana Programs

This directory contains all 7 Anchor programs that power the OpenBook Protocol, a decentralized crowdfunding platform on Solana with built-in anti-Sybil mechanisms.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Programs](#programs)
- [Anti-Sybil Mechanisms](#anti-sybil-mechanisms)
- [Program Interactions (CPI)](#program-interactions-cpi)
- [Testing](#testing)
- [Deployment](#deployment)
- [Development](#development)

## Architecture Overview

OpenBook Protocol uses a modular architecture with 7 specialized programs:

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenBook Protocol                        │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│   Campaign     │  │  Task Manager    │  │  Task Escrow    │
│   Registry     │  │                  │  │                 │
│                │  │  State Machine   │  │  USDC Vault     │
└────────────────┘  └──────────────────┘  └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼────────┐  ┌─────────▼────────┐  ┌────────▼────────┐
│  Budget Vote   │  │ Proof Registry   │  │ Dispute Module  │
│                │  │                  │  │                 │
│ Weighted Median│  │  IPFS/Arweave   │  │ Escrow Freeze   │
└────────────────┘  └──────────────────┘  └─────────────────┘
                              │
                    ┌─────────▼────────┐
                    │ Governance Token │
                    │                  │
                    │   OBOOK (SPL)    │
                    └──────────────────┘
```

## Programs

### 1. Campaign Registry (`campaign-registry`)

**Program ID:** `Camp1111111111111111111111111111111111111111`

**Purpose:** Manages campaign lifecycle and metadata.

**Key Instructions:**
- `create_campaign` - Create campaign in DRAFT state
- `update_campaign` - Update metadata (DRAFT only)
- `publish_campaign` - Move to PUBLISHED state
- `archive_campaign` - Archive when all tasks complete
- `increment_task_count` - Called by task_manager via CPI

**States:**
```
DRAFT → PUBLISHED → ACTIVE → ARCHIVED
```

**Account Structure:**
```rust
pub struct Campaign {
    campaign_id: String,
    creator: Pubkey,
    title: String,
    description: String,
    metadata_uri: String,
    category: String,
    state: CampaignState,
    tasks_count: u32,
    created_at: i64,
    updated_at: i64,
}
```

---

### 2. Task Manager (`task-manager`)

**Program ID:** `Task1111111111111111111111111111111111111111`

**Purpose:** Core state machine for task lifecycle.

**Key Instructions:**
- `create_task` - Create new task
- `start_budget_voting` - Begin voting phase
- `finalize_budget` - Called by budget_vote via CPI
- `submit_proof` - Recipient submits deliverables
- `approve_task` - After donor approval vote
- `reject_task` - After donor rejection vote

**State Machine:**
```
DRAFT → VOTING_BUDGET → BUDGET_FINALIZED → FUNDING_OPEN →
FUNDING_CLOSED → WORK_IN_PROGRESS → SUBMITTED_FOR_REVIEW →
APPROVED → PAYOUT_COMPLETE
                ↓
             REJECTED
```

**Account Structure:**
```rust
pub struct Task {
    task_id: String,
    campaign: Pubkey,
    creator: Pubkey,
    recipient: Option<Pubkey>,
    title: String,
    deliverables: String,
    target_budget: u64,
    finalized_budget: Option<u64>,
    deadline: Option<i64>,
    state: TaskState,
    proof_hash: Option<String>,
    proof_uri: Option<String>,
    created_at: i64,
    updated_at: i64,
}
```

---

### 3. Task Escrow (`task-escrow`)

**Program ID:** `Escr1111111111111111111111111111111111111111`

**Purpose:** Manages USDC contributions, payouts, and refunds with strict invariant checking.

**Key Instructions:**
- `initialize_escrow` - Create escrow for task
- `contribute` - Contribute USDC (min $10)
- `execute_payout` - Transfer funds to recipient
- `execute_refund` - Refund contributor
- `freeze_escrow` - Freeze during disputes
- `unfreeze_escrow` - Unfreeze after resolution

**Anti-Sybil:** Enforces **$10 minimum contribution** (`MIN_CONTRIBUTION = 10_000_000 USDC lamports`)

**Critical Invariant:**
```rust
// MUST ALWAYS BE TRUE:
vault_balance == total_contributed - total_paid_out - total_refunded
```

**Account Structure:**
```rust
pub struct Escrow {
    task: Pubkey,
    total_contributed: u64,
    total_refunded: u64,
    total_paid_out: u64,
    is_frozen: bool,
    bump: u8,
}

pub struct Contribution {
    task: Pubkey,
    contributor: Pubkey,
    amount: u64,  // Cumulative
    contributed_at: i64,
    refunded: bool,
    refund_amount: u64,
}
```

---

### 4. Budget Vote (`budget-vote`)

**Program ID:** `Budg1111111111111111111111111111111111111111`

**Purpose:** Weighted median budget voting resistant to Sybil attacks.

**Key Instructions:**
- `submit_vote` - Submit/update budget vote
- `finalize_budget` - Calculate weighted median (calls task_manager via CPI)

**Anti-Sybil Parameters:**
- **Vote Weight:** USDC contribution amount (not wallet count)
- **Minimum:** $10 USDC to vote (`MIN_CONTRIBUTION_FOR_VOTE`)
- **Quorum:** 60% of total contributions must vote
- **Min Voters:** 3 unique voters required

**Weighted Median Algorithm:**
```rust
// Example: Prevents bot attacks
// 1 donor with $100 USDC vs 10 bots with $10 each
// Median weighted by $ amount, not wallet count
// Result: ~$50-70 (not dominated by bot quantity)
```

See `src/weighted_median.rs` for full implementation with Sybil resistance tests.

**Account Structure:**
```rust
pub struct BudgetVote {
    task: Pubkey,
    voter: Pubkey,
    proposed_budget: u64,
    vote_weight: u64,  // USDC amount
    voted_at: i64,
}

pub struct BudgetAggregate {
    task: Pubkey,
    total_voters: u32,
    total_weight: u64,
}
```

---

### 5. Proof Registry (`proof-registry`)

**Program ID:** `Prof1111111111111111111111111111111111111111`

**Purpose:** On-chain registry of proof-of-work submissions with IPFS/Arweave URIs.

**Key Instructions:**
- `submit_proof` - Submit proof with hash and URI
- `update_proof` - Update proof (recipient only)

**Account Structure:**
```rust
pub struct Proof {
    task: Pubkey,
    recipient: Pubkey,
    proof_hash: String,      // SHA256 hash
    proof_uri: String,        // IPFS/Arweave URI
    submitted_at: i64,
    updated_at: Option<i64>,
}
```

**Typical Flow:**
1. Recipient completes work
2. Uploads deliverable to IPFS/Arweave
3. Computes SHA256 hash
4. Submits to proof_registry
5. Calls task_manager.submit_proof()

---

### 6. Dispute Module (`dispute-module`)

**Program ID:** `Disp1111111111111111111111111111111111111111`

**Purpose:** Handles disputes with escrow freezing and DAO resolution.

**Key Instructions:**
- `open_dispute` - Open dispute (freezes escrow via CPI)
- `resolve_dispute` - DAO resolves (multisig only)

**Resolution Options:**
```rust
pub enum DisputeResolution {
    PayoutToRecipient,         // 100% to recipient
    RefundToDonors,            // 100% refund
    PartialPayoutPartialRefund { payout_percent: u8 },  // Split
}
```

**Timeline:**
- Opens dispute → Freezes escrow immediately
- Resolution deadline: 14 days
- After resolution → Unfreeze + execute outcome

**Account Structure:**
```rust
pub struct Dispute {
    task: Pubkey,
    initiator: Pubkey,
    reason: String,
    opened_at: i64,
    resolution_deadline: i64,
    status: DisputeStatus,
    resolution: Option<DisputeResolution>,
    resolved_at: Option<i64>,
}
```

---

### 7. Governance Token (`governance-token`)

**Program ID:** `Gove1111111111111111111111111111111111111111`

**Purpose:** OBOOK SPL token for governance and rewards.

**Key Instructions:**
- `initialize` - Initialize governance state
- `mint_tokens` - Mint to recipients (capped supply)

**Tokenomics:**
- **Total Supply:** 100,000,000 OBOOK (6 decimals)
- **Distribution:**
  - 20% Early contributors (vesting)
  - 30% Community airdrop
  - 25% DAO treasury
  - 15% Ecosystem fund
  - 10% Future contributors

**Account Structure:**
```rust
pub struct GovernanceState {
    total_minted: u64,
    authority: Pubkey,  // Transferred to DAO multisig
}

pub enum RecipientType {
    EarlyContributor,
    CommunityAirdrop,
    DaoTreasury,
    EcosystemFund,
    FutureContributor,
}
```

---

## Anti-Sybil Mechanisms

OpenBook Protocol prevents Sybil attacks at multiple layers:

### 1. **$10 Minimum Contribution** (`task-escrow`)
- Enforced in `task_escrow::contribute()`
- Raises cost of creating bot wallets
- `MIN_CONTRIBUTION = 10_000_000` (10 USDC)

### 2. **Vote Weight by USDC Amount** (`budget-vote`)
- Vote weight = USDC contributed (not per-wallet)
- 1 donor with $100 = 10x weight of $10 donor
- Prevents wallet multiplication attacks

### 3. **Weighted Median Algorithm** (`budget-vote`)
- Calculates budget using weighted median (not mean)
- Resistant to outliers and coordinated bot attacks
- See `budget-vote/src/weighted_median.rs`

### 4. **Quorum Requirements** (`budget-vote`)
- 60% of total contribution value must vote
- Minimum 3 unique voters
- Prevents single-actor manipulation

### 5. **Wallet Age Weighting** (indexer-level)
- Indexer tracks wallet age from first transaction
- Displayed in UI for transparency
- Can be used for future governance weighting

### Example Attack Resistance:

**Scenario:** Attacker tries to manipulate budget with bot wallets
```
Legitimate donor: $500 USDC → vote weight: 500
Attacker: 50 bots × $10 = $500 USDC → vote weight: 500

Result: Equal weight for equal $ amount
Attack cost: $500 + 50 wallet creation fees
No advantage over single $500 contribution
```

---

## Program Interactions (CPI)

Programs interact through Cross-Program Invocations (CPI):

### CPI Flow Diagram:
```
task_manager.create_task()
    │
    ├─> CPI: campaign_registry.increment_task_count()
    └─> task_escrow.initialize_escrow()

task_manager.start_budget_voting()
    └─> State: VOTING_BUDGET

budget_vote.finalize_budget()
    └─> CPI: task_manager.finalize_budget()
            └─> State: BUDGET_FINALIZED

task_escrow.contribute()
    └─> SPL Token Transfer: contributor → escrow_vault

task_manager.submit_proof()
    └─> Reads: proof_registry.proof

task_manager.approve_task()
    └─> State: APPROVED
        └─> task_escrow.execute_payout()
            └─> SPL Token Transfer: escrow_vault → recipient

dispute_module.open_dispute()
    └─> CPI: task_escrow.freeze_escrow()

dispute_module.resolve_dispute()
    └─> CPI: task_escrow.unfreeze_escrow()
        └─> CPI: task_escrow.execute_payout() OR execute_refund()
```

### Key CPI Patterns:

1. **Task Creation:**
   - `task_manager` → `campaign_registry` (increment count)
   - `task_manager` → `task_escrow` (initialize vault)

2. **Budget Finalization:**
   - `budget_vote` → `task_manager` (update finalized_budget)

3. **Dispute Handling:**
   - `dispute_module` → `task_escrow` (freeze/unfreeze)

4. **Token Transfers:**
   - All programs → SPL Token program (USDC transfers)

---

## Testing

### Unit Tests

Each program has unit tests in `tests/` directory:

```bash
# Test specific program
cd programs/budget-vote
cargo test

# Test all programs
anchor test
```

### Integration Tests

Located in `programs/*/tests/integration.rs`:

```bash
# Run integration tests (requires local validator)
solana-test-validator &
anchor test --skip-local-validator
```

### Key Test Files:

- `budget-vote/tests/weighted_median_tests.rs` - Anti-Sybil algorithm tests
- `campaign-registry/tests/integration.rs` - Campaign lifecycle tests
- `task-escrow/src/lib.rs` - Invariant assertion tests

### Anti-Sybil Tests:

```bash
# Test weighted median resistance
cd programs/budget-vote
cargo test test_weighted_median_sybil_attack
```

---

## Deployment

### Prerequisites:

```bash
# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Configure for devnet
solana config set --url https://api.devnet.solana.com
```

### Deploy to Devnet:

```bash
# Build all programs
anchor build

# Deploy all programs
anchor deploy

# Get program IDs
solana program show <PROGRAM_ADDRESS>
```

### Update Program IDs:

After deployment, update `declare_id!()` in each `lib.rs`:

```rust
// Before (placeholder)
declare_id!("Camp1111111111111111111111111111111111111111");

// After (actual deployed address)
declare_id!("YourActualProgramIDFromDeployment111111111");
```

Then rebuild and redeploy.

### Deploy Order:

1. `governance-token` (independent)
2. `campaign-registry` (independent)
3. `task-manager` (depends on campaign-registry)
4. `task-escrow` (depends on task-manager)
5. `budget-vote` (depends on task-manager)
6. `proof-registry` (independent)
7. `dispute-module` (depends on task-escrow)

---

## Development

### Project Structure:

```
programs/
├── budget-vote/
│   ├── src/
│   │   ├── lib.rs                 # Main program
│   │   ├── state.rs               # Account structures
│   │   └── weighted_median.rs     # Anti-Sybil algorithm
│   ├── tests/
│   │   └── weighted_median_tests.rs
│   └── Cargo.toml
├── campaign-registry/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state.rs
│   │   ├── instructions/          # Modular instructions
│   │   ├── error.rs
│   │   └── events.rs
│   └── Cargo.toml
├── task-manager/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── state.rs               # State machine
│   │   ├── error.rs
│   │   └── events.rs
│   └── Cargo.toml
├── task-escrow/
│   ├── src/
│   │   ├── lib.rs                 # Invariant assertions
│   │   └── state.rs
│   └── Cargo.toml
├── proof-registry/
│   └── src/lib.rs
├── dispute-module/
│   └── src/lib.rs
└── governance-token/
    └── src/lib.rs
```

### Adding New Instructions:

1. Define instruction in `src/lib.rs` or `src/instructions/`
2. Add account context with constraints
3. Emit events for indexer
4. Add error types in `error.rs`
5. Write tests
6. Update this README

### Code Style:

- Use `#[account]` macro for all PDAs
- Validate inputs before state changes
- Emit events for all state changes
- Use `require!()` for checks
- Add inline comments for complex logic
- Follow Anchor best practices

### Common Patterns:

**PDA Seeds:**
```rust
// Campaign: ["campaign", creator.key(), campaign_id]
// Task: ["task", campaign.key(), task_id]
// Escrow: ["escrow", task.key()]
// Contribution: ["contribution", task.key(), contributor.key()]
```

**Event Emission:**
```rust
emit!(EventName {
    field1: value1,
    field2: value2,
    timestamp: Clock::get()?.unix_timestamp,
});
```

**CPI Pattern:**
```rust
let seeds = &[b"escrow", task.key().as_ref(), &[escrow.bump]];
let signer = &[&seeds[..]];

let cpi_accounts = Transfer { /* ... */ };
let cpi_ctx = CpiContext::new_with_signer(program, cpi_accounts, signer);
token::transfer(cpi_ctx, amount)?;
```

---

## Resources

- **Anchor Documentation:** https://www.anchor-lang.com/
- **Solana Cookbook:** https://solanacookbook.com/
- **SPL Token Program:** https://spl.solana.com/token
- **Anti-Sybil Research:** See `budget-vote/src/weighted_median.rs` comments

---

## License

MIT License - See LICENSE file in repository root

---

## Contributing

When contributing to programs:

1. Write comprehensive tests
2. Maintain backward compatibility
3. Document all public functions
4. Update this README
5. Follow Anchor/Solana best practices
6. Consider security implications (especially escrow invariants)

**CRITICAL:** Any changes to `task-escrow` must preserve the invariant:
```rust
vault_balance == total_contributed - total_paid_out - total_refunded
```

---

**Built by Yetse | For the Community | Judge me by my code 🚀**
