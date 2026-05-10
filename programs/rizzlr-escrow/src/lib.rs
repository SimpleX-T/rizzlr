//! Anchor / Solana macros use `cfg(feature = "...")` flags Rust 1.79+ check-cfg
//! does not know until workspace declares them — silence noisy rebuild warnings.
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::system_program::{self, Transfer};

declare_id!("7Qiy37JApZuYj24dPS5bZd7QkE9QVRJbMQozoY6u2zYJ");

#[program]
pub mod rizzlr_escrow {
    use super::*;

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        challenge_id: [u8; 16],
        wager_per_side: u64,
        expires_ts: i64,
    ) -> Result<()> {
        require!(wager_per_side > 0, EscrowError::ZeroWager);

        let escrow = &mut ctx.accounts.escrow;
        escrow.authority = ctx.accounts.authority.key();
        escrow.creator = ctx.accounts.creator.key();
        escrow.challenge_id = challenge_id;
        escrow.wager_per_side = wager_per_side;
        escrow.challenger = Pubkey::default();
        escrow.creator_deposited = true;
        escrow.challenger_deposited = false;
        escrow.settled = false;
        escrow.refunded = false;
        escrow.expires_ts = expires_ts;
        escrow.bump = ctx.bumps.escrow;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            wager_per_side,
        )?;

        Ok(())
    }

    pub fn deposit_challenger(ctx: Context<DepositChallenger>) -> Result<()> {
        {
            let escrow = &ctx.accounts.escrow;
            require!(!escrow.settled && !escrow.refunded, EscrowError::BadState);
            require!(escrow.challenger == Pubkey::default(), EscrowError::AlreadyJoined);
            require!(escrow.creator_deposited, EscrowError::NotFunded);
        }

        let amount = ctx.accounts.escrow.wager_per_side;
        let challenger_pk = ctx.accounts.challenger.key();

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.challenger.to_account_info(),
                    to: ctx.accounts.escrow.to_account_info(),
                },
            ),
            amount,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.challenger = challenger_pk;
        escrow.challenger_deposited = true;
        Ok(())
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        {
            let escrow = &ctx.accounts.escrow;
            require_keys_eq!(ctx.accounts.authority.key(), escrow.authority);
            require!(!escrow.settled && !escrow.refunded, EscrowError::BadState);
            require!(
                escrow.creator_deposited && escrow.challenger_deposited,
                EscrowError::NotFullyFunded
            );

            let winner = ctx.accounts.winner.key();
            require!(
                winner == escrow.creator || winner == escrow.challenger,
                EscrowError::BadWinner
            );
        }

        let bump = ctx.accounts.escrow.bump;
        let challenge_id = ctx.accounts.escrow.challenge_id;
        let escrow_ai = ctx.accounts.escrow.to_account_info();
        let winner_ai = ctx.accounts.winner.to_account_info();

        let rent = Rent::get()?.minimum_balance(escrow_ai.data_len());
        let bal = **escrow_ai.lamports.borrow();
        let payout = bal.checked_sub(rent).ok_or(error!(EscrowError::Underflow))?;
        require!(payout > 0, EscrowError::NothingToPay);

        let seeds: &[&[u8]] = &[b"escrow", challenge_id.as_ref(), &[bump]];
        invoke_signed(
            &system_instruction::transfer(escrow_ai.key, winner_ai.key, payout),
            &[escrow_ai.clone(), winner_ai.clone()],
            &[seeds],
        )?;

        ctx.accounts.escrow.settled = true;
        Ok(())
    }

    /// Refund locked stake when the challenger never deposited before expiry (ghost).
    pub fn refund_expired(ctx: Context<RefundExpired>) -> Result<()> {
        {
            let escrow = &ctx.accounts.escrow;
            require_keys_eq!(ctx.accounts.authority.key(), escrow.authority);
            require!(!escrow.settled && !escrow.refunded, EscrowError::BadState);
            require!(!escrow.challenger_deposited, EscrowError::HasChallenger);
            require!(
                Clock::get()?.unix_timestamp >= escrow.expires_ts,
                EscrowError::NotExpired
            );
        }

        let bump = ctx.accounts.escrow.bump;
        let challenge_id = ctx.accounts.escrow.challenge_id;
        let escrow_ai = ctx.accounts.escrow.to_account_info();
        let creator_ai = ctx.accounts.creator.to_account_info();

        let rent = Rent::get()?.minimum_balance(escrow_ai.data_len());
        let bal = **escrow_ai.lamports.borrow();
        let payout = bal.checked_sub(rent).ok_or(error!(EscrowError::Underflow))?;
        require!(payout > 0, EscrowError::NothingToPay);

        let seeds: &[&[u8]] = &[b"escrow", challenge_id.as_ref(), &[bump]];
        invoke_signed(
            &system_instruction::transfer(escrow_ai.key, creator_ai.key, payout),
            &[escrow_ai.clone(), creator_ai.clone()],
            &[seeds],
        )?;

        ctx.accounts.escrow.refunded = true;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(challenge_id: [u8; 16], wager_per_side: u64, expires_ts: i64)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [b"escrow", challenge_id.as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: backend settlement authority pubkey stored in escrow state
    pub authority: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositChallenger<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.challenge_id.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub challenger: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.challenge_id.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundExpired<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.challenge_id.as_ref()],
        bump = escrow.bump,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub authority: Signer<'info>,
    #[account(mut, constraint = creator.key() == escrow.creator @ EscrowError::BadWinner)]
    pub creator: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub authority: Pubkey,
    pub creator: Pubkey,
    pub challenger: Pubkey,
    pub challenge_id: [u8; 16],
    pub wager_per_side: u64,
    pub creator_deposited: bool,
    pub challenger_deposited: bool,
    pub settled: bool,
    pub refunded: bool,
    pub expires_ts: i64,
    pub bump: u8,
}

#[error_code]
pub enum EscrowError {
    #[msg("Wager must be positive")]
    ZeroWager,
    #[msg("Invalid escrow state")]
    BadState,
    #[msg("Challenger already joined")]
    AlreadyJoined,
    #[msg("Creator has not funded escrow")]
    NotFunded,
    #[msg("Both sides must deposit before settle")]
    NotFullyFunded,
    #[msg("Winner must be creator or challenger")]
    BadWinner,
    #[msg("Challenger funded — use settle")]
    HasChallenger,
    #[msg("Challenge has not expired")]
    NotExpired,
    #[msg("Math underflow")]
    Underflow,
    #[msg("Nothing to pay out")]
    NothingToPay,
}
