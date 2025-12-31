use anchor_lang::prelude::*;

#[account]
pub struct BudgetVote {
    pub task: Pubkey,
    pub voter: Pubkey,
    pub proposed_budget: u64,
    pub vote_weight: u64,  // ANTI-SYBIL: This is contribution amount in USDC, not "1 per wallet"
    pub voted_at: i64,
}

impl BudgetVote {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8;
}

#[account]
pub struct BudgetAggregate {
    pub task: Pubkey,
    pub total_voters: u32,
    pub total_weight: u64,  // Total USDC value of all votes
}

impl BudgetAggregate {
    pub const LEN: usize = 8 + 32 + 4 + 8;
}
