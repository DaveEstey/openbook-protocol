use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};

declare_id!("Gove1111111111111111111111111111111111111111");

/// Total supply: 100 million OBOOK tokens
pub const TOTAL_SUPPLY: u64 = 100_000_000_000_000; // 6 decimals

#[program]
pub mod governance_token {
    use super::*;

    /// Initialize OBOOK governance token
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let governance_state = &mut ctx.accounts.governance_state;
        governance_state.total_minted = 0;
        governance_state.authority = ctx.accounts.authority.key();

        Ok(())
    }

    /// Mint tokens (for initial distribution)
    /// Distribution:
    /// - 20% Early contributors (vesting)
    /// - 30% Community airdrop
    /// - 25% DAO treasury
    /// - 15% Ecosystem fund
    /// - 10% Future contributors
    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
        recipient_type: RecipientType,
    ) -> Result<()> {
        let governance_state = &mut ctx.accounts.governance_state;

        // Check total supply cap
        require!(
            governance_state.total_minted + amount <= TOTAL_SUPPLY,
            GovernanceError::ExceedsTotalSupply
        );

        // Mint tokens
        let seeds = &[
            b"governance",
            &[ctx.bumps.governance_state],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.governance_state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, amount)?;

        governance_state.total_minted += amount;

        emit!(TokensMinted {
            recipient: ctx.accounts.recipient_token_account.key(),
            amount,
            recipient_type,
            total_minted: governance_state.total_minted,
        });

        Ok(())
    }
}

#[account]
pub struct GovernanceState {
    pub total_minted: u64,
    pub authority: Pubkey,  // Can be transferred to DAO
}

impl GovernanceState {
    pub const LEN: usize = 8 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum RecipientType {
    EarlyContributor,
    CommunityAirdrop,
    DaoTreasury,
    EcosystemFund,
    FutureContributor,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = GovernanceState::LEN,
        seeds = [b"governance"],
        bump
    )]
    pub governance_state: Account<'info, GovernanceState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        mut,
        seeds = [b"governance"],
        bump,
        constraint = governance_state.authority == authority.key()
    )]
    pub governance_state: Account<'info, GovernanceState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[event]
pub struct TokensMinted {
    pub recipient: Pubkey,
    pub amount: u64,
    pub recipient_type: RecipientType,
    pub total_minted: u64,
}

#[error_code]
pub enum GovernanceError {
    #[msg("Minting would exceed total supply cap")]
    ExceedsTotalSupply,

    #[msg("Unauthorized")]
    Unauthorized,
}
