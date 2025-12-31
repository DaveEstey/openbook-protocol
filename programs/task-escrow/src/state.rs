use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    pub task: Pubkey,
    pub total_contributed: u64,
    pub total_refunded: u64,
    pub total_paid_out: u64,
    pub is_frozen: bool,  // For disputes
    pub bump: u8,
}

impl Escrow {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 1 + 1;

    /// INVARIANT: Balance must equal contributed - paid - refunded
    pub fn check_invariant(&self, actual_vault_balance: u64) -> bool {
        let expected_balance = self.total_contributed
            .saturating_sub(self.total_paid_out)
            .saturating_sub(self.total_refunded);

        actual_vault_balance == expected_balance
    }
}

#[account]
pub struct Contribution {
    pub task: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,  // Total contributed (cumulative if multiple contributions)
    pub contributed_at: i64,
    pub refunded: bool,
    pub refund_amount: u64,
}

impl Contribution {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 8;
}
