use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod error;
pub mod events;

use instructions::*;

declare_id!("Camp1111111111111111111111111111111111111111");

#[program]
pub mod campaign_registry {
    use super::*;

    /// Create a new campaign in DRAFT state
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: String,
        title: String,
        description: String,
        metadata_uri: String,
        category: String,
    ) -> Result<()> {
        instructions::create_campaign::handler(ctx, campaign_id, title, description, metadata_uri, category)
    }

    /// Update campaign metadata (only in DRAFT state)
    pub fn update_campaign(
        ctx: Context<UpdateCampaign>,
        title: Option<String>,
        description: Option<String>,
        metadata_uri: Option<String>,
        category: Option<String>,
    ) -> Result<()> {
        instructions::update_campaign::handler(ctx, title, description, metadata_uri, category)
    }

    /// Publish campaign (move from DRAFT to PUBLISHED)
    pub fn publish_campaign(ctx: Context<PublishCampaign>) -> Result<()> {
        instructions::publish_campaign::handler(ctx)
    }

    /// Archive campaign (only when all tasks complete or fail)
    pub fn archive_campaign(ctx: Context<ArchiveCampaign>) -> Result<()> {
        instructions::archive_campaign::handler(ctx)
    }

    /// Increment task count (called by task_manager program via CPI)
    pub fn increment_task_count(ctx: Context<IncrementTaskCount>) -> Result<()> {
        instructions::increment_task_count::handler(ctx)
    }
}
