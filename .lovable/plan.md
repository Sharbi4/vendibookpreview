# PermitPath Redesign + Engine Upgrade

Two workstreams: (1) visual/UX overhaul of `src/pages/tools/PermitPath.tsx`, (2) prompt + JSON-schema upgrade of `supabase/functions/ai-license-finder/index.ts` to power a richer interactive results dashboard.

## 1. Visual + UX rebuild (`PermitPath.tsx`)

**Fix contrast immediately**
- Replace the pastel green/blue/purple benefit cards with a single cohesive system: dark `bg-card/60` surface, hairline border, colored icon tile (icon keeps its hue, card stays dark), bold near-white heading, muted body. No light-on-light anywhere.
- Audit every heading/body line; standardize to `text-foreground` / `text-muted-foreground`.

**Remove "AI" framing (user-facing only)**
- Drop the big "Important Disclaimer / This AI tool…" banner. Replace with a single small line under results: "Requirements are researched from official sources. Always confirm with your local agency before applying."
- Rename step 2 from "AI Maps Requirements" → "We Map Your Requirements."
- Strip any other "AI" labels from copy. Engine keeps working unchanged under the hood.

**Premium polish (Satin Lux, orange-only CTA — matches Core memory)**
- Hero: keep "Navigate permits in minutes, not weeks." Add a subtle radial `#FF5124` glow behind the headline using a CSS radial-gradient layer. Refine the PermitPath badge (hairline border, tiny dot, tracking).
- Primary CTA "Find My Permits": solid `bg-[hsl(var(--primary))]` orange-red, white text, right-arrow, shimmer-sweep hover (reuse the existing glass CTA variant from memory).
- Benefit cards: staggered fade-up on scroll (framer-motion `whileInView`).
- "How PermitPath Works": orange filled numbered circles + thin vertical connector line on desktop, stacked on mobile. Tighten copy.
- Mobile-first: 16px inputs (Core rule), 48px tap targets, generous spacing.

## 2. Interactive results dashboard

Replace the current flat list with a dashboard rendered from the new JSON schema:

- **Sticky summary header**: progress bar ("4 of 11 complete"), running cost range, typical setup weeks. Updates live as checkboxes toggle.
- **"Don't skip these" highlight strip** at the top — auto-populated from `commonly_missed: true` items.
- **Recent law alert banner** (orange-tinted, dismissible) when `recent_law_alert` is non-null.
- **Category sections** (Business Registration, Food Safety Certifications, Health Permits, Mobile Vendor License, Fire/Equipment, Local/City, Insurance) rendered as collapsible groups.
- **Each requirement = expandable card** with: title, issuer + level badge (state/county/city/federal), cost estimate, timeline estimate, "why it matters" plain-language line, official link button, checkbox for progress.
- **Persistence**: checklist state stored in `localStorage` keyed by `state|city|business_type` so progress survives reloads. Optional "Save to my account" if user is authed (writes to a new lightweight `permit_checklists` table — flag this for a follow-up migration; not in scope for this pass unless approved).
- **Download as PDF** button using the existing `generateReceiptPdf` pattern (new helper `generatePermitChecklistPdf.ts`).
- Small inline verify note at the bottom of results, not a banner.

New components (kept small, in `src/components/tools/permit-path/`):
- `ResultsDashboard.tsx`
- `CategorySection.tsx`
- `RequirementCard.tsx`
- `ProgressSummary.tsx`
- `LawAlertBanner.tsx`
- `usePermitChecklist.ts` (localStorage hook)

## 3. Engine upgrade (`supabase/functions/ai-license-finder/index.ts`)

- Replace system + user prompts with the PermitPath spec from the brief: forbids invented fees/links, mandates official-source grounding, separates state vs city/county, bakes in the known recent changes (TX HB 2844 / SB 1008, FDA 2022 Food Code, cottage food shifts in FL/MI/ND/MN) with "verify still current" caveats.
- Expand Firecrawl `gatherSources` queries to also hit: state DSHS / health dept, city clerk, county environmental health, fire marshal, cottage-food law pages, and recent-news queries filtered to the last 12 months.
- Switch JSON schema to the new shape the dashboard consumes:
  ```
  { location, recent_law_alert, estimated_total_cost{low,high},
    estimated_setup_weeks{low,high},
    categories:[{ name, items:[{ title, issuer, level, cost_estimate,
      timeline_estimate, official_url, why_it_matters, commonly_missed }]}],
    sources:[…], verify_note }
  ```
- Keep model `google/gemini-3-pro-preview`, keep 429/402 handling, keep source backfill.
- Update the client fetch in `PermitPath.tsx` to consume the new schema (with a small adapter so an in-flight old-shape response degrades gracefully).

## Files touched

- `src/pages/tools/PermitPath.tsx` — rewrite UI shell + wire dashboard
- `src/components/tools/permit-path/*` — new (5 components + 1 hook)
- `src/lib/generatePermitChecklistPdf.ts` — new
- `supabase/functions/ai-license-finder/index.ts` — new prompt + JSON schema + expanded queries

## Out of scope (flag for follow-up)

- Account-level checklist persistence table + RLS (only if you want cross-device save). Local progress works without it.
- Email/share the checklist.
