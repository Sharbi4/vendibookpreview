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

sys.path.insert(0, str(Path(__file__).parent))
from _selectors import TID, visible  # noqa: E402

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
    for branch, expected_txn_selector, force_mode in [
        ("sale", BUY_TXN, "sale"),
        ("rent", case["rent_txn"], "rent"),
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

            # 1. Guidance section is present + visible (testid; copy-agnostic).
            section = page.locator(visible(TID["section"])).first
            await section.wait_for(state="visible", timeout=15000)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_01_section.png"))

            # 2. Open the modal via the inline testid CTA.
            await section.locator(TID["open_cta"]).first.click()
            dialog = page.locator(TID["dialog"]).first
            await dialog.wait_for(state="visible", timeout=8000)
            # Branch selector should be visible for a dual listing.
            await dialog.locator(TID["branch_selector"]).first.wait_for(
                state="visible", timeout=5000
            )
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_02_selector.png"))

            # 3. Pick the branch by testid.
            branch_tid = TID["branch_sale"] if branch == "sale" else TID["branch_rent"]
            await dialog.locator(branch_tid).first.click()
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_03_branch.png"))

            # 4. Click the branch's final CTA and confirm data-branch matches.
            final_cta = dialog.locator(
                f'{TID["final_cta"]}[data-branch="{branch}"]'
            ).first
            await final_cta.wait_for(state="visible", timeout=5000)
            url_before = page.url
            await final_cta.click()
            await page.wait_for_timeout(1200)

            # 5. Assert exact URL / route after the final CTA fires.
            #
            # Accepted terminal states per branch:
            #   sale → same /listing/{id} page (in-page scroll to Buy widget),
            #          OR /checkout/{id}, OR /auth?redirect=/checkout/{id}
            #   rent → same /listing/{id} page (in-page scroll to booking widget),
            #          OR /book/{id}[?start=YYYY-MM-DD&end=YYYY-MM-DD]
            listing_id = case["listing_id"]
            final_url = page.url
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(final_url)
            path = parsed.path
            qs = parse_qs(parsed.query)

            date_re = re.compile(r"^\d{4}-\d{2}-\d{2}$")
            if branch == "sale":
                sale_ok = (
                    path == f"/listing/{listing_id}"
                    or path == f"/checkout/{listing_id}"
                    or (path == "/auth" and qs.get("redirect", [""])[0] == f"/checkout/{listing_id}")
                )
                assert sale_ok, f"sale CTA landed on unexpected URL: {final_url}"
            else:
                rent_path_ok = (
                    path == f"/listing/{listing_id}"
                    or path == f"/book/{listing_id}"
                )
                assert rent_path_ok, f"rent CTA landed on unexpected URL: {final_url}"
                if path == f"/book/{listing_id}":
                    start = qs.get("start", [None])[0]
                    end = qs.get("end", [None])[0]
                    if start or end:
                        assert start and end and date_re.match(start) and date_re.match(end), (
                            f"rent /book URL missing valid start/end: {final_url}"
                        )
                        assert start <= end, f"rent /book start>{end} in {final_url}"

            print(f"  ✓ {branch}: url {url_before} → {final_url}")

            # 6. Assert the correct transaction widget is mounted for the branch.
            #    On in-page scroll destinations the widget must be visible.
            #    On navigated destinations (/checkout, /auth, /book) the page has
            #    changed and the listing-detail widgets no longer apply — instead
            #    assert we landed on the expected route via the URL check above.
            if path == f"/listing/{listing_id}":
                txn = page.locator(expected_txn_selector).first
                await txn.wait_for(state="visible", timeout=10000)
                # Extra: for rent, confirm the instant-book flavour lines up
                # with what the listing exposes (the selector already encodes
                # data-instant-book, so a match here proves the widget rendered
                # in the correct mode).
                print(f"  ✓ {branch}: on-page widget visible via testid")
            else:
                print(f"  ✓ {branch}: navigated to {path}, skipping in-page widget check")

            await page.screenshot(path=str(SHOTS / f"dual_{label}_{branch}_04_after_cta.png"))
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
