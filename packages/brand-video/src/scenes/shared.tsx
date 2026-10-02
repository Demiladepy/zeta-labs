import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

export const C = {
  ink: '#071a12', mint: '#a6f4c5', paper: '#eef0e8', white: '#f8faf5',
  muted: '#9bb5a5', red: '#ef796d', line: '#3c5948',
};

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const appear = (frame: number, start: number, duration = 17) => interpolate(frame, [start, start + duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
export const drift = (frame: number, start: number, distance = 56) => interpolate(frame, [start, start + 20], [distance, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

export const Scene = ({children, light = false}: {children: ReactNode; light?: boolean}) => (
  <AbsoluteFill style={{backgroundColor: light ? C.paper : C.ink, color: light ? C.ink : C.white, overflow: 'hidden'}}>{children}</AbsoluteFill>
);

export const Kicker = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <div style={{fontFamily: 'Zeta Mono', fontSize: 25, letterSpacing: 4, color: C.mint, ...style}}>{children}</div>
);

export const Brand = ({dark = false, compact = false}: {dark?: boolean; compact?: boolean}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: compact ? 17 : 24}}>
    <div style={{width: compact ? 46 : 66, height: compact ? 46 : 66, borderRadius: '50%', backgroundColor: dark ? C.ink : C.white, display: 'grid', placeItems: 'center'}}>
      <Img src={staticFile('logo-zeta.png')} style={{width: compact ? 36 : 52, height: compact ? 36 : 52, objectFit: 'contain', filter: dark ? 'invert(1)' : 'none'}} />
    </div>
    <div style={{fontFamily: 'Zeta Sans', fontSize: compact ? 33 : 50, fontWeight: 700, letterSpacing: -2.3, color: dark ? C.ink : C.white}}>Zeta Labs</div>
  </div>
);

export const Topline = ({label, light = false}: {label: string; light?: boolean}) => (
  <div style={{position: 'absolute', top: 76, left: 105, right: 105, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${light ? '#cbd3c8' : C.line}`, paddingBottom: 26}}>
    <Brand dark={light} compact />
    <span style={{fontFamily: 'Zeta Mono', fontSize: 19, letterSpacing: 2.3, color: light ? '#537060' : C.muted}}>{label}</span>
  </div>
);

export const Bottomline = ({label, light = false}: {label: string; light?: boolean}) => (
  <div style={{position: 'absolute', bottom: 66, left: 105, right: 105, borderTop: `1px solid ${light ? '#cbd3c8' : C.line}`, paddingTop: 23, display: 'flex', justifyContent: 'space-between', color: light ? '#61776a' : C.muted, fontFamily: 'Zeta Mono', fontSize: 19, letterSpacing: 2}}>
    <span>POLICY-BOUND CREDIT</span><span>{label}</span>
  </div>
);

export const In = ({children, start, x = 0, y = 42, style}: {children: ReactNode; start: number; x?: number; y?: number; style?: CSSProperties}) => {
  const f = useCurrentFrame();
  return <div style={{opacity: appear(f, start), translate: `${drift(f, start, x)}px ${drift(f, start, y)}px`, ...style}}>{children}</div>;
};
