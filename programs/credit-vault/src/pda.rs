//! Shared PDA create helper for vault + policy processors.
//! Clients cannot `SystemProgram.createAccount` a PDA — only the owning
//! program can sign the create via seeds (`invoke_signed`).

use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    system_program,
    sysvar::{rent::Rent, Sysvar},
};

const ERR_ACCOUNTS: u32 = 21;
const ERR_PDA: u32 = 22;

fn err(code: u32) -> ProgramError {
    ProgramError::Custom(code)
}

/// If `pda` is empty, create it with `create_account` + PDA seeds.
/// If it already exists with the right owner and length, no-op.
///
/// `system_program` must be present when the account does not yet exist.
pub fn ensure_pda_account<'info>(
    program_id: &Pubkey,
    payer: &AccountInfo<'info>,
    pda: &AccountInfo<'info>,
    system_program_ai: Option<&AccountInfo<'info>>,
    space: usize,
    seeds: &[&[u8]],
    bump: u8,
) -> ProgramResult {
    if pda.lamports() > 0 {
        if pda.owner != program_id {
            return Err(err(ERR_PDA));
        }
        if pda.data_len() < space {
            return Err(err(ERR_ACCOUNTS));
        }
        return Ok(());
    }

    let system_ai = system_program_ai.ok_or_else(|| err(ERR_ACCOUNTS))?;
    if *system_ai.key != system_program::id() {
        return Err(err(ERR_ACCOUNTS));
    }
    if !payer.is_signer {
        return Err(err(ERR_ACCOUNTS));
    }

    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(space);
    let ix = system_instruction::create_account(
        payer.key,
        pda.key,
        lamports,
        space as u64,
        program_id,
    );
    let bump_seed = [bump];
    let mut signer_seeds: Vec<&[u8]> = seeds.to_vec();
    signer_seeds.push(&bump_seed);
    invoke_signed(
        &ix,
        &[payer.clone(), pda.clone(), system_ai.clone()],
        &[&signer_seeds],
    )?;
    Ok(())
}
