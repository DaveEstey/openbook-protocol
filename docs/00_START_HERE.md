# OpenBook Protocol — Start Here

## What this project is
OpenBook is a utility-first, transparent fundraising platform.

Campaigns are broken into tasks.
Tasks are funded on-chain.
Budgets are decided collectively.
Payouts are rule-bound and publicly auditable.

The OpenBook Protocol enforces all critical logic on-chain.
Off-chain systems are convenience layers only.

## Design center
- Public, open-ended fundraising
- No nonprofit-only assumptions
- No speculative incentives
- No platform custody of funds

## v0 scope
- Solana + USDC
- Campaign and task creation
- Task-level escrow
- Collective budget voting (weighted median)
- Proof submission
- Approval + payout
- Refunds on failure
- Discovery UI (trending, top, category, search)
- Recipient-only KYC for payouts

## Hard constraints
- No paid promotion
- No outcome manipulation by operator
- No hidden accounting
- No off-chain balance authority

## Implementation order
1. Lock decisions in `03_SCOPE_DECISIONS.md`
2. Implement programs per `08_PROGRAMS_SPEC.md`
3. Emit all events per `09_EVENTS_SCHEMA.md`
4. Build indexer per `10_INDEXER_SPEC.md`
5. Build API per `11_API_SPEC.md`
6. Build web per discovery + task flows

Docs are authoritative.
