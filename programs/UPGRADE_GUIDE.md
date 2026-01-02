# Program Upgrade Guide - OpenBook Protocol

## Overview

This document outlines the strategy for safely upgrading Solana programs after deployment to mainnet while preserving existing account data and ensuring backward compatibility.

## Versioning Strategy

### Account Versioning

All major account structures should include a `version` field for future migrations:

```rust
#[account]
pub struct Campaign {
    pub version: u8,  // Start at 1, increment on breaking changes
    // ... other fields
}
```

### Version Scheme

- **Version 1**: Initial deployment
- **Version 2+**: Incremental upgrades with migration logic

### Migration Pattern

```rust
// In instruction handler
pub fn some_instruction(ctx: Context<SomeInstruction>) -> Result<()> {
    let account = &mut ctx.accounts.some_account;

    // Migrate if needed
    match account.version {
        1 => migrate_v1_to_v2(account)?,
        2 => {}, // Current version, no migration needed
        _ => return Err(ErrorCode::UnsupportedVersion.into()),
    }

    // Continue with instruction logic
    Ok(())
}

fn migrate_v1_to_v2(account: &mut SomeAccount) -> Result<()> {
    // Migration logic
    account.version = 2;
    Ok(())
}
```

---

## Current State Assessment

### Accounts Needing Version Fields

| Program | Account | Has Version? | Recommendation |
|---------|---------|--------------|----------------|
| campaign-registry | `Campaign` | ❌ No | Add `version: u8` field |
| task-manager | `Task` | ❌ No | Add `version: u8` field |
| task-escrow | `Escrow` | ❌ No | Add `version: u8` field |
| task-escrow | `Contribution` | ❌ No | Add `version: u8` field |
| budget-vote | `BudgetVote` | ❌ No | Add `version: u8` field |
| budget-vote | `BudgetAggregate` | ❌ No | Add `version: u8` field |
| proof-registry | `Proof` | ❌ No | Add `version: u8` field |
| dispute-module | `Dispute` | ❌ No | Add `version: u8` field |
| governance-token | `GovernanceState` | ❌ No | Add `version: u8` field |

---

## Upgrade Safeguards (v0 → v1 Deployment)

### For Initial Devnet/Mainnet Deployment

**Strategy:** Since we're pre-launch, we can add version fields NOW before first deployment.

#### 1. Add Version Fields to All Accounts

**Campaign (campaign-registry):**
```rust
#[account]
pub struct Campaign {
    pub version: u8,  // = 1 on creation
    pub campaign_id: String,
    pub creator: Pubkey,
    // ... existing fields
}

impl Campaign {
    pub const LEN: usize = 8 + 1 + /* rest of calculation */;
    pub const CURRENT_VERSION: u8 = 1;
}
```

**Task (task-manager):**
```rust
#[account]
pub struct Task {
    pub version: u8,  // = 1 on creation
    pub task_id: String,
    // ... existing fields
}

impl Task {
    pub const CURRENT_VERSION: u8 = 1;
}
```

**Escrow & Contribution (task-escrow):**
```rust
#[account]
pub struct Escrow {
    pub version: u8,  // = 1
    pub task: Pubkey,
    // ... existing fields
}

#[account]
pub struct Contribution {
    pub version: u8,  // = 1
    pub task: Pubkey,
    // ... existing fields
}
```

**All Other Accounts:** Same pattern

#### 2. Initialize Versions in Create Instructions

```rust
pub fn create_campaign(ctx: Context<CreateCampaign>, ...) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // IMPORTANT: Set version on creation
    campaign.version = Campaign::CURRENT_VERSION;

    // ... rest of initialization
    Ok(())
}
```

#### 3. Add Version Checks (Optional for v1, Required for v2+)

```rust
pub fn update_campaign(ctx: Context<UpdateCampaign>, ...) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;

    // Validate version
    require!(
        campaign.version == Campaign::CURRENT_VERSION,
        CampaignError::UnsupportedVersion
    );

    // ... rest of logic
    Ok(())
}
```

---

## Future Upgrade Scenarios

### Scenario 1: Adding Optional Fields (Non-Breaking)

**Example:** Add `tags: Option<Vec<String>>` to Campaign

**Strategy:**
1. Deploy new program version with field
2. Old accounts still work (Option = None)
3. New accounts populate field
4. No version increment needed (backward compatible)

```rust
#[account]
pub struct Campaign {
    pub version: u8,  // Still 1
    // ... existing fields
    pub tags: Option<Vec<String>>,  // NEW: Optional, defaults to None
}
```

### Scenario 2: Changing Field Types (Breaking Change)

**Example:** Change `deadline: Option<i64>` to `deadline: u64` (Unix timestamp)

**Strategy:**
1. Increment version: `CURRENT_VERSION = 2`
2. Add migration logic
3. Lazy migration on next instruction call

```rust
#[account]
pub struct Task {
    pub version: u8,  // Will be 2 for new accounts
    pub task_id: String,
    pub deadline: u64,  // Changed from Option<i64>
    // ... other fields
}

impl Task {
    pub const CURRENT_VERSION: u8 = 2;

    pub fn migrate_if_needed(&mut self) -> Result<()> {
        match self.version {
            1 => self.migrate_v1_to_v2()?,
            2 => {}, // Current
            _ => return Err(TaskError::UnsupportedVersion.into()),
        }
        Ok(())
    }

    fn migrate_v1_to_v2(&mut self) -> Result<()> {
        // Migration logic for deadline field
        // (Would need to store old value somewhere or handle separately)
        self.version = 2;
        Ok(())
    }
}
```

### Scenario 3: Adding Required Fields (Breaking Change)

**Example:** Add `kyc_verified: bool` to Task (required)

**Strategy:**
1. Use discriminator approach: separate account types
2. Create `TaskV2` struct
3. Keep old instructions for `Task`, new for `TaskV2`
4. Provide migration instruction

```rust
#[account]
pub struct TaskV2 {
    pub version: u8,  // = 2
    // ... all Task fields
    pub kyc_verified: bool,  // NEW: Required field
}

// Migration instruction
pub fn migrate_task_to_v2(ctx: Context<MigrateTask>) -> Result<()> {
    let old_task = &ctx.accounts.old_task;
    let new_task = &mut ctx.accounts.new_task;

    // Copy data
    new_task.version = 2;
    new_task.task_id = old_task.task_id.clone();
    // ... copy all fields
    new_task.kyc_verified = false;  // Default for migrated tasks

    // Close old account (return rent)
    // ...

    Ok(())
}
```

---

## Upgrade Checklist

### Before Deploying Upgrade:

- [ ] Write migration tests
- [ ] Test on localnet with real v1 accounts
- [ ] Deploy to devnet and test migration
- [ ] Create migration guide for users
- [ ] Announce upgrade timeline (min 2 weeks notice)
- [ ] Verify all programs compile
- [ ] Check account size calculations (ensure enough space)
- [ ] Test rollback procedure

### During Deployment:

- [ ] Pause frontend write operations
- [ ] Deploy new program versions
- [ ] Monitor for errors
- [ ] Test migration with 1 account before bulk
- [ ] Resume frontend operations
- [ ] Monitor for 24 hours

### After Deployment:

- [ ] Verify all migrations successful
- [ ] Check for stuck accounts
- [ ] Update documentation
- [ ] Announce completion

---

## Error Handling for Versions

### Add to Error Enums:

**Campaign Registry:**
```rust
#[error_code]
pub enum CampaignError {
    // ... existing errors

    #[msg("Unsupported account version - please migrate or contact support")]
    UnsupportedVersion,
}
```

**All Programs:** Same pattern

---

## Account Size Considerations

### Current Account Sizes (Estimated):

| Account | Current Size | With Version (+1 byte) | Safe? |
|---------|-------------|------------------------|-------|
| Campaign | ~500 bytes | ~501 bytes | ✅ Yes |
| Task | ~600 bytes | ~601 bytes | ✅ Yes |
| Escrow | ~100 bytes | ~101 bytes | ✅ Yes |
| Contribution | ~150 bytes | ~151 bytes | ✅ Yes |
| BudgetVote | ~120 bytes | ~121 bytes | ✅ Yes |
| Proof | ~350 bytes | ~351 bytes | ✅ Yes |
| Dispute | ~600 bytes | ~601 bytes | ✅ Yes |

**Impact:** Adding 1 byte for version is negligible (<0.2% increase)

---

## Alternative: Use Anchor's Built-in Discriminator

Anchor automatically adds an 8-byte discriminator to accounts:

```rust
// Anchor automatically does this:
// First 8 bytes = hash("account:Campaign")
```

**Pros:**
- Already included, no size impact
- Prevents type confusion

**Cons:**
- Doesn't help with version migrations
- Not human-readable

**Recommendation:** Use BOTH:
- Discriminator for type safety (automatic)
- Version field for migrations (manual)

---

## Migration Testing Template

```rust
#[cfg(test)]
mod migration_tests {
    use super::*;

    #[test]
    fn test_v1_to_v2_migration() {
        // Create v1 account
        let mut account = create_v1_account();
        assert_eq!(account.version, 1);

        // Migrate
        account.migrate_if_needed().unwrap();
        assert_eq!(account.version, 2);

        // Verify fields
        assert!(account.some_new_field.is_some());
    }

    #[test]
    fn test_v2_no_migration() {
        let mut account = create_v2_account();
        assert_eq!(account.version, 2);

        // Should not migrate
        account.migrate_if_needed().unwrap();
        assert_eq!(account.version, 2);
    }
}
```

---

## Recommended Actions for v0 → v1

### Option A: Add Versions NOW (Before First Deploy)
**Pros:**
- Clean slate
- No migration needed
- Best practice from start

**Cons:**
- Slight complexity increase
- 1 byte per account

**Verdict:** ✅ **RECOMMENDED** - Add now during development

### Option B: Deploy Without, Add Later
**Pros:**
- Simpler initial deployment
- Saves 1 byte per account

**Cons:**
- Forces v1 → v2 migration immediately
- More complex first upgrade
- Bad precedent

**Verdict:** ❌ Not recommended

---

## Implementation Steps (If Adding Now)

1. **Add version field to all account structs** (1 line each)
2. **Update LEN calculations** (add + 1)
3. **Initialize version in create instructions** (1 line each)
4. **Add UnsupportedVersion error** (all programs)
5. **Add version constants** (`CURRENT_VERSION = 1`)
6. **Test account creation** (ensure version = 1)

**Estimated Time:** 1-2 hours
**Value:** Future-proofs all programs

---

## Program-Specific Upgrade Notes

### Campaign Registry
- Low upgrade risk: Simple state machine
- Likely changes: Adding optional metadata fields

### Task Manager
- Medium upgrade risk: Complex state machine
- Likely changes: New states, deadline logic changes

### Task Escrow
- **HIGH upgrade risk**: Financial invariants
- Recommendation: Avoid breaking changes if possible
- If needed: Deploy separate `EscrowV2` program

### Budget Vote
- Medium upgrade risk: Voting logic
- Likely changes: Quorum thresholds, weighting formulas

### Proof Registry
- Low upgrade risk: Simple storage
- Likely changes: Additional proof types

### Dispute Module
- Low upgrade risk: Straightforward resolution
- Likely changes: New resolution types

### Governance Token
- **HIGH upgrade risk**: Tokenomics
- Recommendation: Make immutable after initial distribution

---

## Resources

- Anchor Migration Guide: https://www.anchor-lang.com/docs/account-migration
- Solana Program Upgrades: https://docs.solana.com/cli/deploy-a-program#upgrading
- Metaplex Migration Example: https://github.com/metaplex-foundation/metaplex-program-library

---

## Summary

**Current Status:** ⚠️ No versioning in place (v0)

**Recommendation:** Add version fields before first deployment

**Impact:** Minimal (1 byte/account, ~2 hours work)

**Benefit:** Smooth upgrades for years to come

---

**Next Steps:**
1. Review this guide with Yetse
2. Decide: Add versions now or later?
3. If now: Implement in next session
4. If later: Document decision and plan for v1 → v2 migration

---

**Updated:** January 2026
**Status:** Recommendation for v0 → v1 deployment
