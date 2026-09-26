//! Layout + instruction + Payment Channels `open` wire tests.
//! These are the program-bytes fixtures Joshna's decoder must match.

use zeta_interface::{
    encode_payment_channels_open, open_slot_is_recent, AuditRecord, CreditLine, CreditVaultIx,
    Denial, DrawArgs, DrawChannelSpec, EvaluateArgs, OpenLineArgs, PaymentChannelsOpenAccounts,
    Policy, PolicyRegistryIx, Pool, RegisterPolicyArgs, RepayArgs, ACCOUNT_DISCRIMINATOR_LINE,
    ACCOUNT_DISCRIMINATOR_POLICY, ACCOUNT_DISCRIMINATOR_POOL, AUDIT_RECORD_LEN, CREDIT_LINE_LEN,
    DRAW_IX_HEADER_LEN, OPEN_SLOT_WINDOW, PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT,
    PAYMENT_CHANNELS_OPEN_DISC, PAYMENT_CHANNELS_OPEN_IX_HEADER_LEN, POLICY_LEN, POOL_LEN,
};

fn sample_pool() -> Pool {
    Pool {
        discriminator: ACCOUNT_DISCRIMINATOR_POOL,
        authority: [1; 32],
        mint: [2; 32],
        vault_ata: [3; 32],
        deposited: 10_000,
        outstanding: 400,
        bump: 255,
        _pad: [0; 7],
    }
}

fn sample_line() -> CreditLine {
    CreditLine {
        discriminator: ACCOUNT_DISCRIMINATOR_LINE,
        pool: [4; 32],
        agent: [5; 32],
        policy: [6; 32],
        limit: 2_000,
        drawn: 120,
        reserved: 400,
        bump: 254,
        _pad: [0; 7],
    }
}

fn sample_policy() -> Policy {
    Policy {
        discriminator: ACCOUNT_DISCRIMINATOR_POLICY,
        issuer: [7; 32],
        seed: 99,
        per_call_cap: 500,
        expires_at: 1_700_000_000,
        rolling_cap: 0,
        total_cap: 0,
        acl_version: 0,
        revoked: false,
        bump: 253,
        _pad: [0; 12],
    }
}

#[test]
fn pool_bytes_roundtrip_and_offsets() {
    let packed = sample_pool().pack();
    assert_eq!(packed.len(), POOL_LEN);
    assert_eq!(&packed[0..8], &ACCOUNT_DISCRIMINATOR_POOL.to_le_bytes());
    assert_eq!(&packed[8..40], &[1u8; 32]);
    assert_eq!(&packed[104..112], &10_000u64.to_le_bytes());
    assert_eq!(&packed[112..120], &400u64.to_le_bytes());
    assert_eq!(packed[120], 255);
    assert_eq!(Pool::unpack(&packed), Some(sample_pool()));
}

#[test]
fn line_and_policy_bytes_roundtrip() {
    let line = sample_line().pack();
    assert_eq!(line.len(), CREDIT_LINE_LEN);
    assert_eq!(CreditLine::unpack(&line), Some(sample_line()));
    let policy = sample_policy().pack();
    assert_eq!(policy.len(), POLICY_LEN);
    assert_eq!(&policy[40..48], &99u64.to_le_bytes());
    assert_eq!(policy[82], 0);
    assert_eq!(Policy::unpack(&policy), Some(sample_policy()));
}

#[test]
fn audit_record_bytes_roundtrip() {
    let rec = AuditRecord::new([1; 32], [2; 32], [3; 32], 40, Denial::Revoked, 9, 8);
    let packed = rec.pack();
    assert_eq!(packed.len(), AUDIT_RECORD_LEN);
    assert!(!rec.allowed);
    assert_eq!(packed[112], 0);
    assert_eq!(packed[113], Denial::Revoked.as_u8());
    assert_eq!(AuditRecord::unpack(&packed), Some(rec));
}

#[test]
fn instruction_codecs_roundtrip() {
    let reg = PolicyRegistryIx::RegisterPolicy(RegisterPolicyArgs {
        seed: 1,
        per_call_cap: 50,
        expires_at: 0,
    });
    assert_eq!(PolicyRegistryIx::decode(&reg.encode()).map(|ix| match ix {
        PolicyRegistryIx::RegisterPolicy(a) => a.per_call_cap,
        _ => 0,
    }), Some(50));

    let ev = PolicyRegistryIx::Evaluate(EvaluateArgs {
        amount: 7,
        recipient: [9; 32],
        category: 3,
    });
    let ev_dec = PolicyRegistryIx::decode(&ev.encode()).unwrap();
    match ev_dec {
        PolicyRegistryIx::Evaluate(a) => {
            assert_eq!(a.amount, 7);
            assert_eq!(a.category, 3);
        }
        _ => panic!("expected evaluate"),
    }

    let draw = CreditVaultIx::Draw(DrawArgs {
        amount: 400,
        salt: 11,
        grace_period: 60,
        open_slot: 99,
        category: 0,
    });
    let encoded = CreditVaultIx::encode_draw(
        DrawArgs {
            amount: 400,
            salt: 11,
            grace_period: 60,
            open_slot: 99,
            category: 0,
        },
        &[0xAB, 0xCD],
    );
    assert_eq!(encoded.len(), DRAW_IX_HEADER_LEN + 2);
    let (decoded, extra) = CreditVaultIx::decode(&encoded).unwrap();
    match decoded {
        CreditVaultIx::Draw(a) => assert_eq!(a.amount, 400),
        _ => panic!("expected draw"),
    }
    assert_eq!(extra, &[0xAB, 0xCD]);
    assert_eq!(draw.encode()[0], 3);

    let repay = CreditVaultIx::Repay(RepayArgs {
        reserved_this_draw: 400,
        settled: 120,
    });
    let (dec, _) = CreditVaultIx::decode(&repay.encode()).unwrap();
    match dec {
        CreditVaultIx::Repay(a) => assert_eq!(a.settled, 120),
        _ => panic!("expected repay"),
    }
    let _ = OpenLineArgs { limit: 1 }.pack();
}

#[test]
fn payment_channels_open_is_real_shaped() {
    let spec = DrawChannelSpec::from_draw(
        [1; 32],
        [2; 32],
        [3; 32],
        [4; 32],
        [5; 32],
        DrawArgs {
            amount: 1_000,
            salt: 7,
            grace_period: 900,
            open_slot: 42,
            category: 0,
        },
    )
    .unwrap();
    let extra = [1u8, 2, 3, 4];
    let data = encode_payment_channels_open(&spec, &extra);
    assert_eq!(data[0], PAYMENT_CHANNELS_OPEN_DISC);
    assert_eq!(data.len(), PAYMENT_CHANNELS_OPEN_IX_HEADER_LEN + extra.len());
    assert_eq!(&data[1..9], &7u64.to_le_bytes());
    assert_eq!(&data[9..17], &1_000u64.to_le_bytes());
    assert_eq!(&data[17..21], &900u32.to_le_bytes());
    assert_eq!(&data[21..29], &42u64.to_le_bytes());
    assert_eq!(&data[29..], &extra);

    let accounts = PaymentChannelsOpenAccounts::from_spec(
        &spec,
        [10; 32],
        [11; 32],
        [12; 32],
        [0; 32],
        [13; 32],
        [14; 32],
        [15; 32],
        [16; 32],
    );
    let metas = accounts.metas();
    assert_eq!(metas.len(), PAYMENT_CHANNELS_OPEN_ACCOUNT_COUNT);
    assert!(metas[0].is_signer && metas[0].is_writable);
    assert_eq!(metas[0].pubkey, spec.payer);
    assert!(metas[1].is_signer && metas[1].is_writable);
    assert_eq!(metas[2].pubkey, spec.payee);
    assert_eq!(metas[4].pubkey, spec.authorized_signer);
    assert_eq!(spec.authorized_signer, spec.payee);
    assert!(metas[5].is_writable && !metas[5].is_signer);
    assert!(metas[6].is_writable);
    assert!(!metas[8].is_writable);
}

#[test]
fn open_slot_window_is_current_or_recent() {
    assert!(open_slot_is_recent(100, 100));
    assert!(open_slot_is_recent(100, 100 + OPEN_SLOT_WINDOW));
    assert!(!open_slot_is_recent(100, 100 + OPEN_SLOT_WINDOW + 1));
    assert!(!open_slot_is_recent(101, 100));
}
