use anchor_lang::prelude::*;

#[error_code]
pub enum CampaignError {
    #[msg("Campaign ID is invalid (only alphanumeric, dash, underscore allowed)")]
    InvalidCampaignId,

    #[msg("Title is too long or empty")]
    InvalidTitle,

    #[msg("Description is too long")]
    InvalidDescription,

    #[msg("Metadata URI is invalid or too long")]
    InvalidMetadataUri,

    #[msg("Category is invalid or too long")]
    InvalidCategory,

    #[msg("Campaign is not in editable state (must be DRAFT)")]
    NotEditable,

    #[msg("Campaign cannot add tasks in current state")]
    CannotAddTasks,

    #[msg("Only campaign creator can perform this action")]
    UnauthorizedCreator,

    ##[msg("Campaign is not in correct state for this operation")]
    InvalidState,

    #[msg("Campaign has active tasks and cannot be archived")]
    HasActiveTasks,
}
