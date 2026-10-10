/**
 * Policy simulator — the only panel that does something rather than report
 * something, and the only one that cannot fail live.
 *
 * It runs entirely in the browser against the SDK's offline mirror of the
 * on-chain `evaluate` body. No wallet, no RPC, no keys. If devnet is throttled
 * or down, this still works.
 */
import { useMemo, useState } from "react";
import { Button, Field, Input } from "@fluentui/react-components";
import { PlayRegular, ArrowCounterclockwiseRegular } from "@fluentui/react-icons";
import {
  Denial,
  buildFragmentationAttack,
  simulateSpendSequence,
  type PolicyLimits,
  type SequenceResult,
} from "@zetasdk/sdk/dashboard";

const UNIT = 1_000_000n; // USDC base units

function toBase(value: string): bigint {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0n;
  return BigInt(Math.round(n * 1e6));
}

function usdc(base: bigint): string {
  const whole = base / UNIT;
  const frac = (base % UNIT).toString().padStart(6, "0").slice(0, 2);
  return `${whole}.${frac}`;
}

const DENIAL_LABEL: Record<number, string> = {
  [Denial.Allow]: "Allowed",
  [Denial.Revoked]: "Revoked",
  [Denial.Expired]: "Expired",
  [Denial.PerCallCap]: "Per-call cap",
  [Denial.RollingCap]: "Rolling cap",
  [Denial.TotalCap]: "Total cap",
  [Denial.NotAllowlisted]: "Not allowlisted",
};

type Form = {
  perCallCap: string;
  rollingCap: string;
  windowSecs: string;
  target: string;
};

const DEFAULTS: Form = {
  perCallCap: "1",
  rollingCap: "5",
  windowSecs: "3600",
  target: "20",
};

export default function SimulatorPanel() {
  const [form, setForm] = useState<Form>(DEFAULTS);
  const [defended, setDefended] = useState(true);
  const [run, setRun] = useState<SequenceResult | null>(null);

  const policy: PolicyLimits = useMemo(
    () => ({
      perCallCap: toBase(form.perCallCap),
      expiresAt: 0n,
      rollingCap: defended ? toBase(form.rollingCap) : 0n,
      rollingWindowSecs: defended ? Number(form.windowSecs) || 0 : 0,
      totalCap: 0n,
      aclVersion: 0,
      revoked: false,
    }),
    [form, defended],
  );

  const execute = () => {
    const perCall = toBase(form.perCallCap);
    if (perCall <= 0n) return;
    const attempts = buildFragmentationAttack({
      perCallCap: perCall,
      target: toBase(form.target),
      startAt: 1_700_000_000n,
      spacingSecs: 30n,
    });
    setRun(simulateSpendSequence(policy, attempts));
  };

  const blocked = run ? run.attempted - run.admitted : 0n;
  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (_: unknown, d: { value: string }) => setForm({ ...form, [key]: d.value }),
  });

  return (
    <section className="panel sim-panel" aria-labelledby="sim-title">
      <header className="panel-head">
        <div>
          <h1 id="sim-title">Policy simulator</h1>
          <p>
            A per-call cap bounds one transaction, not a sequence. Set the limits, then
            run an agent that splits its spend into individually legal calls.
          </p>
        </div>
      </header>

      <div className="sim-controls">
        <Field label="Per-call cap (USDC)"><Input {...field("perCallCap")} type="number" step="0.5" min="0" /></Field>
        <Field label="Rolling cap (USDC)"><Input {...field("rollingCap")} type="number" step="1" min="0" disabled={!defended} /></Field>
        <Field label="Window (seconds)"><Input {...field("windowSecs")} type="number" step="60" min="0" disabled={!defended} /></Field>
        <Field label="Attacker target (USDC)"><Input {...field("target")} type="number" step="5" min="0" /></Field>
      </div>

      <div className="sim-actions">
        <div className="sim-toggle" role="group" aria-label="Enforcement mode">
          <button
            type="button"
            className={!defended ? "sim-mode sim-mode-active" : "sim-mode"}
            onClick={() => { setDefended(false); setRun(null); }}
          >
            Per-call cap only
          </button>
          <button
            type="button"
            className={defended ? "sim-mode sim-mode-active" : "sim-mode"}
            onClick={() => { setDefended(true); setRun(null); }}
          >
            Zeta enforcement
          </button>
        </div>
        <div className="sim-buttons">
          <Button appearance="primary" icon={<PlayRegular />} onClick={execute}>Run the attack</Button>
          <Button
            appearance="subtle"
            icon={<ArrowCounterclockwiseRegular />}
            onClick={() => { setForm(DEFAULTS); setRun(null); }}
          >
            Reset
          </Button>
        </div>
      </div>

      {run ? (
        <>
          <div className="sim-summary">
            <div><span>Attempted</span><strong>{usdc(run.attempted)} USDC</strong><small>{run.outcomes.length} legal calls</small></div>
            <div className={run.deniedCount > 0 ? "sim-ok" : "sim-bad"}>
              <span>Admitted</span><strong>{usdc(run.admitted)} USDC</strong>
              <small>{run.outcomes.length - run.deniedCount} allowed</small>
            </div>
            <div className={blocked > 0n ? "sim-ok" : "sim-bad"}>
              <span>Blocked</span><strong>{usdc(blocked)} USDC</strong><small>{run.deniedCount} denied</small>
            </div>
          </div>

          <p className={run.deniedCount > 0 ? "sim-verdict sim-verdict-ok" : "sim-verdict sim-verdict-bad"}>
            {run.deniedCount > 0
              ? `The drain was stopped. ${usdc(blocked)} USDC never moved, however the agent split the request.`
              : "The drain succeeded. Every call passed the per-call check and the sequence was never evaluated."}
          </p>

          <div className="sim-table" role="table" aria-label="Simulated calls">
            <div className="sim-row sim-row-head" role="row">
              <span role="columnheader">Call</span>
              <span role="columnheader">Amount</span>
              <span role="columnheader">Decision</span>
              <span role="columnheader">Cumulative</span>
            </div>
            {run.outcomes.slice(0, 24).map((o) => (
              <div className={o.allowed ? "sim-row" : "sim-row sim-row-denied"} role="row" key={o.index}>
                <span role="cell">{o.index + 1}</span>
                <span role="cell">{usdc(o.amount)}</span>
                <span role="cell">
                  <em className={o.allowed ? "sim-pill sim-pill-ok" : "sim-pill sim-pill-deny"}>
                    {DENIAL_LABEL[o.denial] ?? o.denial}
                  </em>
                </span>
                <span role="cell">{usdc(o.admittedSoFar)}</span>
              </div>
            ))}
            {run.outcomes.length > 24 ? (
              <div className="sim-row sim-row-more" role="row">
                <span role="cell">{run.outcomes.length - 24} further calls behave identically</span>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <p className="sim-empty">Set the limits and run the attack to see each decision.</p>
      )}

      <p className="sim-foot">
        Runs offline against the same ordered checks the programs enforce on-chain.
        Proven in <code>invariants.rs::fragmentation</code> and{" "}
        <code>fragmentation.test.ts</code>.
      </p>
    </section>
  );
}
