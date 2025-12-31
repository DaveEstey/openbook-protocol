use anchor_lang::prelude::*;

declare_id!("Disp1111111111111111111111111111111111111111");

#[program]
pub mod dispute_module {
    use super::*;

    /// Open a dispute
    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        reason: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        dispute.task = ctx.accounts.task.key();
        dispute.initiator = ctx.accounts.initiator.key();
        dispute.reason = reason.clone();
        dispute.opened_at = clock.unix_timestamp;
        dispute.resolution_deadline = clock.unix_timestamp + (14 * 24 * 60 * 60); // 14 days
        dispute.status = DisputeStatus::Open;
        dispute.resolution = None;

        emit!(DisputeOpened {
            task: ctx.accounts.task.key(),
            initiator: ctx.accounts.initiator.key(),
            reason,
            opened_at: clock.unix_timestamp,
        });

        // Would CPI to escrow to freeze funds
        // freeze_escrow_cpi(ctx.accounts.task.key())?;

        Ok(())
    }

    /// Resolve dispute (multisig only)
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        resolution: DisputeResolution,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        let clock = Clock::get()?;

        require!(
            dispute.status == DisputeStatus::Open,
            DisputeError::DisputeNotOpen
        );

        dispute.status = DisputeStatus::Resolved;
        dispute.resolution = Some(resolution.clone());
        dispute.resolved_at = Some(clock.unix_timestamp);

        emit!(DisputeResolved {
            task: ctx.accounts.task.key(),
            resolution: resolution.clone(),
            resolved_at: clock.unix_timestamp,
        });

        // Would CPI to escrow to unfreeze and execute outcome
        match resolution {
            DisputeResolution::PayoutToRecipient => {
                // unfreeze_and_payout_cpi()?;
            },
            DisputeResolution::RefundToDonors => {
                // unfreeze_and_refund_cpi()?;
            },
            DisputeResolution::PartialPayoutPartialRefund { payout_percent } => {
                // unfreeze_and_split_cpi(payout_percent)?;
            },
        }

        Ok(())
    }
}

#[account]
pub struct Dispute {
    pub task: Pubkey,
    pub initiator: Pubkey,
    pub reason: String,
    pub opened_at: i64,
    pub resolution_deadline: i64,
    pub status: DisputeStatus,
    pub resolution: Option<DisputeResolution>,
    pub resolved_at: Option<i64>,
}

impl Dispute {
    pub const LEN: usize = 8 + 32 + 32 + (4 + 500) + 8 + 8 + 1 + (1 + 32) + (1 + 8);
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum DisputeStatus {
    Open,
    Resolved,
    Expired,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DisputeResolution {
    PayoutToRecipient,
    RefundToDonors,
    PartialPayoutPartialRefund { payout_percent: u8 },
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(
        init,
        payer = initiator,
        space = Dispute::LEN,
        seeds = [b"dispute", task.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    #[account(mut)]
    pub initiator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"dispute", task.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    /// Multisig authority (DAO)
    pub authority: Signer<'info>,
}

#[event]
pub struct DisputeOpened {
    pub task: Pubkey,
    pub initiator: Pubkey,
    pub reason: String,
    pub opened_at: i64,
}

#[event]
pub struct DisputeResolved {
    pub task: Pubkey,
    pub resolution: DisputeResolution,
    pub resolved_at: i64,
}

#[error_code]
pub enum DisputeError {
    #[msg("Dispute is not in open status")]
    DisputeNotOpen,

    #[msg("Unauthorized to resolve dispute")]
    UnauthorizedResolver,
}
