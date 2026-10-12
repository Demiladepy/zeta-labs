# Pitch video — 2:45

Face on camera (Zoom, or the car — the car is fine, winners have done less).
No deck. Screens only where you reference them. Talk it, don't read it.

**~400 words.** Know the beats, not the sentences. If you stumble, keep going —
a real stumble reads better than a second take that sounds rehearsed.

---

## 1 · The hook — your founder-market fit (0:00 – 0:20)

**Screen:** just you.

> I'm Demilade. This is my third Colosseum hackathon, and I've spent all three
> building agents that spend money.
>
> At Cypherpunk I built Horizon — an agent that buys and sells on Solana
> through a chat interface. At Frontier I built solo for the Code Covalence
> track.
>
> And in all that time, I have never once been able to pay for the APIs my own
> agents need. Not because I didn't have the money. Because I'm in Lagos.

*This is the whole pitch. Everything after it is evidence.*

---

## 2 · The problem, with the data (0:20 – 0:50)

**Screen:** the card-wall section of the landing page — the $0 / $500 / 1-10th
/ Verve cards.

> Nigerian banks suspended naira cards for international payments in 2020.
> They came back in July 2025 at about five hundred dollars a month — under a
> tenth of what it was in 2015. Most naira debit cards still carry a zero
> dollar international limit. Verve, the most-used card network in my country,
> isn't accepted by AWS at all. Two failed payments and your cloud account is
> suspended.
>
> Now look at what shipped for agents this year. Google's AP2. Stripe's MPP.
> Every one of them assumes you hold a card that works internationally.
>
> I can't hand an autonomous agent a card that doesn't work. Neither can about
> a billion other developers.

---

## 3 · The insight, then the solution (0:50 – 1:20)

**Screen:** you, then the simulator.

> So we built credit that needs no card, no bank, no FX approval. A lender
> funds a USDC pool. An agent draws against a policy-bounded credit line.
>
> But here's what we found building it, and it's the part I care about.
>
> A spending cap on one call doesn't protect you. An agent with a one dollar
> per-call cap can still move twenty dollars in twenty individually legal
> calls. Every request passes. The sequence is never checked.
>
> A 2026 systematisation paper on agent payments names this as an open problem.
> We built the answer — and when your whole monthly ceiling is five hundred
> dollars, that leak isn't a rounding error. It's forty percent of your month.

---

## 4 · Proof (1:20 – 1:45)

**Screen:** simulator running, then the audit panel with the denials.

> Same attack, twice. Per-call cap only: twenty dollars gone. With our
> enforcement: stopped at five, fifteen never moved.
>
> And that's not a simulation. Real denials, on Solana devnet, with explorer
> links. Programs are live, the SDK is on npm, and every number we quote is
> sourced in the repo — including the ones we couldn't verify, which we don't
> claim.

---

## 5 · Market and go-to-market (1:45 – 2:10)

**Screen:** you.

> The average x402 transaction today is fourteen cents. So nobody builds a
> business on per-transaction fees. You price the credit, not the call — which
> is why this is a lending primitive and not a payment processor.
>
> We go to market through developers first: the SDK is public, and our first
> users are agent builders in Lagos, Mumbai, Manila — people who already can't
> transact and already hold stablecoins. That's not a market we have to educate.
> It's one we're already in.

---

## 6 · Why this team (2:10 – 2:35)

**Screen:** you.

> Anurag founded TapPay, is a Stellar India ambassador, and has raised around
> seventy thousand in grants for agent orchestration work. Joshna holds a
> Superteam grant and is both an LFX mentee and a mentor. I've been funded and
> trusted by Mezo, Canton, and Solana Student Africa across three hackathons.
>
> Everyone can build now. What we have that most teams don't is that we are the
> users. I'm not researching this payment wall. I live behind it.

---

## 7 · Close (2:35 – 2:45)

**Screen:** zetalabsx.vercel.app

> Zeta Labs is live on devnet today. Try the simulator, break the policy, read
> the sources.
>
> We're building this past the hackathon — and we're looking for agent teams
> who need working capital their cards can't give them.

---

## Delivery

**Protect these two lines above everything:**
1. *"I have never once been able to pay for the APIs my own agents need. Not
   because I didn't have the money. Because I'm in Lagos."*
2. *"I'm not researching this payment wall. I live behind it."*

Those are the only two sentences in the pitch that no other team on earth can
say. Everything else is replaceable.

**If you overrun**, cut in this order: the x402 fourteen-cents line, then the
Frontier/Code Covalence mention, then the team credentials down to one sentence
each. Never cut the hook or the close.

**Pace:** slower than feels natural. The Lagos line needs a beat after it. Let
it land.

**Don't apologise for anything.** No "we didn't get to", no "we ran out of
time". The honest limits are in STATUS.md where they belong — a judge who cares
will find them and respect them. A pitch is not the place.
