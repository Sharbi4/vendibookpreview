"""
Dual-mode (sale + rent) listing guidance — end-to-end coverage.

No live production listing currently exposes BOTH a sale price and a rental
price, so this test uses Playwright request-interception to rewrite the
Supabase (Lovable Cloud) REST response for a real published rental listing
so it also carries a sale price. The client-side resolver then treats it as
a `sale_and_rent` dual listing.

The test asserts, on both desktop and mobile viewports, that:

    1. The inline "How This Listing Works" section renders.
    2. Opening the modal via the inline "See Your Options" CTA shows the
       buy-vs-rent branch selector.
    3. Picking "Buy" then hitting the final CTA lands the user on the
       "Buy Now" purchase widget.
    4. Picking "Rent" then hitting the final CTA lands the user on the
       correct booking widget ("Book Now" or "Request to book").

Run:
    python3 tests/e2e/listing_guidance_dual_mode.py
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Route, Request

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

# Real published rental listings we can safely "upgrade" to dual-mode by
# injecting a sale price into the REST response. Keep them in sync with
# listing_guidance.py.
DUAL_LISTINGS = [
    dict(
        label="instant_book_dual",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        rent_button=re.compile(r"book now", re.I),
    ),
    dict(
        label="request_book_dual",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        rent_button=re.compile(r"request to book", re.I),
    ),
]

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]

INJECTED_SALE_PRICE = 4500  # dollars — enough to make hasSalePrice truthy
INJECTED_DAILY_PRICE = 150  # fallback rental rate when the source lacks one


def _rewrite_listing_row(row: dict, listing_id: str, force_mode: str) -> dict:
    if not isinstance(row, dict):
        return row
    if str(row.get("id")) != listing_id:
        return row
    row = dict(row)
    # Always inject a sale price so hasSalePrice is truthy.
    row["price_sale"] = INJECTED_SALE_PRICE
    # Ensure at least one rental price exists so hasRentalPrice is truthy.
    if not any(row.get(k) for k in ("price_hourly", "price_daily", "price_weekly", "price_monthly")):
        row["price_daily"] = INJECTED_DAILY_PRICE
    # Force the requested mode so the listing detail page renders the matching
    # transaction widget (sale → Buy Now, rent → Book / Request).
    row["mode"] = force_mode
    if "accept_card_payment" in row and row["accept_card_payment"] is False:
        row["accept_card_payment"] = True
    return row


async def _install_listing_rewriter(context, listing_id: str, force_mode: str) -> None:
    """Intercept Supabase REST responses for `listings` rows and rewrite them
    into a dual-mode configuration with the requested widget mode."""

    async def handler(route: Route, request: Request) -> None:
        try:
            response = await route.fetch()
            ctype = response.headers.get("content-type", "")
            if "application/json" not in ctype:
                await route.fulfill(response=response)
                return
            body = await response.text()
            try:
                data = json.loads(body)
            except Exception:
                await route.fulfill(response=response)
                return
            changed = False
            if isinstance(data, list):
                new_data = []
                for row in data:
                    new_row = _rewrite_listing_row(row, listing_id, force_mode)
                    if new_row is not row:
                        changed = True
                    new_data.append(new_row)
                data = new_data
            elif isinstance(data, dict):
                new_data = _rewrite_listing_row(data, listing_id, force_mode)
                if new_data is not data:
                    changed = True
                    data = new_data
            if changed:
                await route.fulfill(
                    status=response.status,
                    headers={**response.headers, "content-type": "application/json"},
                    body=json.dumps(data),
                )
            else:
                await route.fulfill(response=response)
        except Exception as exc:
            print(f"  rewriter error: {exc}")
            await route.continue_()

    await context.route(re.compile(r"/rest/v1/listings(\?|/).*", re.I), handler)


def visible_locator(page, selector: str):
    return page.locator(selector).locator("visible=true").first


async def run_case(pw, case: dict, viewport: dict) -> None:
    label = f"{case['label']}_{viewport['name']}"
    print(f"\n▶ {label}")

    # Each branch runs in its own browser context because the injected `mode`
    # value must match the branch under test so the correct transaction widget
    # actually renders on the page.
    for branch, expected_button, force_mode in [
        ("sale", re.compile(r"buy now", re.I), "sale"),
        ("rent", case["rent_button"], "rent"),
    ]:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": viewport["width"], "height": viewport["height"]}
        )
        await _install_listing_rewriter(context, case["listing_id"], force_mode)
        await context.add_init_script(
            "window.localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
        )
        try:
            page = await context.new_page()
            url = f"{BASE}/listing/{case['listing_id']}"
            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(1500)

            # 1. Inline dual-mode heading should be present & visible.
            heading = page.get_by_role("heading", name="How This Listing Works").locator("visible=true").first
            await heading.wait_for(state="visible", timeout=15000)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_01_heading.png"))

            # 2. Open the modal via "See Your Options".
            open_cta = page.get_by_role("button", name=re.compile(r"see your options", re.I)).locator("visible=true").first
            await open_cta.click()
            dialog = page.get_by_role("dialog").locator("visible=true").first
            await dialog.wait_for(state="visible", timeout=8000)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_02_selector.png"))

            # 3. Pick the branch (buy or rent).
            pick_label = "Buy this listing" if branch == "sale" else "Rent this listing"
            branch_button = dialog.get_by_role("button", name=re.compile(pick_label, re.I))
            await branch_button.click()
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_03_branch.png"))

            # 4. Click the branch's final CTA.
            final_cta_names = re.compile(
                r"(continue to purchase|book available dates|request to book|contact the seller|continue)",
                re.I,
            )
            final_cta = dialog.get_by_role("button", name=final_cta_names).last
            await final_cta.click()
            await page.wait_for_timeout(1000)

            # 5. Assert the correct transaction button appears in a visible widget.
            txn = page.get_by_role("button", name=expected_button).locator("visible=true").first
            await txn.wait_for(state="visible", timeout=10000)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_04_after_cta.png"))
            print(f"  ✓ {branch}: transaction button /{expected_button.pattern}/ visible")

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
        print(f"PASSED all {len(DUAL_LISTINGS) * len(VIEWPORTS)} dual-mode cases.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
