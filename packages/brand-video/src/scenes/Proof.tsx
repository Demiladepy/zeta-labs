import {interpolate, useCurrentFrame} from 'remotion';
import {appear, Bottomline, C, In, Kicker, Scene, Topline} from './shared';

export const Proof = () => {
  const f = useCurrentFrame();
  const rows = [['01', 'ALLOWED', 'Policy checked', C.mint], ['02', 'DENIED', 'No funds moved', C.red], ['03', 'REVOKED', 'Next draw blocked', '#e7eb8e']] as const;
  return (
    <Scene>
      <Topline label="04 / VERIFY THE DECISION" />
      <In start={5} style={{position: 'absolute', left: 105, top: 249}}><Kicker>THE RECORD</Kicker></In>
      <In start={10} style={{position: 'absolute', left: 105, top: 314, fontFamily: 'Zeta Sans', fontWeight: 700, letterSpacing: -8, fontSize: 118, lineHeight: 1}}>Every decision<br/>leaves proof.</In>
      <div style={{position: 'absolute', top: 249, right: 105, width: 710, borderTop: `1px solid ${C.line}`}}>
        {rows.map(([n, state, detail, color], i) => (
          <div key={n} style={{height: 154, padding: '37px 0', borderBottom: `1px solid ${C.line}`, display: 'grid', gridTemplateColumns: '80px 230px 1fr', alignItems: 'center', opacity: appear(f, 12 + i * 10), translate: `${interpolate(f, [12 + i * 10, 27 + i * 10], [40, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px 0px`}}>
            <span style={{fontFamily: 'Zeta Mono', fontSize: 21, color: C.muted}}>{n}</span>
            <span style={{fontFamily: 'Zeta Mono', fontSize: 24, color, letterSpacing: 1.5}}>{state}</span>
            <span style={{fontFamily: 'Zeta Sans', fontSize: 29}}>{detail}</span>
          </div>
        ))}
      </div>
      <Bottomline label="AUDIT / AVAILABLE" />
    </Scene>
  );
};
