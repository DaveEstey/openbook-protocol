# Scope Decisions (Must Be Locked Before Coding)

## Chain and currency
- Chain: Solana
- Currency: USDC (SPL)

## Funding model
- Task-level escrow ONLY (recommended)
- Campaign-level pooled balances: YES / NO (choose one)

## Budget discovery
- Mechanism: weighted median
- Vote input: numeric budget amount
- Vote weight basis:
  - Task contributions
  - Campaign contributions (riskier)

## Approval model (choose one for v0)
- Donor approval vote
- Reviewer approval with stake
- Hybrid (reviewer approve + donor veto)

## KYC
- Required for recipients only
- Not required for donors

## Disputes
- v0: freeze + resolve to payout or refund

## Receipt tokens
- SPL receipt tokens: YES / NO
- Default recommendation: NO (use PDA receipts)
