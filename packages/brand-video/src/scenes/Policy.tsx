import {interpolate, useCurrentFrame} from 'remotion';
import {appear, Bottomline, C, In, Kicker, Scene, Topline} from './shared';

export const Policy = () => {
  const f = useCurrentFrame();
  const reach = interpolate(f, [12, 58], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const checks = [['PER-CALL CAP', '01'], ['EXPIRY', '02'], ['RECIPIENT', '03']] as const;
  return (
    <Scene light>
      <Topline label="02 / SET THE POLICY" light />
      <In start={6} style={{position: 'absolute', left: 106, top: 226}}><Kicker style={{color: '#447858'}}>THE RULES</Kicker></In>
      <In start={12} style={{position: 'absolute', left: 105, top: 292, fontFamily: 'Zeta Sans', fontWeight: 700, fontSize: 133, lineHeight: .98, letterSpacing: -10}}>Before funds move,<br/>policy decides.</In>
      <div style={{position: 'absolute', left: 114, top: 661, width: 1700, height: 4, backgroundColor: '#c5d3c7'}} />
      <div style={{position: 'absolute', left: 114, top: 661, width: 1700 * reach, height: 4, backgroundColor: C.ink}} />
      <div style={{position: 'absolute', left: 114 + 1700 * reach - 19, top: 644, width: 38, height: 38, borderRadius: '50%', backgroundColor: C.ink, opacity: appear(f, 11)}} />
      {checks.map(([title, number], i) => {
        const on = appear(f, 19 + i * 12);
        return (
          <div key={number} style={{position: 'absolute', left: 250 + i * 510, top: 610, opacity: on}}>
            <div style={{width: 110, height: 110, borderRadius: '50%', border: `3px solid ${C.ink}`, backgroundColor: on > .95 ? C.mint : C.paper, display: 'grid', placeItems: 'center', fontFamily: 'Zeta Mono', fontSize: 34, color: C.ink}}>{on > .95 ? '✓' : number}</div>
            <div style={{fontFamily: 'Zeta Mono', fontSize: 29, color: C.ink, letterSpacing: 1, marginTop: 38, marginLeft: -25}}>{title}</div>
          </div>
        );
      })}
      <Bottomline label="EVALUATE / ON CHAIN" light />
    </Scene>
  );
};
