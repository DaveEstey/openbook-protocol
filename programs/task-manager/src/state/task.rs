use anchor_lang::prelude::*;

/// Task states - complete state machine
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum TaskState {
    Draft,                  // Initial state
    VotingBudget,          // Budget voting open
    BudgetFinalized,       // Budget locked
    FundingOpen,           // Accepting contributions
    Funded,                // Fully funded
    InProgress,            // Work started
    SubmittedForReview,    // Proof submitted
    Approved,              // Donors approved
    PaidOut,               // Recipient paid
    Rejected,              // Work rejected
    Refunding,             // Refunds being processed
    Refunded,              // All refunds complete
    Disputed,              // Under dispute
}

pub const MAX_TASK_ID_LEN: usize = 64;
pub const MAX_TASK_TITLE_LEN: usize = 100;
pub const MAX_DELIVERABLES_LEN: usize = 2000;
pub const MAX_PROOF_HASH_LEN: usize = 64;
pub const MAX_PROOF_URI_LEN: usize = 200;

/// Task account
/// PDA seeds: ["task", campaign.key(), task_id]
#[account]
pub struct Task {
    /// Unique identifier within campaign
    pub task_id: String,

    /// Parent campaign
    pub campaign: Pubkey,

    /// Task creator (often same as campaign creator)
    pub creator: Pubkey,

    /// Recipient who will execute the task
    pub recipient: Option<Pubkey>,

    /// Task title
    pub title: String,

    /// Deliverables description
    pub deliverables: String,

    /// Deadline timestamp (unix)
    pub deadline: Option<i64>,

    /// Initial target budget (for reference)
    pub target_budget: u64,

    /// Finalized budget (from weighted median vote)
    pub finalized_budget: Option<u64>,

    /// Current state
    pub state: TaskState,

    /// When created
    pub created_at: i64,

    /// Last updated
    pub updated_at: i64,

    /// When budget voting started
    pub budget_voting_started_at: Option<i64>,

    /// When budget was finalized
    pub budget_finalized_at: Option<i64>,

    /// When funding opened
    pub funding_opened_at: Option<i64>,

    /// When work started
    pub work_started_at: Option<i64>,

    /// Proof hash (SHA256 of deliverable)
    pub proof_hash: Option<String>,

    /// Proof URI (IPFS/Arweave)
    pub proof_uri: Option<String>,

    /// When proof submitted
    pub proof_submitted_at: Option<i64>,

    /// When approved
    pub approved_at: Option<i64>,

    /// When paid out
    pub paid_out_at: Option<i64>,

    /// PDA bump
    pub bump: u8,
}

impl Task {
    pub const LEN: usize = 8 + // discriminator
        4 + MAX_TASK_ID_LEN +
        32 + // campaign
        32 + // creator
        1 + 32 + // recipient (Option<Pubkey>)
        4 + MAX_TASK_TITLE_LEN +
        4 + MAX_DELIVERABLES_LEN +
        1 + 8 + // deadline (Option<i64>)
        8 + // target_budget
        1 + 8 + // finalized_budget (Option<u64>)
        1 + // state (enum, 1 byte for variants up to 256)
        8 + // created_at
        8 + // updated_at
        1 + 8 + // budget_voting_started_at
        1 + 8 + // budget_finalized_at
        1 + 8 + // funding_opened_at
        1 + 8 + // work_started_at
        1 + 4 + MAX_PROOF_HASH_LEN + // proof_hash (Option<String>)
        1 + 4 + MAX_PROOF_URI_LEN + // proof_uri (Option<String>)
        1 + 8 + // proof_submitted_at
        1 + 8 + // approved_at
        1 + 8 + // paid_out_at
        1; // bump

    /// Check if task can transition to new state
    pub fn can_transition_to(&self, new_state: &TaskState) -> bool {
        use TaskState::*;

        matches!(
            (&self.state, new_state),
            // From Draft
            (Draft, VotingBudget) |

            // From VotingBudget
            (VotingBudget, BudgetFinalized) |

            // From BudgetFinalized
            (BudgetFinalized, FundingOpen) |

            // From FundingOpen
            (FundingOpen, Funded) |
            (FundingOpen, Refunding) | // If no contributions

            // From Funded
            (Funded, InProgress) |

            // From InProgress
            (InProgress, SubmittedForReview) |
            (InProgress, Refunding) | // If deadline missed

            // From SubmittedForReview
            (SubmittedForReview, Approved) |
            (SubmittedForReview, Rejected) |
            (SubmittedForReview, Disputed) |

            // From Approved
            (Approved, PaidOut) |

            // From Rejected
            (Rejected, Refunding) |

            // From Refunding
            (Refunding, Refunded) |

            // From Disputed
            (Disputed, Approved) |
            (Disputed, Rejected) |

            // Any state can go to Disputed
            (_, Disputed)
        )
    }

    /// Check if deadline has passed
    pub fn is_past_deadline(&self, current_time: i64) -> bool {
        if let Some(deadline) = self.deadline {
            current_time > deadline
        } else {
            false
        }
    }

    /// Validate task ID
    pub fn validate_task_id(id: &str) -> bool {
        !id.is_empty() && id.len() <= MAX_TASK_ID_LEN &&
        id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    }

    /// Validate title
    pub fn validate_title(title: &str) -> bool {
        !title.is_empty() && title.len() <= MAX_TASK_TITLE_LEN
    }

    /// Validate deliverables
    pub fn validate_deliverables(deliverables: &str) -> bool {
        !deliverables.is_empty() && deliverables.len() <= MAX_DELIVERABLES_LEN
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_transitions() {
        let task = Task {
            task_id: "test".to_string(),
            campaign: Pubkey::default(),
            creator: Pubkey::default(),
            recipient: None,
            title: "Test".to_string(),
            deliverables: "Test".to_string(),
            deadline: None,
            target_budget: 100,
            finalized_budget: None,
            state: TaskState::Draft,
            created_at: 0,
            updated_at: 0,
            budget_voting_started_at: None,
            budget_finalized_at: None,
            funding_opened_at: None,
            work_started_at: None,
            proof_hash: None,
            proof_uri: None,
            proof_submitted_at: None,
            approved_at: None,
            paid_out_at: None,
            bump: 0,
        };

        // Valid transitions
        assert!(task.can_transition_to(&TaskState::VotingBudget));

        // Invalid transitions
        assert!(!task.can_transition_to(&TaskState::Funded));
        assert!(!task.can_transition_to(&TaskState::PaidOut));

        // Can always dispute
        assert!(task.can_transition_to(&TaskState::Disputed));
    }
}
