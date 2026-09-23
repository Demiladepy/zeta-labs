/// `u8` denial codes. `0` = allow. SDK maps these 1:1.
#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Denial {
    Allow = 0,
    Revoked = 1,
    Expired = 2,
    PerCallCap = 3,
    RollingCap = 4,
    TotalCap = 5,
    NotAllowlisted = 6,
}

impl Denial {
    pub const fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(Self::Allow),
            1 => Some(Self::Revoked),
            2 => Some(Self::Expired),
            3 => Some(Self::PerCallCap),
            4 => Some(Self::RollingCap),
            5 => Some(Self::TotalCap),
            6 => Some(Self::NotAllowlisted),
            _ => None,
        }
    }

    pub const fn as_u8(self) -> u8 {
        self as u8
    }

    pub const fn is_allow(self) -> bool {
        matches!(self, Self::Allow)
    }

    /// On-chain custom error = `100 + denial`. Allow is never returned as an error.
    pub const PROGRAM_ERROR_BASE: u32 = 100;

    pub const fn program_error_code(self) -> u32 {
        Self::PROGRAM_ERROR_BASE + self.as_u8() as u32
    }
}
