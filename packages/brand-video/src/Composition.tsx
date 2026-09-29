import {AbsoluteFill, Audio, Composition, Easing, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Opening} from './scenes/Opening';
import {Pool} from './scenes/Pool';
import {Policy} from './scenes/Policy';
import {Decision} from './scenes/Decision';
import {Proof} from './scenes/Proof';
import {Endcard} from './scenes/Endcard';

export const FPS = 30;
export const DURATION = 450;

const cuts = [65, 150, 240, 330, 390];

const Curtain = ({at, index}: {at: number; index: number}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at - 5, at + 7], [-125, 125], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.78, 0, 0.22, 1),
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${progress}%`,
        width: 210,
        backgroundColor: index % 2 === 0 ? '#a6f4c5' : '#e7ebdc',
        transform: 'skewX(-11deg)',
      }}
    />
  );
};

const Film = () => (
  <AbsoluteFill style={{backgroundColor: '#071a12'}}>
    <Sequence durationInFrames={65}><Opening /></Sequence>
    <Sequence from={65} durationInFrames={85}><Pool /></Sequence>
    <Sequence from={150} durationInFrames={90}><Policy /></Sequence>
    <Sequence from={240} durationInFrames={90}><Decision /></Sequence>
    <Sequence from={330} durationInFrames={60}><Proof /></Sequence>
    <Sequence from={390} durationInFrames={60}><Endcard /></Sequence>
    <Audio src={staticFile('zeta-score.wav')} volume={0.8} />
    {cuts.map((at, index) => <Curtain key={at} at={at} index={index} />)}
  </AbsoluteFill>
);

export const MyComposition = () => (
  <Composition id="ZetaLabs15" component={Film} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
);
