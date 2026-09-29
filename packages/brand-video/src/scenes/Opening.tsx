import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {appear, Brand, C, In, Scene} from './shared';

export const Opening = () => {
  const f = useCurrentFrame();
  const line = interpolate(f, [3, 49], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(.15, .7, .25, 1)});
  return (
    <Scene light>
      <div style={{position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(#dce2d9 1px, transparent 1px),linear-gradient(90deg,#dce2d9 1px, transparent 1px)', backgroundSize: '120px 120px', opacity: .27}} />
      <div style={{position: 'absolute', left: 105, top: 83}}><Brand dark compact /></div>
      <In start={3} style={{position: 'absolute', left: 105, top: 270, width: 1550, fontFamily: 'Zeta Sans', fontWeight: 700, letterSpacing: -13, fontSize: 160, lineHeight: .98}}>Agents need capital.</In>
      <In start={19} style={{position: 'absolute', left: 105, top: 455, width: 1440, fontFamily: 'Zeta Sans', fontWeight: 700, letterSpacing: -13, fontSize: 160, lineHeight: .98}}>Not the keys.</In>
      <div style={{position: 'absolute', left: 105, top: 731, width: 1460, height: 3, backgroundColor: '#c5d1c7'}} />
      <div style={{position: 'absolute', left: 105, top: 731, width: 1460 * line, height: 3, backgroundColor: C.ink}} />
      <div style={{position: 'absolute', left: 105 + 1460 * line - 16, top: 717, width: 32, height: 32, borderRadius: '50%', backgroundColor: C.ink, opacity: appear(f, 6)}} />
      <In start={32} y={18} style={{position: 'absolute', left: 105, top: 797, fontFamily: 'Zeta Mono', fontSize: 28, letterSpacing: 2.6, color: '#50745e'}}>CREDIT FOR AGENTS. CONTROL FOR HUMANS.</In>
      <div style={{position: 'absolute', right: 104, bottom: 71, fontFamily: 'Zeta Mono', fontSize: 20, letterSpacing: 2, color: '#789080'}}>01 / 06</div>
    </Scene>
  );
};
