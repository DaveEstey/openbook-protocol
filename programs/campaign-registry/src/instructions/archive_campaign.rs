use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CampaignError;
use crate::events::*;

#[derive(Accounts)]
pub struct ArchiveCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        constraint = campaign.creator == creator.key() @ CampaignError::UnauthorizedCreator,
    )]
    pub campaign: Account<'info, Campaign>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<ArchiveCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let clock = Clock::get()?;

    let old_state = campaign.state.clone();
    campaign.state = CampaignState::Archived;
    campaign.updated_at = clock.unix_timestamp;

    // Emit events
    emit!(CampaignArchived {
        campaign_pubkey: campaign.key(),
        campaign_id: campaign.campaign_id.clone(),
        archived_by: ctx.accounts.creator.key(),
        archived_at: clock.unix_timestamp,
    });

    emit!(CampaignStateChanged {
        campaign_pubkey: campaign.key(),
        campaign_id: campaign.campaign_id.clone(),
        old_state,
        new_state: campaign.state.clone(),
        changed_at: clock.unix_timestamp,
    });

    Ok(())
}
