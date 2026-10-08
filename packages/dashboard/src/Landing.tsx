import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowRightRegular,
  BotRegular,
  BuildingBankRegular,
  CheckmarkCircleRegular,
  DatabaseRegular,
  DocumentBulletListRegular,
  ShieldCheckmarkRegular,
  ChevronDownRegular,
} from "@fluentui/react-icons";
import { demoSnapshot, denialLabels, formatTime, formatUsdc } from "./data.js";
import { VPrism } from "./VPrism.js";
import { HeroMascot } from "./HeroMascot.js";
import "./ProductWalkthrough.css";
import { FlipFadeHeroText } from "./FlipFadeText.js";

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
      <span className="landing-brand-mark"><img src="/logo-zeta.png" alt="" /></span>
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
            <h3>{rows[activeRow].allowed ? "Allowed" : "Denied"} <span>payment decision</span></h3>
          </div>
          <div className="details-section">
            <h4>Decision details</h4>
            <div className="details-table">
              <div><span>Amount</span><span>{formatUsdc(rows[activeRow].amount)} USDC</span></div>
              <div><span>Reason</span><span>{rows[activeRow].allowed ? "Allowed by policy" : denialLabels[rows[activeRow].denial]}</span></div>
              <div><span>Requested by</span><span>Approved agent</span></div>
              <div><span>Proof</span><span>Available on Solana</span></div>
            </div>
          </div>
          <div className="details-section">
            <h4>Decision summary</h4>
            <div className={`decision-summary ${rows[activeRow].allowed ? "decision-summary-approved" : "decision-summary-denied"}`}>
              <span className="decision-summary-icon"><ShieldCheckmarkRegular /></span>
              <div>
                <strong>{rows[activeRow].allowed ? "Payment approved" : "Payment stopped"}</strong>
                <p>{rows[activeRow].allowed
                  ? "The amount and recipient matched the active policy."
                  : denialLabels[rows[activeRow].denial]}</p>
              </div>
              <span className="decision-summary-proof">Recorded on Solana</span>
            </div>
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
        <div className="agent-payment-story">
          <div className="payment-story-request">
            <span className="payment-story-icon"><BotRegular /></span>
            <div><small>Agent request</small><strong>Purchase API credits</strong><span>10.00 USDC</span></div>
          </div>
          <div className="payment-story-route" aria-hidden="true"><span /><span /><span /></div>
          <div className="payment-story-checks">
            <small>Zeta policy check</small>
            <span><CheckmarkCircleRegular /> Within payment limit</span>
            <span><CheckmarkCircleRegular /> Approved recipient</span>
            <span><CheckmarkCircleRegular /> Credit line active</span>
          </div>
          <div className="payment-story-result">
            <CheckmarkCircleRegular />
            <div><small>Approved</small><strong>Payment complete</strong><span>Proof saved automatically</span></div>
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
        <div className="receipt-sheet">
          <div className="receipt-heading">
            <span className="receipt-eyebrow">On-chain receipt</span>
            <div><h3>Payment verified</h3><span className="receipt-status"><CheckmarkCircleRegular /> Confirmed</span></div>
          </div>
          <div className="receipt-amount">
            <span>Agent payment</span>
            <div><strong>10.00</strong><span>USDC</span></div>
            <p>Approved by the active spending policy</p>
          </div>
          <dl className="receipt-details">
            <div><dt>Decision</dt><dd className="receipt-allowed">Allowed by policy</dd></div>
            <div><dt>Network</dt><dd>Solana Devnet</dd></div>
            <div><dt>Record</dt><dd>Permanent</dd></div>
          </dl>
          <div className="receipt-note"><ShieldCheckmarkRegular /><p><strong>Independently verifiable.</strong> Check the decision without trusting the agent.</p></div>
        </div>
      </div>
    </div>
  );
}

function FundingPreview() {
  return (
    <div className="funding-preview">
      <div className="funding-preview-heading"><span>Shared capital</span><strong>One pool. Ready for work.</strong></div>
      <div className="funding-balance"><DatabaseRegular /><span>USDC in the pool</span><strong>12,000<span> USDC</span></strong></div>
      <div className="funding-allocation"><div><span>Allocated to agent lines</span><strong>4,500 USDC</strong></div><div><span>Available capital</span><strong>7,500 USDC</strong></div></div>
      <div className="funding-meter" aria-hidden="true"><span /></div>
      <div className="funding-confirmation"><CheckmarkCircleRegular /><span>Funded once. Shared by approved agent lines.</span></div>
    </div>
  );
}

function ProductWalkthrough({ onOpenDashboard }: LandingProps) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [pinned, setPinned] = useState(() => window.matchMedia("(min-width: 1051px) and (min-height: 650px)").matches);
  const anchors = ["fund", "policy", "agent", "verify"];
  const previews = [<FundingPreview />, <PolicyPreview />, <AgentSpendsPreview />, <VerifyProofPreview />];

  const selectStep = (index: number) => {
    activeRef.current = index;
    setActive(index);
    const section = sectionRef.current;
    if (!section) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    if (pinned) {
      const padding = parseFloat(getComputedStyle(section).paddingTop);
      const distance = parseFloat(section.style.getPropertyValue("--walkthrough-scroll-distance"));
      const top = section.getBoundingClientRect().top + window.scrollY + padding - 88 + distance * (index + .15) / 4;
      window.scrollTo({ top, behavior });
    } else {
      section.querySelector(`#mobile-workflow-${index}`)?.scrollIntoView({ behavior, block: "start" });
    }
  };

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1051px) and (min-height: 650px)");
    const sync = () => setPinned(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!pinned) return;
      const padding = parseFloat(getComputedStyle(section).paddingTop);
      const distance = parseFloat(section.style.getPropertyValue("--walkthrough-scroll-distance"));
      const progress = (88 - section.getBoundingClientRect().top - padding) / distance;
      if (progress < 0 || progress > 1) return;
      const index = Math.min(3, Math.max(0, Math.floor(progress * 4)));
      if (activeRef.current !== index) {
        activeRef.current = index;
        setActive(index);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      section.style.setProperty("--walkthrough-grid-height", `${grid.offsetHeight}px`);
      section.style.setProperty("--walkthrough-scroll-distance", `${Math.max(480, window.innerHeight * .7) * 4}px`);
      schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(grid);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    measure();
    const mobileObserver = new IntersectionObserver(entries => {
      if (pinned) return;
      const entry = entries.find(item => item.isIntersecting);
      if (!entry) return;
      const index = Number((entry.target as HTMLElement).dataset.step);
      activeRef.current = index;
      setActive(index);
    }, { rootMargin: "-20% 0px -50% 0px", threshold: 0 });
    section.querySelectorAll(".walkthrough-mobile-step").forEach(node => mobileObserver.observe(node));
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mobileObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  useEffect(() => {
    const selectFromHash = () => {
      const index = anchors.indexOf(window.location.hash.slice(1));
      if (index >= 0) selectStep(index);
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, [pinned]);

  return (
    <section ref={sectionRef} className={`landing-section product-walkthrough${pinned ? " walkthrough-scroll-enabled" : ""}`} id="product" aria-labelledby="walkthrough-title">
      <div ref={gridRef} className="walkthrough-grid">
        <div className="walkthrough-copy">
          <span className="section-eyebrow">Zeta in action</span>
          <h2 id="walkthrough-title">From capital<br />to confidence.</h2>
          <p className="walkthrough-intro">Follow a payment from a funded pool to a decision you can verify.</p>
          <div className="walkthrough-tabs" role={pinned ? "tablist" : undefined} aria-label="Explore the Zeta payment workflow" aria-orientation={pinned ? "vertical" : undefined}>
            {steps.map((step, index) => (
              <button
                ref={element => { tabs.current[index] = element; }}
                key={step.title}
                id={anchors[index]}
                role={pinned ? "tab" : undefined}
                type="button"
                aria-selected={pinned ? active === index : undefined}
                aria-pressed={pinned ? undefined : active === index}
                aria-controls={pinned ? "walkthrough-panel" : `mobile-workflow-${index}`}
                tabIndex={!pinned || active === index ? 0 : -1}
                className={`walkthrough-tab${active === index ? " walkthrough-tab-active" : ""}`}
                onClick={() => selectStep(index)}
                onKeyDown={event => {
                  let next = index;
                  if (event.key === "ArrowDown") next = (index + 1) % steps.length;
                  else if (event.key === "ArrowUp") next = (index + steps.length - 1) % steps.length;
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = steps.length - 1;
                  else return;
                  event.preventDefault();
                  selectStep(next);
                  tabs.current[next]?.focus({ preventScroll: true });
                }}
              >
                <span className="walkthrough-number">0{index + 1}</span>
                <span><strong>{step.title}</strong><span className="walkthrough-description">{index === 2 ? "Agents pay for approved tools and services autonomously without receiving unrestricted wallet access." : step.copy}</span></span>
                <ArrowRightRegular aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        {pinned ? <div className="walkthrough-stage">
          <div className="walkthrough-stage-label"><span><img src="/logo-zeta.png" alt="" /> Zeta preview</span><span>Sample data</span></div>
          <div id="walkthrough-panel" role="tabpanel" aria-labelledby={anchors[active]} tabIndex={0}>
            <div key={active} className="walkthrough-scene">{previews[active]}</div>
          </div>
          <button className="walkthrough-cta" type="button" onClick={onOpenDashboard}>Explore the dashboard <ArrowRightRegular /></button>
        </div> : <div className="walkthrough-mobile-story">
          {steps.map((step, index) => <section key={step.title} id={`mobile-workflow-${index}`} data-step={index} className="walkthrough-mobile-step" aria-label={step.title}>
            <div className="walkthrough-mobile-heading"><span>0{index + 1}</span><h3>{step.title}</h3></div>
            <div className="walkthrough-stage"><div className="walkthrough-stage-label"><span><img src="/logo-zeta.png" alt="" /> Zeta preview</span><span>Sample data</span></div>{previews[index]}</div>
          </section>)}
          <button className="walkthrough-cta" type="button" onClick={onOpenDashboard}>Explore the dashboard <ArrowRightRegular /></button>
        </div>}
      </div>
    </section>
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
                <span><small>Per-call cap</small><strong>1.00 USDC</strong></span>
                <span><small>Expiry</small><strong>Oct 28, 2026</strong></span>
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
          &ldquo;Authorization policies constrain individual transactions. However, they do not capture the execution history, cumulative spend, or multi-step strategies. Sequences of valid transactions may violate intended spending boundaries through repetition, fragmentation, or timing manipulation.&rdquo;
        </blockquote>
        <p className="testimonial-author">SoK: Blockchain Agent-to-Agent Payments, arXiv:2604.03733 (2026) &mdash; the gap Zeta closes</p>
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
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(([entry]) => {
      grid.classList.toggle("feature-visible", entry.isIntersecting);
    }, { threshold: 0.12 });
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="feature-cards-grid" ref={gridRef}>
      <article className="feature-card feature-card-pool">
        <div className="feature-card-content">
          <h3>One shared capital pool</h3>
          <p>Deposit USDC once. Every approved agent draw comes from the same pool.</p>
        </div>
        <div className="feature-pool-visual" aria-hidden="true">
          <span className="pool-path pool-path-one" />
          <span className="pool-path pool-path-two" />
          <span className="pool-path pool-path-three" />
          <span className="pool-drop pool-drop-one">USDC</span>
          <span className="pool-drop pool-drop-two">USDC</span>
          <span className="pool-drop pool-drop-three">USDC</span>
          <div className="pool-reservoir">
            <span className="pool-reservoir-rim" />
            <span className="pool-reservoir-water" />
            <span className="pool-reservoir-label">USDC pool</span>
            <span className="pool-reservoir-ripple" />
          </div>
        </div>
      </article>

      <article className="feature-card feature-card-policy">
        <div className="feature-card-content">
          <h3>Rules checked before every draw</h3>
          <p>Caps, expiry, and recipients are checked before funds can move.</p>
        </div>
        <div className="feature-policy-visual" aria-hidden="true">
          <span className="policy-source"><BotRegular /> Agent</span>
          <span className="policy-wire" />
          <span className="policy-request" />
          <div className="policy-gate">
            <span>Per-call cap <CheckmarkCircleRegular /></span>
            <span>Expiry <CheckmarkCircleRegular /></span>
            <span>Recipient <CheckmarkCircleRegular /></span>
          </div>
          <span className="policy-allow-line" />
          <span className="policy-allow">Allowed</span>
          <span className="policy-deny-line" />
          <span className="policy-deny">Denied</span>
        </div>
      </article>

      <article className="feature-card feature-card-proof">
        <div className="feature-card-content">
          <h3>Proof for every decision</h3>
          <p>Allowed and denied requests leave an on-chain decision you can verify.</p>
        </div>
        <div className="feature-proof-visual" aria-hidden="true">
          <div className="proof-events">
            <span className="proof-event"><CheckmarkCircleRegular /> Allowed</span>
            <span className="proof-event proof-event-denied"><ShieldCheckmarkRegular /> Denied</span>
            <span className="proof-event"><CheckmarkCircleRegular /> Allowed</span>
          </div>
          <span className="proof-connector" />
          <div className="proof-record"><DocumentBulletListRegular /><strong>On-chain record</strong><span>View transaction proof</span></div>
        </div>
      </article>
    </div>
  );
}

function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!video) return;

    const syncPlayback = () => {
      if (motionPreference.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        void video.play().catch(() => undefined);
      }
    };

    syncPlayback();
    motionPreference.addEventListener("change", syncPlayback);
    return () => motionPreference.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <video
      ref={videoRef}
      className="hero-background-video"
      poster="/hero-background-poster.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/hero-background.mp4" type="video/mp4" />
    </video>
  );
}

const CARD_WALL_STATS = [
  { figure: "$0", label: "International limit on most Nigerian naira debit cards" },
  { figure: "$500", label: "Monthly ceiling after cards were restored in July 2025" },
  { figure: "1/10th", label: "Of the 2015 limit, after a 70% currency decline" },
  { figure: "Verve", label: "Nigeria's most-used card network — not accepted by AWS" },
] as const;

function CardWallSection() {
  return (
    <section className="landing-section cardwall-section reveal" id="why" aria-labelledby="cardwall-title">
      <div className="section-heading section-heading-centered">
        <p className="landing-section-label">Why Zeta exists</p>
        <h2 id="cardwall-title">Every agent payment standard<br />assumes you have a card.</h2>
        <p className="cardwall-lede">
          Google&rsquo;s AP2, Stripe&rsquo;s MPP, and the card-network mandates behind them all settle
          on rails that a billion developers cannot reach.
        </p>
      </div>
      <div className="cardwall-grid">
        {CARD_WALL_STATS.map((stat) => (
          <div className="cardwall-stat" key={stat.figure}>
            <strong>{stat.figure}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <div className="cardwall-close">
        <p>
          A developer in Lagos cannot hand an autonomous agent a card that does not work.
          And when your entire monthly capacity is $500, a spend that leaks past a per-call
          cap is not a rounding error &mdash; it is <strong>40% of your month</strong>, and the failed
          payment afterwards can suspend the account you work from.
        </p>
        <p className="cardwall-answer">
          Zeta is credit that needs no card, no bank, and no FX approval &mdash; with the
          spending rules enforced on-chain, across the whole sequence, before funds move.
        </p>
      </div>
    </section>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: "What is Zeta Labs?", a: "Zeta Labs provides programmable credit infrastructure on Solana. Fund a pool, set spending policies, and let autonomous agents pay for tools and services without handing over your wallet." },
    { q: "How does the policy engine work?", a: "You define per-transaction caps, daily frequency limits, recipient allowlists, and expiry dates. Every draw request is checked against these rules on-chain before funds move." },
    { q: "Is it safe for production?", a: "Zeta uses on-chain program validation. Every transaction generates cryptographic proof. Agents never receive unrestricted wallet access. They can only spend within the boundaries you set." },
    { q: "What tokens are supported?", a: "Currently USDC on Solana devnet. Mainnet support and additional stablecoins are on the roadmap." },
    { q: "How do I get started?", a: "Install the @zetasdk/sdk package, connect to your Solana RPC, create a pool, and set a policy. The SDK guide walks through every step." },
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
            <button className="landing-button landing-button-primary" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a className="landing-button cta-button-outline" href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">
              <span>Documentation</span>
            </a>
          </div>
          <p className="cta-subtext">Live on Solana devnet. Open source. <code>npm i @zetasdk/sdk</code></p>
        </div>
        <div className="testimonial-art" aria-hidden="true">
          {pixels.map((p) => (
            <div
              key={p.id}
              className="testimonial-pixel"
              style={{
                left: `${(p.c / p.cols) * 100}%`,
                top: `${(p.r / p.rows) * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing({ onOpenDashboard }: LandingProps) {
  const [footerBurst, setFooterBurst] = useState(false);

  const moveGuardian = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const footer = event.currentTarget;
    const bounds = footer.getBoundingClientRect();
    const horizontal = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    const vertical = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
    footer.style.setProperty("--guardian-x", `${(horizontal * 13).toFixed(2)}px`);
    footer.style.setProperty("--guardian-y", `${(vertical * 5).toFixed(2)}px`);
    footer.style.setProperty("--guardian-tilt", `${(horizontal * 0.7).toFixed(2)}deg`);
    footer.style.setProperty("--guardian-eye-x", `${(horizontal * 5).toFixed(2)}px`);
    footer.style.setProperty("--guardian-eye-y", `${(vertical * 2).toFixed(2)}px`);
  };

  const resetGuardian = (event: ReactPointerEvent<HTMLElement>) => {
    const footer = event.currentTarget;
    footer.style.setProperty("--guardian-x", "0px");
    footer.style.setProperty("--guardian-y", "0px");
    footer.style.setProperty("--guardian-tilt", "0deg");
    footer.style.setProperty("--guardian-eye-x", "0px");
    footer.style.setProperty("--guardian-eye-y", "0px");
  };

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
          <a href="#why">Why Zeta</a>
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#developers">Developers</a>
          <a href="/docs">Docs</a>
        </nav>
        <button className="landing-button landing-button-primary" type="button" onClick={onOpenDashboard}>
          <span>Open dashboard</span><ArrowRightRegular />
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <HeroBackgroundVideo />
          <div className="hero-copy">
            <span className="hero-eyebrow">Programmable credit on Solana</span>
            <FlipFadeHeroText />
            <p>Fund once, set the rules, and let autonomous software pay safely.</p>
            <div className="hero-actions">
              <button className="landing-button landing-button-primary" type="button" onClick={onOpenDashboard}>
                <span>Open dashboard</span><ArrowRightRegular />
              </button>
              <a className="landing-button landing-button-outline" href="/docs"><span>Read the SDK guide</span></a>
              <HeroMascot />
            </div>
          </div>
        </section>

        <div className="landing-trusted-section">
          <p className="trusted-heading">Built on</p>
          <div className="landing-trusted-logos-wrapper">
            <div className="landing-trusted-logos">
              <div className="trusted-logo">Solana</div>
              <div className="trusted-logo">Payment Channels</div>
              <div className="trusted-logo">x402</div>
              <div className="trusted-logo">Swig</div>
              <div className="trusted-logo">USDC</div>
              <div className="trusted-logo">Solana</div>
              <div className="trusted-logo">Payment Channels</div>
              <div className="trusted-logo">x402</div>
              <div className="trusted-logo">Swig</div>
              <div className="trusted-logo">USDC</div>
            </div>
          </div>
        </div>



        <CardWallSection />

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

        <ProductWalkthrough onOpenDashboard={onOpenDashboard} />

        <section className="landing-section feature-section reveal" id="features">
          <h2 id="features-title" className="features-title">Built for agentic workflows</h2>
          <FeatureCards />
        </section>

        <section className="landing-section sdk-features-section reveal" aria-labelledby="sdk-features-title">
          <div className="sdk-features-heading">
            <span className="section-eyebrow">SDK features</span>
            <h2 id="sdk-features-title">The essentials, built in.</h2>
            <p>Manage capital, define spending rules, and check each decision through the Zeta SDK.</p>
          </div>
          <div className="sdk-features-grid">
            <article>
              <span className="sdk-feature-icon" aria-hidden="true"><DatabaseRegular /></span>
              <h3>Fund</h3>
              <p>Use one shared USDC pool for approved agent lines.</p>
            </article>
            <article>
              <span className="sdk-feature-icon" aria-hidden="true"><ShieldCheckmarkRegular /></span>
              <h3>Control</h3>
              <p>Set limits, expiry, and allowed recipients before an agent spends.</p>
            </article>
            <article>
              <span className="sdk-feature-icon" aria-hidden="true"><DocumentBulletListRegular /></span>
              <h3>Verify</h3>
              <p>Read the decision and its transaction proof after each draw.</p>
            </article>
          </div>
        </section>

        <section className="landing-section developer-section reveal" id="developers" aria-labelledby="developer-title">
          <div className="developer-lead">
            <div className="developer-intro">
              <span className="developer-kicker">For developers</span>
              <h2 id="developer-title">Start with the rules.</h2>
              <p>Give an agent a funded credit line with clear limits, then keep a record of every decision.</p>
              <a className="developer-doc-link" href="/docs">Read the SDK guide <ArrowRightRegular /></a>
            </div>
            <VPrism />
          </div>
          <div className="developer-example">
            <div className="integration-journey" aria-label="How Zeta connects a funded pool to a verified agent payment">
              <div className="integration-journey-head">
                <span>One connection</span>
                <strong>From budget to proof</strong>
                <p>Your product sets the rules. Zeta checks each payment and keeps the record.</p>
              </div>
              <div className="integration-journey-track" aria-hidden="true">
                <span className="journey-pulse" />
              </div>
              <div className="integration-journey-stages">
                <div><span><DatabaseRegular /></span><strong>Fund</strong><small>Shared USDC pool</small></div>
                <div><span><ShieldCheckmarkRegular /></span><strong>Check</strong><small>Policy decides</small></div>
                <div><span><BotRegular /></span><strong>Pay</strong><small>Agent completes work</small></div>
                <div><span><DocumentBulletListRegular /></span><strong>Prove</strong><small>Record stays visible</small></div>
              </div>
            </div>
          </div>
          <div className="developer-actions">
            <button className="landing-button landing-button-primary dev-action-btn" type="button" onClick={onOpenDashboard}>
              <span>Open dashboard</span><ArrowRightRegular />
            </button>
            <a className="landing-button landing-button-outline-dark" href="/docs">
              <span>Read the SDK guide</span>
            </a>
          </div>
        </section>

<FaqSection />
        <CtaSection onOpenDashboard={onOpenDashboard} />
      </main>

      <footer
        className={`zeta-character-footer reveal${footerBurst ? " footer-is-bursting" : ""}`}
        onPointerMove={moveGuardian}
        onPointerLeave={resetGuardian}
      >
        <div className="character-footer-nav character-footer-left">
          <div>
            <strong>Product</strong>
            <a href="#product">Dashboard</a>
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <strong>Developers</strong>
            <a href="/docs">SDK guide</a>
            <a href="/docs#devnet">Devnet setup</a>
            <a href="/docs#reference">API reference</a>
            <a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>

        <button
          className="character-footer-brand"
          type="button"
          aria-label="Animate the Zeta credit guardian"
          onClick={() => setFooterBurst(true)}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setFooterBurst(false);
          }}
        >
          <img src="/logo-zeta.png" alt="" />
          <span>Zeta Labs</span>
          <i className="brand-particle particle-one" />
          <i className="brand-particle particle-two" />
          <i className="brand-particle particle-three" />
          <i className="brand-particle particle-four" />
          <i className="brand-particle particle-five" />
          <i className="brand-particle particle-six" />
        </button>

        <div className="character-footer-nav character-footer-right">
          <div>
            <strong>Zeta</strong>
            <button type="button" onClick={onOpenDashboard}>Open dashboard</button>
            <a href="/docs#policy">Policy controls</a>
            <a href="/docs#audit">Audit trail</a>
            <a href="/docs">Documentation</a>
          </div>
          <div>
            <strong>Elsewhere</strong>
            <a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter</a>
            <a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://discord.com" target="_blank" rel="noreferrer">Discord</a>
            <a href="#top">Back to top</a>
          </div>
        </div>

        <div className="credit-guardian" aria-hidden="true">
          <div className="guardian-body">
            <img src="/zeta-credit-guardian.png" alt="" />
            <span className="guardian-visor">
              <i className="guardian-eye guardian-eye-left" />
              <i className="guardian-eye guardian-eye-right" />
            </span>
          </div>
        </div>

        <a className="character-footer-cta" href="/docs">Read the SDK guide <ArrowRightRegular /></a>
        <div className="character-footer-meta">
          <span>&copy; 2024-{new Date().getFullYear()} Zeta Labs&trade;</span>
          <span>Programmable credit on Solana</span>
        </div>
      </footer>
    </div>
  );
}
