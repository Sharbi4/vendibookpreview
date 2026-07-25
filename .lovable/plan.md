
# Homepage videos overhaul

## 1. Diagnosis

**Where they live:** `src/components/home/how-it-works/` — 4 explainers (Buying, Renting, Selling, Hosting) shown as tiles by `HowVendibookWorks.tsx`; clicking a tile opens `ExplainerVideoModal.tsx` which mounts `AnimatedExplainer.tsx`. There are **no `<video>` files** on the homepage — everything is an in-browser React/Framer animation.

**How each is implemented today**
- `HowVendibookWorks.tsx` → 4× `VideoTile` (poster tiles).
- `ExplainerVideoModal.tsx` → renders `AnimatedExplainer`.
- `AnimatedExplainer.tsx` (654 lines) runs 8 React scenes back-to-back via a `requestAnimationFrame` clock (**10 s per scene × 8 = 80 s per video**; `durationSeconds` in data says 85 s).
- `data/explainers.ts` holds a **massive prose transcript per explainer** (~400–500 words each).
- On modal open, `AnimatedExplainer` **calls a TTS edge function `explainer-tts`** with the full transcript, downloads the MP3 as a blob, creates `new Audio(url)`, and tries to `play()` it while the RAF clock advances scenes.
- Also mixes in a WebAudio `ambientBed` bass drone.

**Why it breaks (confirmed)**
1. **Autoplay-with-audio is blocked.** The scene RAF starts immediately on mount (`playing=true`); the `<audio>` element cannot start until either (a) a user gesture inside the same tick or (b) the TTS blob has finished downloading. So the scene clock is already several seconds in when the voiceover finally starts → the mid-video-start you're seeing.
2. **TTS latency is variable.** `fetchNarration` awaits a synth call (Lovable AI or similar). First-open cold path is easily 3–8 s. The animation doesn't wait for `voiceReady` before advancing.
3. **No re-sync when audio catches up.** Even the "resync on scene change" comment can't fix the *initial* offset, only later beats.
4. **Two independent clocks** (RAF for scenes, `<audio>` for narration) fundamentally can't stay locked without pausing one to the other — and the code doesn't.
5. **Length.** 80 s of dense narration is far past the 30 s home-page ceiling; viewers bounce before the message lands.

**Other audio on the site (not homepage, leave alone this pass):** `AudioListingPlayer` on listing detail pages, gallery `<video muted playsInline>` thumbnails in listing wizard/gallery — those are already muted or user-triggered, no defect.

## 2. Rebuild — muted captioned loops

Replace the TTS + RAF-synced approach entirely for all 4 explainers. Each becomes:

- Same React scene components (reused, don't rebuild), but shortened to **3 scenes × 6–8 s = 20–24 s total**.
- **No audio path.** Remove the TTS fetch, `<audio>` element, ambient bed, mute/volume controls, transcript download hotkey.
- Muted autoplay loop, tap-to-restart. `IntersectionObserver` — plays when tile is in view on the homepage, pauses off-screen.
- Kinetic on-screen captions carry the message: **max 7 words per card**, Sofia Pro display font, token colors, one active caption at a time synced to the scene index (single clock — no sync bug possible).
- Poster frame (existing `heroImage`) shown before first play and for `prefers-reduced-motion` users, who also get a **static caption stack** below the poster (no animation).
- Modal path (`ExplainerVideoModal` → click tile to open full-size) reuses the same shortened animation, adds a Play/Pause/Restart control set and larger captions. Still muted, no voiceover.

**New scripts (7 words max per card)**
- **Buying** — "Search real inventory" → "Message the seller" → "Pay protected, in one dashboard."
- **Renting** — "Pick your dates" → "Send one request" → "Rental, docs, payment — one place."
- **Selling** — "List free in minutes" → "Reach serious buyers" → "Get paid, protected by Vendibook."
- **Hosting** — "Open your calendar" → "Approve real requests" → "Payouts 24 hours after return."

## 3. Files changed

**Deleted / gutted**
- `src/components/home/how-it-works/audio/ambientBed.ts` — delete.
- `AnimatedExplainer.tsx` — rewritten to a lean ~180-line captioned loop (no TTS, no `<audio>`, no volume state, no ambient bed, no localStorage-elapsed).
- `explainer-tts` edge function — leave deployed, but stop calling it from the homepage. Not deleting server-side in case other pages hit it; will grep to confirm homepage is the only caller.

**Modified**
- `data/explainers.ts` — reduce each explainer to 3 scenes (subset of existing scene arrays), replace `caption`s with the new short strings, drop `transcript` from the runtime path (keep the field for SEO/accessibility text but read from a new `accessibleSummary` short string, ≤ 240 chars).
- `HowVendibookWorks.tsx` — tiles auto-preview in-place (muted loop) via `IntersectionObserver`, click still opens the modal.
- `VideoTile.tsx` — poster + inline captioned playback; adds reduced-motion fallback.
- `ExplainerVideoModal.tsx` — no audio controls; keeps Play/Pause/Restart + captions + CTA.

**Added**
- `useInViewAutoplay.ts` hook — shared IntersectionObserver ≥ 40% visible → play, else pause.
- `CaptionCard.tsx` — kinetic caption primitive (Sofia Pro, token colors, fade+rise via Framer, respects reduced-motion).

## 4. Tech quality checklist
- Single clock per animation — captions read scene index, cannot drift.
- Poster = existing `heroImage`, painted before first frame → no black flash.
- IntersectionObserver play/pause; unmount cleans up.
- `prefers-reduced-motion` → poster + static caption stack, no motion.
- Mobile: no `<video>` so `playsinline` isn't relevant, but pointer-events guarded so tile tap opens modal without scroll hijack.
- No `new Audio()`, no autoplay-with-sound, no user-gesture requirement.

## 5. Verification
- Playwright at 1280 and 390 widths: load `/`, scroll to `HowVendibookWorks`, screenshot each tile mid-loop, confirm caption text matches scene, no audio nodes exist in the document, no console warnings from blocked autoplay.
- `bunx tsgo --noEmit`.
- Report per-video: previous 80 s TTS-synced → new 20–24 s muted captioned loop.

## Assumptions
- Voiceover is not essential for these homepage tiles (per your rule 2a preference). If you want any single one kept as a narrated video, tell me and I'll pre-render an MP4 for that one only and swap it in via `videoSource` (the data model already has the slot).
- Keeping the `explainer-tts` edge function deployed (unused by homepage) rather than deleting it, in case other pages call it.
