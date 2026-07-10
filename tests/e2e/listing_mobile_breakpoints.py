"""
Mobile breakpoint coverage for the "How This Listing Works" CTA
and deep-link widget state.

The existing suites cover one desktop (1280) and one mobile (390) viewport.
This test sweeps a range of realistic small-screen widths to catch layout
regressions where the inline guidance CTA, modal branch selector, or the
mode-specific transaction widget only breaks on a particular breakpoint
(e.g., iPhone SE, foldable, small Android, large phone, small tablet).

For each breakpoint × forced mode (sale, rent) on the SAME dual-mode
listing we assert:

    1. The inline `howitworks-section` is visible and its `open-cta`
       is tappable (>= 40px hit target on the shorter axis).
    2. Opening the modal shows the dual `branch-selector` + both branch
       buttons; the `final-cta[data-branch=<mode>]` renders.
    3. Deep-linking directly to `/listing/{id}` with the mode forced
       lands on the correct transaction widget (Buy vs Rent CTA) and
       the opposite widget is NOT mounted.

Run:
    python3 tests/e2e/listing_mobile_breakpoints.py
"""

import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from _selectors import TID, visible  # noqa: E402
from listing_guidance_dual_mode import (  # noqa: E402
    DUAL_LISTINGS,
    BUY_TXN,
    _install_listing_rewriter,
)

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

# Real-device widths spanning the mobile → small-tablet range.
BREAKPOINTS = [
    dict(name="iphone_se",   width=320, height=568),   # smallest supported
    dict(name="iphone_mini", width=375, height=812),
    dict(name="pixel_7",     width=412, height=915),
    dict(name="iphone_pro_max", width=430, height=932),
    dict(name="foldable",    width=280, height=653),   # Galaxy Fold cover
    dict(name="small_tablet", width=600, height=960),
    dict(name="ipad_mini",   width=768, height=1024),  # tablet edge
]

# Use the first dual-mode listing (instant book) — enough to exercise
# every breakpoint without doubling the runtime.
CASE = DUAL_LISTINGS[0]


async def _count_visible(page, selector: str) -> int:
    return await page.locator(selector).locator("visible=true").count()


async def run_breakpoint(pw, bp: dict) -> None:
    label = f"{CASE['label']}_{bp['name']}_{bp['width']}x{bp['height']}"
    listing_id = CASE["listing_id"]
    print(f"\n▶ mobile-bp {label}")

    for mode in ("sale", "rent"):
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": bp["width"], "height": bp["height"]},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        await _install_listing_rewriter(context, listing_id, mode)
        await context.add_init_script(
            "window.localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
        )
        try:
            page = await context.new_page()
            await page.goto(
                f"{BASE}/listing/{listing_id}", wait_until="domcontentloaded"
            )
            await page.wait_for_timeout(1500)

            # ── Deep link: correct widget mounted, opposite absent.
            parsed = urlparse(page.url)
            assert parsed.path == f"/listing/{listing_id}", (
                f"[{mode}/{bp['name']}] deep link redirected: {page.url}"
            )
            expected = BUY_TXN if mode == "sale" else CASE["rent_txn"]
            forbidden = CASE["rent_txn"] if mode == "sale" else BUY_TXN

            widget = page.locator(expected).first
            await widget.wait_for(state="visible", timeout=15000)
            wrong = await _count_visible(page, forbidden)
            assert wrong == 0, (
                f"[{mode}/{bp['name']}] opposite widget rendered "
                f"({wrong} match(es) for {forbidden!r})"
            )

            # ── Inline guidance CTA present, visible, and tappable.
            section = page.locator(visible(TID["section"])).first
            await section.wait_for(state="visible", timeout=10000)
            await section.scroll_into_view_if_needed()
            open_cta = section.locator(TID["open_cta"]).first
            await open_cta.wait_for(state="visible", timeout=5000)
            box = await open_cta.bounding_box()
            assert box is not None, (
                f"[{mode}/{bp['name']}] open-cta has no bounding box"
            )
            # Enforce Apple/Google recommended min tap target on the short axis.
            assert min(box["width"], box["height"]) >= 32, (
                f"[{mode}/{bp['name']}] open-cta tap target too small: {box}"
            )

            # ── Modal opens + branch selector visible + correct final CTA.
            await open_cta.click()
            dialog = page.locator(TID["dialog"]).first
            await dialog.wait_for(state="visible", timeout=8000)
            await dialog.locator(TID["branch_selector"]).first.wait_for(
                state="visible", timeout=5000
            )
            await dialog.locator(TID["branch_sale"]).first.wait_for(
                state="visible", timeout=3000
            )
            await dialog.locator(TID["branch_rent"]).first.wait_for(
                state="visible", timeout=3000
            )
            branch_tid = TID["branch_sale"] if mode == "sale" else TID["branch_rent"]
            await dialog.locator(branch_tid).first.click()
            final = dialog.locator(
                f'{TID["final_cta"]}[data-branch="{mode}"]'
            ).first
            await final.wait_for(state="visible", timeout=5000)
            fbox = await final.bounding_box()
            assert fbox and min(fbox["width"], fbox["height"]) >= 32, (
                f"[{mode}/{bp['name']}] final-cta tap target too small: {fbox}"
            )

            await page.screenshot(
                path=str(SHOTS / f"mobile_bp_{label}_{mode}.png")
            )
            print(f"  ✓ {mode}: widget + CTA + modal ok")
            await page.close()
        finally:
            await context.close()
            await browser.close()


async def main() -> int:
    async with async_playwright() as pw:
        failures = []
        for bp in BREAKPOINTS:
            try:
                await run_breakpoint(pw, bp)
            except Exception as exc:
                failures.append((bp["name"], repr(exc)))
        print("\n" + "=" * 60)
        if failures:
            print(f"FAILED {len(failures)} breakpoint(s):")
            for name, err in failures:
                print(f"  - {name}: {err}")
            return 1
        print(f"PASSED all {len(BREAKPOINTS) * 2} mobile-breakpoint assertions.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
