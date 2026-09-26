import { Connection, PublicKey } from "@solana/web3.js";
import {
  ACCOUNT_DISCRIMINATOR,
  CREDIT_LINE_LEN,
  CREDIT_VAULT_PROGRAM_ID,
  Denial,
  POLICY_LEN,
  POLICY_REGISTRY_PROGRAM_ID,
  POOL_LEN,
  decodeAuditLogs,
  decodeLine,
  decodePolicy,
  decodePool,
  type AuditRecord,
  type CreditLine,
  type Policy,
  type Pool,
} from "@zeta/sdk/dashboard";

export type DashboardConfig = {
  rpcUrl: string;
  poolAddress: string;
  lineAddress: string;
  policyAddress: string;
};

export type AuditEntry = AuditRecord & {
  signature: string;
  explorerUrl: string;
};

export type DashboardSnapshot = {
  source: "demo" | "live";
  fetchedAt: number;
  poolAddress: string;
  lineAddress: string;
  policyAddress: string;
  pool: Pool;
  line: CreditLine;
  policy: Policy;
  audits: AuditEntry[];
  auditError?: string;
};

export const DEFAULT_CONFIG: DashboardConfig = {
  rpcUrl: "https://api.devnet.solana.com",
  poolAddress: "",
  lineAddress: "",
  policyAddress: "",
};

type AccountState<T> = {
  address: string;
  state: T;
};

function bytes(fill: number): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

const now = Math.floor(Date.now() / 1000);
const demoPolicy = bytes(31);
const demoLine = bytes(21);
const demoAgent = bytes(11);

function address(value: Uint8Array): string {
  return new PublicKey(value).toBase58();
}

function audit(
  amount: bigint,
  denial: Denial,
  minutesAgo: number,
  signature: string,
): AuditEntry {
  return {
    discriminator: ACCOUNT_DISCRIMINATOR.audit,
    policy: demoPolicy,
    line: demoLine,
    agent: demoAgent,
    amount,
    allowed: denial === Denial.Allow,
    denial,
    slot: 294_883_120n - BigInt(minutesAgo * 8),
    unixTs: BigInt(now - minutesAgo * 60),
    signature,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}

export function demoSnapshot(): DashboardSnapshot {
  return {
    source: "demo",
    fetchedAt: Date.now(),
    poolAddress: address(bytes(4)),
    lineAddress: address(demoLine),
    policyAddress: address(demoPolicy),
    pool: {
      discriminator: ACCOUNT_DISCRIMINATOR.pool,
      authority: bytes(4),
      mint: bytes(5),
      vaultAta: bytes(6),
      deposited: 250_000_000n,
      outstanding: 18_000_000n,
      bump: 254,
    },
    line: {
      discriminator: ACCOUNT_DISCRIMINATOR.line,
      pool: bytes(4),
      agent: demoAgent,
      policy: demoPolicy,
      limit: 75_000_000n,
      drawn: 21_460_000n,
      reserved: 3_000_000n,
      bump: 253,
    },
    policy: {
      discriminator: ACCOUNT_DISCRIMINATOR.policy,
      issuer: bytes(4),
      seed: 42n,
      perCallCap: 8_000_000n,
      expiresAt: BigInt(now + 6 * 24 * 60 * 60),
      rollingCap: 0n,
      totalCap: 0n,
      aclVersion: 0,
      revoked: false,
      bump: 251,
      rollingWindowSecs: 0,
    },
    audits: [
      audit(3_000_000n, Denial.Allow, 4, "5hA9Sg4demo1111111111111111111111111111111111111111111111111111"),
      audit(12_000_000n, Denial.PerCallCap, 27, "2cK8Xe7demo2222222222222222222222222222222222222222222222222222"),
      audit(1_250_000n, Denial.Allow, 56, "4mP7Wd2demo3333333333333333333333333333333333333333333333333333"),
      audit(5_600_000n, Denial.Allow, 140, "8rQ3Nv6demo4444444444444444444444444444444444444444444444444444"),
      audit(4_200_000n, Denial.Allow, 310, "3tL6Hj9demo5555555555555555555555555555555555555555555555555555"),
      audit(9_500_000n, Denial.PerCallCap, 620, "9xC2Bp5demo6666666666666666666666666666666666666666666666666666"),
      audit(2_410_000n, Denial.Allow, 1_120, "6vM4Za8demo7777777777777777777777777777777777777777777777777777"),
    ],
  };
}

function assertOwner(actual: PublicKey, expected: string, label: string): void {
  const expectedKey = new PublicKey(expected);
  if (!actual.equals(expectedKey)) {
    throw new Error(`${label} is owned by ${actual.toBase58()}, not the expected Zeta program`);
  }
}

export function matchLiveConfigurations(
  rpcUrl: string,
  pools: AccountState<Pool>[],
  lines: AccountState<CreditLine>[],
  policies: AccountState<Policy>[],
): DashboardConfig[] {
  const poolAddresses = new Set(pools.map(({ address: value }) => value));
  const policyAddresses = new Set(policies.map(({ address: value }) => value));

  return lines.flatMap(({ address: lineAddress, state: line }) => {
    const poolAddress = publicKeyAddress(line.pool);
    const policyAddress = publicKeyAddress(line.policy);
    if (!poolAddresses.has(poolAddress) || !policyAddresses.has(policyAddress)) return [];
    return [{ rpcUrl, poolAddress, lineAddress, policyAddress }];
  });
}

function decodeProgramAccounts<T>(
  accounts: Awaited<ReturnType<Connection["getProgramAccounts"]>>,
  decode: (data: Uint8Array) => T,
): AccountState<T>[] {
  return accounts.flatMap(({ pubkey, account }) => {
    try {
      return [{ address: pubkey.toBase58(), state: decode(account.data) }];
    } catch {
      return [];
    }
  });
}

/** Find the most recently used connected pool, line, and policy on devnet. */
export async function discoverDashboardConfig(rpcUrl: string): Promise<DashboardConfig> {
  const connection = new Connection(rpcUrl, "confirmed");
  const vaultProgram = new PublicKey(CREDIT_VAULT_PROGRAM_ID);
  const policyProgram = new PublicKey(POLICY_REGISTRY_PROGRAM_ID);
  const [poolAccounts, lineAccounts, policyAccounts] = await Promise.all([
    connection.getProgramAccounts(vaultProgram, { filters: [{ dataSize: POOL_LEN }] }),
    connection.getProgramAccounts(vaultProgram, { filters: [{ dataSize: CREDIT_LINE_LEN }] }),
    connection.getProgramAccounts(policyProgram, { filters: [{ dataSize: POLICY_LEN }] }),
  ]);

  const candidates = matchLiveConfigurations(
    rpcUrl,
    decodeProgramAccounts(poolAccounts, decodePool),
    decodeProgramAccounts(lineAccounts, decodeLine),
    decodeProgramAccounts(policyAccounts, decodePolicy),
  );
  if (candidates.length === 0) {
    throw new Error("No connected Zeta pool, credit line, and policy accounts were found on devnet");
  }

  const ranked = await Promise.all(candidates.map(async (config) => {
    const [latest] = await connection.getSignaturesForAddress(
      new PublicKey(config.lineAddress),
      { limit: 1 },
    );
    return { config, slot: latest?.slot ?? 0 };
  }));
  ranked.sort((a, b) => b.slot - a.slot);
  return ranked[0]!.config;
}

export async function loadLiveSnapshot(config: DashboardConfig): Promise<DashboardSnapshot> {
  const poolKey = new PublicKey(config.poolAddress);
  const lineKey = new PublicKey(config.lineAddress);
  const policyKey = new PublicKey(config.policyAddress);
  const connection = new Connection(config.rpcUrl, "confirmed");

  const [poolAccount, lineAccount, policyAccount] = await Promise.all([
    connection.getAccountInfo(poolKey),
    connection.getAccountInfo(lineKey),
    connection.getAccountInfo(policyKey),
  ]);
  if (!poolAccount) throw new Error("Pool account was not found on the selected RPC");
  if (!lineAccount) throw new Error("Credit line account was not found on the selected RPC");
  if (!policyAccount) throw new Error("Policy account was not found on the selected RPC");

  assertOwner(poolAccount.owner, CREDIT_VAULT_PROGRAM_ID, "Pool account");
  assertOwner(lineAccount.owner, CREDIT_VAULT_PROGRAM_ID, "Credit line account");
  assertOwner(policyAccount.owner, POLICY_REGISTRY_PROGRAM_ID, "Policy account");

  const [pool, line, policy] = [
    decodePool(poolAccount.data),
    decodeLine(lineAccount.data),
    decodePolicy(policyAccount.data),
  ];

  let audits: AuditEntry[] = [];
  let auditError: string | undefined;
  try {
    const signatures = await connection.getSignaturesForAddress(lineKey, { limit: 8 });
    const transactions = await connection.getTransactions(
      signatures.map(({ signature }) => signature),
      { commitment: "confirmed", maxSupportedTransactionVersion: 0 },
    );
    audits = transactions.flatMap((transaction, transactionIndex) => {
      const signature = signatures[transactionIndex]!.signature;
      return decodeAuditLogs(transaction?.meta?.logMessages).map((record) => ({
        ...record,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      }));
    });
  } catch {
    auditError = "The public devnet RPC rate-limited audit history. Live balances and policy state are still current.";
  }

  return {
    source: "live",
    fetchedAt: Date.now(),
    poolAddress: poolKey.toBase58(),
    lineAddress: lineKey.toBase58(),
    policyAddress: policyKey.toBase58(),
    pool,
    line,
    policy,
    audits: audits.sort((a, b) => Number(b.slot - a.slot)),
    auditError,
  };
}

export function formatUsdc(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

export function shortAddress(value: string): string {
  if (value.length <= 14) return value;
  return `${value.slice(0, 6)}...${value.slice(-5)}`;
}

export function publicKeyLabel(value: Uint8Array): string {
  return shortAddress(publicKeyAddress(value));
}

export function publicKeyAddress(value: Uint8Array): string {
  return address(value);
}

export const denialLabels: Record<Denial, string> = {
  [Denial.Allow]: "Allowed",
  [Denial.Revoked]: "Policy revoked",
  [Denial.Expired]: "Policy expired",
  [Denial.PerCallCap]: "Per-call cap",
  [Denial.RollingCap]: "Rolling cap",
  [Denial.TotalCap]: "Total cap",
  [Denial.NotAllowlisted]: "Not allowlisted",
};

export function formatTime(unixTs: bigint): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(Number(unixTs) * 1000));
}
