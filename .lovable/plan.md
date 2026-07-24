## Diagnosis (confirmed)

Two separate issues combine into what you're hearing:

1. **The "buzzing" is not audio noise from a broken file** — it's the intentional ambient pad in `src/components/home/how-it-works/audio/ambientBed.ts` (two detuned sine oscillators + slow LFO through a lowpass filter). It's meant to sit *under* the narrator's voice. With no voice on top, it sounds like a hum/buzz on its own.
2. **The narration is missing** because `explainer-tts` calls the Lovable AI Gateway, which is returning `402 Not enough credits` (verified in the edge function logs). So every scene plays the pad with nothing over it.

The project already has ElevenLabs wired up (`ELEVENLABS_API_KEY` is used by `supabase/functions/listing-narration/index.ts`), so we can switch the explainer voiceover to ElevenLabs and get natural narration without touching billing.

## Fix

### 1. Switch `explainer-tts` to ElevenLabs

Rewrite `supabase/functions/explainer-tts/index.ts` to call ElevenLabs Text‑to‑Speech instead of the Lovable AI Gateway:

- Model: `eleven_multilingual_v2` (highest quality, best for long marketing narration).
- Voice: **Sarah** (`EXAVITQu4vr4xnSDxMaL`) as the default — warm, neutral, conversational narrator. Allow `?voice=` override.
- Output: `mp3_44100_128` (query string, per ElevenLabs API contract).
- Voice settings tuned for narration: `stability: 0.55`, `similarity_boost: 0.75`, `style: 0.35`, `use_speaker_boost: true`, `speed: 0.98`.
- Keep the existing `shapeForNarration()` prosody shaper (commas, em-dashes, ellipses, paragraph breaks) — it works just as well for ElevenLabs.
- Keep the CDN cache header (`Cache-Control: public, max-age=86400, immutable`) so repeat plays are instant.
- Keep the same GET + POST interface so the client (`AnimatedExplainer.tsx`) needs no changes.
- Surface ElevenLabs errors clearly (401 → misconfigured key, 429 → rate limited, 402 → quota).

### 2. Stop the "buzzing" when narration isn't ready

In `src/components/home/how-it-works/AnimatedExplainer.tsx`:

- Only start `AmbientBed` **after** `voiceReady === true`. If narration fetch fails, the pad never starts, so there's no lone hum.
- If narration later becomes available (e.g. voice toggle re-fetch), start the bed at that point.
- Lower the default ambient volume from `0.06` → `0.04` so even when it does play under the voice it's less prominent on small mobile speakers.

### 3. Verify

- Check `ELEVENLABS_API_KEY` is present in project secrets (I'll confirm with `fetch_secrets` in build mode; the `listing-narration` function already uses it, so it should be).
- Reload the homepage, open a "How Vendibook Works" video, confirm:
  - Sarah's voice plays clearly over each scene.
  - No standalone hum when audio isn't loaded yet.
  - Volume slider + mute still work.

## Technical notes

- **File changes:** `supabase/functions/explainer-tts/index.ts` (full rewrite), `src/components/home/how-it-works/AnimatedExplainer.tsx` (gate ambient bed on `voiceReady`), `src/components/home/how-it-works/audio/ambientBed.ts` (lower default volume constant only).
- **Not touching:** the client fetch path, cache keys, analytics, captions, keyboard shortcuts, or volume persistence. The audio element still receives an `audio/mpeg` blob URL exactly as it does today.
- **Cost:** ElevenLabs is billed to the ElevenLabs account (existing connector), not Lovable AI credits, so this also removes the 402 dependency for narration going forward.
- **Fallback:** If `ELEVENLABS_API_KEY` isn't set for any reason, the function returns a clean JSON 500 and the client already handles narration failure silently (scenes still animate, captions still show).
