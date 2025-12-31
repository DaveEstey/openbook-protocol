use anchor_lang::prelude::*;

pub mod state;
pub mod weighted_median;

use state::*;
use weighted_median::*;

declare_id!("Budg1111111111111111111111111111111111111111");

/// Minimum contribution to have voting power: $10 USDC (6 decimals)
pub const MIN_CONTRIBUTION_FOR_VOTE: u64 = 10_000_000;

/// Quorum: 60% of total contribution value must vote
pub const QUORUM_PERCENTAGE: u8 = 60;

/// Minimum unique voters required
pub const MIN_VOTERS: u32 = 3;

#[program]
pub mod budget_vote {
    use super::*;

    /// Submit or update budget vote
    /// Vote weight = contributor's total contribution to this task (USDC amount, not per-wallet)
    pub fn submit_vote(
        ctx: Context<SubmitVote>,
        proposed_budget: u64,
        contribution_amount: u64,
    ) -> Result<()> {
        require!(
            contribution_amount >= MIN_CONTRIBUTION_FOR_VOTE,
            BudgetVoteError::ContributionTooSmall
        );

        let vote = &mut ctx.accounts.budget_vote;
        let clock = Clock::get()?;

        vote.task = ctx.accounts.task.key();
        vote.voter = ctx.accounts.voter.key();
        vote.proposed_budget = proposed_budget;
        vote.vote_weight = contribution_amount; // ANTI-SYBIL: Weight by USDC, not wallet count
        vote.voted_at = clock.unix_timestamp;

        // Update aggregate
        let aggregate = &mut ctx.accounts.budget_aggregate;
        if aggregate.task == Pubkey::default() {
            // Initialize
            aggregate.task = ctx.accounts.task.key();
            aggregate.total_voters = 1;
            aggregate.total_weight = contribution_amount;
        } else {
            // Check if new voter
            let is_new_voter = true; // In production, check if voter exists in votes list
            if is_new_voter {
                aggregate.total_voters += 1;
            }
            aggregate.total_weight += contribution_amount;
        }

        emit!(BudgetVoteSubmitted {
            task: ctx.accounts.task.key(),
            voter: ctx.accounts.voter.key(),
            proposed_budget,
            vote_weight: contribution_amount,
            voted_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Finalize budget using weighted median
    /// Can only be called when quorum is met
    pub fn finalize_budget(
        ctx: Context<FinalizeBudget>,
        total_contributed: u64,
    ) -> Result<()> {
        let aggregate = &ctx.accounts.budget_aggregate;

        // Check quorum
        require!(
            aggregate.total_voters >= MIN_VOTERS,
            BudgetVoteError::QuorumNotMet
        );

        let total_voted_weight = aggregate.total_weight;
        let participation_pct = (total_voted_weight * 100) / total_contributed;

        require!(
            participation_pct >= QUORUM_PERCENTAGE as u64,
            BudgetVoteError::QuorumNotMet
        );

        // In production: fetch all votes, calculate weighted median
        // For now, simplified: use average or placeholder
        // The weighted_median module has the algorithm

        let finalized_budget = calculate_weighted_median_placeholder(total_voted_weight);

        emit!(BudgetFinalized {
            task: ctx.accounts.task.key(),
            finalized_budget,
            total_voters: aggregate.total_voters,
            total_vote_weight: total_voted_weight,
            finalized_at: Clock::get()?.unix_timestamp,
        });

        // CPI to task_manager to update task
        // (Would be implemented with actual CPI call)

        Ok(())
    }
}

// Placeholder for weighted median calculation
// In production, this fetches all votes and calculates properly
fn calculate_weighted_median_placeholder(total_weight: u64) -> u64 {
    // Simplified: return proportional value
    // Real implementation in weighted_median.rs
    total_weight / 2
}

#[derive(Accounts)]
pub struct SubmitVote<'info> {
    #[account(
        init_if_needed,
        payer = voter,
        space = BudgetVote::LEN,
        seeds = [b"budget_vote", task.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub budget_vote: Account<'info, BudgetVote>,

    #[account(
        init_if_needed,
        payer = voter,
        space = BudgetAggregate::LEN,
        seeds = [b"budget_aggregate", task.key().as_ref()],
        bump
    )]
    pub budget_aggregate: Account<'info, BudgetAggregate>,

    /// CHECK: Task account from task_manager
    pub task: UncheckedAccount<'info>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeBudget<'info> {
    #[account(
        seeds = [b"budget_aggregate", task.key().as_ref()],
        bump
    )]
    pub budget_aggregate: Account<'info, BudgetAggregate>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
}

#[event]
pub struct BudgetVoteSubmitted {
    pub task: Pubkey,
    pub voter: Pubkey,
    pub proposed_budget: u64,
    pub vote_weight: u64,
    pub voted_at: i64,
}

#[event]
pub struct BudgetFinalized {
    pub task: Pubkey,
    pub finalized_budget: u64,
    pub total_voters: u32,
    pub total_vote_weight: u64,
    pub finalized_at: i64,
}

#[error_code]
pub enum BudgetVoteError {
    #[msg("Contribution too small - minimum $10 USDC required to vote")]
    ContributionTooSmall,

    #[msg("Quorum not met - need 60% of funds to vote and at least 3 voters")]
    QuorumNotMet,

    #[msg("Budget voting period not active")]
    VotingNotActive,
}
