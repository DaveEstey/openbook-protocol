use anchor_lang::prelude::*;

declare_id!("Prof1111111111111111111111111111111111111111");

#[program]
pub mod proof_registry {
    use super::*;

    pub fn submit_proof(
        ctx: Context<SubmitProof>,
        proof_hash: String,
        proof_uri: String,
    ) -> Result<()> {
        let proof = &mut ctx.accounts.proof;
        let clock = Clock::get()?;

        proof.task = ctx.accounts.task.key();
        proof.recipient = ctx.accounts.recipient.key();
        proof.proof_hash = proof_hash.clone();
        proof.proof_uri = proof_uri.clone();
        proof.submitted_at = clock.unix_timestamp;

        emit!(ProofSubmitted {
            task: ctx.accounts.task.key(),
            recipient: ctx.accounts.recipient.key(),
            proof_hash,
            proof_uri,
            submitted_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_proof(
        ctx: Context<UpdateProof>,
        proof_hash: String,
        proof_uri: String,
    ) -> Result<()> {
        let proof = &mut ctx.accounts.proof;
        let clock = Clock::get()?;

        proof.proof_hash = proof_hash.clone();
        proof.proof_uri = proof_uri.clone();
        proof.updated_at = Some(clock.unix_timestamp);

        emit!(ProofUpdated {
            task: ctx.accounts.task.key(),
            proof_hash,
            proof_uri,
            updated_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

#[account]
pub struct Proof {
    pub task: Pubkey,
    pub recipient: Pubkey,
    pub proof_hash: String,      // SHA256 hash of deliverable
    pub proof_uri: String,        // IPFS/Arweave URI
    pub submitted_at: i64,
    pub updated_at: Option<i64>,
}

impl Proof {
    pub const LEN: usize = 8 + 32 + 32 + (4 + 64) + (4 + 200) + 8 + (1 + 8);
}

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        init,
        payer = recipient,
        space = Proof::LEN,
        seeds = [b"proof", task.key().as_ref()],
        bump
    )]
    pub proof: Account<'info, Proof>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    #[account(mut)]
    pub recipient: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProof<'info> {
    #[account(
        mut,
        seeds = [b"proof", task.key().as_ref()],
        bump,
        constraint = proof.recipient == recipient.key()
    )]
    pub proof: Account<'info, Proof>,

    /// CHECK: Task account
    pub task: UncheckedAccount<'info>,

    pub recipient: Signer<'info>,
}

#[event]
pub struct ProofSubmitted {
    pub task: Pubkey,
    pub recipient: Pubkey,
    pub proof_hash: String,
    pub proof_uri: String,
    pub submitted_at: i64,
}

#[event]
pub struct ProofUpdated {
    pub task: Pubkey,
    pub proof_hash: String,
    pub proof_uri: String,
    pub updated_at: i64,
}
