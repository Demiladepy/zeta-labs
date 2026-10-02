import {
  ArrowLeftRegular,
  ArrowRightRegular,
  OpenRegular,
} from "@fluentui/react-icons";

type DocsProps = {
  onHome: () => void;
  onOpenDashboard: () => void;
};

const sections = [
  { id: "overview", label: "Overview", group: "Start here" },
  { id: "quickstart", label: "Quickstart", group: "Start here" },
  { id: "install", label: "Install and connect", group: "Start here" },
  { id: "devnet", label: "Devnet setup", group: "Build with Zeta" },
  { id: "credit-flow", label: "Pool, policy, line", group: "Build with Zeta" },
  { id: "spend", label: "Agent spend", group: "Build with Zeta" },
  { id: "proof", label: "Proof and denials", group: "Build with Zeta" },
  { id: "reference", label: "SDK reference", group: "Reference" },
] as const;

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="docs-external-link" href={href} target="_blank" rel="noreferrer">{children}<OpenRegular aria-hidden="true" /></a>;
}

export default function Docs({ onHome, onOpenDashboard }: DocsProps) {
  return (
    <div className="docs-page">
      <header className="docs-topbar">
        <button className="docs-brand" type="button" onClick={onHome} aria-label="Go to Zeta Labs home"><img src="/logo-zeta.png" width="30" height="30" alt="" /><strong>Zeta Labs</strong><span>Docs</span></button>
        <nav aria-label="Docs top navigation"><button type="button" onClick={onHome}>Home</button><a href="https://github.com/Demiladepy/zeta-labs" target="_blank" rel="noreferrer">GitHub <OpenRegular aria-hidden="true" /></a><button className="docs-dashboard-link" type="button" onClick={onOpenDashboard}>Dashboard <ArrowRightRegular aria-hidden="true" /></button></nav>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="Documentation navigation">
          <p className="docs-sidebar-title">Documentation</p>
          {Array.from(new Set(sections.map((section) => section.group))).map((group) => (
            <div className="docs-nav-group" key={group}>
              <span>{group}</span>
              {sections.filter((section) => section.group === group).map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
            </div>
          ))}
          <div className="docs-sidebar-help"><strong>Need more detail?</strong><p>The package, reference material, and Devnet notes are available in the public repository.</p><ExternalLink href="https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk">View the SDK</ExternalLink></div>
        </aside>

        <main className="docs-content" id="docs-content">
          <div className="docs-breadcrumb"><button type="button" onClick={onHome}>Zeta Labs</button><span>/</span><span>Documentation</span></div>
          <section className="docs-intro" id="overview" aria-labelledby="docs-title">
            <span className="docs-kicker">Developer documentation</span>
            <h1 id="docs-title">Build with Zeta.</h1>
            <p>Give an autonomous agent a funded credit line without giving it unrestricted access to your wallet. This guide takes you from your first SDK call to a verifiable spend on Solana Devnet.</p>
            <div className="docs-intro-actions"><a href="#quickstart">Start the quickstart <ArrowRightRegular aria-hidden="true" /></a><a href="#devnet">Set up a devnet demo</a></div>
          </section>

          <div className="docs-callout"><strong>What Zeta does</strong><p>A lender deposits USDC into a shared pool. A policy sets the spending rules. An agent gets a bounded credit line. Each request is checked before funds move, and the decision can be inspected afterward.</p></div>

          <section className="docs-article-section" id="quickstart" aria-labelledby="docs-quickstart-title">
            <p className="docs-section-label">Start here</p><h2 id="docs-quickstart-title">Quickstart</h2>
            <p>Already have a Zeta pool and a transaction signature? Connect the SDK to Devnet, ask it to read the pool, then use the signature to verify the decision. Reading information does not move funds.</p>
            <div className="docs-explainer"><strong>What you need</strong><span>A Solana RPC address, a signing key held securely on your server, the pool address, and the transaction signature you want to inspect.</span></div>
            <p className="docs-note">Keep every private key on your server. Never place one in browser code or commit it to Git.</p>
          </section>

          <section className="docs-article-section" id="install" aria-labelledby="docs-install-title">
            <p className="docs-section-label">Start here</p><h2 id="docs-install-title">Install and connect</h2>
            <p>The SDK is a server-side TypeScript package. Use Node.js 20 or later, an RPC endpoint for Solana Devnet, and a funded signing key when you intend to move funds.</p>
            <div className="docs-explainer"><strong>Connect once</strong><span>Give the SDK a Solana connection and the keypair that is permitted to sign. Your app can then read pool, line, policy, and proof information through the same connection.</span></div>
            <p>Find the package and its supported exports on <ExternalLink href="https://www.npmjs.com/package/@zetasdk/sdk">npm</ExternalLink>. Devnet USDC amounts are measured in the mint's smallest units, so confirm token decimals before you set a limit.</p>
          </section>

          <section className="docs-article-section" id="devnet" aria-labelledby="docs-devnet-title">
            <p className="docs-section-label">Build with Zeta</p><h2 id="docs-devnet-title">Set up a Devnet demo</h2>
            <p>For a complete Devnet demonstration, add your own RPC address and local signing-key locations to the repository's example environment file. The setup is designed to let you inspect the network before you submit any payment.</p>
            <div className="docs-explainer"><strong>Before a live test</strong><span>Make sure the lender, agent, and settlement operator have the right keys, your agent has Devnet SOL for fees, and the pool has Devnet USDC available.</span></div>
            <p className="docs-note">The optional payment endpoint is only needed when testing a metered x402 purchase. You can still follow the on-chain credit path without it.</p>
            <ExternalLink href="https://github.com/Demiladepy/zeta-labs/blob/main/scripts/devnet.env.example">Read the Devnet configuration guide</ExternalLink>
          </section>

          <section className="docs-article-section" id="credit-flow" aria-labelledby="docs-credit-title">
            <p className="docs-section-label">Build with Zeta</p><h2 id="docs-credit-title">Create a pool, policy, and line</h2>
            <p>The lender signs these setup actions. Create a pool for the USDC mint, register the rules, fund the pool's token account, and then open a line for an agent. The line cannot spend more than its limit or the live policy allows.</p>
            <ol className="docs-flow-list"><li><strong>Create a pool</strong><span>One pool holds the USDC used by approved lines.</span></li><li><strong>Register a policy</strong><span>Set the per-call cap and optional expiry. Recipient rules and rolling limits can be added later.</span></li><li><strong>Deposit USDC</strong><span>Fund the pool's vault token account before the agent can use its line.</span></li><li><strong>Open a line</strong><span>Bind an agent public key to the pool and policy with a lifetime limit.</span></li></ol>
            <div className="docs-explainer"><strong>How the SDK maps to this</strong><span>The lender uses the client to create the pool, register the policy, deposit USDC, and open the line. Zeta checks pool liquidity and the policy before it lets the line make a draw.</span></div>
            <p className="docs-note">Open a line only after the pool is funded. Zeta can refuse a line that has insufficient available capital.</p>
          </section>

          <section className="docs-article-section" id="spend" aria-labelledby="docs-spend-title">
            <p className="docs-section-label">Build with Zeta</p><h2 id="docs-spend-title">Let the agent spend</h2>
            <p>Use an existing line with the agent signer and settlement operator. Zeta checks the policy, opens a payment channel, calls the approved payment endpoint, settles the payment, and returns unused reservation to the pool. This is a Devnet write operation.</p>
            <div className="docs-explainer"><strong>The information Zeta needs</strong><span>The agent's line address, the amount to spend, the approved payment endpoint, the agent signer, and the operator who settles the channel.</span></div>
            <p className="docs-note">Keep every signer on the server. An agent never receives the lender's unrestricted wallet key.</p>
          </section>

          <section className="docs-article-section" id="proof" aria-labelledby="docs-proof-title">
            <p className="docs-section-label">Build with Zeta</p><h2 id="docs-proof-title">Verify proof and handle denials</h2>
            <p>After a transaction, ask Zeta for proof using the transaction signature. It returns the decoded audit record, whether the last decision was allowed, and a Solana Explorer link. Policy failures have clear, typed reasons, so your app can explain what happened without guessing from an RPC message.</p>
            <div className="docs-denials" aria-label="Policy denial reasons"><span>Revoked</span><span>Expired</span><span>Per-call cap</span><span>Rolling cap</span><span>Total cap</span><span>Recipient or category not allowed</span></div>
            <button className="docs-text-button" type="button" onClick={onOpenDashboard}>Inspect live decisions in the dashboard <ArrowRightRegular aria-hidden="true" /></button>
          </section>

          <section className="docs-article-section" id="reference" aria-labelledby="docs-reference-title">
            <p className="docs-section-label">Reference</p><h2 id="docs-reference-title">SDK surface and resources</h2>
            <div className="docs-api-list"><div><strong>Connect a Zeta client</strong><span>Configure the RPC connection and signer for reads and writes.</span></div><div><strong>Create the credit setup</strong><span>Create the pool, policy, deposit, and credit line for the lender.</span></div><div><strong>Request an agent payment</strong><span>Pass the line, amount, and approved payment endpoint with the agent and operator.</span></div><div><strong>Verify a transaction</strong><span>Read the on-chain audit decision and Explorer URL from its signature.</span></div><div><strong>Explain a denial</strong><span>Handle a rejected spend by its clear policy reason.</span></div></div>
            <div className="docs-resource-links"><ExternalLink href="https://github.com/Demiladepy/zeta-labs/tree/main/packages/sdk">SDK source and README</ExternalLink><ExternalLink href="https://github.com/Demiladepy/zeta-labs/blob/main/docs/PROGRAM_IDS.md">Devnet program IDs</ExternalLink><ExternalLink href="https://github.com/Demiladepy/zeta-labs/blob/main/docs/INTERFACE.md">Program interface</ExternalLink><ExternalLink href="https://www.npmjs.com/package/@zetasdk/sdk">npm package</ExternalLink></div>
          </section>

          <div className="docs-end"><button type="button" onClick={onHome}><ArrowLeftRegular aria-hidden="true" /> Back to Zeta Labs</button><button type="button" onClick={onOpenDashboard}>Open dashboard <ArrowRightRegular aria-hidden="true" /></button></div>
        </main>

        <aside className="docs-toc" aria-label="On this page"><strong>On this page</strong>{sections.map((section) => <a href={`#${section.id}`} key={section.id}>{section.label}</a>)}</aside>
      </div>
    </div>
  );
}
