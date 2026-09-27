import { Denial, type Denial as DenialCode } from "./types.js";

export type PolicyDenial = Exclude<DenialCode, typeof Denial.Allow>;

const DENIAL_MESSAGES: Record<PolicyDenial, string> = {
  [Denial.Revoked]: "policy has been revoked",
  [Denial.Expired]: "policy has expired",
  [Denial.PerCallCap]: "amount exceeds the per-call cap",
  [Denial.RollingCap]: "amount exceeds the rolling spend cap",
  [Denial.TotalCap]: "amount exceeds the total spend cap",
  [Denial.NotAllowlisted]: "recipient or category is not allowlisted",
};

export function policyDenialMessage(denial: PolicyDenial): string {
  return DENIAL_MESSAGES[denial];
}

export class PolicyDeniedError extends Error {
  readonly denial: PolicyDenial;
  readonly programErrorCode: number;
  readonly signature?: string;

  constructor(
    denial: PolicyDenial,
    options: { signature?: string; cause?: unknown } = {},
  ) {
    super(`Zeta policy denied the spend: ${policyDenialMessage(denial)}`, {
      cause: options.cause,
    });
    this.name = "PolicyDeniedError";
    this.denial = denial;
    this.programErrorCode = 100 + denial;
    this.signature = options.signature;
  }
}

function customCode(value: unknown): number | undefined {
  if (typeof value === "string") {
    const hex = value.match(/custom program error:\s*0x([0-9a-f]+)/i);
    if (hex?.[1]) return Number.parseInt(hex[1], 16);
    const decimal = value.match(/(?:Custom|custom(?: program)? error)["':\s]+(\d+)/i);
    if (decimal?.[1]) return Number.parseInt(decimal[1], 10);
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const code = customCode(item);
      if (code !== undefined) return code;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.Custom === "number") return record.Custom;
    if (value instanceof Error) {
      const fromMessage = customCode(value.message);
      if (fromMessage !== undefined) return fromMessage;
    }
    for (const item of Object.values(record)) {
      const code = customCode(item);
      if (code !== undefined) return code;
    }
  }
  return undefined;
}

export function policyDenialFromError(error: unknown): PolicyDenial | undefined {
  const code = customCode(error);
  if (code === undefined) return undefined;
  const denial = code - 100;
  if (denial < Denial.Revoked || denial > Denial.NotAllowlisted) return undefined;
  return denial as PolicyDenial;
}

export function asPolicyDeniedError(
  error: unknown,
  signature?: string,
): PolicyDeniedError | undefined {
  const denial = policyDenialFromError(error);
  return denial === undefined
    ? undefined
    : new PolicyDeniedError(denial, { signature, cause: error });
}
