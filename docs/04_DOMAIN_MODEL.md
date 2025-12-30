# OpenBook Domain Model

## Core entities
- Campaign
- Task
- Contribution
- BudgetVote
- Proof
- Payout
- Refund
- Dispute
- ModerationAction

## Campaign
Container for narrative and tasks.

## Task
Atomic unit of funding and execution.
Tasks have scope, deliverables, deadlines, escrow, and approval rules.

## Invariants
- Funds only move via protocol rules
- Budget finalized before payout
- Task approved before payout
- Recipient must be KYC-verified
