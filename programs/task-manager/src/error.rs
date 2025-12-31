use anchor_lang::prelude::*;

#[error_code]
pub enum TaskError {
    #[msg("Invalid task ID format")]
    InvalidTaskId,

    #[msg("Invalid title")]
    InvalidTitle,

    #[msg("Invalid deliverables description")]
    InvalidDeliverables,

    #[msg("Invalid state transition")]
    InvalidStateTransition,

    #[msg("Task deadline has passed")]
    DeadlinePassed,

    #[msg("Only task creator can perform this action")]
    UnauthorizedCreator,

    #[msg("Only task recipient can perform this action")]
    UnauthorizedRecipient,

    #[msg("Budget must be finalized before this action")]
    BudgetNotFinalized,

    #[msg("Task must be fully funded before starting")]
    NotFullyFunded,

    #[msg("Proof already submitted")]
    ProofAlreadySubmitted,

    #[msg("No proof submitted")]
    NoProofSubmitted,

    #[msg("Task is not in correct state for this operation")]
    InvalidState,

    #[msg("Recipient not set")]
    RecipientNotSet,

    #[msg("Minimum contribution amount not met ($10 USDC)")]
    ContributionTooSmall,
}
