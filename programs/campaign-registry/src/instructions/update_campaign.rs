use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CampaignError;
use crate::events::*;

#[derive(Accounts)]
pub struct UpdateCampaign<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.creator.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump,
        constraint = campaign.creator == creator.key() @ CampaignError::UnauthorizedCreator,
        constraint = campaign.is_editable() @ CampaignError::NotEditable,
    )]
    pub campaign: Account<'info, Campaign>,

    pub creator: Signer<'info>,
}

pub fn handler(
    ctx: Context<UpdateCampaign>,
    title: Option<String>,
    description: Option<String>,
    metadata_uri: Option<String>,
    category: Option<String>,
) -> Result<()> {
    let campaign = &mut ctx.accounts.campaign;
    let clock = Clock::get()?;

    // Update fields if provided
    if let Some(new_title) = title {
        require!(
            Campaign::validate_title(&new_title),
            CampaignError::InvalidTitle
        );
        campaign.title = new_title;
    }

    if let Some(new_description) = description {
        require!(
            Campaign::validate_description(&new_description),
            CampaignError::InvalidDescription
        );
        campaign.description = new_description;
    }

    if let Some(new_uri) = metadata_uri {
        require!(
            Campaign::validate_metadata_uri(&new_uri),
            CampaignError::InvalidMetadataUri
        );
        campaign.metadata_uri = new_uri;
    }

    if let Some(new_category) = category {
        require!(
            Campaign::validate_category(&new_category),
            CampaignError::InvalidCategory
        );
        campaign.category = new_category;
    }

    campaign.updated_at = clock.unix_timestamp;

    // Emit event
    emit!(CampaignUpdated {
        campaign_pubkey: campaign.key(),
        campaign_id: campaign.campaign_id.clone(),
        updated_by: ctx.accounts.creator.key(),
        updated_at: clock.unix_timestamp,
    });

    Ok(())
}
