
## See How Vendibook Works — Homepage Section

A new homepage section featuring 4 clickable tiles (Buying, Renting, Selling, Hosting), each opening a premium modal that plays an in-browser animated explainer starring "Vendi", our marketplace guide character.

### Video approach

MP4 rendering isn't practical inline in this app runtime (Remotion is a separate rendering pipeline, not a runtime player). Instead, each explainer is built as a **React + Framer Motion + SVG animated sequence** — same visual quality bar, fully controllable, captioned, and lightweight. The modal API is structured so a future MP4 can drop in without changing the tile grid or section markup (each explainer entry has a `videoSource` field; when present, the modal renders `<video>` instead of `<AnimatedExplainer />`).

### Placement

Insert on `src/pages/Index.tsx` immediately after `<AnnouncementBanner />` and before `<HomepageFeaturedRow />` — early enough to educate confused visitors, after the value prop.

### Routes (all verified to already exist)

| Video | Primary CTA → route | Secondary CTA → route |
|---|---|---|
| Buying | Browse Food Trucks & Trailers → `/browse` | Learn About Buying → `/how-it-works` |
| Renting | Explore Rentals → `/browse?mode=rent` | How Rentals Work → `/how-it-works` |
| Selling | List for Free → `/list` | Explore Selling Tools → `/how-it-works-seller` |
| Hosting | Become a Host → `/how-it-works-host` | See Hosting Benefits → `/how-it-works-host#benefits` |

### Component structure

```text
src/components/home/how-it-works/
  HowVendibookWorks.tsx        # section wrapper + heading + tile grid
  VideoTile.tsx                # thumbnail + play button + hover motion
  ExplainerVideoModal.tsx      # Radix Dialog, focus trap, ESC/backdrop close, transport controls
  VideoEndCTA.tsx              # end-of-video primary + secondary CTA
  AnimatedExplainer.tsx        # scene runner: timeline, captions, progress, play/pause
  Vendi.tsx                    # the character SVG (accessory prop: search|calendar|camera|dashboard)
  scenes/
    buying/Scene1..Scene6.tsx
    renting/Scene1..Scene6.tsx
    selling/Scene1..Scene6.tsx
    hosting/Scene1..Scene6.tsx
  data/explainers.ts           # single config array (see schema below)
  scripts/voiceover-scripts.md # full VO + caption + transcript reference doc
```

### Data schema (`data/explainers.ts`)

```ts
type ExplainerType = 'buying' | 'renting' | 'selling' | 'hosting';
interface Explainer {
  id: ExplainerType;
  title: string;
  description: string;
  durationSeconds: number;      // ~60
  thumbnail: ReactNode;         // animated SVG preview
  videoSource?: string;         // future MP4 slot; undefined = use AnimatedExplainer
  captionsVtt?: string;         // future .vtt path
  transcript: string;
  ctaLabel: string; ctaRoute: string;
  secondaryCtaLabel: string; secondaryCtaRoute: string;
  scenes: SceneDef[];           // { component, durationMs, caption }
}
```

### Modal behaviour

- Built on existing shadcn `Dialog` (Radix) — inherits focus trap, ESC close, backdrop click close, scroll lock.
- Fade + scale entrance (existing `animate-scale-in` + `animate-fade-in`).
- Custom transport bar: play/pause, progress scrubber, mute, CC toggle, fullscreen (requestFullscreen on modal content).
- Caption toggle on by default; captions are large, readable, mobile-safe.
- Playback position persisted in `localStorage` per explainer id.
- Opening a new modal pauses any other running explainer.
- Respects `prefers-reduced-motion`: skips motion, shows scene stills with captions and manual next/back.

### Tiles

- Desktop: 4-column grid (`lg:grid-cols-4`, `md:grid-cols-2`).
- Mobile: horizontal snap carousel (`overflow-x-auto snap-x`).
- Each tile: animated SVG thumbnail (Vendi + scene motif), large centered play button, title, one-line description, duration badge ("≈60s"), "Watch" affordance, hover lift + play-button pulse.
- Uses existing brand tokens only (no hardcoded colors). Glassmorphism card style matching the rest of the homepage.

### Vendi character

Single reusable SVG component. Rounded food-trailer silhouette body, small display-panel face with two dot eyes, subtle wheels, minimal line details. Accepts an `accessory` prop that renders a small overlaid SVG:
- `search` (Buyer) — magnifier + clipboard
- `calendar` (Renter) — calendar + key
- `camera` (Seller) — camera + price tag
- `dashboard` (Host) — bar-chart + pin

Idle animation: subtle bob + blink loop (disabled under reduced-motion).

### Scenes (per video)

Each of the 6 scenes per video is its own file rendering an `AbsoluteFill`-style layout with:
- Background motif (map, listing grid, calendar, messaging, payout)
- Vendi in role
- Animated UI props (listing cards sliding, calendar days selecting, badges stamping, payout counter)
- Caption line synced to scene duration

Scene contents follow the user's brief exactly for Buying/Renting/Selling/Hosting (6 scenes each with the specified beats and on-screen text). No unsupported claims — copy carefully avoids "guaranteed", "risk-free", "instant approval", etc.

### Analytics

New events added to `src/lib/leadTracking.ts` `LeadEventName` union (category `homepage`):
- `homepage_video_tile_viewed` (IntersectionObserver via existing `ImpressionTracker`)
- `homepage_video_opened`, `homepage_video_started`
- `homepage_video_25_percent`, `_50_percent`, `_75_percent`, `_completed`
- `homepage_video_cta_clicked`

All fire with `{ video_type: 'buying'|'renting'|'selling'|'hosting' }`.

### Performance

- Section itself is imported directly (small); scene components lazy-loaded per explainer via `React.lazy` — only the chosen video's scene bundle downloads on open.
- Thumbnails are inline SVG (no image download, LCP-safe).
- Body scroll lock via Radix Dialog default.
- Reduced-motion honored; still frames rendered instead of animation loops.
- No autoplay with sound; user must click play inside modal.

### Voiceover scripts

`scripts/voiceover-scripts.md` contains, for each of the 4 videos:
- Full VO script (~120 words, ~60s at conversational pace)
- Caption cues (timestamped)
- Transcript block
- Production notes (music mood, pacing, brand-voice guardrails)

### Accessibility & QA checklist

- Keyboard: Tab reaches tiles, Enter opens; modal traps focus; ESC closes; Space toggles play; arrow keys scrub.
- Captions readable on 360px viewport.
- Reduced-motion path tested.
- All CTAs use verified existing routes (see table above).
- Copy reviewed for banned phrases ("guaranteed", "risk-free", "instant approval", "everyone is verified", "Vendibook handles everything").
- Brand spelling "Vendibook" everywhere.
- No placeholder video files, no external YouTube embeds, no stock footage.

### Files touched

- **New**: everything under `src/components/home/how-it-works/` (~20 files) + `scripts/voiceover-scripts.md`.
- **Edit**: `src/pages/Index.tsx` (insert section), `src/lib/leadTracking.ts` (add 8 event names + categories).
- **No changes** to routing, backend, RLS, edge functions, or unrelated homepage sections.
