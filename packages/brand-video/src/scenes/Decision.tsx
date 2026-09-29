import {interpolate, useCurrentFrame} from 'remotion';
import {appear, Bottomline, C, In, Kicker, Scene, Topline} from './shared';

export const Decision = () => {
  const f = useCurrentFrame();
  const pass = interpolate(f, [15, 61], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const deny = interpolate(f, [33, 63], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene>
      <Topline label="03 / AGENT SPEND" />
      <In start={5} style={{position: 'absolute', left: 104, top: 220}}><Kicker>ONE CHECK. TWO OUTCOMES.</Kicker></In>
      <In start={11} style={{position: 'absolute', left: 105, top: 285, fontFamily: 'Zeta Sans', fontWeight: 700, fontSize: 123, lineHeight: .98, letterSpacing: -8}}>Approved moves.<br/>Denied stays.</In>
      <div style={{position: 'absolute', left: 105, right: 105, top: 680, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64}}>
        <div style={{position: 'relative', height: 200, borderTop: `2px solid ${C.line}`, opacity: appear(f, 23)}}>
          <div style={{height: 5, width: `${pass * 100}%`, backgroundColor: C.mint, position: 'absolute', top: -4}} />
          <div style={{position: 'absolute', left: `calc(${pass * 100}% - 13px)`, top: -15, width: 28, height: 28, borderRadius: '50%', backgroundColor: C.mint}} />
          <div style={{fontFamily: 'Zeta Mono', fontSize: 25, color: C.mint, marginTop: 42}}>ALLOW / DRAW RESERVED</div>
          <div style={{fontFamily: 'Zeta Sans', fontSize: 34, color: C.white, marginTop: 16}}>The vault pays through the channel.</div>
        </div>
        <div style={{position: 'relative', height: 200, borderTop: `2px solid ${C.line}`, opacity: appear(f, 36)}}>
          <div style={{height: 5, width: `${deny * 58}%`, backgroundColor: C.red, position: 'absolute', top: -4}} />
          <div style={{position: 'absolute', left: `calc(${deny * 58}% - 18px)`, top: -20, width: 40, height: 40, borderRadius: '50%', border: `4px solid ${C.red}`, color: C.red, display: 'grid', placeItems: 'center', fontFamily: 'Zeta Sans', fontWeight: 700, fontSize: 27}}>×</div>
          <div style={{fontFamily: 'Zeta Mono', fontSize: 25, color: C.red, marginTop: 42}}>DENY / NO RESERVATION</div>
          <div style={{fontFamily: 'Zeta Sans', fontSize: 34, color: C.white, marginTop: 16}}>The capital stays where it is.</div>
        </div>
      </div>
      <Bottomline label="POLICY / ENFORCED" />
    </Scene>
  );
};
