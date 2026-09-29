import {interpolate, useCurrentFrame} from 'remotion';
import {appear, Bottomline, C, In, Kicker, Scene, Topline} from './shared';

export const Pool = () => {
  const f = useCurrentFrame();
  const fill = interpolate(f, [13, 62], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene>
      <Topline label="01 / FUND THE POOL" />
      <div style={{position: 'absolute', left: 107, top: 253}}>
        <In start={7}><Kicker>THE LENDER</Kicker></In>
        <In start={12} style={{fontFamily: 'Zeta Sans', fontSize: 143, fontWeight: 700, lineHeight: .98, letterSpacing: -10, marginTop: 35}}>One pool.</In>
        <In start={26} style={{fontFamily: 'Zeta Sans', fontSize: 48, lineHeight: 1.25, color: C.muted, marginTop: 28, maxWidth: 615}}>USDC stays in a shared, program-owned vault.</In>
        <In start={38} y={20} style={{marginTop: 80, border: `1px solid ${C.line}`, display: 'inline-flex', alignItems: 'center', gap: 20, padding: '22px 30px', fontFamily: 'Zeta Mono', fontSize: 25, color: C.mint}}>
          <span style={{height: 15, width: 15, borderRadius: '50%', backgroundColor: C.mint}} /> CAPITAL READY
        </In>
      </div>
      <div style={{position: 'absolute', right: 155, top: 190, width: 800, height: 740}}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{position: 'absolute', left: 90 + i * 33, top: 148 + i * 29, width: 650 - i * 66, height: 500 - i * 58, border: `2px solid ${i === 0 ? '#446e54' : C.mint}`, borderRadius: '50%', opacity: appear(f, i * 6 + 2) * (.72 - i * .09), scale: interpolate(f, [i * 6, i * 6 + 20], [.8, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}} />
        ))}
        <div style={{position: 'absolute', left: 270, top: 317, width: 282, height: 170, borderRadius: '50%', backgroundColor: C.mint, opacity: .10 + fill * .23, filter: 'blur(16px)'}} />
        <div style={{position: 'absolute', left: 278, top: 314, width: 260, height: 180, borderRadius: '50%', border: `2px solid ${C.mint}`, backgroundColor: C.ink, display: 'grid', placeItems: 'center', opacity: appear(f, 14)}}>
          <div style={{fontFamily: 'Zeta Mono', color: C.white, fontSize: 34, letterSpacing: 2}}>USDC</div>
        </div>
        <div style={{position: 'absolute', left: 408, top: 34 + 252 * fill, width: 27, height: 27, backgroundColor: C.mint, borderRadius: '50%', boxShadow: `0 0 45px ${C.mint}`, opacity: appear(f, 4)}} />
      </div>
      <Bottomline label="POOL / FUNDED" />
    </Scene>
  );
};
