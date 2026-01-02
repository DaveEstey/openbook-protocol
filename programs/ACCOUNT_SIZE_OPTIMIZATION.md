# Account Size Optimization - OpenBook Protocol

## Overview

This document analyzes account sizes across all 7 programs and provides optimization recommendations to minimize rent costs for users.

## Cost Context

**Solana Rent:** ~0.00000348 SOL per byte per year (rent-exempt)
**Current SOL Price:** ~$100 (variable)
**Impact:** Larger accounts = higher rent deposits

---

## Current Account Sizes

### Campaign Registry

**Campaign Account:**
```rust
pub struct Campaign {
    pub campaign_id: String,        // 4 + 50 = 54 bytes (max)
    pub creator: Pubkey,            // 32 bytes
    pub title: String,               // 4 + 200 = 204 bytes (max)
    pub description: String,         // 4 + 2000 = 2004 bytes (max)
    pub metadata_uri: String,        // 4 + 200 = 204 bytes (max)
    pub category: String,            // 4 + 50 = 54 bytes (max)
    pub state: CampaignState,        // 1 byte (enum)
    pub tasks_count: u32,            // 4 bytes
    pub created_at: i64,             // 8 bytes
    pub updated_at: i64,             // 8 bytes
    pub published_at: Option<i64>,   // 1 + 8 = 9 bytes
    pub archived_at: Option<i64>,    // 1 + 8 = 9 bytes
    pub bump: u8,                    // 1 byte
}

// Total: 8 (discriminator) + 54 + 32 + 204 + 2004 + 204 + 54 + 1 + 4 + 8 + 8 + 9 + 9 + 1 = 2600 bytes
```

**Rent Cost:** ~0.009 SOL (~$0.90 at $100/SOL)

**Optimization Opportunities:**
1. **Description** (2000 bytes max) → Move to IPFS/Arweave
   - Store only `description_hash: [u8; 32]` on-chain
   - Save: ~1970 bytes (~75% reduction)
   - New size: ~630 bytes
   - New cost: ~$0.22

2. **metadata_uri** already efficient for long content

**Recommendation:**
```rust
pub struct Campaign {
    // ... same fields
    pub description_hash: [u8; 32],  // NEW: SHA256 of description (stored off-chain)
    // Remove: description: String
}

// New total: ~630 bytes (75% smaller)
```

---

### Task Manager

**Task Account:**
```rust
pub struct Task {
    pub task_id: String,             // 4 + 50 = 54 bytes
    pub campaign: Pubkey,            // 32 bytes
    pub creator: Pubkey,             // 32 bytes
    pub recipient: Option<Pubkey>,   // 1 + 32 = 33 bytes
    pub title: String,               // 4 + 200 = 204 bytes
    pub deliverables: String,        // 4 + 2000 = 2004 bytes (max)
    pub target_budget: u64,          // 8 bytes
    pub finalized_budget: Option<u64>, // 1 + 8 = 9 bytes
    pub deadline: Option<i64>,       // 1 + 8 = 9 bytes
    pub state: TaskState,            // 1 byte (enum)
    pub proof_hash: Option<String>,  // 1 + 4 + 64 = 69 bytes
    pub proof_uri: Option<String>,   // 1 + 4 + 200 = 205 bytes
    pub created_at: i64,             // 8 bytes
    pub updated_at: i64,             // 8 bytes
    // ... plus state-specific timestamps
    pub bump: u8,                    // 1 byte
}

// Total: ~2800 bytes
```

**Rent Cost:** ~0.0097 SOL (~$0.97)

**Optimization Opportunities:**
1. **deliverables** (2000 bytes) → Store off-chain
   - Use `deliverables_hash: [u8; 32]`
   - Save: ~1970 bytes
2. **proof_hash** and **proof_uri** → Already in proof_registry
   - Remove from Task, reference Proof PDA
   - Save: ~274 bytes

**Recommendation:**
```rust
pub struct Task {
    // ... same fields
    pub deliverables_hash: [u8; 32],  // NEW: Hash of deliverables
    // Remove: deliverables, proof_hash, proof_uri (use proof_registry)
}

// New total: ~560 bytes (80% smaller)
```

---

### Task Escrow

**Escrow Account:**
```rust
pub struct Escrow {
    pub task: Pubkey,               // 32 bytes
    pub total_contributed: u64,     // 8 bytes
    pub total_refunded: u64,        // 8 bytes
    pub total_paid_out: u64,        // 8 bytes
    pub is_frozen: bool,            // 1 byte
    pub bump: u8,                   // 1 byte
}

// Total: 8 + 32 + 8 + 8 + 8 + 1 + 1 = 66 bytes
```

**Rent Cost:** ~0.00023 SOL (~$0.02) ✅ Already optimal!

**Contribution Account:**
```rust
pub struct Contribution {
    pub task: Pubkey,               // 32 bytes
    pub contributor: Pubkey,        // 32 bytes
    pub amount: u64,                // 8 bytes (cumulative)
    pub contributed_at: i64,        // 8 bytes
    pub refunded: bool,             // 1 byte
    pub refund_amount: u64,         // 8 bytes
}

// Total: 8 + 32 + 32 + 8 + 8 + 1 + 8 = 97 bytes
```

**Rent Cost:** ~0.00034 SOL (~$0.03) ✅ Already optimal!

**Recommendation:** No changes needed. These accounts are already minimal.

---

### Budget Vote

**BudgetVote Account:**
```rust
pub struct BudgetVote {
    pub task: Pubkey,               // 32 bytes
    pub voter: Pubkey,              // 32 bytes
    pub proposed_budget: u64,       // 8 bytes
    pub vote_weight: u64,           // 8 bytes
    pub voted_at: i64,              // 8 bytes
}

// Total: 8 + 32 + 32 + 8 + 8 + 8 = 96 bytes
```

**Rent Cost:** ~0.00033 SOL (~$0.03) ✅ Optimal!

**BudgetAggregate Account:**
```rust
pub struct BudgetAggregate {
    pub task: Pubkey,               // 32 bytes
    pub total_voters: u32,          // 4 bytes
    pub total_weight: u64,          // 8 bytes
}

// Total: 8 + 32 + 4 + 8 = 52 bytes
```

**Rent Cost:** ~0.00018 SOL (~$0.02) ✅ Optimal!

**Recommendation:** No changes needed.

---

### Proof Registry

**Proof Account:**
```rust
pub struct Proof {
    pub task: Pubkey,               // 32 bytes
    pub recipient: Pubkey,          // 32 bytes
    pub proof_hash: String,         // 4 + 64 = 68 bytes
    pub proof_uri: String,          // 4 + 200 = 204 bytes
    pub submitted_at: i64,          // 8 bytes
    pub updated_at: Option<i64>,    // 1 + 8 = 9 bytes
}

// Total: 8 + 32 + 32 + 68 + 204 + 8 + 9 = 361 bytes
```

**Rent Cost:** ~0.00126 SOL (~$0.13)

**Optimization Opportunities:**
1. **proof_hash** as `String` → Use `[u8; 32]`
   - SHA256 is always 32 bytes, no need for String
   - Save: ~36 bytes

**Recommendation:**
```rust
pub struct Proof {
    pub task: Pubkey,
    pub recipient: Pubkey,
    pub proof_hash: [u8; 32],       // CHANGED: Fixed-size
    pub proof_uri: String,          // Keep as String (varies)
    pub submitted_at: i64,
    pub updated_at: Option<i64>,
}

// New total: 8 + 32 + 32 + 32 + 204 + 8 + 9 = 325 bytes (~10% smaller)
```

---

### Dispute Module

**Dispute Account:**
```rust
pub struct Dispute {
    pub task: Pubkey,                       // 32 bytes
    pub initiator: Pubkey,                  // 32 bytes
    pub reason: String,                     // 4 + 500 = 504 bytes (max)
    pub opened_at: i64,                     // 8 bytes
    pub resolution_deadline: i64,           // 8 bytes
    pub status: DisputeStatus,              // 1 byte
    pub resolution: Option<DisputeResolution>, // 1 + 32 = 33 bytes
    pub resolved_at: Option<i64>,           // 1 + 8 = 9 bytes
}

// Total: 8 + 32 + 32 + 504 + 8 + 8 + 1 + 33 + 9 = 635 bytes
```

**Rent Cost:** ~0.0022 SOL (~$0.22)

**Optimization Opportunities:**
1. **reason** (500 bytes) → Move to IPFS
   - Use `reason_hash: [u8; 32]`
   - Save: ~470 bytes

**Recommendation:**
```rust
pub struct Dispute {
    // ... same fields
    pub reason_hash: [u8; 32],      // NEW: Hash of reason (stored off-chain)
    pub reason_preview: [u8; 32],   // OPTIONAL: First 32 chars for preview
}

// New total: ~200 bytes (69% smaller)
```

---

### Governance Token

**GovernanceState Account:**
```rust
pub struct GovernanceState {
    pub total_minted: u64,          // 8 bytes
    pub authority: Pubkey,          // 32 bytes
}

// Total: 8 + 8 + 32 = 48 bytes
```

**Rent Cost:** ~0.00017 SOL (~$0.02) ✅ Optimal!

**Recommendation:** No changes needed.

---

## Summary of Optimizations

| Program | Account | Current Size | Optimized Size | Savings | Impact |
|---------|---------|--------------|----------------|---------|--------|
| campaign-registry | Campaign | 2600 bytes | 630 bytes | 75% | 🔥 High |
| task-manager | Task | 2800 bytes | 560 bytes | 80% | 🔥 High |
| task-escrow | Escrow | 66 bytes | 66 bytes | 0% | ✅ Optimal |
| task-escrow | Contribution | 97 bytes | 97 bytes | 0% | ✅ Optimal |
| budget-vote | BudgetVote | 96 bytes | 96 bytes | 0% | ✅ Optimal |
| budget-vote | BudgetAggregate | 52 bytes | 52 bytes | 0% | ✅ Optimal |
| proof-registry | Proof | 361 bytes | 325 bytes | 10% | 💡 Small |
| dispute-module | Dispute | 635 bytes | 200 bytes | 69% | 🔥 High |
| governance-token | GovernanceState | 48 bytes | 48 bytes | 0% | ✅ Optimal |

---

## Cost Savings Example

**Scenario:** 1000 campaigns, 5000 tasks, 100 disputes

**Current Costs:**
- Campaigns: 1000 × $0.90 = $900
- Tasks: 5000 × $0.97 = $4,850
- Disputes: 100 × $0.22 = $22
- **Total:** $5,772

**Optimized Costs:**
- Campaigns: 1000 × $0.22 = $220
- Tasks: 5000 × $0.20 = $1,000
- Disputes: 100 × $0.07 = $7
- **Total:** $1,227

**Savings:** $4,545 (79% reduction)

---

## Implementation Strategy

### Recommended Approach:

1. **For v1 Deployment:**
   - Implement optimizations for Campaign, Task, Dispute (high impact)
   - Keep Proof as-is (low impact)
   - Keep all other accounts as-is (already optimal)

2. **Off-Chain Storage:**
   - Use IPFS or Arweave for large text fields
   - Store hashes on-chain for verification
   - Provide helper functions to fetch full content

3. **Helper Functions:**
```rust
// In frontend/indexer
pub async fn get_full_description(campaign_id: &str) -> Result<String> {
    let campaign = get_campaign_account(campaign_id)?;

    // Fetch from IPFS using hash
    let content = ipfs_client
        .get(&campaign.description_hash)
        .await?;

    // Verify hash matches
    let computed_hash = hash_content(&content);
    require!(computed_hash == campaign.description_hash, "Hash mismatch");

    Ok(content)
}
```

---

## Trade-offs

### Pros of Optimization:
- ✅ 79% cost savings for users
- ✅ Lower barrier to entry
- ✅ More sustainable long-term

### Cons of Optimization:
- ❌ Requires IPFS/Arweave integration
- ❌ Slight latency fetching off-chain data
- ❌ More complex indexer logic

### Hybrid Approach (Recommended):
- Large fields (>200 bytes) → Off-chain with hash
- Small fields (<200 bytes) → On-chain
- Critical fields (amounts, states) → Always on-chain

---

## Action Items

### Before v1 Deployment:

- [ ] Decide: Implement optimizations now or later?
- [ ] Set up IPFS/Arweave infrastructure if optimizing
- [ ] Update struct definitions
- [ ] Update LEN calculations
- [ ] Add hash verification in instructions
- [ ] Test with real data
- [ ] Update frontend to fetch off-chain data

### If Not Optimizing Now:

- [ ] Document decision and rationale
- [ ] Plan for v1 → v2 migration (see UPGRADE_GUIDE.md)
- [ ] Communicate costs to users

---

## Alternative: Compression

Solana State Compression (via Merkle trees) can reduce costs by ~1000x but:
- Not suitable for frequently updated data (campaigns/tasks change state)
- Best for immutable data (proof registry could use it)
- Added complexity

**Recommendation:** Use traditional optimization (off-chain storage) for now.

---

## Testing Checklist

### If Implementing Optimizations:

- [ ] Hash functions work correctly (SHA256)
- [ ] Off-chain storage is reliable
- [ ] Indexer can fetch and verify hashes
- [ ] Frontend displays full content
- [ ] Migration from current → optimized works
- [ ] Account size calculations are correct
- [ ] Rent exemption is met

---

## Resources

- Solana Rent Docs: https://docs.solana.com/developing/programming-model/accounts#rent
- IPFS Best Practices: https://docs.ipfs.tech/concepts/best-practices/
- Arweave Pricing: https://arwiki.wiki/#/en/storage-endowment

---

## Summary

**Current State:** 5 accounts need optimization (Campaign, Task, Proof, Dispute, 1 more)

**Impact:** Up to 79% cost savings ($5,772 → $1,227 for 1000 campaigns scenario)

**Recommendation:** Implement for high-impact accounts (Campaign, Task, Dispute) before v1

**Effort:** ~8-12 hours (IPFS integration + struct updates + testing)

---

**Updated:** January 2026
**Status:** Analysis complete, awaiting decision for v1
