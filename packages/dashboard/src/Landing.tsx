import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightRegular,
  BotRegular,
  CheckmarkCircleRegular,
  CodeRegular,
  DatabaseRegular,
  DocumentBulletListRegular,
  ShieldCheckmarkRegular,
} from "@fluentui/react-icons";
import { demoSnapshot, denialLabels, formatTime, formatUsdc } from "./data.js";

type LandingProps = {
  onOpenDashboard: () => void;
};

const steps = [
  {
    title: "Fund the pool",
    copy: "Deposit USDC once. The pool remains the single source of capital for every approved agent line.",
    label: "Capital ready",
    icon: <DatabaseRegular />,
  },
  {
    title: "Set policy",
    copy: "Choose caps, expiry, and recipients. Every draw is checked before funds can move.",
    label: "Rules enforced",
    icon: <ShieldCheckmarkRegular />,
  },
  {
    title: "Agent spends",
    copy: "Agents pay for approved tools and services without receiving unrestricted wallet access.",
    label: "Payments in motion",
    icon: <BotRegular />,
  },
  {
    title: "Verify proof",
    copy: "Each decision leaves an on-chain record with the amount, result, reason, and transaction proof.",
    label: "Trust by default",
    icon: <DocumentBulletListRegular />,
  },
] as const;

function Brand() {
  return (
    <a className="landing-brand" href="#top" aria-label="Zeta Labs home">
      <span className="landing-brand-mark"><img src="/logo-zeta.svg" alt="" /></span>
      <strong>Zeta Labs</strong>
    </a>
  );
}

function ProductPreview() {
  const snapshot = useMemo(() => demoSnapshot(), []);
  const remaining = snapshot.line.limit - snapshot.line.drawn - snapshot.line.reserved;
  const rows = snapshot.audits.slice(0, 5);

  return (
    <div className="landing-product" aria-label="Zeta dashboard preview using sample data">
      <aside className="preview-sidebar" aria-hidden="true">
        <Brand />
        <span className="preview-nav-active">Overview</span>
        <span>Lender</span>
        <span>Agent</span>
        <span>Policies</span>
        <span>Audit</span>
      </aside>
      <div className="preview-content">
        <div className="preview-heading">
          <div><span>Live policy view</span><strong>Credit control center</strong></div>
          <span className="preview-source">Preview data</span>
        </div>
        <div className="preview-metrics">
          <div><span>Capital in pool</span><strong>{formatUsdc(snapshot.pool.deposited)}</strong><small>USDC</small></div>
          <div><span>Agent can spend</span><strong>{formatUsdc(remaining)}</strong><small>USDC</small></div>
          <div><span>Policy status</span><strong>{snapshot.policy.revoked ? "Blocked" : "Active"}</strong><small>Checked on-chain</small></div>
        </div>
        <div className="preview-ledger">
          <div className="preview-ledger-head"><strong>Recent decisions</strong><span>Result</span><span>Reason</span></div>
          {rows.map((entry) => (
            <div className="preview-ledger-row" key={`${entry.signature}-${entry.slot}`}>
              <span><strong>{formatUsdc(entry.amount)} USDC</strong><small>{formatTime(entry.unixTs)}</small></span>
              <span className={entry.allowed ? "preview-allowed" : "preview-denied"}>{entry.allowed ? "Allowed" : "Denied"}</span>
              <span>{entry.allowed ? "Allowed by policy" : denialLabels[entry.denial]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlowSteps() {
  const [active, setActive] = useState(1);

  return (
    <div className="flow-steps">
      {steps.map((step, index) => (
        <button
          type="button"
          key={step.title}
          className={`flow-step ${active === index ? "flow-step-active" : ""}`}
          onMouseEnter={() => setActive(index)}
          onFocus={() => setActive(index)}
          onClick={() => setActive(index)}
          aria-expanded={active === index}
        >
          <span className="flow-step-index">0{index + 1}</span>
          <span className="flow-step-copy">
            <strong>{step.title}</strong>
            <span>{step.copy}</span>
          </span>
          <span className="flow-step-visual" aria-hidden="true">
            {step.icon}
            {active === index && index === 1 ? (
              <span className="policy-preview">
                <span><small>Per-call cap</small><strong>1,000 USDC</strong></span>
                <span><small>Expiry</small><strong>Apr 30</strong></span>
                <span><small>Recipients</small><strong>Allowlist on</strong></span>
              </span>
            ) : null}
          </span>
          <span className="flow-step-label">{step.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Landing({ onOpenDashboard }: LandingProps) {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }),
      { threshold: 0.16 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page" id="top">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Landing page sections">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#developers">Developers</a>
        </nav>
        <button className="landing-button landing-button-dark" type="button" onClick={onOpenDashboard}>
          <span>Open dashboard</span><ArrowRightRegular />
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="hero-copy">
            <span className="hero-eyebrow">Programmable credit on Solana</span>
            <h1 id="landing-title">Credit for agents.<br />Control for humans.</h1>
            <p>Fund once, set the rules, and let autonomous software pay safely.</p>
            <div className="hero-actions">
              <button className="landing-button landing-button-light" type="button" onClick={onOpenDashboard}>
                <span>Open dashboard</span><ArrowRightRegular />
              </button>
              <a className="landing-button landing-button-outline" href="#developers"><span>Read the SDK guide</span></a>
            </div>
          </div>
          <div className="hero-art">
            <img src="/zeta-credit-flow.png" alt="Capital moving through a policy gate to an autonomous agent and an audit record" />
          </div>
        </section>

        <div className="landing-principles" aria-label="Zeta product principles">
          <span>One shared capital pool</span>
          <span>Rules checked before every draw</span>
          <span>Proof for every decision</span>
        </div>

        <section className="landing-section reveal" id="how-it-works" aria-labelledby="flow-title">
          <div className="section-heading section-heading-centered">
            <h2 id="flow-title">One pool. Clear rules.<br />Every payment visible.</h2>
            <p>Zeta turns a funded credit pool into controlled spending for autonomous agents.</p>
          </div>
          <div className="flow-line" aria-hidden="true"><span /><span /><span /><span /></div>
          <FlowSteps />
        </section>

        <section className="landing-section product-section reveal" id="product" aria-labelledby="product-title">
          <div className="section-heading section-heading-centered">
            <h2 id="product-title">See every decision as it happens.</h2>
            <p>Live balances, active policy, allowed spending, and the denials that protected the pool.</p>
          </div>
          <ProductPreview />
          <button className="landing-button landing-button-dark product-cta" type="button" onClick={onOpenDashboard}>
            <span>Open dashboard</span><ArrowRightRegular />
          </button>
        </section>

        <section className="landing-section developer-section reveal" id="developers" aria-labelledby="developer-title">
          <div className="section-heading section-heading-centered">
            <span className="section-eyebrow">Built for developers</span>
            <h2 id="developer-title">Give your agent a budget,<br />not your wallet.</h2>
            <p>Connect to Zeta, read the pool, and verify a transaction in eight lines.</p>
          </div>
          <div className="developer-grid">
            <div className="code-window">
              <div className="code-window-head"><span><CodeRegular /> Quickstart</span><small>TypeScript</small></div>
              <pre><code>{`import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createZetaClient } from "@zeta/sdk";
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ZETA_KEY!)));
const zeta = createZetaClient({ connection: new Connection("https://api.devnet.solana.com"), payer });
const pool = await zeta.pool(new PublicKey(process.env.ZETA_POOL!));
const proof = await zeta.proof(process.env.ZETA_SIGNATURE!);
console.log({ deposited: pool.deposited, outstanding: pool.outstanding });
console.log(proof.explorerUrl, proof.allowed);`}</code></pre>
            </div>
            <div className="proof-receipt">
              <div><span>Transaction proof</span><strong>Agent spend completed</strong></div>
              {[
                ["Policy checked", "Within budget and allowed by your rules"],
                ["Spend allowed", "USDC released to the approved recipient"],
                ["Settlement confirmed", "Finalized on Solana devnet"],
                ["Explorer proof", "Transaction and audit record available"],
              ].map(([title, detail]) => (
                <div className="proof-step" key={title}>
                  <CheckmarkCircleRegular />
                  <span><strong>{title}</strong><small>{detail}</small></span>
                </div>
              ))}
            </div>
          </div>
          <div className="developer-actions">
            <button className="landing-button landing-button-dark" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a href="https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk" target="_blank" rel="noreferrer">Read the SDK guide</a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <div><a href="#product">Product</a><a href="#developers">Developers</a><a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">GitHub</a></div>
        <span>Agents on-chain. Spending under control.</span>
      </footer>
    </div>
  );
}
