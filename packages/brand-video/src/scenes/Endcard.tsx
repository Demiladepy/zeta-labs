import {interpolate, useCurrentFrame} from 'remotion';
import {appear, C, In, Scene} from './shared';

export const Endcard = () => {
  const f = useCurrentFrame();
  const ring = interpolate(f, [0, 52], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene light>
      <div style={{position: 'absolute', top: -740, right: -460, width: 1900, height: 1900, borderRadius: '50%', border: `5px solid ${C.ink}`, scale: .7 + ring * .28, opacity: .08}} />
      <div style={{position: 'absolute', top: -540, right: -240, width: 1450, height: 1450, borderRadius: '50%', border: `5px solid ${C.ink}`, scale: .7 + ring * .28, opacity: .13}} />
      <div style={{position: 'absolute', left: 105, top: 286, width: 145, height: 145, borderRadius: '50%', backgroundColor: C.ink, color: C.mint, display: 'grid', placeItems: 'center', opacity: appear(f, 5), scale: interpolate(f, [4, 24], [.7, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), fontFamily: 'Zeta Sans', fontWeight: 700, fontSize: 107, letterSpacing: -16, paddingRight: 19}}>Ƶ</div>
      <In start={11} style={{position: 'absolute', left: 284, top: 278, fontFamily: 'Zeta Sans', fontWeight: 700, fontSize: 145, letterSpacing: -11, color: C.ink}}>Zeta Labs</In>
      <In start={20} y={24} style={{position: 'absolute', left: 105, top: 543, fontFamily: 'Zeta Sans', fontSize: 76, letterSpacing: -4, color: C.ink}}>Credit for agents.<br/>Control for humans.</In>
      <div style={{position: 'absolute', left: 105, right: 105, bottom: 126, height: 2, backgroundColor: '#c6d0c7'}} />
      <div style={{position: 'absolute', left: 105, bottom: 78, fontFamily: 'Zeta Mono', fontSize: 23, letterSpacing: 2, color: '#52735d'}}>BUILT ON SOLANA</div>
      <div style={{position: 'absolute', right: 105, bottom: 78, fontFamily: 'Zeta Mono', fontSize: 23, letterSpacing: 2, color: '#52735d'}}>ZETA LABS</div>
    </Scene>
  );
};
