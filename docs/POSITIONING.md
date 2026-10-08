# Positioning — market, model, and the lane we own

Companion to `docs/WEDGE.md` (the technical claim). This is the startup case.
Colosseum judges on: real problem, real users, market, business model, and
intent to build full-time. This document is the source of truth for all of it.

---

## 1. The lane

> **Every agent-payment standard shipped in the last year assumes you have a
> card that works internationally. Over a billion people don't.**

That is the sentence. Everything else supports it.

### Why it is defensible

The agentic-payments space consolidated fast, and it consolidated on cards:

| Standard | Shipped | Mechanism | Backers |
| --- | --- | --- | --- |
| **x402** | Coinbase / Cloudflare, May 2025 | per-request stablecoin payment at the HTTP layer | ~154M transactions to date |
| **AP2** | Google, Sept 2025 | user signs a **spending mandate** upfront; agent draws against it | 60+ orgs incl. Amex, Mastercard, PayPal |
| **MPP** | Stripe / Tempo, Mar 2026 | session-based billing, agent consumes against a session | Stripe |

AP2 is the direct competitor to naive "policy-bounded agent spending" — Google
has already standardised the mandate, with the card networks behind it. Any
project whose pitch is *"we let you set limits on what an agent spends"* is now
competing with Google and Mastercard. **We are not making that pitch.**

AP2 mandates settle on card rails. So does MPP. That is fine in San Francisco.
It is not fine in Lagos, and that gap is documented, severe, and structural.

### The wall, with numbers

**Nigeria.** Banks suspended naira cards for international payments in 2020
during the dollar shortage. Service resumed only in **July 2025**, with limits
of roughly **$500/month or $1,000/quarter — about $4,000/year.** For scale, the
equivalent limits a decade earlier were $50,000–$150,000: the reinstated ceiling
is **under one-tenth** of the 2015 floor. Most naira debit cards still carry a
**$0 international limit**. **Verve — Nigeria's most widely used card network —
is not accepted by AWS at all.** And on the major clouds, **two failed payments
suspends the account.**

The naira fell roughly 70% against the dollar between 2020 and 2024, so the
ceiling tightened in real terms while the price of compute rose in dollars.

**What that means for an agent.** A developer in Lagos who wants an agent to buy
its own inference cannot do the thing every Western standard assumes. They
cannot issue it a card mandate, because the card either has a $0 international
limit, is on a network the provider rejects, or sits under a monthly cap that a
single runaway agent would blow through — taking the account with it.

They are structurally excluded from agentic commerce at the exact moment it is
being standardised.

### Why the policy engine matters more here

This is the part that makes the technical work and the market fit the same
story rather than two stories.

When your entire international spend capacity is **$500/month**, a fragmentation
attack that leaks $200 through a per-call cap is not a rounding error on an
enterprise card. It is **40% of your month**, and a failed payment afterwards can
suspend the account you run your business on.

Per-call caps are theatre everywhere. In a $4,000/year ceiling they are
negligence. `docs/WEDGE.md` proves the bound; this is who needs it.

---

## 2. Market opportunity

### The honest version

Stating this carefully, because inflated numbers are the fastest way to lose a
judge who checks.

**What is large:** the agent market itself. Agentic AI was valued at **$5.25B in
2024, projected to $199B by 2034**. The AI-agents segment is **$7.84B (2025) →
$52.6B**. US hyperscaler AI capex alone exceeds **$650B in 2026**. Agents that buy
things are not speculative; they are funded.

**What is large in count:** x402 did roughly **154M transactions** since May 2025.
Chainalysis reports agentic transactions on Base passing **100M in about three
quarters**, with transfers above $1 now **95% of value moved**.

**What is still small in value — and we say so:** Visa and Artemis measured
roughly **$15M cumulative x402 volume across 109.6M adjusted transactions**
through April 2026. That is an average transaction of about **$0.14**.

So the market today is enormous in transaction count and small in dollars. Two
consequences we build on:

1. **Per-transaction fees are not a business.** Nobody earns a living on a
   fraction of $0.14. Any viable model must price the *credit*, not the call.
   This is why Zeta is a lending primitive, not a payments processor.
2. **The value migration has already started.** Transfers above $1 are now 95%
   of value on Base. As agents move from pinging APIs to buying real compute,
   average size rises — and the moment agents transact in amounts that matter,
   *who fronts the money* becomes the question. That is the market we are early
   to.

### Who we serve first

Not "enterprises." Concretely:

- **Solo and small-team developers in Nigeria and India** building agents that
  consume paid APIs, inference, and compute, who cannot get a working
  international card or whose ceiling is too low to risk an autonomous spender.
- **Agent operators without working capital** — the agent needs $200 of
  inference to complete a job worth $500, and does not have the $200.
- **Lenders holding idle USDC** who will fund that gap for yield, provided the
  downside is bounded by something stronger than a prompt.

Nigeria and India are two of the largest developer and outsourced-engineering
populations on earth, and both sit behind exactly this payment wall. This is not
a charity framing — it is an underserved market with real dollar demand and no
incumbent, versus a US market with Google, Stripe, and Mastercard already in it.

---

## 3. Business model

Priced on credit, not on calls — for the reason above.

| Line | Mechanism | Why it works |
| --- | --- | --- |
| **Interest spread** (primary) | Lenders deposit USDC and earn yield. Agents draw against a policy-bounded line and repay from job revenue. Zeta takes a cut of the spread. | The only line that scales with value moved rather than call count. Standard lending economics, already modelled by the vault's `drawn` / `reserved` / `repay` accounting. |
| **Origination fee** | Basis points on each line opened, not each draw. | Aligns with underwriting cost. Survives a $0.14 average transaction. |
| **Policy SLA / enterprise tier** | Hosted policy enforcement, audit export, custom caps for operators running many agents. | The audit trail is the compliance artifact. Buyers who need it will pay for it. |

**What we do not claim.** We have no revenue, no users, and no mainnet
deployment. The model above is the thesis we intend to test, not a result. Our
first commercial milestone is a single funded line repaid from real job revenue
on devnet — not an ARR figure.

**Why this is venture-shaped.** Underwriting a non-human borrower is an unsolved
problem: no credit history, no legal identity, collateral that is future
revenue. Whoever solves agent underwriting owns a toll on the agent economy.
"SoK: Blockchain Agent-to-Agent Payments" (arXiv:2604.03733) surveys this entire
field and addresses authorization and spend control at length — and says nothing
about extending credit to agents that hold no capital. The gap is literally
unwritten.

---

## 4. Team

Three builders across Lagos and India. Fill the bracketed fields before the
pitch — judges explicitly penalise missing team background.

- **Demilade** — Vault + Policy programs. Solana programs in `solana-program`
  2.2, no Anchor. Third Colosseum hackathon (Cypherpunk, Frontier, World's
  Fair). `[one line: what you do when not hacking]`
- **Anurag** — Payment Channels, x402, Swig delegated authority. Owns the
  settlement leg end to end. `[background]`
- **Joshna** — SDK, decoder, dashboard. Shipped `@zetasdk/sdk` to npm.
  `[background]`

**The founding insight is lived, not researched.** `[Demilade: the specific time
a payment for an API or cloud service failed — which service, which card, what
you did instead. This is the first 20 seconds of the pitch video.]`

**After the hackathon:** `[state full-time intent explicitly — Colosseum awards
prizes to teams who intend to build full-time]`

---

## 5. The pitch, in order

Colosseum's required structure, mapped to our content. Under 3 minutes, face on
camera, startup pitch not product tour.

1. **Team** (20s) — who we are, and the payment that failed.
2. **Problem** (30s) — agents are buying compute; every standard assumes a card;
   a billion developers don't have one that works. Nigeria's $500/month ceiling.
3. **Product** (40s) — USDC pool, policy-bounded credit line, enforced on-chain
   before funds move. No card, no bank, no FX approval.
4. **The wedge** (30s) — per-call caps are theatre. Run the fragmentation demo:
   undefended drains 20.00 USDC in twenty legal calls; defended stops at 5.00.
   Cite the SoK open problem. This is the "aha".
5. **Market and model** (20s) — priced on credit, not calls, because the average
   agent transaction is $0.14.
6. **Traction and next** (20s) — what is live on devnet, who is using the SDK,
   and that we are building this full-time.

---

## 6. Sources

- Nigerian card limits and resumption: Reuters, Forbes Africa (July 2025);
  Access Bank naira global-spending FAQ.
- Verve/AWS rejection, failed-payment suspension, naira depreciation: published
  developer payment guides, 2026.
- x402 / AP2 / MPP mechanics and backers: Galaxy Research; Tiger Research
  "Payments 3.0"; Fystack protocol comparison.
- x402 volume and transaction count: Visa + Artemis, through April 2026;
  Chainalysis agentic-payments adoption.
- Agentic AI market sizing: Nevermined decentralized-AI-payments statistics.
- Hyperscaler AI capex: Pantera Capital, "The Financial Rails of Agentic
  Commerce" (Feb 2026).
- Open problem in sequence-level spend control: arXiv:2604.03733.
