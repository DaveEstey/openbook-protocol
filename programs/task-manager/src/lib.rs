use anchor_lang::prelude::*;

pub mod state;
pub mod error;
pub mod events;

use state::*;
use error::*;
use events::*;

declare_id!("Task1111111111111111111111111111111111111111");

#[program]
pub mod task_manager {
    use super::*;

    /// Create new task
    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: String,
        title: String,
        deliverables: String,
        target_budget: u64,
        recipient: Option<Pubkey>,
        deadline: Option<i64>,
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(Task::validate_task_id(&task_id), TaskError::InvalidTaskId);
        require!(Task::validate_title(&title), TaskError::InvalidTitle);
        require!(Task::validate_deliverables(&deliverables), TaskError::InvalidDeliverables);

        task.task_id = task_id.clone();
        task.campaign = ctx.accounts.campaign.key();
        task.creator = ctx.accounts.creator.key();
        task.recipient = recipient;
        task.title = title.clone();
        task.deliverables = deliverables;
        task.target_budget = target_budget;
        task.deadline = deadline;
        task.state = TaskState::Draft;
        task.created_at = clock.unix_timestamp;
        task.updated_at = clock.unix_timestamp;
        task.bump = ctx.bumps.task;

        emit!(TaskCreated {
            task_pubkey: task.key(),
            task_id,
            campaign: ctx.accounts.campaign.key(),
            creator: ctx.accounts.creator.key(),
            title,
            target_budget,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Open budget voting
    pub fn start_budget_voting(ctx: Context<StartBudgetVoting>) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(
            task.can_transition_to(&TaskState::VotingBudget),
            TaskError::InvalidStateTransition
        );

        let old_state = task.state.clone();
        task.state = TaskState::VotingBudget;
        task.budget_voting_started_at = Some(clock.unix_timestamp);
        task.updated_at = clock.unix_timestamp;

        emit!(TaskStateChanged {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            old_state,
            new_state: task.state.clone(),
            changed_at: clock.unix_timestamp,
        });

        emit!(BudgetVotingStarted {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            started_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Finalize budget (called by budget_vote program via CPI)
    pub fn finalize_budget(ctx: Context<FinalizeBudget>, finalized_budget: u64) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(
            task.can_transition_to(&TaskState::BudgetFinalized),
            TaskError::InvalidStateTransition
        );

        task.finalized_budget = Some(finalized_budget);
        task.state = TaskState::BudgetFinalized;
        task.budget_finalized_at = Some(clock.unix_timestamp);
        task.updated_at = clock.unix_timestamp;

        emit!(BudgetFinalized {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            finalized_budget,
            finalized_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Submit proof of work
    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        proof_hash: String,
        proof_uri: String,
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(
            task.can_transition_to(&TaskState::SubmittedForReview),
            TaskError::InvalidStateTransition
        );
        require!(task.recipient.is_some(), TaskError::RecipientNotSet);

        task.proof_hash = Some(proof_hash.clone());
        task.proof_uri = Some(proof_uri.clone());
        task.proof_submitted_at = Some(clock.unix_timestamp);
        task.state = TaskState::SubmittedForReview;
        task.updated_at = clock.unix_timestamp;

        emit!(ProofSubmitted {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            recipient: task.recipient.unwrap(),
            proof_hash,
            proof_uri,
            submitted_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Approve task (called after donor vote)
    pub fn approve_task(ctx: Context<UpdateTaskState>) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(
            task.can_transition_to(&TaskState::Approved),
            TaskError::InvalidStateTransition
        );

        task.state = TaskState::Approved;
        task.approved_at = Some(clock.unix_timestamp);
        task.updated_at = clock.unix_timestamp;

        emit!(TaskApproved {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            approved_at: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Reject task
    pub fn reject_task(ctx: Context<UpdateTaskState>) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        require!(
            task.can_transition_to(&TaskState::Rejected),
            TaskError::InvalidStateTransition
        );

        task.state = TaskState::Rejected;
        task.updated_at = clock.unix_timestamp;

        emit!(TaskRejected {
            task_pubkey: task.key(),
            task_id: task.task_id.clone(),
            rejected_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

// Account contexts
#[derive(Accounts)]
#[instruction(task_id: String)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = creator,
        space = Task::LEN,
        seeds = [b"task", campaign.key().as_ref(), task_id.as_bytes()],
        bump
    )]
    pub task: Account<'info, Task>,

    /// CHECK: Validated by campaign_registry
    pub campaign: UncheckedAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartBudgetVoting<'info> {
    #[account(
        mut,
        constraint = task.creator == creator.key() @ TaskError::UnauthorizedCreator
    )]
    pub task: Account<'info, Task>,

    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTaskState<'info> {
    #[account(mut)]
    pub task: Account<'info, Task>,

    /// Authority (could be DAO/governance for approve/reject operations)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeBudget<'info> {
    #[account(mut)]
    pub task: Account<'info, Task>,

    /// CHECK: Only budget_vote program can call this
    pub budget_vote_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        mut,
        constraint = task.recipient == Some(recipient.key()) @ TaskError::UnauthorizedRecipient
    )]
    pub task: Account<'info, Task>,

    pub recipient: Signer<'info>,
}
