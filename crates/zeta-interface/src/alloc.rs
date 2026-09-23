//! PDA allocation sizes Joshna needs before register / create_pool / open_line.
//!
//! Programs expect zeroed accounts of these lengths. Rent is approximate
//! (Solana rent-exempt for the data length); clients should call
//! `getMinimumBalanceForRentExemption` on RPC rather than hardcoding lamports.

use crate::accounts::{CREDIT_LINE_LEN, POLICY_LEN, POOL_LEN};

/// Exact data lengths the processors write.
pub const fn pool_alloc_bytes() -> usize {
    POOL_LEN
}
pub const fn policy_alloc_bytes() -> usize {
    POLICY_LEN
}
pub const fn line_alloc_bytes() -> usize {
    CREDIT_LINE_LEN
}

/// System Program `CreateAccount` / `Allocate` space field for each PDA.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PdaAlloc {
    pub space: u64,
    pub seed_label: &'static str,
}

pub const POOL_ALLOC: PdaAlloc = PdaAlloc {
    space: POOL_LEN as u64,
    seed_label: "pool",
};
pub const POLICY_ALLOC: PdaAlloc = PdaAlloc {
    space: POLICY_LEN as u64,
    seed_label: "policy",
};
pub const LINE_ALLOC: PdaAlloc = PdaAlloc {
    space: CREDIT_LINE_LEN as u64,
    seed_label: "line",
};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alloc_matches_frozen_lens() {
        assert_eq!(POOL_ALLOC.space, 128);
        assert_eq!(POLICY_ALLOC.space, 96);
        assert_eq!(LINE_ALLOC.space, 136);
    }
}
