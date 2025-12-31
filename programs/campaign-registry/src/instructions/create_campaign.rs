use anchor_lang::prelude::*;
use crate::state::*;
use crate::error::CampaignError;
use crate::events::*;

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = creator,
        space = Campaign::LEN,
        seeds = [b"campaign", creator.key().as_ref(), campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateCampaign>,
    campaign_id: String,
    title: String,
    description: String,
    metadata_uri: String,
    category: String,
) -> Result<()> {
    // Validate all inputs
    require!(
        Campaign::validate_campaign_id(&campaign_id),
        CampaignError::InvalidCampaignId
    );
    require!(
        Campaign::validate_title(&title),
        CampaignError::InvalidTitle
    );
    require!(
        Campaign::validate_description(&description),
        CampaignError::InvalidDescription
    );
    require!(
        Campaign::validate_metadata_uri(&metadata_uri),
        CampaignError::InvalidMetadataUri
    );
    require!(
        Campaign::validate_category(&category),
        CampaignError::InvalidCategory
    );

    let campaign = &mut ctx.accounts.campaign;
    let clock = Clock::get()?;

    // Initialize campaign
    campaign.campaign_id = campaign_id.clone();
    campaign.creator = ctx.accounts.creator.key();
    campaign.title = title.clone();
    campaign.description = description;
    campaign.metadata_uri = metadata_uri;
    campaign.category = category.clone();
    campaign.state = CampaignState::Draft;
    campaign.tasks_count = 0;
    campaign.created_at = clock.unix_timestamp;
    campaign.updated_at = clock.unix_timestamp;
    campaign.published_at = None;
    campaign.bump = ctx.bumps.campaign;

    // Emit event
    emit!(CampaignCreated {
        campaign_pubkey: campaign.key(),
        campaign_id,
        creator: ctx.accounts.creator.key(),
        title,
        category,
        created_at: clock.unix_timestamp,
    });

    Ok(())
}
