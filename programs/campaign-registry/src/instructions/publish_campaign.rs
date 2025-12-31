use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CampaignError;
use crate::events::*;

#[derive(Accounts)]
pub struct PublishCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        constraint = campaign.creator == creator.key() @ CampaignError::UnauthorizedCreator,
        constraint = campaign.state == CampaignState::Draft @ CampaignError::InvalidState,
    )]
    pub campaign: Account<'info, Campaign>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<PublishCampaign>) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let clock = Clock::get()?;

    let old_state = campaign.state.clone();
    campaign.state = CampaignState::Published;
    campaign.published_at = Some(clock.unix_timestamp);
    campaign.updated_at = clock.unix_timestamp;

    // Emit events
    emit!(CampaignPublished {
        campaign_pubkey: campaign.key(),
        campaign_id: campaign.campaign_id.clone(),
        creator: ctx.accounts.creator.key(),
        published_at: clock.unix_timestamp,
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
