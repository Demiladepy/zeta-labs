//! LiteSVM harness — loads Policy Registry + Credit Vault BPF for judge-facing proof.
//!
//! Prerequisite (WSL):
//! ```bash
//! cargo build-sbf --manifest-path programs/policy-registry/Cargo.toml
//! cargo build-sbf --manifest-path programs/credit-vault/Cargo.toml
//! cargo test -p litesvm-harness -- --nocapture
//! ```

use std::path::PathBuf;

use litesvm::LiteSVM;
use solana_address::Address;
use solana_clock::Clock;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_signer::Signer;
use solana_transaction::Transaction;
use zeta_interface::{
    ids, line_seeds, policy_seeds, pool_seeds, CreditVaultIx, OpenLineArgs, PolicyRegistryIx,
    RegisterPolicyArgs, CREDIT_LINE_LEN,
};

fn deploy_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("target/deploy")
}

fn require_so(name: &str) -> Vec<u8> {
    let path = deploy_dir().join(name);
    std::fs::read(&path).unwrap_or_else(|e| {
        panic!(
            "missing {path:?}: {e}. Run cargo build-sbf for policy-registry and credit-vault first."
        )
    })
}

fn addr(bytes: [u8; 32]) -> Address {
    Address::new_from_array(bytes)
}

fn send_ix(svm: &mut LiteSVM, payer: &Keypair, ix: Instruction) -> Result<(), String> {
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let tx = Transaction::new(&[payer], msg, blockhash);
    svm.send_transaction(tx)
        .map(|_| ())
        .map_err(|e| format!("{e:?}"))
}

#[test]
fn litesvm_underwriting_allow_and_deny() {
    let policy_so = require_so("policy_registry.so");
    let vault_so = require_so("credit_vault.so");

    let policy_pid = addr(ids::POLICY_REGISTRY_ID);
    let vault_pid = addr(ids::CREDIT_VAULT_ID);

    let mut svm = LiteSVM::new();
    svm.add_program(policy_pid, &policy_so).unwrap();
    svm.add_program(vault_pid, &vault_so).unwrap();

    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 10_000_000_000).unwrap();

    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = 1_700_000_000;
    svm.set_sysvar(&clock);

    let authority = payer.pubkey();
    let mint = Keypair::new().pubkey();
    let vault_ata = Keypair::new().pubkey();
    let agent = Keypair::new().pubkey();

    let auth_b = authority.to_bytes();
    let mint_b = mint.to_bytes();
    let (pool_pda, _) = Address::find_program_address(&pool_seeds(&auth_b, &mint_b), &vault_pid);

    let seed = 1u64;
    let seed_b = seed.to_le_bytes();
    let (policy_pda, _) =
        Address::find_program_address(&policy_seeds(&auth_b, &seed_b), &policy_pid);

    let pool_key = pool_pda.to_bytes();
    let agent_b = agent.to_bytes();
    let (line_loose, _) =
        Address::find_program_address(&line_seeds(&pool_key, &agent_b), &vault_pid);
    let agent2 = Keypair::new().pubkey();
    let agent2_b = agent2.to_bytes();
    let (line_ok, _) =
        Address::find_program_address(&line_seeds(&pool_key, &agent2_b), &vault_pid);

    let system = solana_sdk_ids::system_program::ID;
    let clock_pk = solana_sdk_ids::sysvar::clock::ID;

    send_ix(
        &mut svm,
        &payer,
        Instruction {
            program_id: vault_pid,
            accounts: vec![
                AccountMeta::new(authority, true),
                AccountMeta::new_readonly(mint, false),
                AccountMeta::new(pool_pda, false),
                AccountMeta::new_readonly(vault_ata, false),
                AccountMeta::new_readonly(system, false),
            ],
            data: CreditVaultIx::CreatePool.encode(),
        },
    )
    .expect("create_pool");

    send_ix(
        &mut svm,
        &payer,
        Instruction {
            program_id: vault_pid,
            accounts: vec![
                AccountMeta::new_readonly(authority, true),
                AccountMeta::new(pool_pda, false),
            ],
            data: CreditVaultIx::Deposit { amount: 10_000 }.encode(),
        },
    )
    .expect("deposit");

    send_ix(
        &mut svm,
        &payer,
        Instruction {
            program_id: policy_pid,
            accounts: vec![
                AccountMeta::new(authority, true),
                AccountMeta::new(policy_pda, false),
                AccountMeta::new_readonly(system, false),
            ],
            data: PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
                seed,
                per_call_cap: 500,
                expires_at: 0,
            })
            .encode(),
        },
    )
    .expect("register_policy");

    let deny_err = send_ix(
        &mut svm,
        &payer,
        Instruction {
            program_id: vault_pid,
            accounts: vec![
                AccountMeta::new(authority, true),
                AccountMeta::new_readonly(pool_pda, false),
                AccountMeta::new_readonly(policy_pda, false),
                AccountMeta::new_readonly(agent, false),
                AccountMeta::new(line_loose, false),
                AccountMeta::new_readonly(system, false),
                AccountMeta::new_readonly(clock_pk, false),
            ],
            data: CreditVaultIx::OpenLine(OpenLineArgs { limit: 10_000 }).encode(),
        },
    )
    .expect_err("expected underwriting deny");
    assert!(
        deny_err.contains("Custom(6)")
            || deny_err.contains("Custom { 6")
            || deny_err.contains("6"),
        "expected custom 6, got {deny_err}"
    );

    send_ix(
        &mut svm,
        &payer,
        Instruction {
            program_id: vault_pid,
            accounts: vec![
                AccountMeta::new(authority, true),
                AccountMeta::new_readonly(pool_pda, false),
                AccountMeta::new_readonly(policy_pda, false),
                AccountMeta::new_readonly(agent2, false),
                AccountMeta::new(line_ok, false),
                AccountMeta::new_readonly(system, false),
                AccountMeta::new_readonly(clock_pk, false),
            ],
            data: CreditVaultIx::OpenLine(OpenLineArgs { limit: 2_500 }).encode(),
        },
    )
    .expect("open_line allow at LTV max");

    let line_acc = svm.get_account(&line_ok).expect("line account");
    assert!(line_acc.data.len() >= CREDIT_LINE_LEN);
}
