# Voiceover — Simulator cut (`zeta hr.mp4`)

**38.6s · 1920×792 · 30fps · no audio stream.** Voice: **tayo** (YarnGPT).

Budget: **94 words at ~150 wpm.** This clip is dense and fast — every word has
to earn its place. Do not add a sentence "to explain more"; the footage is
already making the argument. Let it breathe.

Works standalone as the wedge clip, or cut it into the 103s walkthrough
straight after the audit panel.

---

## Segment A · 0:00 – 0:08 · Undefended table scrolling (18 words)

> Twenty calls. Each one a single USDC, each one under the per-call cap.
> Every single one allowed.

## Segment B · 0:08 – 0:16 · The verdict (21 words)

> Twenty attempted, twenty admitted, nothing blocked. The drain succeeded.
> Every call passed the check, and the sequence was never evaluated.

## Segment C · 0:16 – 0:26 · Toggle to enforcement (25 words)

> Now the same attacker, the same per-call cap — but with a rolling cap of five
> USDC over one hour. Twenty attempted. Five admitted. Fifteen blocked.

## Segment D · 0:26 – 0:38 · The decision table (30 words)

> Five through, then the accumulator bites. Cumulative frozen at five.
> A tumbling window that evaluate reads before every draw — at most one cap per
> window, two across a boundary.

---

**Total: 94 words.**

Delivery note: the pause between B and C is the whole clip. Let roughly a
second of silence sit after "the sequence was never evaluated" before the
toggle. The contrast is the argument.

---

## Generating with YarnGPT — tayo

Hosted: <https://yarngpt.ai> — paste each segment, pick **tayo**, download four
WAVs named `segA.wav` … `segD.wav`.

Colab (free GPU), from <https://github.com/saheedniyi02/yarngpt>:

```python
!git clone https://github.com/saheedniyi02/yarngpt.git
!pip install outetts uroman
!wget https://huggingface.co/novateur/WavTokenizer-medium-speech-75token/resolve/main/wavtokenizer_mediumdata_frame75_3s_nq1_code4096_dim512_kmeans200_attn.yaml
!gdown 1-ASeEkrn4HY49yZWHTASgfGFNXdVnLTt

from yarngpt.audiotokenizer import AudioTokenizerV2
from transformers import AutoModelForCausalLM
import torchaudio

audio_tokenizer = AudioTokenizerV2(
    "saheedniyi/YarnGPT2",
    "/content/wavtokenizer_large_speech_320_24k.ckpt",
    "/content/wavtokenizer_mediumdata_frame75_3s_nq1_code4096_dim512_kmeans200_attn.yaml",
)
model = AutoModelForCausalLM.from_pretrained(
    "saheedniyi/YarnGPT2", torch_dtype="auto"
).to(audio_tokenizer.device)

segments = {
    "segA": "Twenty calls. Each one a single USDC, each one under the per-call cap. Every single one allowed.",
    "segB": "Twenty attempted, twenty admitted, nothing blocked. The drain succeeded. Every call passed the check, and the sequence was never evaluated.",
    "segC": "Now the same attacker, the same per-call cap, but with a rolling cap of five USDC over one hour. Twenty attempted. Five admitted. Fifteen blocked.",
    "segD": "Five through, then the accumulator bites. Cumulative frozen at five. A tumbling window that evaluate reads before every draw. At most one cap per window, two across a boundary.",
}

for name, text in segments.items():
    prompt = audio_tokenizer.create_prompt(text, lang="english", speaker_name="tayo")
    ids = audio_tokenizer.tokenize_prompt(prompt)
    out = model.generate(
        input_ids=ids, temperature=0.1, repetition_penalty=1.1, max_length=4000
    )
    audio = audio_tokenizer.get_audio(audio_tokenizer.get_codes(out))
    torchaudio.save(f"{name}.wav", audio, sample_rate=24000)
```

Note the em-dashes are written out as commas in the Python strings — TTS
models read punctuation, and a dash can land as an odd pause.

---

## Muxing

This file has **no audio stream at all**, so the mux just adds one.

```bash
ffmpeg -i "zeta hr.mp4" \
  -i segA.wav -i segB.wav -i segC.wav -i segD.wav \
  -filter_complex "\
    [1:a]adelay=200|200[a1]; \
    [2:a]adelay=8000|8000[a2]; \
    [3:a]adelay=16000|16000[a3]; \
    [4:a]adelay=26000|26000[a4]; \
    [a1][a2][a3][a4]amix=inputs=4:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest \
  zeta-simulator-demo.mp4
```

The 200 ms offset on segment A stops the voice starting on the very first
frame, which always sounds clipped.

Check the toggle lands with the narration before rendering everything:

```bash
ffplay -ss 14 zeta-simulator-demo.mp4
```

If a segment overruns its slot, cut words. Do not speed the audio up — it
destroys the accent, which is the reason for using YarnGPT at all.
