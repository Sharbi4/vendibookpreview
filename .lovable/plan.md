## 1. Archive test listings from the homepage

Currently 3 "QA Cash Food Truck …" rows are `status='published'` and appear in the live feed. Set them to `archived` so they disappear from the homepage, search, and public routes (drafts already hidden).

Rows to archive:
- `716dd2e9-c4d7-43b4-9be6-9648055aa551` — QA Cash Food Truck 1783693500
- `b0292fb9-9d00-4fe2-93db-8398f011f0e4` — QA Cash Food Truck 1783693479
- `7e7e4aaf-9401-4980-a57a-4bd65c8228c0` — QA Cash Food Truck 1783693446

Run via `supabase--insert`:
```sql
UPDATE public.listings
SET status = 'archived', updated_at = now()
WHERE id IN ('716dd2e9-…','b0292fb9-…','7e7e4aaf-…');
```

## 2. Restore the brand font (Sofia Pro Soft Light)

The Tailwind config already declares `SofiaProSoftLight` as the sans stack, but no `@font-face` rule loads the file (the S3 preload was removed for CORS). The uploaded `SofiaProSoftLight.otf` will be published as a Lovable CDN asset and wired in via `@font-face` so the whole app picks it up automatically.

Steps:
1. Upload the file to the CDN: `lovable-assets create --file /mnt/user-uploads/SofiaProSoftLight.otf --filename SofiaProSoftLight.otf > src/assets/SofiaProSoftLight.otf.asset.json`.
2. Add an `@font-face` block at the top of `src/index.css` that references the CDN URL from the pointer JSON, with `font-display: swap` to avoid FOIT.
3. Add a matching `<link rel="preload" as="font" type="font/otf" crossorigin>` in `index.html` `<head>` so the font is fetched during initial paint.
4. No Tailwind or component changes needed — `font-sans` already resolves to `SofiaProSoftLight`.

Note: `.otf` works but is larger than `.woff2`. If you later want a smaller payload, upload a `.woff2` version and I'll swap the URL — no other code changes required.

## 3. Verify

- Query `listings` to confirm only clean rows remain published.
- Reload `/` in the preview and confirm the QA rows are gone and body text renders in Sofia Pro Soft Light (visible weight/shape shift from system-ui).
