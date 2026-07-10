"""
Dual-mode listing guidance — shareable deep-link end-to-end coverage.

Flow verified per (listing, viewport):

    1. Open the listing page fresh (no deep link).
    2. Click the inline "See Your Options" CTA on the "How This Listing Works"
       card so the modal renders and the branch selector is visible.
    3. For each shareable deep-link URL that the walkthrough supports
       (?walkthrough=buy and ?walkthrough=rent, plus the #howitworks= hash
       alias), open that URL in a fresh browser context and assert:
         a. The modal auto-opens with the correct branch preselected.
         b. Hitting the branch's final CTA lands on the correct
            transaction widget (Buy Now for sale, Book Now / Request to
            book for rent).

Because no live published listing currently ships with BOTH a sale price
and a rental price, we reuse the same Supabase REST rewriter as
`listing_guidance_dual_mode.py` to synthesize the dual-mode row on the fly.

Run:
    python3 tests/e2e/listing_guidance_dual_mode_deeplink.py
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Route, Request

sys.path.insert(0, str(Path(__file__).parent))
from _selectors import TID, visible  # noqa: E402

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

DUAL_LISTINGS = [
    dict(
        label="instant_book_dual",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        rent_txn=f'{visible(TID["rental_cta"])}[data-instant-book="true"],'
                 f'{visible(TID["rent_cta_widget"])}[data-instant-book="true"],'
                 f'{visible(TID["sticky_mobile_rent"])}[data-instant-book="true"]',
    ),
    dict(
        label="request_book_dual",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        rent_txn=f'{visible(TID["rental_cta"])}[data-instant-book="false"],'
                 f'{visible(TID["rent_cta_widget"])}[data-instant-book="false"],'
                 f'{visible(TID["sticky_mobile_rent"])}[data-instant-book="false"]',
    ),
]

BUY_TXN = ",".join(
    visible(TID[k]) for k in (
        "buy_now_widget", "sale_sticky_buy", "sale_mobile_buy", "sticky_mobile_buy",
    )
)

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]

INJECTED_SALE_PRICE = 4500
INJECTED_DAILY_PRICE = 150


def _rewrite_listing_row(row: dict, listing_id: str, force_mode: str) -> dict:
    if not isinstance(row, dict) or str(row.get("id")) != listing_id:
        return row
    row = dict(row)
    row["price_sale"] = INJECTED_SALE_PRICE
    if not any(row.get(k) for k in ("price_hourly", "price_daily", "price_weekly", "price_monthly")):
        row["price_daily"] = INJECTED_DAILY_PRICE
    row["mode"] = force_mode
    if row.get("accept_card_payment") is False:
        row["accept_card_payment"] = True
    return row


async def _install_listing_rewriter(context, listing_id: str, force_mode: str) -> None:
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


async def _new_context(pw, viewport, listing_id, force_mode):
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        viewport={"width": viewport["width"], "height": viewport["height"]}
    )
    await _install_listing_rewriter(context, listing_id, force_mode)
    await context.add_init_script(
        "window.localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
    )
    return browser, context


async def verify_inline_cta_opens_modal(pw, case, viewport):
    """Step 1 — from the listing page, the inline CTA opens the modal."""
    label = f"{case['label']}_{viewport['name']}"
    browser, context = await _new_context(pw, viewport, case["listing_id"], "rent")
    try:
        page = await context.new_page()
        await page.goto(f"{BASE}/listing/{case['listing_id']}", wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        section = page.locator(visible(TID["section"])).first
        await section.wait_for(state="visible", timeout=15000)

        await section.locator(TID["open_cta"]).first.click()
        dialog = page.locator(TID["dialog"]).first
        await dialog.wait_for(state="visible", timeout=8000)
        await page.screenshot(path=str(SHOTS / f"dl_dual_{label}_00_inline_modal.png"))
        # Branch selector should be rendered for a dual listing.
        await dialog.locator(TID["branch_selector"]).first.wait_for(
            state="visible", timeout=5000
        )
        await dialog.locator(TID["branch_sale"]).first.wait_for(state="visible", timeout=3000)
        await dialog.locator(TID["branch_rent"]).first.wait_for(state="visible", timeout=3000)
        print(f"  ✓ inline CTA opened modal with branch selector")
    finally:
        await context.close()
        await browser.close()


async def follow_deeplink(pw, case, viewport, deeplink_suffix, branch, expected_txn_selector):
    """Open a fresh context at the shareable deep-link URL and drive the flow."""
    label = f"{case['label']}_{viewport['name']}_{branch}_{deeplink_suffix.replace('?', '').replace('=', '').replace('#', 'h')}"
    force_mode = "sale" if branch == "sale" else "rent"
    browser, context = await _new_context(pw, viewport, case["listing_id"], force_mode)
    try:
        page = await context.new_page()
        url = f"{BASE}/listing/{case['listing_id']}{deeplink_suffix}"
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1800)

        # Modal must auto-open thanks to the deep link.
        dialog = page.locator(TID["dialog"]).first
        await dialog.wait_for(state="visible", timeout=10000)
        await page.screenshot(path=str(SHOTS / f"dl_{label}_01_auto_open.png"))

        # Deep link should have preselected the branch — the selector must be
        # gone. Assert by absence of the testid.
        selector_visible = await dialog.locator(TID["branch_selector"]).count()
        assert selector_visible == 0, "deep link did not preselect the branch (selector still visible)"

        # Click the branch's final CTA (data-branch must match).
        final_cta = dialog.locator(
            f'{TID["final_cta"]}[data-branch="{branch}"]'
        ).first
        await final_cta.wait_for(state="visible", timeout=5000)
        await final_cta.click()
        await page.wait_for_timeout(1000)

        txn = page.locator(expected_txn_selector).first
        await txn.wait_for(state="visible", timeout=10000)
        await page.screenshot(path=str(SHOTS / f"dl_{label}_02_after_cta.png"))
        print(f"  ✓ deeplink {deeplink_suffix!r} → {branch} → txn control visible")
    finally:
        await context.close()
        await browser.close()


async def run_case(pw, case, viewport):
    print(f"\n▶ {case['label']}/{viewport['name']}")
    await verify_inline_cta_opens_modal(pw, case, viewport)

    for suffix, branch, expected in [
        ("?walkthrough=buy", "sale", BUY_TXN),
        ("?walkthrough=sale", "sale", BUY_TXN),
        ("?walkthrough=rent", "rent", case["rent_txn"]),
        ("#howitworks=buy", "sale", BUY_TXN),
        ("#howitworks=rent", "rent", case["rent_txn"]),
    ]:
        await follow_deeplink(pw, case, viewport, suffix, branch, expected)


async def main() -> int:
    async with async_playwright() as pw:
        failures = []
        total = 0
        for case in DUAL_LISTINGS:
            for viewport in VIEWPORTS:
                total += 1
                try:
                    await run_case(pw, case, viewport)
                except Exception as exc:
                    failures.append((case["label"], viewport["name"], repr(exc)))
        print("\n" + "=" * 60)
        if failures:
            print(f"FAILED {len(failures)}/{total} case(s):")
            for label, vp, err in failures:
                print(f"  - {label}/{vp}: {err}")
            return 1
        print(f"PASSED all {total} deep-link cases.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
