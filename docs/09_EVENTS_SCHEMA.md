# OpenBook Event Schema

All OpenBook programs MUST emit events.

## Required fields
- program_id
- event_name
- campaign_id (if applicable)
- task_id (if applicable)
- actor
- tx_signature
- slot

## Core events
- CampaignCreated
- TaskCreated
- ContributionMade
- BudgetVoted
- BudgetFinalized
- ProofSubmitted
- PayoutExecuted
- RefundExecuted
- DisputeOpened
- DisputeResolved
