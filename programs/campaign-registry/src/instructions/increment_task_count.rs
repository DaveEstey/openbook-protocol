use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CampaignError;
use crate::events::*;

#[derive(Accounts)]
pub struct IncrementTaskCount<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        constraint = campaign.can_add_tasks() @ CampaignError::CannotAddTasks,
    )]
    pub campaign: Account<'info, Campaign>,

    /// The task being added (for event emission)
    /// CHECK: This is just for event, validated by task_manager program
    pub task: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<IncrementTaskCount>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let clock = Clock::get()?;

    campaign.tasks_count = campaign.tasks_count.checked_add(1).unwrap();
    campaign.updated_at = clock.unix_timestamp;

    // Update state to Active if was Published
    if campaign.state == CampaignState::Published {
        campaign.state = CampaignState::Active;
    }

    // Emit event
    emit!(TaskAddedToCampaign {
        campaign_pubkey: campaign.key(),
        campaign_id: campaign.campaign_id.clone(),
        task_pubkey: ctx.accounts.task.key(),
        tasks_count: campaign.tasks_count,
        added_at: clock.unix_timestamp,
    });

    Ok(())
}
