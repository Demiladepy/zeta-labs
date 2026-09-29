import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const sampleRate = 48000;
const duration = 15;
const frames = sampleRate * duration;
const output = resolve('public/zeta-score.wav');
const buffer = Buffer.alloc(44 + frames * 4);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(buffer.length - 8, 4);
buffer.write('WAVEfmt ', 8);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 4, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(frames * 4, 40);

const hits = [0, 65 / 30, 150 / 30, 240 / 30, 330 / 30, 390 / 30];
const notes = [146.83, 164.81, 196.0, 174.61, 220.0, 146.83];
let seed = 89431;

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const fade = Math.min(1, t / .24, (duration - t) / .38);
  const pad =
    .038 * Math.sin(2 * Math.PI * 73.416 * t) +
    .021 * Math.sin(2 * Math.PI * 110 * t + .2) +
    .012 * Math.sin(2 * Math.PI * 146.83 * t + Math.sin(t * .33) * .12);
  let bell = 0;
  let thump = 0;
  let air = 0;
  for (let j = 0; j < hits.length; j++) {
    const d = t - hits[j];
    if (d >= 0 && d < 2.2) {
      const note = notes[j];
      bell += Math.exp(-2.3 * d) * (
        .052 * Math.sin(2 * Math.PI * note * d) +
        .022 * Math.sin(2 * Math.PI * note * 2.01 * d)
      );
      if (d < .36) {
        thump += .12 * Math.exp(-19 * d) * Math.sin(2 * Math.PI * (49 - 22 * d) * d);
      }
      if (d < .22) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        air += ((seed / 4294967295) * 2 - 1) * .025 * Math.exp(-22 * d);
      }
    }
  }
  const pulse = .79 + .21 * Math.sin(2 * Math.PI * 1.6 * t);
  const left = Math.max(-1, Math.min(1, (pad * pulse + bell + thump + air) * fade));
  const right = Math.max(-1, Math.min(1, (pad * pulse + bell * .96 + thump + air * .7) * fade));
  buffer.writeInt16LE(Math.round(left * 32767), 44 + i * 4);
  buffer.writeInt16LE(Math.round(right * 32767), 46 + i * 4);
}

writeFileSync(output, buffer);
process.stdout.write(`Generated ${output}\n`);
