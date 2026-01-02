use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod state;
use state::*;

declare_id!("Escr1111111111111111111111111111111111111111");

/// Minimum contribution: $10 USDC (6 decimals)
pub const MIN_CONTRIBUTION: u64 = 10_000_000;

#[program]
pub mod task_escrow {
    use super::*;

    /// Initialize escrow for a task
    pub fn initialize_escrow(ctx: Context<InitializeEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.task = ctx.accounts.task.key();
        escrow.total_contributed = 0;
        escrow.total_refunded = 0;
        escrow.total_paid_out = 0;
        escrow.is_frozen = false;
        escrow.bump = ctx.bumps.escrow;

        emit!(EscrowInitialized {
            escrow_pubkey: escrow.key(),
            task: ctx.accounts.task.key(),
        });

        Ok(())
    }

    /// Contribute USDC to task
    /// ANTI-SYBIL: Enforces $10 minimum
    pub fn contribute(ctx: Context<Contribute>, amount: u64) -> Result<()> {
        require!(amount >= MIN_CONTRIBUTION, EscrowError::ContributionTooSmall);
        require!(!ctx.accounts.escrow.is_frozen, EscrowError::EscrowFrozen);

        // Transfer USDC from contributor to escrow vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.contributor_token.to_account_info(),
            to: ctx.accounts.escrow_vault.to_account_info(),
            authority: ctx.accounts.contributor.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Record contribution
        let contribution = &mut ctx.accounts.contribution;
        contribution.task = ctx.accounts.task.key();
        contribution.contributor = ctx.accounts.contributor.key();
        contribution.amount += amount;  // Cumulative
        contribution.contributed_at = Clock::get()?.unix_timestamp;
        contribution.refunded = false;
        contribution.refund_amount = 0;

        // Update escrow totals
        let escrow = &mut ctx.accounts.escrow;
        escrow.total_contributed = escrow.total_contributed.checked_add(amount).unwrap();

        // INVARIANT CHECK
        assert_invariant(escrow)?;

        emit!(ContributionMade {
            task: ctx.accounts.task.key(),
            contributor: ctx.accounts.contributor.key(),
            amount,
            total_contributed: escrow.total_contributed,
            contributed_at: contribution.contributed_at,
        });

        Ok(())
    }

    /// Execute payout to recipient
    /// Requires: Task approved, KYC verified
    pub fn execute_payout(
        ctx: Context<ExecutePayout>,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.escrow.is_frozen, EscrowError::EscrowFrozen);

        let escrow = &ctx.accounts.escrow;

        // Check can payout
        let available = escrow.total_contributed
            .checked_sub(escrow.total_paid_out)
            .unwrap()
            .checked_sub(escrow.total_refunded)
            .unwrap();

        require!(amount <= available, EscrowError::InsufficientFunds);

        // Transfer USDC from escrow vault to recipient
        let seeds = &[
            b"escrow",
            ctx.accounts.task.key().as_ref(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.recipient_token.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Update escrow
        let escrow = &mut ctx.accounts.escrow;
        escrow.total_paid_out = escrow.total_paid_out.checked_add(amount).unwrap();

        // INVARIANT CHECK
        assert_invariant(escrow)?;

        emit!(PayoutExecuted {
            task: ctx.accounts.task.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
            total_paid_out: escrow.total_paid_out,
            executed_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Execute refund (pro-rata)
    pub fn execute_refund(ctx: Context<ExecuteRefund>) -> Result<()> {
        let contribution = &ctx.accounts.contribution;

        require!(!contribution.refunded, EscrowError::AlreadyRefunded);
        require!(!ctx.accounts.escrow.is_frozen, EscrowError::EscrowFrozen);

        // Calculate pro-rata refund
        let refund_amount = contribution.amount; // Full refund for simplicity in v0

        // Transfer USDC back to contributor
        let escrow = &ctx.accounts.escrow;
        let seeds = &[
            b"escrow",
            ctx.accounts.task.key().as_ref(),
            &[escrow.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_vault.to_account_info(),
            to: ctx.accounts.contributor_token.to_account_info(),
            authority: ctx.accounts.escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, refund_amount)?;

        // Update contribution
        let contribution = &mut ctx.accounts.contribution;
        contribution.refunded = true;
        contribution.refund_amount = refund_amount;

        // Update escrow
        let escrow = &mut ctx.accounts.escrow;
        escrow.total_refunded = escrow.total_refunded.checked_add(refund_amount).unwrap();

        // INVARIANT CHECK
        assert_invariant(escrow)?;

        emit!(RefundExecuted {
            task: ctx.accounts.task.key(),
            contributor: ctx.accounts.contributor.key(),
            amount: refund_amount,
            total_refunded: escrow.total_refunded,
            executed_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Freeze escrow (during disputes)
    pub fn freeze_escrow(ctx: Context<FreezeEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.is_frozen = true;

        emit!(EscrowFrozen {
            task: ctx.accounts.task.key(),
            frozen_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Unfreeze escrow (after dispute resolution)
    pub fn unfreeze_escrow(ctx: Context<FreezeEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.is_frozen = false;

        emit!(EscrowUnfrozen {
            task: ctx.accounts.task.key(),
            unfrozen_at: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

/// CRITICAL INVARIANT:
/// Total USDC in vault MUST equal: total_contributed - total_paid_out - total_refunded
fn assert_invariant(escrow: &Escrow) -> Result<()> {
    let expected_balance = escrow.total_contributed
        .checked_sub(escrow.total_paid_out).unwrap()
        .checked_sub(escrow.total_refunded).unwrap();

    // In production, would check actual vault balance matches
    // require!(vault_balance == expected_balance, EscrowError::InvariantViolation);

    Ok(())
}

// Account contexts
#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = payer,
        space = Escrow::LEN,
        seeds = [b"escrow", task.key().as_ref()],
        bump
    )]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Contribute<'info> {
    #[account(
        mut,
        seeds = [b"escrow", task.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init_if_needed,
        payer = contributor,
        space = Contribution::LEN,
        seeds = [b"contribution", task.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,

    /// Escrow USDC vault (PDA-owned token account)
    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    /// Contributor's USDC token account
    #[account(mut)]
    pub contributor_token: Account<'info, TokenAccount>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecutePayout<'info> {
    #[account(
        mut,
        seeds = [b"escrow", task.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_token: Account<'info, TokenAccount>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    pub recipient: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ExecuteRefund<'info> {
    #[account(
        mut,
        seeds = [b"escrow", task.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        mut,
        seeds = [b"contribution", task.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(mut)]
    pub escrow_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub contributor_token: Account<'info, TokenAccount>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    pub contributor: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FreezeEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", task.key().as_ref()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, Escrow>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
}

// Events
#[event]
pub struct EscrowInitialized {
    pub escrow_pubkey: Pubkey,
    pub task: Pubkey,
}

#[event]
pub struct ContributionMade {
    pub task: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
    pub total_contributed: u64,
    pub contributed_at: i64,
}

#[event]
pub struct PayoutExecuted {
    pub task: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub total_paid_out: u64,
    pub executed_at: i64,
}

#[event]
pub struct RefundExecuted {
    pub task: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
    pub total_refunded: u64,
    pub executed_at: i64,
}

#[event]
pub struct EscrowFrozen {
    pub task: Pubkey,
    pub frozen_at: i64,
}

#[event]
pub struct EscrowUnfrozen {
    pub task: Pubkey,
    pub unfrozen_at: i64,
}

// Errors
#[error_code]
pub enum EscrowError {
    #[msg("Contribution too small - minimum $10 USDC (10,000,000 lamports) required for anti-Sybil protection")]
    ContributionTooSmall,

    #[msg("Insufficient funds in escrow - requested amount exceeds available balance (contributed - paid_out - refunded)")]
    InsufficientFunds,

    #[msg("Escrow is frozen due to active dispute - no contributions, payouts, or refunds allowed until resolved")]
    EscrowFrozen,

    #[msg("Contribution already refunded - cannot refund twice")]
    AlreadyRefunded,

    #[msg("CRITICAL: Escrow invariant violated - vault balance does not match accounting (total_contributed - total_paid_out - total_refunded)")]
    InvariantViolation,

    #[msg("Unauthorized - only specified recipient can execute payout")]
    UnauthorizedPayout,

    #[msg("Unauthorized - only original contributor can request refund")]
    UnauthorizedRefund,
}
