use anchor_lang::prelude::*;
use crate::state::CampaignState;

/// Emitted when a campaign is created
#[event]
pub struct CampaignCreated {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub creator: Pubkey,
    pub title: String,
    pub category: String,
    pub created_at: i64,
}

/// Emitted when campaign metadata is updated
#[event]
pub struct CampaignUpdated {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub updated_by: Pubkey,
    pub updated_at: i64,
}

/// Emitted when campaign is published
#[event]
pub struct CampaignPublished {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub creator: Pubkey,
    pub published_at: i64,
}

/// Emitted when campaign state changes
#[event]
pub struct CampaignStateChanged {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub old_state: CampaignState,
    pub new_state: CampaignState,
    pub changed_at: i64,
}

/// Emitted when campaign is archived
#[event]
pub struct CampaignArchived {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub archived_by: Pubkey,
    pub archived_at: i64,
}

/// Emitted when a task is added to campaign
#[event]
pub struct TaskAddedToCampaign {
    pub campaign_pubkey: Pubkey,
    pub campaign_id: String,
    pub task_pubkey: Pubkey,
    pub tasks_count: u32,
    pub added_at: i64,
}
