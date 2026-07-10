"""
Deep-link widget-state assertions for the SAME dual-mode listing.

Companion to `listing_guidance_dual_mode.py`. Where that test walks the
user through the guidance modal and clicks the branch CTA, this test
verifies the *deep link* contract: opening `/listing/{id}` with the
listing forced into `mode=sale` or `mode=rent` must land the visitor
directly on the correct transaction widget — no guidance click required.

For each viewport × mode we assert, on the exact same listing id:

    1. URL is exactly `/listing/{id}` (no redirect, no hash rewrite).
    2. The correct transaction widget is mounted AND visible:
         sale → Buy Now widget (booking-widget-buy-now / sticky Buy).
         rent → Rent CTA widget (rental-widget-cta / booking-widget-rent-cta
                / sticky-mobile-rent-cta) with the right data-instant-book.
    3. The OPPOSITE mode's widget is NOT mounted (no accidental
       dual-render), preventing the "both widgets visible" regression.
    4. Guidance section still renders in dual mode with the branch
       selector available (so deep-link entry does not suppress it).
    5. Price / mode label in the hero matches the forced mode.

Run:
    python3 tests/e2e/listing_deep_link_widget_state.py
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

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]


async def _count_visible(page, selector: str) -> int:
    return await page.locator(selector).locator("visible=true").count()


async def run_case(pw, case: dict, viewport: dict) -> None:
    label = f"{case['label']}_{viewport['name']}"
    listing_id = case["listing_id"]
    print(f"\n▶ deep-link {label}")

    for mode in ("sale", "rent"):
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport["width"], "height": viewport["height"]}
        )
        await _install_listing_rewriter(context, listing_id, mode)
        await context.add_init_script(
            "window.localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
        )
        try:
            page = await context.new_page()
            url = f"{BASE}/listing/{listing_id}"
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)

            # 1. URL exactness — no redirect, no hash bump.
            parsed = urlparse(page.url)
            assert parsed.path == f"/listing/{listing_id}", (
                f"[{mode}] deep link redirected: {page.url}"
            )
            assert parsed.fragment == "", (
                f"[{mode}] deep link added hash: {page.url}"
            )

            # 2. Correct widget mounted + visible.
            if mode == "sale":
                expected = BUY_TXN
                forbidden = case["rent_txn"]
            else:
                expected = case["rent_txn"]
                forbidden = BUY_TXN

            widget = page.locator(expected).first
            await widget.wait_for(state="visible", timeout=15000)

            # 3. Opposite-mode widget must NOT be visible.
            wrong = await _count_visible(page, forbidden)
            assert wrong == 0, (
                f"[{mode}] opposite widget also rendered "
                f"({wrong} match(es) for {forbidden!r})"
            )

            # 4. Guidance section + branch selector still available
            #    (dual-mode entry point survives deep link).
            section = page.locator(visible(TID["section"])).first
            await section.wait_for(state="visible", timeout=10000)
            await section.locator(TID["open_cta"]).first.click()
            dialog = page.locator(TID["dialog"]).first
            await dialog.wait_for(state="visible", timeout=8000)
            await dialog.locator(TID["branch_selector"]).first.wait_for(
                state="visible", timeout=5000
            )
            # Close modal so the screenshot shows the widget state.
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(300)

            # 5. Hero copy reflects forced mode (data-testid free — use
            #    a page-level text probe that tolerates both listings).
            body_text = (await page.locator("body").inner_text()).lower()
            if mode == "sale":
                assert "for sale" in body_text or "buy" in body_text, (
                    f"[sale] page copy missing sale affordance"
                )
            else:
                assert "for rent" in body_text or "book" in body_text, (
                    f"[rent] page copy missing rent affordance"
                )

            await page.screenshot(
                path=str(SHOTS / f"deeplink_{label}_{mode}.png")
            )
            print(f"  ✓ {mode}: correct widget mounted, opposite absent")
            await page.close()
        finally:
            await context.close()
            await browser.close()


async def main() -> int:
    async with async_playwright() as pw:
        failures = []
        for case in DUAL_LISTINGS:
            for viewport in VIEWPORTS:
                try:
                    await run_case(pw, case, viewport)
                except Exception as exc:
                    failures.append((case["label"], viewport["name"], repr(exc)))
        print("\n" + "=" * 60)
        if failures:
            print(f"FAILED {len(failures)} case(s):")
            for label, vp, err in failures:
                print(f"  - {label}/{vp}: {err}")
            return 1
        total = len(DUAL_LISTINGS) * len(VIEWPORTS) * 2
        print(f"PASSED all {total} deep-link widget-state assertions.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
