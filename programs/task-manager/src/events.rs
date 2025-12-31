use anchor_lang::prelude::*;
use crate::state::TaskState;

#[event]
pub struct TaskCreated {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub campaign: Pubkey,
    pub creator: Pubkey,
    pub title: String,
    pub target_budget: u64,
    pub created_at: i64,
}

#[event]
pub struct TaskStateChanged {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub old_state: TaskState,
    pub new_state: TaskState,
    pub changed_at: i64,
}

#[event]
pub struct BudgetVotingStarted {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub started_at: i64,
}

#[event]
pub struct BudgetFinalized {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub finalized_budget: u64,
    pub finalized_at: i64,
}

#[event]
pub struct ProofSubmitted {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub recipient: Pubkey,
    pub proof_hash: String,
    pub proof_uri: String,
    pub submitted_at: i64,
}

#[event]
pub struct TaskApproved {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub approved_at: i64,
}

#[event]
pub struct TaskRejected {
    pub task_pubkey: Pubkey,
    pub task_id: String,
    pub rejected_at: i64,
}
