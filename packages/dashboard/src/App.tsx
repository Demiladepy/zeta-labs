import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Link,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  ArrowRightRegular,
  BotRegular,
  BuildingBankRegular,
  CheckmarkCircleRegular,
  CopyRegular,
  DatabaseRegular,
  DismissCircleRegular,
  DocumentBulletListRegular,
  HomeRegular,
  OpenRegular,
  SettingsRegular,
  ShieldCheckmarkRegular,
} from "@fluentui/react-icons";
import {
  DEFAULT_CONFIG,
  demoSnapshot,
  denialLabels,
  discoverDashboardConfig,
  formatTime,
  formatUsdc,
  loadLiveSnapshot,
  publicKeyAddress,
  publicKeyLabel,
  shortAddress,
  type AuditEntry,
  type DashboardConfig,
  type DashboardSnapshot,
} from "./data.js";

type View = "overview" | "lender" | "agent" | "policy" | "audit";
type AuditFilter = "all" | "allowed" | "denied";

const STORAGE_KEY = "zeta-dashboard-config";

function loadSavedConfig(): DashboardConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function copy(value: string): void {
  void navigator.clipboard.writeText(value);
}

function Metric(props: { label: string; value: string; detail?: string; tone?: "accent" | "danger" }) {
  return (
    <div className={`metric ${props.tone ? `metric-${props.tone}` : ""}`}>
      <span className="metric-label">{props.label}</span>
      <strong>{props.value}</strong>
      {props.detail ? <span className="metric-detail">{props.detail}</span> : null}
    </div>
  );
}

function AddressValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="address-row">
      <span>{label}</span>
      <code title={value}>{shortAddress(value)}</code>
      <Tooltip content={`Copy ${label}`} relationship="label">
        <Button
          appearance="subtle"
          size="small"
          icon={<CopyRegular />}
          aria-label={`Copy ${label}`}
          onClick={() => copy(value)}
        />
      </Tooltip>
    </div>
  );
}

function SourceNotice({ snapshot, loading }: { snapshot: DashboardSnapshot | null; loading: boolean }) {
  const isLive = snapshot?.source === "live";
  return (
    <div className={`source-notice source-${snapshot?.source ?? "pending"}`} role="status">
      <DatabaseRegular />
      <div>
        <strong>{loading ? "Finding live data" : isLive ? "Live devnet data" : snapshot ? "Demo data" : "Live data unavailable"}</strong>
        <span>
          {loading
            ? "Scanning Zeta accounts on Solana"
            : isLive && snapshot
            ? `Synced ${new Date(snapshot.fetchedAt).toLocaleTimeString()}`
            : snapshot
              ? "Sample values, not on-chain activity"
              : "Retry or choose a specific account set"}
        </span>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-layout" aria-label="Loading dashboard data" aria-busy="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton-metric" />
        <div className="skeleton skeleton-metric" />
        <div className="skeleton skeleton-metric" />
      </div>
      <div className="skeleton skeleton-block" />
    </div>
  );
}

function PanelHeader(props: { id: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <h1 id={props.id}>{props.title}</h1>
        <p>{props.description}</p>
      </div>
      {props.actions ? <div className="panel-actions">{props.actions}</div> : null}
    </div>
  );
}

function policyExpiry(expiresAt: bigint): string {
  if (expiresAt === 0n) return "No expiry";
  return new Date(Number(expiresAt) * 1000).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OverviewPanel({ snapshot, onNavigate }: { snapshot: DashboardSnapshot; onNavigate: (view: View) => void }) {
  const available = snapshot.pool.deposited - snapshot.pool.outstanding;
  const remaining = snapshot.line.limit - snapshot.line.drawn - snapshot.line.reserved;
  const latestDecision = snapshot.audits[0];
  const policyStatus = snapshot.policy.revoked ? "Blocked" : "Active";

  return (
    <section aria-labelledby="overview-title">
      <PanelHeader
        id="overview-title"
        title="Credit control center"
        description="A live view of capital, policy checks, and the agent credit line they protect."
      />
      <div className="metric-grid overview-metrics">
        <Metric label="Capital in pool" value={`${formatUsdc(snapshot.pool.deposited)} USDC`} detail="Live vault balance" />
        <Metric label="Agent can spend" value={`${formatUsdc(remaining)} USDC`} detail="After settled and reserved credit" tone="accent" />
        <Metric label="Policy status" value={policyStatus} detail={snapshot.policy.revoked ? "New draws are stopped" : "Checks run before each draw"} tone={snapshot.policy.revoked ? "danger" : "accent"} />
      </div>

      <div className="overview-grid">
        <article className="surface control-stage">
          <div className="surface-heading">
            <div><span className="section-kicker">Capital at work</span><h2>Where the available USDC sits</h2></div>
            <Button appearance="subtle" size="small" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => onNavigate("lender")}>Open lender view</Button>
          </div>
          <div className="stage-amount">
            <span>Ready for a policy-approved draw</span>
            <strong>{formatUsdc(available)}</strong>
            <small>USDC</small>
          </div>
          <div className="stage-breakdown">
            <div><span>Outstanding in channels</span><strong>{formatUsdc(snapshot.pool.outstanding)} USDC</strong></div>
            <div><span>Credit line limit</span><strong>{formatUsdc(snapshot.line.limit)} USDC</strong></div>
          </div>
        </article>

        <article className="surface control-summary">
          <div className="surface-heading">
            <div><span className="section-kicker">Policy checkpoint</span><h2>Draw protection</h2></div>
            <span className={snapshot.policy.revoked ? "state-label state-danger" : "state-label"}>{policyStatus}</span>
          </div>
          <dl className="compact-list">
            <div><dt>Per-call maximum</dt><dd>{formatUsdc(snapshot.policy.perCallCap)} USDC</dd></div>
            <div><dt>Expiry</dt><dd>{policyExpiry(snapshot.policy.expiresAt)}</dd></div>
            <div><dt>Revocation</dt><dd>{snapshot.policy.revoked ? "In effect" : "Ready"}</dd></div>
          </dl>
          <Button appearance="subtle" size="small" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => onNavigate("policy")}>Review policy</Button>
        </article>

        <article className="surface route-surface">
          <div className="surface-heading"><div><span className="section-kicker">Credit route</span><h2>How one spend is protected</h2></div></div>
          <div className="route-map" aria-label="Pool to agent credit route">
            <div className="route-node"><BuildingBankRegular /><div><strong>Pool</strong><span>{shortAddress(snapshot.poolAddress)}</span></div></div>
            <ArrowRightRegular className="route-arrow" aria-hidden="true" />
            <div className="route-node"><ShieldCheckmarkRegular /><div><strong>Policy</strong><span>{shortAddress(snapshot.policyAddress)}</span></div></div>
            <ArrowRightRegular className="route-arrow" aria-hidden="true" />
            <div className="route-node"><BotRegular /><div><strong>Agent line</strong><span>{publicKeyLabel(snapshot.line.agent)}</span></div></div>
          </div>
        </article>

        <article className="surface latest-surface">
          <div className="surface-heading"><div><span className="section-kicker">Latest evaluation</span><h2>On-chain decision</h2></div></div>
          {latestDecision ? (
            <div className={`latest-decision ${latestDecision.allowed ? "decision-allow" : "decision-deny"}`}>
              {latestDecision.allowed ? <CheckmarkCircleRegular /> : <DismissCircleRegular />}
              <div><span>{latestDecision.allowed ? "Allowed" : "Denied"}</span><strong>{formatUsdc(latestDecision.amount)} USDC</strong><small>{latestDecision.allowed ? formatTime(latestDecision.unixTs) : denialLabels[latestDecision.denial]}</small></div>
            </div>
          ) : <p className="empty-copy">No decoded evaluation is available yet.</p>}
          <Button appearance="subtle" size="small" icon={<ArrowRightRegular />} iconPosition="after" onClick={() => onNavigate("audit")}>View audit trail</Button>
        </article>
      </div>
    </section>
  );
}

function PolicyPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const controls = [
    ["Per-call amount", `${formatUsdc(snapshot.policy.perCallCap)} USDC`, "Enforced"],
    ["Expiry", policyExpiry(snapshot.policy.expiresAt), "Enforced"],
    ["Revocation", snapshot.policy.revoked ? "Blocked now" : "Can stop new draws", "Enforced"],
  ];

  return (
    <section aria-labelledby="policy-title">
      <PanelHeader id="policy-title" title="Policy controls" description="Every draw is evaluated on-chain before USDC can leave the vault." />
      <div className={`policy-hero ${snapshot.policy.revoked ? "policy-hero-revoked" : ""}`}>
        {snapshot.policy.revoked ? <DismissCircleRegular /> : <ShieldCheckmarkRegular />}
        <div><span>Current protection</span><strong>{snapshot.policy.revoked ? "New draws are blocked" : "Policy is active"}</strong><p>{snapshot.policy.revoked ? "This policy has been revoked, so the credit line cannot make new draws." : "Each request must satisfy the current policy before it is approved."}</p></div>
      </div>
      <div className="content-grid policy-grid">
        <article className="surface">
          <div className="surface-heading"><div><span className="section-kicker">Enforced today</span><h2>Live guardrails</h2></div></div>
          <div className="control-list">
            {controls.map(([label, value, status]) => <div key={label}><div><strong>{label}</strong><span>{value}</span></div><span className="enforced-label">{status}</span></div>)}
          </div>
          <div className="address-stack"><AddressValue label="Policy" value={snapshot.policyAddress} /><AddressValue label="Issuer" value={publicKeyAddress(snapshot.policy.issuer)} /></div>
        </article>
        <article className="surface planned-surface">
          <div className="surface-heading"><div><span className="section-kicker">Planned controls</span><h2>Not enabled on this policy</h2></div></div>
          <p>These controls are reserved for a later protocol phase. They are not applied to the connected agent today.</p>
          <div className="planned-controls"><span>Rolling spend cap</span><span>Total credit cap</span><span>Recipient allowlist</span><span>Spend category</span></div>
          <div className="policy-note"><DocumentBulletListRegular /><span>Current policy seed: {snapshot.policy.seed.toString()}</span></div>
        </article>
      </div>
    </section>
  );
}

function LenderPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const available = snapshot.pool.deposited - snapshot.pool.outstanding;
  const utilization = snapshot.pool.deposited === 0n
    ? 0
    : Number((snapshot.pool.outstanding * 10_000n) / snapshot.pool.deposited) / 100;
  const remainingLine = snapshot.line.limit - snapshot.line.drawn - snapshot.line.reserved;

  return (
    <section aria-labelledby="lender-title">
      <PanelHeader
        id="lender-title"
        title="Lender position"
        description="Liquidity, reservations, and the credit line funded by this pool."
      />
      <div className="metric-grid">
        <Metric label="Pool deposits" value={`${formatUsdc(snapshot.pool.deposited)} USDC`} detail="Capital supplied" />
        <Metric label="Available" value={`${formatUsdc(available)} USDC`} detail="Ready for new draws" tone="accent" />
        <Metric label="Outstanding" value={`${formatUsdc(snapshot.pool.outstanding)} USDC`} detail={`${utilization.toFixed(2)}% of pool`} />
      </div>

      <div className="content-grid lender-grid">
        <article className="surface liquidity-surface">
          <div className="surface-heading">
            <div>
              <span className="section-kicker">Liquidity position</span>
              <h2>Capital remains in the vault</h2>
            </div>
            <span className="safe-label"><ShieldCheckmarkRegular /> Policy protected</span>
          </div>
          <div className="liquidity-figure" aria-label="Pool liquidity composition">
            <div className="liquidity-primary">
              <span>Available</span>
              <strong>{formatUsdc(available)}</strong>
              <small>USDC</small>
            </div>
            <div className="liquidity-secondary">
              <div><span>Reserved in channels</span><strong>{formatUsdc(snapshot.pool.outstanding)}</strong></div>
              <div><span>Lifetime settled</span><strong>{formatUsdc(snapshot.line.drawn)}</strong></div>
            </div>
          </div>
          <div className="address-stack">
            <AddressValue label="Pool" value={snapshot.poolAddress} />
            <AddressValue label="Vault authority" value={publicKeyAddress(snapshot.pool.authority)} />
            <AddressValue label="USDC mint" value={publicKeyAddress(snapshot.pool.mint)} />
          </div>
        </article>

        <article className="surface line-surface">
          <div className="surface-heading">
            <div>
              <span className="section-kicker">Active line</span>
              <h2>{publicKeyLabel(snapshot.line.agent)}</h2>
            </div>
            <span className="state-label">Open</span>
          </div>
          <dl className="definition-grid">
            <div><dt>Credit limit</dt><dd>{formatUsdc(snapshot.line.limit)} USDC</dd></div>
            <div><dt>Remaining</dt><dd>{formatUsdc(remainingLine)} USDC</dd></div>
            <div><dt>Settled</dt><dd>{formatUsdc(snapshot.line.drawn)} USDC</dd></div>
            <div><dt>Reserved</dt><dd>{formatUsdc(snapshot.line.reserved)} USDC</dd></div>
          </dl>
          <div className="line-composition" aria-label="Credit line composition">
            <span className="composition-drawn" style={{ flexGrow: Number(snapshot.line.drawn || 1n) }} />
            <span className="composition-reserved" style={{ flexGrow: Number(snapshot.line.reserved || 1n) }} />
            <span className="composition-free" style={{ flexGrow: Number(remainingLine || 1n) }} />
          </div>
          <div className="composition-key">
            <span><i className="key-drawn" /> Settled</span>
            <span><i className="key-reserved" /> Reserved</span>
            <span><i className="key-free" /> Remaining</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function AgentPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const remaining = snapshot.line.limit - snapshot.line.drawn - snapshot.line.reserved;
  const lastSpend = snapshot.audits.find((entry) => entry.allowed);
  const lastDenial = snapshot.audits.find((entry) => !entry.allowed);
  const expiry = policyExpiry(snapshot.policy.expiresAt);

  return (
    <section aria-labelledby="agent-title">
      <PanelHeader
        id="agent-title"
        title="Agent credit"
        description="What this agent can spend now, and which policy controls every request."
      />
      <div className="agent-hero">
        <div>
          <span className="section-kicker">Available to spend</span>
          <strong>{formatUsdc(remaining)}</strong>
          <span className="currency">USDC</span>
        </div>
        <div className={`policy-state ${snapshot.policy.revoked ? "policy-revoked" : ""}`}>
          {snapshot.policy.revoked ? <DismissCircleRegular /> : <CheckmarkCircleRegular />}
          <div>
            <strong>{snapshot.policy.revoked ? "Policy revoked" : "Policy active"}</strong>
            <span>{snapshot.policy.revoked ? "New draws are blocked" : "Every draw is evaluated on-chain"}</span>
          </div>
        </div>
      </div>

      <div className="content-grid agent-grid">
        <article className="surface">
          <div className="surface-heading">
            <div><span className="section-kicker">Guardrails</span><h2>Current policy</h2></div>
          </div>
          <dl className="policy-list">
            <div><dt>Per-call maximum</dt><dd>{formatUsdc(snapshot.policy.perCallCap)} USDC</dd></div>
            <div><dt>Expiry</dt><dd>{expiry}</dd></div>
            <div><dt>Revocation</dt><dd>{snapshot.policy.revoked ? "Immediate block" : "Ready"}</dd></div>
            <div><dt>Rolling cap</dt><dd>{snapshot.policy.rollingCap === 0n ? "Phase 2" : `${formatUsdc(snapshot.policy.rollingCap)} USDC`}</dd></div>
          </dl>
          <AddressValue label="Policy" value={snapshot.policyAddress} />
        </article>

        <article className="surface activity-surface">
          <div className="surface-heading">
            <div><span className="section-kicker">Recent decisions</span><h2>Spend activity</h2></div>
          </div>
          {lastSpend ? (
            <div className="decision decision-allow">
              <CheckmarkCircleRegular />
              <div><span>Last approved</span><strong>{formatUsdc(lastSpend.amount)} USDC</strong><small>{formatTime(lastSpend.unixTs)}</small></div>
            </div>
          ) : <p className="empty-copy">No approved spend has been recorded.</p>}
          {lastDenial ? (
            <div className="decision decision-deny">
              <DismissCircleRegular />
              <div><span>Last denied</span><strong>{formatUsdc(lastDenial.amount)} USDC</strong><small>{denialLabels[lastDenial.denial]}</small></div>
            </div>
          ) : <p className="empty-copy">No denied spend has been recorded.</p>}
        </article>
      </div>
    </section>
  );
}

function AuditDetail({ audit }: { audit: AuditEntry }) {
  return (
    <aside className="audit-detail" aria-label="Selected audit details">
      <div className={`audit-result ${audit.allowed ? "result-allow" : "result-deny"}`}>
        {audit.allowed ? <CheckmarkCircleRegular /> : <DismissCircleRegular />}
        <div><span>Decision</span><strong>{audit.allowed ? "Allowed" : "Denied"}</strong></div>
      </div>
      <dl>
        <div><dt>Requested</dt><dd>{formatUsdc(audit.amount)} USDC</dd></div>
        <div><dt>Reason</dt><dd>{denialLabels[audit.denial]}</dd></div>
        <div><dt>Agent</dt><dd><code>{publicKeyLabel(audit.agent)}</code></dd></div>
        <div><dt>Slot</dt><dd>{audit.slot.toLocaleString("en-US")}</dd></div>
        <div><dt>Time</dt><dd>{formatTime(audit.unixTs)}</dd></div>
      </dl>
      <Link href={audit.explorerUrl} target="_blank" rel="noreferrer" className="explorer-link">
        View transaction <OpenRegular />
      </Link>
    </aside>
  );
}

function AuditPanel({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [filter, setFilter] = useState<AuditFilter>("all");
  const filtered = useMemo(() => snapshot.audits.filter((audit) => {
    if (filter === "allowed") return audit.allowed;
    if (filter === "denied") return !audit.allowed;
    return true;
  }), [filter, snapshot.audits]);
  const [selectedSignature, setSelectedSignature] = useState(snapshot.audits[0]?.signature ?? "");
  const selected = filtered.find((entry) => entry.signature === selectedSignature) ?? filtered[0];
  const allowCount = snapshot.audits.filter((entry) => entry.allowed).length;
  const denyCount = snapshot.audits.length - allowCount;

  return (
    <section aria-labelledby="audit-title">
      <PanelHeader
        id="audit-title"
        title="Policy audit"
        description="Every on-chain evaluation, including the denials that protected the pool."
        actions={
          <div className="audit-summary" aria-label="Audit decision summary">
            <span><CheckmarkCircleRegular /> {allowCount} allowed</span>
            <span className="denied-count"><DismissCircleRegular /> {denyCount} denied</span>
          </div>
        }
      />
      <div className="audit-toolbar" role="group" aria-label="Filter audit records">
        {(["all", "allowed", "denied"] as const).map((value) => (
          <button key={value} className={filter === value ? "filter-active" : ""} onClick={() => setFilter(value)}>
            {value[0]!.toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {snapshot.auditError ? (
        <div className="audit-warning" role="status">
          <DatabaseRegular />
          <span>{snapshot.auditError}</span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <ShieldCheckmarkRegular />
          <h2>No matching evaluations</h2>
          <p>{snapshot.auditError ? "Refresh later or use a dedicated RPC to load audit transactions." : "Change the filter or refresh after a new agent spend request."}</p>
        </div>
      ) : (
        <div className="audit-layout">
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead><tr><th>Decision</th><th>Amount</th><th>Reason</th><th>Time</th></tr></thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={`${entry.signature}-${entry.slot}`}
                    className={selected?.signature === entry.signature ? "row-selected" : ""}
                    onClick={() => setSelectedSignature(entry.signature)}
                    tabIndex={0}
                    aria-selected={selected?.signature === entry.signature}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setSelectedSignature(entry.signature);
                    }}
                  >
                    <td><span className={`decision-chip ${entry.allowed ? "chip-allow" : "chip-deny"}`}>{entry.allowed ? "Allowed" : "Denied"}</span></td>
                    <td>{formatUsdc(entry.amount)} <small>USDC</small></td>
                    <td>{denialLabels[entry.denial]}</td>
                    <td>{formatTime(entry.unixTs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selected ? <AuditDetail audit={selected} /> : null}
        </div>
      )}
    </section>
  );
}

function SettingsDialog(props: {
  open: boolean;
  config: DashboardConfig;
  onClose: () => void;
  onConnect: (config: DashboardConfig) => void;
  onDiscover: (rpcUrl: string) => void;
  onDemo: () => void;
}) {
  const [draft, setDraft] = useState(props.config);
  useEffect(() => {
    if (props.open) setDraft(props.config);
  }, [props.config, props.open]);
  const complete = Boolean(draft.rpcUrl && draft.poolAddress && draft.lineAddress && draft.policyAddress);
  return (
    <Dialog open={props.open} onOpenChange={(_, data) => { if (!data.open) props.onClose(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Chain connection</DialogTitle>
          <DialogContent className="settings-fields">
            <p>Live accounts are found automatically. You can also paste a specific pool, credit line, and policy.</p>
            <Field label="Solana RPC URL" required><Input value={draft.rpcUrl} onChange={(_, data) => setDraft({ ...draft, rpcUrl: data.value })} /></Field>
            <Field label="Pool address"><Input value={draft.poolAddress} onChange={(_, data) => setDraft({ ...draft, poolAddress: data.value })} /></Field>
            <Field label="Credit line address"><Input value={draft.lineAddress} onChange={(_, data) => setDraft({ ...draft, lineAddress: data.value })} /></Field>
            <Field label="Policy address"><Input value={draft.policyAddress} onChange={(_, data) => setDraft({ ...draft, policyAddress: data.value })} /></Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={props.onDemo}>Use demo data</Button>
            <Button appearance="secondary" disabled={!draft.rpcUrl} onClick={() => props.onDiscover(draft.rpcUrl)}>Find live accounts</Button>
            <Button appearance="primary" disabled={!complete} onClick={() => props.onConnect(draft)}>Use these addresses</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [config, setConfig] = useState<DashboardConfig>(() => loadSavedConfig());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoLoadStarted = useRef(false);

  const connect = useCallback(async (nextConfig: DashboardConfig) => {
    setSettingsOpen(false);
    setLoading(true);
    setError(null);
    try {
      const nextSnapshot = await loadLiveSnapshot(nextConfig);
      setConfig(nextConfig);
      setSnapshot(nextSnapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to read chain data");
    } finally {
      setLoading(false);
    }
  }, []);

  const discover = useCallback(async (rpcUrl: string) => {
    setSettingsOpen(false);
    setLoading(true);
    setError(null);
    try {
      const discovered = await discoverDashboardConfig(rpcUrl);
      const nextSnapshot = await loadLiveSnapshot(discovered);
      setConfig(discovered);
      setSnapshot(nextSnapshot);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(discovered));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to discover live Zeta accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoadStarted.current) return;
    autoLoadStarted.current = true;
    const hasSavedAddresses = Boolean(config.poolAddress && config.lineAddress && config.policyAddress);
    if (hasSavedAddresses) void connect(config);
    else void discover(config.rpcUrl);
  }, [config, connect, discover]);

  const showDemo = () => {
    setSnapshot(demoSnapshot());
    setConfig(DEFAULT_CONFIG);
    setError(null);
    setSettingsOpen(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refresh = () => {
    if (snapshot?.source === "live") void connect(config);
    else void discover(config.rpcUrl);
  };

  const navItems: Array<{ id: View; label: string; icon: ReactNode }> = [
    { id: "overview", label: "Overview", icon: <HomeRegular /> },
    { id: "lender", label: "Lender", icon: <BuildingBankRegular /> },
    { id: "agent", label: "Agent", icon: <BotRegular /> },
    { id: "policy", label: "Policies", icon: <ShieldCheckmarkRegular /> },
    { id: "audit", label: "Audit", icon: <ShieldCheckmarkRegular /> },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-mark" src="/logo-zeta.png" width={34} height={34} alt="" />
          <div><strong>Zeta</strong><span>Credit control</span></div>
        </div>
        <nav aria-label="Dashboard sections">
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "nav-active" : ""} onClick={() => setView(item.id)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <SourceNotice snapshot={snapshot} loading={loading} />
          <Button appearance="subtle" icon={<SettingsRegular />} onClick={() => setSettingsOpen(true)}>Connection</Button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div><span className="workspace-label">Zeta Labs</span><span className="network-label">Credit operations · Solana devnet</span></div>
          <div className="topbar-actions">
            <Tooltip content="Refresh live data" relationship="label">
              <Button appearance="subtle" icon={<ArrowSyncRegular />} aria-label="Refresh live data" onClick={refresh} disabled={loading} />
            </Tooltip>
            <Tooltip content="Connection settings" relationship="label">
              <Button appearance="subtle" icon={<SettingsRegular />} aria-label="Connection settings" onClick={() => setSettingsOpen(true)} />
            </Tooltip>
          </div>
        </header>
        <div className="main-content">
          {error ? (
            <div className="error-banner" role="alert">
              <DismissCircleRegular />
              <div><strong>Live devnet data is not available</strong><span>{error}</span></div>
              <Button appearance="subtle" onClick={() => setSettingsOpen(true)}>Check addresses</Button>
            </div>
          ) : null}
          {loading ? <LoadingState /> : snapshot ? (
            <>
              {view === "overview" ? <OverviewPanel snapshot={snapshot} onNavigate={setView} /> : null}
              {view === "lender" ? <LenderPanel snapshot={snapshot} /> : null}
              {view === "agent" ? <AgentPanel snapshot={snapshot} /> : null}
              {view === "policy" ? <PolicyPanel snapshot={snapshot} /> : null}
              {view === "audit" ? <AuditPanel snapshot={snapshot} /> : null}
            </>
          ) : (
            <div className="empty-state live-empty-state">
              <DatabaseRegular />
              <h2>No live account set loaded</h2>
              <p>Retry automatic discovery, choose specific devnet addresses, or open the labelled demo.</p>
              <div className="empty-actions">
                <Button appearance="primary" onClick={() => void discover(config.rpcUrl)}>Retry live discovery</Button>
                <Button appearance="secondary" onClick={showDemo}>Use demo data</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <SettingsDialog
        open={settingsOpen}
        config={config}
        onClose={() => setSettingsOpen(false)}
        onConnect={(next) => void connect(next)}
        onDiscover={(rpcUrl) => void discover(rpcUrl)}
        onDemo={showDemo}
      />
    </div>
  );
}
