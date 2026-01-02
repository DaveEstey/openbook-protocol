# Improved Error Messages - OpenBook Protocol

## Overview

All error messages have been enhanced to provide:
1. **Clear context** - What went wrong
2. **Specific values** - Expected limits, minimums, etc.
3. **Actionable guidance** - What the user should do
4. **Anti-Sybil rationale** - Why certain limits exist

## Programs

### 1. Campaign Registry ✅ ALREADY GOOD

Error messages include specific constraints and state requirements.

**Example:**
```rust
#[msg("Campaign ID is invalid (only alphanumeric, dash, underscore allowed)")]
InvalidCampaignId,

#[msg("Campaign is not in editable state (must be DRAFT)")]
NotEditable,
```

---

### 2. Task Manager ✅ ENHANCED

**Changes Made:**
- Added character limits to validation errors
- Added state machine references
- Added specific lamport values
- Clarified authorization errors

**Before:**
```rust
#[msg("Invalid title")]
InvalidTitle,

#[msg("Only task creator can perform this action")]
UnauthorizedCreator,
```

**After:**
```rust
#[msg("Invalid title - must be 3-200 characters")]
InvalidTitle,

#[msg("Unauthorized - only task creator can perform this action")]
UnauthorizedCreator,

#[msg("Unauthorized authority - this operation requires creator or DAO permissions")]
UnauthorizedAuthority,  // NEW ERROR
```

**File:** `programs/task-manager/src/error.rs`

---

### 3. Task Escrow ✅ ENHANCED

**Changes Made:**
- Explained escrow invariant in detail
- Added lamport values for minimum contribution
- Clarified anti-Sybil rationale
- Added authorization errors

**Before:**
```rust
#[msg("Contribution too small - minimum $10 USDC")]
ContributionTooSmall,

#[msg("Insufficient funds in escrow")]
InsufficientFunds,
```

**After:**
```rust
#[msg("Contribution too small - minimum $10 USDC (10,000,000 lamports) required for anti-Sybil protection")]
ContributionTooSmall,

#[msg("Insufficient funds in escrow - requested amount exceeds available balance (contributed - paid_out - refunded)")]
InsufficientFunds,

#[msg("CRITICAL: Escrow invariant violated - vault balance does not match accounting (total_contributed - total_paid_out - total_refunded)")]
InvariantViolation,

// NEW ERRORS:
#[msg("Unauthorized - only specified recipient can execute payout")]
UnauthorizedPayout,

#[msg("Unauthorized - only original contributor can request refund")]
UnauthorizedRefund,
```

**File:** `programs/task-escrow/src/lib.rs`

---

### 4. Budget Vote ✅ ENHANCED

**Changes Made:**
- Explained quorum requirements in detail
- Added lamport values
- Added new error variants for edge cases

**Before:**
```rust
#[msg("Contribution too small - minimum $10 USDC required to vote")]
ContributionTooSmall,

#[msg("Quorum not met - need 60% of funds to vote and at least 3 voters")]
QuorumNotMet,
```

**After:**
```rust
#[msg("Contribution too small - minimum $10 USDC (10,000,000 lamports) required to vote (anti-Sybil)")]
ContributionTooSmall,

#[msg("Quorum not met - need 60% of total contribution value to participate and minimum 3 unique voters")]
QuorumNotMet,

// NEW ERRORS:
#[msg("Invalid budget proposal - proposed budget cannot be zero")]
InvalidBudgetProposal,

#[msg("Vote weight calculation overflow - contribution amount too large")]
VoteWeightOverflow,
```

**File:** `programs/budget-vote/src/lib.rs`

---

### 5. Governance Token 🟡 PROPOSED ENHANCEMENTS

**Recommended Changes:**
```rust
#[error_code]
pub enum GovernanceError {
    #[msg("Minting would exceed total supply cap of 100,000,000 OBOOK tokens")]
    ExceedsTotalSupply,

    #[msg("Unauthorized - only governance authority can mint tokens")]
    Unauthorized,

    // NEW ERRORS:
    #[msg("Invalid mint amount - amount must be greater than zero")]
    InvalidMintAmount,

    #[msg("Invalid recipient type - must be one of: EarlyContributor, CommunityAirdrop, DaoTreasury, EcosystemFund, FutureContributor")]
    InvalidRecipientType,
}
```

**File:** `programs/governance-token/src/lib.rs`

---

### 6. Dispute Module ✅ ADEQUATE

**Current Errors:**
```rust
#[msg("Dispute is not in open status")]
DisputeNotOpen,

#[msg("Unauthorized to resolve dispute - only DAO multisig can resolve")]
UnauthorizedResolver,
```

**Status:** Good - Clear and actionable

---

### 7. Proof Registry ✅ ADEQUATE

**Note:** Proof registry has minimal error handling since it's a simple registry.

**Recommended Additions:**
```rust
#[error_code]
pub enum ProofError {
    #[msg("Invalid proof hash - must be 64-character hex string (SHA256)")]
    InvalidProofHash,

    #[msg("Invalid proof URI - must be valid IPFS or Arweave URI")]
    InvalidProofUri,

    #[msg("Unauthorized - only proof recipient can update")]
    UnauthorizedUpdate,
}
```

---

## Error Message Best Practices

### ✅ Good Error Messages

1. **Include Specific Values:**
```rust
#[msg("Contribution too small - minimum $10 USDC (10,000,000 lamports) required")]
```

2. **Explain Why:**
```rust
#[msg("... required for anti-Sybil protection")]
```

3. **Provide Next Steps:**
```rust
#[msg("Budget must be finalized before this action - complete budget voting first")]
```

4. **Include Context:**
```rust
#[msg("Insufficient funds in escrow - requested amount exceeds available balance (contributed - paid_out - refunded)")]
```

### ❌ Avoid Vague Messages

```rust
// BAD:
#[msg("Invalid input")]

// GOOD:
#[msg("Invalid task ID format - must be alphanumeric with dashes/underscores only, 3-50 characters")]
```

---

## Debugging Guide

### Common Errors and Solutions

#### "Contribution too small - minimum $10 USDC"
**Cause:** Trying to contribute less than 10 USDC (10,000,000 lamports)
**Solution:** Increase contribution amount to at least $10 USDC
**Rationale:** Anti-Sybil protection - prevents bot wallet spam

#### "Quorum not met - need 60% of total contribution value"
**Cause:** Less than 60% of contributors have voted
**Solution:** Get more contributors to vote on budget
**Rationale:** Ensures majority participation in budget decision

#### "Escrow is frozen due to active dispute"
**Cause:** A dispute has been opened on this task
**Solution:** Wait for DAO to resolve dispute
**Rationale:** Protects funds during dispute resolution

#### "CRITICAL: Escrow invariant violated"
**Cause:** Internal accounting error (should never happen)
**Solution:** **IMMEDIATELY HALT ALL OPERATIONS** - Contact developers
**Rationale:** Indicates potential exploit or critical bug

#### "Unauthorized - only task creator can perform this action"
**Cause:** Wrong wallet trying to perform creator-only operation
**Solution:** Use the wallet that created the task
**Rationale:** Access control - only creator can modify task

---

## Testing Error Messages

### Unit Tests Template:
```rust
#[test]
fn test_contribution_too_small() {
    let result = contribute(ctx, 5_000_000); // $5 USDC
    assert_eq!(
        result.unwrap_err(),
        EscrowError::ContributionTooSmall
    );
}

#[test]
fn test_unauthorized_creator() {
    let result = start_budget_voting(wrong_creator_ctx);
    assert_eq!(
        result.unwrap_err(),
        TaskError::UnauthorizedCreator
    );
}
```

### Integration Tests:
```bash
# Test error messages appear correctly
anchor test test_error_messages -- --nocapture

# Expected output should include full error message text
```

---

## Error Code Reference

| Program | Error Enum | Count | Location |
|---------|------------|-------|----------|
| campaign-registry | `CampaignError` | 10 | `src/error.rs` |
| task-manager | `TaskError` | 16 | `src/error.rs` |
| task-escrow | `EscrowError` | 7 | `src/lib.rs` |
| budget-vote | `BudgetVoteError` | 5 | `src/lib.rs` |
| proof-registry | *(none)* | 0 | N/A |
| dispute-module | `DisputeError` | 2 | `src/lib.rs` |
| governance-token | `GovernanceError` | 2 | `src/lib.rs` |

**Total Error Variants:** 42 (enhanced from ~30)

---

## Security Considerations

### Critical Error Messages

Some error messages expose internal state for debugging but should be logged server-side:

**Public (OK to show users):**
- `ContributionTooSmall` - Safe to expose
- `UnauthorizedCreator` - Safe to expose
- `QuorumNotMet` - Safe to expose

**Internal (Log but don't expose details):**
- `InvariantViolation` - Shows internal accounting
- `VoteWeightOverflow` - Could expose calculation logic

**Recommendation:** Frontend should catch `InvariantViolation` and show generic "Internal error - contact support" message.

---

## Future Improvements

1. **Add Error Codes:**
```rust
#[msg("ERR-001: Contribution too small - minimum $10 USDC")]
```

2. **Internationalization:**
```rust
// Store error codes, translate messages client-side
pub const ERR_CONTRIBUTION_SMALL: u32 = 6000;
```

3. **Structured Error Data:**
```rust
#[error_code]
pub enum EscrowError {
    #[msg("Contribution too small - minimum {min} USDC, got {actual} USDC")]
    ContributionTooSmall { min: u64, actual: u64 },
}
```

---

## Summary

**Enhancements Made:**
- ✅ Task Escrow: 7 errors enhanced (2 new)
- ✅ Budget Vote: 5 errors enhanced (2 new)
- ✅ Task Manager: 16 errors enhanced (1 new)
- 🟡 Governance Token: Proposed 4 errors (2 new)
- 🟡 Proof Registry: Proposed 3 errors (all new)

**Impact:**
- Better developer experience debugging
- Clearer user feedback
- Faster issue resolution
- Self-documenting code

---

**Updated:** January 2026
**Status:** Implemented for critical programs
