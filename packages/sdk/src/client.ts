import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  CREDIT_LINE_LEN,
  POLICY_LEN,
  POOL_LEN,
  CREDIT_VAULT_PROGRAM_ID,
  POLICY_REGISTRY_PROGRAM_ID,
  type AuditRecord,
  type CreditLine,
  type Policy,
  type Pool,
} from "./types.js";
import { decodeAuditLogs, decodeLine, decodePolicy, decodePool } from "./decoder.js";
import {
  buildCreatePoolInstruction,
  buildDepositInstruction,
  buildOpenLineInstruction,
  buildRegisterPolicyInstruction,
  buildRevokeInstruction,
  findLinePda,
  findPolicyPda,
  findPoolPda,
} from "./instructions.js";

export type ZetaClientConfig = {
  connection: Connection | string;
  payer: Keypair;
  commitment?: "processed" | "confirmed" | "finalized";
  cluster?: "devnet" | "testnet" | "mainnet-beta";
};

export type PdaAccountRequest = {
  address: PublicKey;
  owner: PublicKey;
  space: number;
};

/**
 * The current v1 programs expect their PDA accounts to be provisioned before
 * their initialise instructions run. A client cannot create a PDA itself, so
 * deploy tooling must supply a program-side provisioner after that interface
 * issue is resolved.
 */
export type PdaAccountProvisioner = (
  request: PdaAccountRequest,
) => Promise<TransactionInstruction | readonly TransactionInstruction[]>;

export class PdaAccountProvisioningRequiredError extends Error {
  constructor(address: PublicKey) {
    super(
      `Cannot initialise ${address.toBase58()}: the current programs require a pre-provisioned PDA account. ` +
        "Use an approved program-side PDA provisioner before submitting this instruction.",
    );
    this.name = "PdaAccountProvisioningRequiredError";
  }
}

export type TransactionProof = {
  signature: string;
  explorerUrl: string;
  allowed: boolean;
  audits: AuditRecord[];
};

function asKey(value: string | PublicKey): PublicKey {
  return value instanceof PublicKey ? value : new PublicKey(value);
}

export class ZetaClient {
  readonly connection: Connection;
  readonly payer: Keypair;
  readonly commitment: "processed" | "confirmed" | "finalized";
  readonly cluster: "devnet" | "testnet" | "mainnet-beta";

  constructor(config: ZetaClientConfig) {
    this.connection =
      typeof config.connection === "string"
        ? new Connection(config.connection, config.commitment ?? "confirmed")
        : config.connection;
    this.payer = config.payer;
    this.commitment = config.commitment ?? "confirmed";
    this.cluster = config.cluster ?? "devnet";
  }

  async pool(address: string | PublicKey): Promise<Pool> {
    return decodePool(
      await this.accountData(
        asKey(address),
        POOL_LEN,
        new PublicKey(CREDIT_VAULT_PROGRAM_ID),
      ),
    );
  }

  async line(address: string | PublicKey): Promise<CreditLine> {
    return decodeLine(
      await this.accountData(
        asKey(address),
        CREDIT_LINE_LEN,
        new PublicKey(CREDIT_VAULT_PROGRAM_ID),
      ),
    );
  }

  async policy(address: string | PublicKey): Promise<Policy> {
    return decodePolicy(
      await this.accountData(
        asKey(address),
        POLICY_LEN,
        new PublicKey(POLICY_REGISTRY_PROGRAM_ID),
      ),
    );
  }

  async proof(signature: string): Promise<TransactionProof> {
    const transaction = await this.connection.getTransaction(signature, {
      commitment: this.commitment === "processed" ? "confirmed" : this.commitment,
      maxSupportedTransactionVersion: 0,
    });
    if (!transaction) throw new Error(`transaction not found: ${signature}`);
    const audits = decodeAuditLogs(transaction.meta?.logMessages);
    if (audits.length === 0) {
      throw new Error(`transaction ${signature} contains no Zeta audit record`);
    }
    const clusterQuery = this.cluster === "mainnet-beta" ? "" : `?cluster=${this.cluster}`;
    return {
      signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}${clusterQuery}`,
      allowed: audits[audits.length - 1]!.allowed,
      audits,
    };
  }

  async submit(instructions: readonly TransactionInstruction[]): Promise<string> {
    if (instructions.length === 0) throw new Error("at least one instruction is required");
    const transaction = new Transaction().add(...instructions);
    return sendAndConfirmTransaction(this.connection, transaction, [this.payer], {
      // web3's confirmation helper accepts Finality, while account reads also
      // accept "processed". Confirm at least at confirmed level on submission.
      commitment: this.commitment === "processed" ? "confirmed" : this.commitment,
    });
  }

  async createPool(args: {
    authority?: PublicKey;
    mint: PublicKey;
    provision?: PdaAccountProvisioner;
  }): Promise<{ pool: PublicKey; signature: string }> {
    const authority = args.authority ?? this.payer.publicKey;
    this.requirePayer(authority, "createPool authority");
    const ix = buildCreatePoolInstruction({ authority, mint: args.mint });
    const pool = findPoolPda(authority, args.mint, ix.programId);
    const setup = await this.provision(pool, ix.programId, POOL_LEN, args.provision);
    return { pool, signature: await this.submit([...setup, ix]) };
  }

  async registerPolicy(args: {
    issuer?: PublicKey;
    seed: bigint;
    perCallCap: bigint;
    expiresAt: bigint;
    provision?: PdaAccountProvisioner;
  }): Promise<{ policy: PublicKey; signature: string }> {
    const issuer = args.issuer ?? this.payer.publicKey;
    this.requirePayer(issuer, "registerPolicy issuer");
    const ix = buildRegisterPolicyInstruction({ ...args, issuer });
    const policy = findPolicyPda(issuer, args.seed, ix.programId);
    const setup = await this.provision(policy, ix.programId, POLICY_LEN, args.provision);
    return { policy, signature: await this.submit([...setup, ix]) };
  }

  async deposit(args: {
    pool: PublicKey;
    amount: bigint;
    sourceAta: PublicKey;
    vaultAta: PublicKey;
  }): Promise<{ signature: string }> {
    const ix = buildDepositInstruction({
      authority: this.payer.publicKey,
      ...args,
    });
    return { signature: await this.submit([ix]) };
  }

  async openLine(args: {
    pool: PublicKey;
    agent: PublicKey;
    policy: PublicKey;
    limit: bigint;
    provision?: PdaAccountProvisioner;
  }): Promise<{ line: PublicKey; signature: string }> {
    const ix = buildOpenLineInstruction({ authority: this.payer.publicKey, ...args });
    const line = findLinePda(args.pool, args.agent, ix.programId);
    const setup = await this.provision(line, ix.programId, CREDIT_LINE_LEN, args.provision);
    return { line, signature: await this.submit([...setup, ix]) };
  }

  async revoke(policy: PublicKey): Promise<{ signature: string }> {
    return {
      signature: await this.submit([
        buildRevokeInstruction({ issuer: this.payer.publicKey, policy }),
      ]),
    };
  }

  private async accountData(
    address: PublicKey,
    expectedLength: number,
    expectedOwner: PublicKey,
  ): Promise<Uint8Array> {
    const account = await this.connection.getAccountInfo(address, this.commitment);
    if (!account) throw new Error(`account not found: ${address.toBase58()}`);
    if (!account.owner.equals(expectedOwner)) {
      throw new Error(
        `account ${address.toBase58()} is owned by ${account.owner.toBase58()}; ` +
          `expected ${expectedOwner.toBase58()}`,
      );
    }
    if (account.data.length !== expectedLength) {
      throw new Error(
        `account ${address.toBase58()} has ${account.data.length} bytes; expected ${expectedLength}`,
      );
    }
    return account.data;
  }

  private async provision(
    address: PublicKey,
    owner: PublicKey,
    space: number,
    provisioner?: PdaAccountProvisioner,
  ): Promise<readonly TransactionInstruction[]> {
    const existing = await this.connection.getAccountInfo(address, this.commitment);
    if (existing) {
      if (!existing.owner.equals(owner)) {
        throw new Error(
          `PDA ${address.toBase58()} is owned by ${existing.owner.toBase58()}; ` +
            `expected ${owner.toBase58()}`,
        );
      }
      if (existing.data.length !== space) {
        throw new Error(
          `PDA ${address.toBase58()} has ${existing.data.length} bytes; expected ${space}`,
        );
      }
      return [];
    }
    if (!provisioner) throw new PdaAccountProvisioningRequiredError(address);
    const result = await provisioner({ address, owner, space });
    return result instanceof TransactionInstruction ? [result] : result;
  }

  private requirePayer(address: PublicKey, role: string): void {
    if (!address.equals(this.payer.publicKey)) {
      throw new Error(
        `${role} ${address.toBase58()} does not match configured signer ${this.payer.publicKey.toBase58()}`,
      );
    }
  }
}

export function createZetaClient(config: ZetaClientConfig): ZetaClient {
  return new ZetaClient(config);
}
