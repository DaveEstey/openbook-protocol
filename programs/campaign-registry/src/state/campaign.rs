use anchor_lang::prelude::*;

/// Campaign states follow a defined lifecycle
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum CampaignState {
    Draft,      // Initial state, can be edited
    Published,  // Published, tasks can be added
    Active,     // Has active tasks
    Completed,  // All tasks complete
    Archived,   // Archived by creator
}

/// Maximum string lengths to control account size
pub const MAX_TITLE_LEN: usize = 100;
pub const MAX_DESCRIPTION_LEN: usize = 500;  // Short on-chain, full desc in metadata_uri
pub const MAX_METADATA_URI_LEN: usize = 200;
pub const MAX_CATEGORY_LEN: usize = 50;
pub const MAX_CAMPAIGN_ID_LEN: usize = 64;

/// Campaign account - represents a fundraising campaign
///
/// PDAs seeds: ["campaign", creator.key(), campaign_id]
#[account]
pub struct Campaign {
    /// Unique identifier (creator-chosen, e.g., "save-the-ocean-2025")
    pub campaign_id: String,

    /// Creator's public key
    pub creator: Pubkey,

    /// Campaign title
    pub title: String,

    /// Short description (full description in metadata_uri)
    pub description: String,

    /// URI to full metadata (IPFS/Arweave)
    /// Contains: full description, images, videos, updates
    pub metadata_uri: String,

    /// Category for discovery (e.g., "Climate", "Education", "OpenSource")
    pub category: String,

    /// Current state
    pub state: CampaignState,

    /// Number of tasks associated with this campaign
    pub tasks_count: u32,

    /// Timestamp when created
    pub created_at: i64,

    /// Timestamp when last updated
    pub updated_at: i64,

    /// Timestamp when published (if published)
    pub published_at: Option<i64>,

    /// Bump seed for PDA
    pub bump: u8,
}

impl Campaign {
    /// Calculate space needed for this account
    /// 8 (discriminator) + fields
    pub const LEN: usize = 8 +  // discriminator
        4 + MAX_CAMPAIGN_ID_LEN +      // campaign_id (String with length prefix)
        32 +                             // creator (Pubkey)
        4 + MAX_TITLE_LEN +             // title
        4 + MAX_DESCRIPTION_LEN +       // description
        4 + MAX_METADATA_URI_LEN +      // metadata_uri
        4 + MAX_CATEGORY_LEN +          // category
        1 +                              // state (enum)
        4 +                              // tasks_count
        8 +                              // created_at
        8 +                              // updated_at
        1 + 8 +                          // published_at (Option<i64>)
        1;                               // bump

    /// Check if campaign can be edited
    pub fn is_editable(&self) -> bool {
        self.state == CampaignState::Draft
    }

    /// Check if tasks can be added
    pub fn can_add_tasks(&self) -> bool {
        matches!(self.state, CampaignState::Draft | CampaignState::Published | CampaignState::Active)
    }

    /// Validate title length
    pub fn validate_title(title: &str) -> bool {
        !title.is_empty() && title.len() <= MAX_TITLE_LEN
    }

    /// Validate description length
    pub fn validate_description(description: &str) -> bool {
        description.len() <= MAX_DESCRIPTION_LEN
    }

    /// Validate metadata URI
    pub fn validate_metadata_uri(uri: &str) -> bool {
        !uri.is_empty() && uri.len() <= MAX_METADATA_URI_LEN
    }

    /// Validate category
    pub fn validate_category(category: &str) -> bool {
        !category.is_empty() && category.len() <= MAX_CATEGORY_LEN
    }

    /// Validate campaign ID
    pub fn validate_campaign_id(id: &str) -> bool {
        !id.is_empty() && id.len() <= MAX_CAMPAIGN_ID_LEN &&
        id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_campaign_id_validation() {
        assert!(Campaign::validate_campaign_id("valid-campaign-123"));
        assert!(Campaign::validate_campaign_id("my_campaign"));
        assert!(!Campaign::validate_campaign_id("invalid campaign"));  // spaces
        assert!(!Campaign::validate_campaign_id("invalid@campaign"));  // special chars
        assert!(!Campaign::validate_campaign_id(""));  // empty
    }

    #[test]
    fn test_editable_states() {
        let mut campaign = Campaign {
            campaign_id: "test".to_string(),
            creator: Pubkey::default(),
            title: "Test".to_string(),
            description: "Test".to_string(),
            metadata_uri: "ipfs://test".to_string(),
            category: "Test".to_string(),
            state: CampaignState::Draft,
            tasks_count: 0,
            created_at: 0,
            updated_at: 0,
            published_at: None,
            bump: 0,
        };

        assert!(campaign.is_editable());

        campaign.state = CampaignState::Published;
        assert!(!campaign.is_editable());
    }
}
