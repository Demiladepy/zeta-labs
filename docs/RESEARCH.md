# Research — where every claim in this repo comes from

Zeta is grounded in published work rather than intuition. This file is the
provenance for every external number and claim we make, so a reader can check
us. If something here is wrong, the build is wrong, and we would rather be
corrected than believed.

---

## 1. The problem we enforce against is a named open problem

**"SoK: Blockchain Agent-to-Agent Payments"** — arXiv:2604.03733 (2026).
<https://arxiv.org/abs/2604.03733>

A systematisation of knowledge across deployed agent-payment systems. Its
transaction-level open challenge is the one Zeta answers:

> "Authorization policies (E1–E3) constrain individual transactions (e.g.,
> amount, recipient, rules). However, they **do not capture the execution
> history, cumulative spend, or multi-step strategies**. Therefore, sequences of
> valid transactions may violate intended spending boundaries through
> **repetition, fragmentation, or timing manipulation**, and this effect is
> further amplified by strategic agent behavior."

The same SoK names two further gaps we do **not** claim to solve:

> *Technical level:* "If the agent or its environment is compromised through
> prompt injection, model manipulation, key leakage... adversaries may generate
> transactions that satisfy authorization policies."

> *Legal and institutional level:* "Standing delegation is typically granted ex
> ante. However, the execution of subsequent payments lacks re-evaluation of
> purpose or cumulative impact."

Our revoke path partially addresses the second. The first is out of scope: Zeta
bounds what a compromised agent can spend, not whether it is compromised.

**What we built against it:** `crates/zeta-interface/tests/invariants.rs::fragmentation`
and `packages/sdk/test/fragmentation.test.ts`. Bounds stated in
[`WEDGE.md`](./WEDGE.md).

### Adjacent literature consulted

- **"Authenticated Delegation and Authorized AI Agents"** — arXiv:2501.09674
  (MIT, Jan 2025). Framing for agent authorization and scoped delegation.
- **"AESP: A Human-Sovereign Economic Protocol for AI Agents with Privacy"** —
  arXiv:2603.00318. Connects capability-based security to per-policy,
  time-limited spending authorizations.
- **"Before the Tool Call: Deterministic Pre-Action Authorization for
  Autonomous AI Agents"** — arXiv:2603.20953. Pre-action authorization as a
  control point; Zeta's `evaluate`-before-`draw` ordering is the same shape.
- **"Secure Autonomous Agent Payments"** — arXiv:2511.15712. Authenticity and
  intent verification for agent-initiated payments.

**Gap we found and are building into:** none of the above addresses *credit* —
extending funds to an agent that holds no capital. The SoK covers authorization
and spend control thoroughly and is silent on underwriting. That silence is the
opening for Underwriting v1 below.

---

## 2. The standards we are positioned against

| Standard | Origin | Mechanism | Settles on |
| --- | --- | --- | --- |
| **x402** | Coinbase / Cloudflare, May 2025 | per-request stablecoin payment at the HTTP layer | stablecoin |
| **AP2** | Google, Sept 2025 | user signs a spending *mandate*; agent draws against it. 60+ backers incl. Amex, Mastercard, PayPal | card rails |
| **MPP** | Stripe / Tempo, Mar 2026 | session-based agent billing | card rails |

Sources: Galaxy Research, *Agentic Payments and Crypto's Emerging Role*; Tiger
Research, *Payments 3.0: The AI Agent Payments Market*; Fystack, *Top 3 Agentic
Payment Protocols in 2026*.

**Why this matters to our positioning:** AP2 already standardises
"policy-bounded agent spending" with the card networks behind it. Competing on
*generic* spending limits means competing with Google. We do not. We compete on
(a) sequence-level enforcement, which AP2's per-mandate model does not provide,
and (b) reachability for developers whose cards do not work.

---

## 3. The market, stated honestly

**Large in transaction count.** x402 has processed roughly **154M transactions**
since May 2025. Chainalysis reports agentic transactions on Base passing **100M
in about three quarters**, with transfers above $1 now **95% of value moved**.

**Small in dollars — and we say so.** Visa and Artemis measured approximately
**$15M cumulative x402 volume across 109.6M adjusted transactions** through
April 2026. That is an average transaction of about **$0.14**.

**Surrounding market.** Agentic AI valued at **$5.25B (2024)**, projected
**$199B by 2034**. AI-agents segment **$7.84B (2025) → $52.6B**. US hyperscaler
AI capex exceeds **$650B in 2026** (Pantera Capital, *The Financial Rails of
Agentic Commerce*, Feb 2026).

**The consequence we build on:** at $0.14 per transaction, per-transaction fees
are not a business. Any viable model prices the *credit*, not the call. This is
why Zeta is a lending primitive and not a payments processor — the market data
forces the architecture.

Sources: Visa + Artemis via public reporting through Apr 2026; Chainalysis
agentic-payments adoption; Nevermined, *Decentralized AI Payments Volume
Statistics*; Pantera Capital.

---

## 4. The reachability gap (Nigeria)

Every figure below is independently checkable.

- Nigerian banks **suspended naira cards for international payments in 2020**
  amid dollar scarcity; service resumed **July 2025** (Reuters, Forbes Africa,
  7–8 July 2025).
- Reinstated limits: approximately **$500/month or $1,000/quarter — about
  $4,000/year**. A decade earlier the equivalent ceilings were
  **$50,000–$150,000**, so the restored limit is **under one-tenth** of the 2015
  floor (Forbes Africa; Access Bank, *Naira Card for Global Spending* FAQ).
- **Most naira debit cards still carry a $0 international limit.**
- **Verve — Nigeria's most widely used card network — is not accepted by AWS.**
- **Two failed payments suspends a major-cloud account.**
- The naira fell roughly **70% against the dollar between 2020 and 2024**, so
  the ceiling tightened in real terms while compute was priced in dollars.

**Why it belongs in a credit protocol:** at a $500/month ceiling, a spend that
leaks past a per-call cap is not a rounding error on an enterprise card. It is
~40% of the month, and the failed payment afterwards can suspend the account the
developer works from. The enforcement has to be real *because* the ceiling is
low. The market and the engineering are the same argument.

**Validation that this lane wins:** three of the 26 Solana Frontier Hackathon
winners (announced 26 June 2026, from 2,857 submissions) were emerging-markets
financial infrastructure — **Stablecorp** (India), **DashX** (India and
emerging markets), **KinnectFi** (Philippine diaspora).

**Not yet verified:** we have *not* independently confirmed India's equivalent
restrictions, so no India-specific figure appears anywhere in this repo. If a
teammate's lived experience supports one, it gets sourced before it ships.

---

## 5. Underwriting v1 — our own thesis

> **Policy tightness is the collateral.**

An autonomous agent has no credit history, no legal identity, and nothing to
pledge. What it *can* offer is constraint. The tighter the leash it accepts, the
safer the loan, so the price of credit is how much freedom the borrower gives
up.

Implemented in `programs/credit-vault/src/lib.rs::policy_ltv_bps`:

| Control accepted | LTV added |
| --- | --- |
| *(base)* | 2,500 bps (25%) |
| Expiry set | +2,000 |
| Recipient/category ACL set | +1,500 |
| Total cap set | +1,500 |
| Rolling cap set | +1,500 |
| **Maximum** | **9,000 bps (90%)** |

Proven in `programs/credit-vault/src/lib.rs::tests::underwriting`:

| Property | Guarantee |
| --- | --- |
| Monotone in tightness | Accepting another constraint never lowers LTV; a strictly tighter policy strictly raises it. Checked across all 16 control subsets, both directions. |
| Floor and permanent haircut | `2,500 ≤ LTV ≤ 9,000` bps. **Never 100%** — even a maximally constrained agent keeps a 10% haircut. |
| Bounded by liquidity | `limit ≤ deposited − outstanding`, across every control subset and liquidity level. |
| Lender ceiling wins | An explicit `total_cap` overrides a generous LTV. |
| Dead policies lend nothing | Revoked or expired underwrites nothing, however tight. Checked at the exact expiry boundary. |
| No underflow | A drained or over-drawn pool underwrites `0`, never wraps. |

**Honest limits.** This is v1. There is no default handling, no interest accrual,
no reputation or repayment history feeding back into LTV. A borrower that
repays reliably earns nothing extra today. Those are the next questions, and
they are the research we think is actually worth doing — see `STATUS.md` for
what we do not claim.

---

## 6. Judging and submission research

Colosseum's own published guidance, used to shape the submission:

- *How to Win a Colosseum Hackathon* — <https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/>
- *Perfecting Your Hackathon Submission* — <https://blog.colosseum.com/perfecting-your-hackathon-submission/>
- Matty Taylor (co-founder) with Chase Barker, 19:52 — <https://www.youtube.com/watch?v=so4AHsd8ioU>

Key constraints we built to: presentation under 3 minutes; judges evaluate the
presentation before any code review; "90% of products don't have any traction at
this point"; teams are assessed on iteration across multiple hackathons.

---

## 7. How to check us

```bash
cargo test -p zeta-interface -p policy-registry -p credit-vault   # 62 tests
cd packages/sdk && npm test                                       # 29 tests
cd packages/dashboard && npm test                                 # 4 tests

# The fragmentation claim, offline, no keys:
cd packages/sdk
npm run demo:fragmentation -- --undefended
npm run demo:fragmentation
```

On-chain evidence, including denials: [`PROOF.md`](./PROOF.md).
What we deliberately do not claim: [`STATUS.md`](./STATUS.md).
