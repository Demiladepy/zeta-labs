# Voiceover — technical walkthrough (103s cut)

Timed to `zeta labs (1).mp4`: **103.5s**, 1920×792, 30fps, silent audio track.

**Budget: ~256 words at ~150 wpm.** Do not exceed it. The single most common
way a voiceover ruins a demo is the narrator racing the footage.

---

## Segment 1 · 0:00 – 0:20 · Landing hero (50 words)

> Zeta Labs is programmable credit for autonomous agents on Solana.
> A lender funds a pool. An agent draws against a credit line. Every spend is
> checked on-chain before any money moves.
> It is two programs — a Policy Registry that decides, and a Credit Vault that
> holds and moves the funds.

## Segment 2 · 0:20 – 0:57 · Landing scroll (92 words)

> We wrote both against solana-program directly, without Anchor, because the
> account layouts are frozen and shared. Both programs call the same evaluate
> function, so the vault and the registry can never drift apart.
> The checks are ordered, and the order is deliberate. Revoked beats expired.
> Expiry beats the per-call cap. First failure wins, and that reason is what
> lands in the audit record — because a denial that cannot explain itself is
> not worth much to the lender who is funding the pool.

## Segment 3 · 0:57 – 1:10 · Dashboard loading (32 words)

> This dashboard reads Solana devnet directly in the browser. No backend, no
> API keys. The decoder parses raw account bytes using the same frozen layout
> the programs write.

## Segment 4 · 1:10 – 1:32 · Audit panel, the denials (55 words)

> And here is the part that matters. Four denials, two allowances — all real,
> all on-chain. Per-call cap. Policy revoked. Slot numbers, agent address, and
> a link straight to Solana Explorer.
> A denial never reserves funds. The line's balance is untouched. That is its
> own tested invariant.

## Segment 5 · 1:32 – 1:43 · Docs (27 words)

> The SDK ships on npm as zeta s d k slash s d k, with the full policy surface
> documented. Programs are live on devnet today.

---

**Total: 256 words.**

---

## Strongly recommended: a 25-second Simulator insert

The current cut never opens the Simulator, which is the only place a viewer
*sees* the policy refuse something. Record this separately and cut it in after
Segment 4, pushing docs to the end. It takes two minutes to shoot.

**Screen:** dashboard → Simulator → toggle **Per-call cap only** → **Run the
attack** → toggle **Zeta enforcement** → **Run the attack**.

> A per-call cap bounds one transaction. It does not bound a sequence.
> One USDC per call. The agent asks twenty times, every request legal. Twenty
> allowed, twenty USDC gone.
> Same cap, now with a rolling cap of five over an hour. Stopped at call six.
> Fifteen USDC never moved. A tumbling-window accumulator that evaluate reads
> before any draw — and we state the exact bound: at most one cap per window,
> at most two across a boundary.

*(62 words, ~25 seconds.)*

This is also the only segment that cannot fail on camera — it runs entirely in
the browser with no RPC.

---

## Generating the audio with YarnGPT

YarnGPT male voices: **jude, tayo, umar, osagie, onye, emma**. Audition two or
three — I have not heard them and will not guess which suits a technical
walkthrough.

**Generate one file per segment**, not one long take. YarnGPT degrades on long
inputs, and per-segment files let you align to the timecodes above.

### Fastest path — hosted
<https://yarngpt.ai> — 16 voices, no install. Paste each segment, pick a male
English voice, download the WAVs.

### Free GPU — Colab (~15 min)
From <https://github.com/saheedniyi02/yarngpt>:

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
    "seg1": "Zeta Labs is programmable credit for autonomous agents on Solana. ...",
    # paste each segment
}

for name, text in segments.items():
    prompt = audio_tokenizer.create_prompt(text, lang="english", speaker_name="jude")
    ids = audio_tokenizer.tokenize_prompt(prompt)
    out = model.generate(
        input_ids=ids, temperature=0.1, repetition_penalty=1.1, max_length=4000
    )
    audio = audio_tokenizer.get_audio(audio_tokenizer.get_codes(out))
    torchaudio.save(f"{name}.wav", audio, sample_rate=24000)
```

**Not viable on this machine today:** no GPU and no torch installed. CPU-only
autoregressive generation for ~100 seconds of speech would take hours, and the
`outetts` + `gdown` setup is failure-prone on Windows. Use the hosted site or
Colab.

---

## Muxing the voiceover onto the video

Place each segment at its timecode, mix to one track, then mux. From the folder
holding the WAVs and the mp4:

```bash
ffmpeg -i "zeta labs (1).mp4" \
  -i seg1.wav -i seg2.wav -i seg3.wav -i seg4.wav -i seg5.wav \
  -filter_complex "\
    [1:a]adelay=0|0[a1]; \
    [2:a]adelay=20000|20000[a2]; \
    [3:a]adelay=57000|57000[a3]; \
    [4:a]adelay=70000|70000[a4]; \
    [5:a]adelay=92000|92000[a5]; \
    [a1][a2][a3][a4][a5]amix=inputs=5:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest \
  zeta-technical-demo.mp4
```

`adelay` values are milliseconds and match the segment timecodes. The
`loudnorm` filter brings it to −16 LUFS, which is YouTube's target — without it
TTS output is usually too quiet.

Check a segment lands where you expect before rendering the whole thing:

```bash
ffplay -ss 68 zeta-technical-demo.mp4
```

If a segment overruns its slot, trim words rather than speeding the audio up.
