# Technical demo script — 2:45

Colosseum's brief for the technical demo: *"explain the design and
implementation choices behind your product, particularly how it leverages
Solana."* So this is architecture and decisions, not the startup story. The
pitch video carries the story.

Supersedes the flow in `RECORD.md`, which predates the simulator and the
on-chain denials.

---

## Before you hit record

**Tabs, in this order (left to right):**

1. `https://zetalabsx.vercel.app/dashboard` — loaded, showing **Live devnet
   data** in the sidebar. If it shows demo data, hit refresh and wait.
2. `https://zetalabsx.vercel.app/docs#sequences`
3. A blank tab for Solana Explorer (the audit panel opens into it)

**Editor:** `crates/zeta-interface/src/evaluate.rs` open, scrolled to
`pub fn evaluate`.

**Terminal:** sitting in `packages/sdk`, screen cleared.

**Housekeeping:** notifications off, bookmarks bar hidden, 1920×1080, browser
zoom at 100%. Do a 20-second throwaway take to check mic levels.

**Rule for the whole take:** the simulator runs offline — no RPC, no wallet — so
it cannot fail mid-recording. The live panels can. That is why the simulator
comes first.

---

## 0:00 – 0:20 · Architecture

**Screen:** editor, `evaluate.rs`.

> "Zeta is two Solana programs. A Policy Registry that decides whether a spend
> is allowed, and a Credit Vault that holds the money and moves it. They're
> written against solana-program 2.2 directly — no Anchor — because the account
> layouts are frozen and shared, and we wanted to control the bytes.
>
> Both programs call the same `evaluate` function. That's the first design
> choice: one body, so the vault and the registry can't drift apart."

---

## 0:20 – 0:45 · The ordering is load-bearing

**Screen:** scroll slowly through `evaluate`.

> "The checks are ordered and the order matters. Revoked beats expired, expiry
> beats the per-call cap, caps beat the allowlist. First failure wins, and the
> reason it lost is what gets written to the audit record.
>
> That matters because a denial has to be explainable. If a lender revokes a
> policy and the agent gets back 'cap exceeded', the audit trail is lying about
> why the money stopped."

**Screen:** terminal.

```bash
cargo test -p zeta-interface -p policy-registry -p credit-vault
```

> "Sixty-two tests across the programs. Another twenty-nine in the SDK, four in
> the dashboard."

*(Let it run in the background. Don't wait on it.)*

---

## 0:45 – 1:30 · The sequence problem — the core of the demo

**Screen:** dashboard → **Simulator**.

> "Here's the design decision the whole thing is built around.
>
> A per-call cap bounds one transaction. It does not bound a sequence. This is
> named as an open problem in a 2026 systematisation paper on agent-to-agent
> payments — authorization policies don't capture execution history or
> cumulative spend, so sequences of individually valid transactions can still
> blow past the intended boundary.
>
> Let me show you what that means."

**Action:** toggle **Per-call cap only** → **Run the attack**.

> "One USDC per-call cap. The agent asks twenty times, each request legal.
> Twenty allowed. Twenty USDC gone. Every single check passed."

**Action:** toggle **Zeta enforcement** → **Run the attack**.

> "Same cap, same attacker. Now there's a rolling cap of five USDC over an
> hour. Stopped at call six. Fifteen USDC never moved.
>
> The mechanism is a tumbling-window accumulator — a `LineUsage` PDA that
> `evaluate` reads before any draw. And we state the exact bound rather than
> claiming it's airtight: within one window, admitted spend is at most the
> rolling cap. Across a window boundary, at most twice the cap, because tumbling
> isn't sliding. Over W windows, W times the cap. All five bounds are tested,
> including a sweep over every legal chunk size an attacker could choose."

---

## 1:30 – 2:00 · Proof it actually happens on-chain

**Screen:** dashboard → **Audit**.

> "That was a simulation running in the browser. This is the same policy on
> devnet."

**Action:** point at the counts, then the rows.

> "Four denials, two allowances. Per-call cap. Policy revoked. Slot numbers,
> real agent address."

**Action:** click **View transaction**.

> "And that's the denial on Solana Explorer. The program rejected it, the audit
> record was emitted, and no funds reserved — a deny never touches the line's
> reserved balance, which is its own invariant."

---

## 2:00 – 2:25 · What's actually Solana about this

**Screen:** back to editor, or `docs/PROOF.md`.

> "Three things we lean on Solana for specifically.
>
> One — `draw` is a CPI into the Payment Channels program. We didn't invent a
> payment primitive; the vault opens a real channel and the agent pays an x402
> endpoint against it. The agent never holds the drawn USDC.
>
> Two — the credit line's agent can be a Swig smart wallet, so a hot delegate
> key signs the draw and the lender isn't in every spend transaction. Revoking
> that delegate kills spending immediately; that's in the proof set.
>
> Three — pool, policy and line PDAs are allocated by the programs themselves
> when you pass a trailing SystemProgram, so there's no client-side
> provisioning step to get wrong.
>
> There's also a reentrancy lock on the pool across the channel CPI, because the
> hot path crosses a program boundary."

---

## 2:25 – 2:45 · Underwriting, and close

**Screen:** `programs/credit-vault/src/lib.rs`, `policy_ltv_bps`.

> "Last piece. An agent has no credit history and nothing to pledge. What it can
> offer is constraint — so in Zeta, policy tightness is the collateral. Base
> twenty-five percent LTV, and every control the agent accepts raises it:
> expiry, allowlist, total cap, rolling cap. Maximum ninety percent — never a
> hundred, so there's always a haircut.
>
> That's proven monotone: accepting another constraint can never cost you
> credit, and a strictly tighter policy strictly earns more.
>
> Programs are live on devnet, the SDK is on npm as @zetasdk/sdk, and every
> external number we quote is sourced in docs/RESEARCH.md — including the ones
> we couldn't verify, which we don't claim. Thanks for watching."

---

## If you overrun

Cut in this order:

1. The PDA provisioning line (0:20 of 2:00–2:25)
2. The reentrancy lock line
3. The `cargo test` run — just say the number

**Never cut:** the two simulator runs, or the explorer click. Those are the
demo. Everything else is context.

## If something breaks live

- **Dashboard shows demo data** → say "public devnet RPC is throttling" and
  move to the simulator, which doesn't need RPC. Don't fight it on camera.
- **Explorer slow** → the audit row already shows slot and reason; narrate those
  and move on.
- **Simulator** cannot break. It is pure local computation.
