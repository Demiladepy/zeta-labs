import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightRegular,
  BotRegular,
  BuildingBankRegular,
  CheckmarkCircleRegular,
  CodeRegular,
  DatabaseRegular,
  DocumentBulletListRegular,
  ShieldCheckmarkRegular,
  ChevronDownRegular,
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
  const rows = snapshot.audits.slice(0, 5);
  const [activeRow, setActiveRow] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveRow((prev) => (prev + 1) % rows.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [rows.length]);

  return (
    <div className="landing-product" aria-label="Zeta dashboard preview using sample data">
      <aside className="preview-sidebar" aria-hidden="true">
        <div className="mac-dots">
          <span className="mac-dot" style={{ background: '#ff5f56' }} />
          <span className="mac-dot" style={{ background: '#ffbd2e' }} />
          <span className="mac-dot" style={{ background: '#27c93f' }} />
        </div>
        <Brand />
        <span className="preview-nav-active">Overview</span>
        <span>Lender</span>
        <span>Agent</span>
        <span>Policies</span>
        <span>Audit</span>
      </aside>
      <div className="preview-content-3col">
        <div className="preview-list">
          <div className="preview-list-header">
            <h3>Recent decisions</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          </div>
          <div className="preview-list-items">
            {rows.map((entry, idx) => (
              <div className={`preview-list-item ${idx === activeRow ? 'active' : ''}`} key={`${entry.signature}-${entry.slot}`}>
                <div className="list-item-top">
                  <span className={entry.allowed ? "method-allowed" : "method-denied"}>{entry.allowed ? "ALLOWED" : "DENIED"}</span>
                  <span className="amount">{formatUsdc(entry.amount)} USDC</span>
                </div>
                <div className="list-item-bottom">
                  <span className="time">{formatTime(entry.unixTs)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="preview-details">
          <div className="details-header">
            <h3>{rows[activeRow].allowed ? "ALLOWED" : "DENIED"} <span>/decision/{rows[activeRow].signature.slice(0, 8)}</span></h3>
          </div>
          <div className="details-section">
            <h4>Headers</h4>
            <div className="details-table">
              <div><span>Amount</span><span>{formatUsdc(rows[activeRow].amount)} USDC</span></div>
              <div><span>Reason</span><span>{rows[activeRow].allowed ? "Allowed by policy" : denialLabels[rows[activeRow].denial]}</span></div>
              <div><span>Agent</span><span>0xAbCd...1234</span></div>
              <div><span>Signature</span><span>{rows[activeRow].signature.slice(0, 32)}...</span></div>
            </div>
          </div>
          <div className="details-section">
            <h4>Body</h4>
            <pre className="details-json">
{`{
  "id": "evt_${rows[activeRow].signature.slice(0, 16)}",
  "object": "decision",
  "amount": ${rows[activeRow].amount},
  "allowed": ${rows[activeRow].allowed}
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyPreview() {
  const [limit, setLimit] = useState("50.00");

  useEffect(() => {
    const timer = setInterval(() => {
      setLimit(prev => prev === "50.00" ? "150.00" : "50.00");
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="landing-product" aria-label="Zeta dashboard policy preview">
      <aside className="preview-sidebar" aria-hidden="true">
        <div className="mac-dots">
          <span className="mac-dot" style={{ background: '#ff5f56' }} />
          <span className="mac-dot" style={{ background: '#ffbd2e' }} />
          <span className="mac-dot" style={{ background: '#27c93f' }} />
        </div>
        <Brand />
        <span>Overview</span>
        <span>Lender</span>
        <span>Agent</span>
        <span className="preview-nav-active">Policies</span>
        <span>Audit</span>
      </aside>
      <div className="preview-content">
        <div className="preview-heading">
          <div><span>Policy configuration</span><strong>Agent spending rules</strong></div>
          <span className="preview-source">Edit mode</span>
        </div>
        <div className="policy-editor">
          <div className="policy-field">
            <div>
              <label>Per-transaction limit</label>
              <p>Maximum amount the agent can draw per request</p>
            </div>
            <div className="policy-input-wrap pulse-bg">
              <input type="text" value={limit} readOnly className="policy-input" />
              <span className="policy-currency">USDC</span>
            </div>
          </div>
          <div className="policy-field">
            <div>
              <label>Daily frequency cap</label>
              <p>Maximum number of allowed calls per 24 hours</p>
            </div>
            <div className="policy-input-wrap">
              <input type="text" value="24" readOnly className="policy-input" />
            </div>
          </div>
          <div className="policy-field policy-field-toggle">
            <div>
              <label>Strict allowlist</label>
              <p>Only allow payments to pre-approved smart contracts</p>
            </div>
            <div className="policy-toggle policy-toggle-animated">
              <div className="policy-toggle-knob"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentSpendsPreview() {
  return (
    <div className="landing-product" aria-label="Zeta dashboard agent view">
      <aside className="preview-sidebar" aria-hidden="true">
        <div className="mac-dots">
          <span className="mac-dot" style={{ background: '#ff5f56' }} />
          <span className="mac-dot" style={{ background: '#ffbd2e' }} />
          <span className="mac-dot" style={{ background: '#27c93f' }} />
        </div>
        <Brand />
        <span>Overview</span>
        <span>Lender</span>
        <span className="preview-nav-active">Agent</span>
        <span>Policies</span>
        <span>Audit</span>
      </aside>
      <div className="preview-content">
        <div className="preview-heading">
          <div><span>Autonomous execution</span><strong>Agent Wallet</strong></div>
          <span className="preview-source">Live network</span>
        </div>
        <div className="agent-terminal-wrapper">
          <div className="agent-terminal">
            <div className="terminal-header">
              <span>agent-loop.py</span>
              <span className="terminal-status"></span>
            </div>
            <div className="terminal-body">
              <p className="terminal-line terminal-delay-1"><span className="prompt">$</span> initializing agent loop...</p>
              <p className="terminal-line terminal-delay-2"><span className="prompt">$</span> LLM requested tool: <span className="highlight">purchase_api_credits(amount=10)</span></p>
              <p className="terminal-line terminal-delay-3"><span className="prompt">$</span> executing on-chain draw request via Zeta...</p>
              <p className="terminal-line terminal-delay-4 terminal-success"><span className="icon">✔</span> draw approved by Zeta policy (Tx: 0x8f...2a)</p>
              <p className="terminal-line terminal-delay-5"><span className="prompt">$</span> API credits successfully purchased. Continuing execution.</p>
              <p className="terminal-cursor">_</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyProofPreview() {
  return (
    <div className="landing-product" aria-label="Zeta dashboard audit view">
      <aside className="preview-sidebar" aria-hidden="true">
        <div className="mac-dots">
          <span className="mac-dot" style={{ background: '#ff5f56' }} />
          <span className="mac-dot" style={{ background: '#ffbd2e' }} />
          <span className="mac-dot" style={{ background: '#27c93f' }} />
        </div>
        <Brand />
        <span>Overview</span>
        <span>Lender</span>
        <span>Agent</span>
        <span>Policies</span>
        <span className="preview-nav-active">Audit</span>
      </aside>
      <div className="preview-content-3col">
        <div className="preview-list">
          <div className="preview-list-header">
            <h3>Recent audits</h3>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
          </div>
          <div className="preview-list-items">
            <div className="preview-list-item active">
               <div className="list-item-top"><span className="method-allowed" style={{color: "#fff"}}>VERIFIED</span></div>
               <div className="list-item-bottom"><span className="time">Just now</span></div>
            </div>
            <div className="preview-list-item">
               <div className="list-item-top"><span className="method-allowed">VERIFIED</span></div>
               <div className="list-item-bottom"><span className="time">2 hours ago</span></div>
            </div>
          </div>
        </div>
        <div className="preview-details" style={{ backgroundColor: "#081a12", color: "#d6f3df", gap: "24px" }}>
          <div className="details-header" style={{ borderBottom: "1px solid #2a4334", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ color: "#27c93f", fontFamily: "'Cascadia Code', monospace" }}>Cryptographic Proof</h3>
              <span style={{ color: "#b8c9bd", fontSize: "12px" }}>On-chain Receipt</span>
            </div>
            <span className="pulse-bg-dark" style={{ padding: "4px 8px", background: "#112b1d", borderRadius: "4px", fontSize: "11px", color: "#27c93f", border: "1px solid #2a4334" }}>Confirmed in slot 251939103</span>
          </div>
          <div className="details-section">
            <h4 style={{ color: "#fff", marginBottom: "12px", fontSize: "14px" }}>Transaction Payload</h4>
            <pre className="details-json" style={{ background: "#0c2118", borderColor: "#2a4334", color: "#a5c2ff" }}>
{`{
  "signature": "3K...9fX",
  "programId": "zeta...v2",
  "instruction": "AgentDraw",
  "data": {
     "amount": 10000000,
     "allowed": true,
     "policyHash": "0x4b...f1"
  }
}`}
            </pre>
          </div>
          <div className="details-section">
            <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "#112b1d", padding: "16px", borderRadius: "8px", border: "1px solid #2a4334" }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#27c93f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
               <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Cryptographically verified by Solana Network</span>
            </div>
          </div>
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

function Testimonial() {
  const pixels = useMemo(() => {
    const arr = [];
    const rows = 35;
    const cols = 150;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c / (cols - 1);
        const y = r / (rows - 1);
        const moundHeight = Math.pow(x, 2.5) * 0.95;
        const currentYInverted = 1 - y;

        if (currentYInverted < moundHeight) {
          const depth = moundHeight - currentYInverted;
          const probability = Math.min(1, depth * 2.5 + Math.random() * 0.2);
          if (Math.random() < probability) {
            arr.push({ id: `${r}-${c}`, r, c, cols, rows });
          }
        }
      }
    }
    return arr;
  }, []);

  return (
    <div className="testimonial-card">
      <div className="testimonial-content">
        <blockquote className="testimonial-quote">
          &ldquo;Before Zeta Labs, we wasted valuable time building custom wallets and monitoring agent spends manually. Now it&rsquo;s as simple as setting a policy and we&rsquo;re secure in seconds. The on-chain audits are outstanding.&rdquo;
        </blockquote>
        <p className="testimonial-author">&mdash; Core Developer at Demo Corp</p>
      </div>
      <div className="testimonial-art" aria-hidden="true">
        {pixels.map((p) => (
          <div
            key={p.id}
            className="testimonial-pixel"
            style={{
              left: `${(p.c / p.cols) * 100}%`,
              top: `${(p.r / p.rows) * 100}%`,
              opacity: 0.3 + Math.random() * 0.7,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FeatureCards() {
  const cards = [
    {
      title: "One shared capital pool",
      copy: "Deposit USDC once. The pool remains the single source of capital for every approved agent line.",
      tag: "SHARED POOL",
      color: "var(--mint)",
      visual: (
        <div className="visual-pool">
          <div className="visual-ring ring-1"></div>
          <div className="visual-ring ring-2"></div>
          <div className="visual-ring ring-3"></div>
          <div className="visual-ring ring-4"></div>
          <div className="visual-line"></div>
        </div>
      )
    },
    {
      title: "Rules checked before every draw",
      copy: "Set caps, expiry, and allowed recipients. Each draw request is validated against the live policy.",
      tag: "POLICY ENGINE",
      color: "#a77ee2",
      visual: (
        <div className="visual-rules">
          <div className="visual-box box-1"></div>
          <div className="visual-box box-2"></div>
          <div className="visual-box box-3"></div>
        </div>
      )
    },
    {
      title: "Proof for every decision",
      copy: "Each allowed or denied transaction generates an on-chain audit trail with a permanent explorer link.",
      tag: "AUDIT TRAIL",
      color: "#6cb575",
      visual: (
        <div className="visual-proof">
          <div className="node center-node"></div>
          <div className="node peripheral-node p1"></div>
          <div className="node peripheral-node p2"></div>
          <div className="node peripheral-node p3"></div>
          <div className="node peripheral-node p4"></div>
          <div className="node peripheral-node p5"></div>
          <div className="link l1"></div>
          <div className="link l2"></div>
          <div className="link l3"></div>
          <div className="link l4"></div>
          <div className="link l5"></div>
        </div>
      )
    },
  ];

  return (
    <div className="feature-cards-grid">
      {cards.map((card) => (
        <div className="feature-card" key={card.title}>
          <div className="feature-card-art">
            {card.visual}
          </div>
          <div className="feature-card-content">
            <span className="feature-card-tag"><span className="tag-dot" style={{ background: card.color }} />{card.tag}</span>
            <p>{card.copy}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: "What is Zeta Labs?", a: "Zeta Labs provides programmable credit infrastructure on Solana. Fund a pool, set spending policies, and let autonomous agents pay for tools and services without handing over your wallet." },
    { q: "How does the policy engine work?", a: "You define rules — per-transaction caps, daily frequency limits, recipient allowlists, and expiry dates. Every draw request is checked against these rules on-chain before funds move." },
    { q: "Is it safe for production?", a: "Zeta uses on-chain program validation. Every transaction generates a cryptographic proof. Agents never receive unrestricted wallet access — they can only spend within the boundaries you set." },
    { q: "What tokens are supported?", a: "Currently USDC on Solana devnet. Mainnet support and additional stablecoins are on the roadmap." },
    { q: "How do I get started?", a: "Install the @zeta/sdk package, connect to your Solana RPC, create a pool, and set a policy. The SDK guide walks through every step." },
  ];

  return (
    <section className="landing-section faq-section reveal" id="faq">
      <div className="faq-container">
        <div className="faq-left">
          <h2>Frequently asked<br />questions</h2>
          <p>Everything you need to know about Zeta Labs and programmable agent credit.</p>
        </div>
        <div className="faq-right">
          {faqs.map((faq, i) => (
            <div
              className={`faq-item ${openIndex === i ? "faq-item-open" : ""}`}
              key={faq.q}
            >
              <button
                type="button"
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span>{faq.q}</span>
                <ChevronDownRegular />
              </button>
              {openIndex === i && (
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const pixels = useMemo(() => {
    const arr = [];
    const rows = 35;
    const cols = 150;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c / (cols - 1);
        const y = r / (rows - 1);
        const moundHeight = Math.pow(x, 2.5) * 0.95;
        const currentYInverted = 1 - y;

        if (currentYInverted < moundHeight) {
          const depth = moundHeight - currentYInverted;
          const probability = Math.min(1, depth * 2.5 + Math.random() * 0.2);
          if (Math.random() < probability) {
            arr.push({ id: `${r}-${c}`, r, c, cols, rows });
          }
        }
      }
    }
    return arr;
  }, []);

  return (
    <section className="landing-section cta-section reveal">
      <div className="testimonial-card">
        <div className="testimonial-content">
          <h2 className="cta-heading">
            <strong>Fund once. Set rules.</strong> Let agents pay securely in seconds.
          </h2>
          <div className="cta-actions">
            <button className="landing-button landing-button-light" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a className="landing-button cta-button-outline" href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">
              <span>Documentation</span>
            </a>
          </div>
          <p className="cta-subtext">Free 14-day trial included. No credit card required.</p>
        </div>
        <div className="testimonial-art" aria-hidden="true">
          {pixels.map((p) => (
            <div
              key={p.id}
              className="testimonial-pixel"
              style={{
                left: `${(p.c / p.cols) * 100}%`,
                top: `${(p.r / p.rows) * 100}%`,
                opacity: 0.3 + Math.random() * 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </section>
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
          <a href="#features">Features</a>
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
            <div className="hero-art-overlay" aria-hidden="true">
              {Array.from({ length: 144 }).map((_, i) => (
                <div
                  key={i}
                  className="reveal-square"
                  style={{ animationDelay: `${(Math.random() * 4 + (i % 12) * 0.15 + Math.floor(i / 12) * 0.12).toFixed(2)}s` }}
                />
              ))}
            </div>
          </div>
        </section>

        <div className="landing-trusted-section">
          <p className="trusted-heading">Trusted by the dev teams at</p>
          <div className="landing-trusted-logos">
            <div className="trusted-logo">Axiom AI</div>
            <div className="trusted-logo">Spectro Labs</div>
            <div className="trusted-logo">ChainFlip</div>
            <div className="trusted-logo">Neon DAO</div>
            <div className="trusted-logo">Primer</div>
          </div>
        </div>

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

        <section className="landing-section reveal testimonial-section-wrapper" aria-labelledby="testimonial-title">
          <Testimonial />
        </section>

        <section className="landing-section product-section reveal" id="product" aria-labelledby="product-title">
          <div className="feature-heading">
            <h2 id="product-title"><span className="feature-step">01</span> Fund the pool</h2>
            <p>Deposit USDC once. The pool remains the single source of capital for every approved agent line.</p>
          </div>
          <ProductPreview />
        </section>

        <section className="landing-section product-section reveal" id="policy" aria-labelledby="policy-title">
          <div className="feature-heading">
            <h2 id="policy-title"><span className="feature-step">02</span> Set policy</h2>
            <p>Choose caps, expiry, and recipients. Every draw is checked before funds can move.</p>
          </div>
          <PolicyPreview />
        </section>

        <section className="landing-section product-section reveal" id="agent" aria-labelledby="agent-title">
          <div className="feature-heading">
            <h2 id="agent-title"><span className="feature-step">03</span> Agent spends</h2>
            <p>Agents pay for approved tools and services autonomously without receiving unrestricted wallet access.</p>
          </div>
          <AgentSpendsPreview />
        </section>

        <section className="landing-section product-section reveal" id="verify" aria-labelledby="verify-title">
          <div className="feature-heading">
            <h2 id="verify-title"><span className="feature-step">04</span> Verify proof</h2>
            <p>Each decision leaves an on-chain record with the amount, result, reason, and transaction proof.</p>
          </div>
          <VerifyProofPreview />
          <button className="landing-button landing-button-dark product-cta" type="button" onClick={onOpenDashboard}>
            <span>Open dashboard</span><ArrowRightRegular />
          </button>
        </section>

        <section className="landing-section feature-section reveal" id="features">
          <h2 id="features-title" className="features-title">Built for agentic workflows</h2>
          <FeatureCards />
        </section>

        <section className="landing-section developer-section reveal" id="developers" aria-labelledby="developer-title">
          <div className="developer-intro">
            <span className="developer-kicker">For developers</span>
            <h2 id="developer-title">Start with the rules.</h2>
            <p>Give an agent a funded credit line with clear limits, then keep a record of every decision.</p>
            <a className="developer-doc-link" href="https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk" target="_blank" rel="noreferrer">Read the SDK guide <ArrowRightRegular /></a>
          </div>
          <div className="developer-example">
            <div className="code-window">
              <div className="code-window-head"><span><CodeRegular /> @zeta/sdk</span><small>TypeScript</small></div>
              <pre><code>{`import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createZetaClient } from "@zeta/sdk";
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ZETA_KEY!)));
const zeta = createZetaClient({ connection: new Connection("https://api.devnet.solana.com"), payer });
const pool = await zeta.pool(new PublicKey(process.env.ZETA_POOL!));
const proof = await zeta.proof(process.env.ZETA_SIGNATURE!);
console.log({ deposited: pool.deposited, outstanding: pool.outstanding });
console.log(proof.explorerUrl, proof.allowed);`}</code></pre>
            </div>
          </div>
          <div className="developer-principles" aria-label="What the Zeta SDK provides">
            <div><span>01</span><strong>Fund</strong><p>Use one shared USDC pool for approved agent lines.</p></div>
            <div><span>02</span><strong>Control</strong><p>Set limits, expiry, and allowed recipients before an agent spends.</p></div>
            <div><span>03</span><strong>Verify</strong><p>Read the decision and its transaction proof after each draw.</p></div>
          </div>
          <div className="developer-actions">
            <button className="landing-button landing-button-dark" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a href="https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk" target="_blank" rel="noreferrer">Read the SDK guide</a>
          </div>
        </section>

        <FaqSection />
        <CtaSection onOpenDashboard={onOpenDashboard} />
      </main>

      <footer className="landing-footer-fat">
        <div className="footer-top">
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-brand-desc">Programmable credit for<br />agents. Control for humans<br />on Solana.</p>
            <div className="footer-socials">
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X / Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
              </a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" aria-label="Discord">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </div>
          <div className="footer-links">
            <div>
              <strong>Product</strong>
              <a href="#product">Dashboard</a>
              <a href="#how-it-works">How it works</a>
              <a href="#features">Features</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <strong>Resources</strong>
              <a href="#developers">SDK Guide</a>
              <a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">GitHub</a>
              <a href="#developers">Changelog</a>
              <a href="#developers">API Reference</a>
            </div>
            <div>
              <strong>Documentation</strong>
              <a href="#developers">Quick start</a>
              <a href="#developers">Installation</a>
              <a href="#developers">Policy setup</a>
              <a href="#developers">Agent integration</a>
              <a href="#developers">Audit trail</a>
            </div>
            <div>
              <strong>Legal</strong>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">Security</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2024&ndash;{new Date().getFullYear()} Zeta Labs&trade;. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}