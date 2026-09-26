//! Policy Registry v1. On-chain entrypoint lands on this state machine.
#![allow(unexpected_cfgs)]
//!
//! Instructions: `register_policy`, `evaluate`, `revoke`, `set_acl`, `set_caps`.

use zeta_interface::{
    evaluate as eval, AuditRecord, Denial, EvaluateArgs, EvaluateInput, Policy, RegisterPolicyArgs,
    ACCOUNT_DISCRIMINATOR_POLICY,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyError {
    Unauthorized,
    AlreadyRevoked,
    InvalidCap,
}

pub fn register_policy(
    issuer: [u8; 32],
    bump: u8,
    args: RegisterPolicyArgs,
) -> Result<Policy, PolicyError> {
    if args.per_call_cap == 0 {
        return Err(PolicyError::InvalidCap);
    }
    Ok(Policy {
        discriminator: ACCOUNT_DISCRIMINATOR_POLICY,
        issuer,
        seed: args.seed,
        per_call_cap: args.per_call_cap,
        expires_at: args.expires_at,
        rolling_cap: 0,
        total_cap: 0,
        acl_version: 0,
        revoked: false,
        bump,
        rolling_window_secs: 0,
        _pad: [0; 8],
    })
}

pub fn revoke(policy: &mut Policy, signer: [u8; 32]) -> Result<(), PolicyError> {
    if signer != policy.issuer {
        return Err(PolicyError::Unauthorized);
    }
    if policy.revoked {
        return Err(PolicyError::AlreadyRevoked);
    }
    policy.revoked = true;
    Ok(())
}

pub fn evaluate(
    policy: &Policy,
    line: [u8; 32],
    agent: [u8; 32],
    args: EvaluateArgs,
    now_unix: i64,
    slot: u64,
) -> (Denial, AuditRecord) {
    evaluate_at(
        policy,
        policy.issuer,
        line,
        agent,
        args,
        now_unix,
        slot,
        None,
        0,
        0,
        0,
        0,
    )
}

/// On-chain path stamps the policy PDA, not the issuer, into the audit.
pub fn evaluate_at(
    policy: &Policy,
    policy_key: [u8; 32],
    line: [u8; 32],
    agent: [u8; 32],
    args: EvaluateArgs,
    now_unix: i64,
    slot: u64,
    acl_allows: Option<bool>,
    line_drawn: u64,
    line_reserved: u64,
    rolling_spent: u64,
    window_start: i64,
) -> (Denial, AuditRecord) {
    let denial = eval(
        policy,
        EvaluateInput {
            amount: args.amount,
            now_unix,
            recipient: args.recipient,
            category: args.category,
            acl_allows,
            line_drawn,
            line_reserved,
            rolling_spent,
            window_start,
        },
    );
    let audit = AuditRecord::new(policy_key, line, agent, args.amount, denial, slot, now_unix);
    (denial, audit)
}

pub mod pda;
pub mod processor;
pub use processor::process_instruction;

#[cfg(test)]
mod tests {
    use super::*;
    use zeta_interface::Denial;

    #[test]
    fn register_and_revoke() {
        let args = RegisterPolicyArgs {
            seed: 1,
            per_call_cap: 10,
            expires_at: 0,
        };
        let mut p = register_policy([7; 32], 255, args).unwrap();
        assert!(revoke(&mut p, [8; 32]).is_err());
        assert!(revoke(&mut p, [7; 32]).is_ok());
        assert!(p.revoked);
        let (d, audit) = evaluate(
            &p,
            [1; 32],
            [2; 32],
            EvaluateArgs {
                amount: 5,
                recipient: [0; 32],
                category: 0,
            },
            1,
            1,
        );
        assert_eq!(d, Denial::Revoked);
        assert!(!audit.allowed);
    }
}
