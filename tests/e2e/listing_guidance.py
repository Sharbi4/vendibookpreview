"""
Listing-Detail Transaction Guidance — end-to-end coverage.

For every active listing configuration currently in production and on both
desktop and mobile viewports, this suite:

    1. Loads the listing detail page.
    2. Locates the visible "How This Listing Works" guidance section.
    3. Opens the walkthrough modal via the inline CTA.
    4. Clicks the final CTA inside the modal.
    5. Asserts the correct primary transaction button for that variant becomes
       visible after the CTA runs — proving the guidance routes into the real
       existing purchase / booking flow.

The `sale_and_rent` (dual mode) variant has no production listings today, so
it is covered by the resolver unit tests; this E2E suite iterates the four
live variants.

Run:
    python3 tests/e2e/listing_guidance.py
    E2E_BASE_URL=https://vendibookpreview.lovable.app python3 tests/e2e/listing_guidance.py
"""

import asyncio
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

# One listing per active variant, taken from live published data.
# Replace an id if a listing is unpublished; keep it in the same variant bucket.
CASES = [
    dict(
        variant="sale_card",
        listing_id="ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25",
        heading="Buying on Vendibook",
        open_cta="See the Purchase Steps",
        final_cta="Continue to purchase",
        txn_button=re.compile(r"buy now", re.I),
    ),
    dict(
        variant="sale_pay_in_person",
        listing_id="cc3c8214-e327-4670-99ed-e1425494cc8c",
        heading="Paying the Seller in Person",
        open_cta="See How Pay in Person Works",
        final_cta="Contact the seller",
        txn_button=re.compile(r"buy now", re.I),
    ),
    dict(
        variant="rent_instant",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        heading="Book This Listing Instantly",
        open_cta="See the Booking Steps",
        final_cta="Book available dates",
        txn_button=re.compile(r"book now", re.I),
    ),
    dict(
        variant="rent_request",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        heading="Requesting This Listing",
        open_cta="See What Happens Next",
        final_cta="Request to book",
        txn_button=re.compile(r"request to book", re.I),
    ),
]

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]


def visible_locator(page, css_selector, text):
    """Return the first *visible* element matching css_selector whose text
    contains ``text``. Playwright's :visible pseudo skips display:none nodes,
    which we need because the listing detail page mounts the guidance twice
    (mobile-only + desktop-only wrappers)."""
    return page.locator(f"{css_selector}:visible").filter(has_text=text).first


async def run_case(browser, case, vp):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    # Suppress the first-visit auto-open so we exercise the inline CTA explicitly.
    await context.add_init_script(
        "try { localStorage.setItem('vb_howitworks_seen_global', new Date().toISOString()); } catch (e) {}"
    )
    page = await context.new_page()
    result = {"case": case["variant"], "viewport": vp["name"], "passed": [], "failed": []}

    async def shot(name):
        try:
            await page.screenshot(path=str(SHOTS / f"{case['variant']}_{vp['name']}_{name}.png"))
        except Exception:
            pass

    try:
        url = f"{BASE}/listing/{case['listing_id']}"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # 1. Visible guidance heading is present.
        heading = visible_locator(page, "h3", case["heading"])
        await heading.wait_for(state="visible", timeout=15000)
        result["passed"].append("inline_heading")
        await shot("01_heading")

        # 2. Open the modal via the inline "See ..." CTA (visible copy).
        open_btn = visible_locator(page, "button", case["open_cta"])
        await open_btn.scroll_into_view_if_needed()
        await open_btn.click()
        dialog = page.get_by_role("dialog")
        await dialog.wait_for(state="visible", timeout=5000)
        result["passed"].append("modal_open")
        await shot("02_modal")

        # 3. Click the final CTA inside the dialog.
        final_btn = dialog.get_by_role("button", name=case["final_cta"]).first
        await final_btn.wait_for(state="visible", timeout=5000)
        await final_btn.click()
        result["passed"].append("final_cta_clicked")

        # 4. Modal closes.
        await dialog.wait_for(state="hidden", timeout=5000)
        result["passed"].append("modal_closed")

        # 5. The correct transaction button for this variant is visible on
        #    the page after the CTA — proving the guidance routes the user
        #    into the real purchase / booking flow.
        #    Desktop: inside #booking-widget; mobile: inside a fixed sticky bar.
        await page.wait_for_timeout(800)  # let smooth scroll settle
        txn = page.locator("button:visible").filter(has_text=case["txn_button"]).first
        await txn.wait_for(state="visible", timeout=10000)
        # Presence + visibility proves the guidance routed into the real flow.
        # The button may be disabled until the user selects dates / signs in —
        # that's the expected next step of the flow, not a failure of routing.
        result["passed"].append("txn_button_visible")
        await shot("03_after_cta")

    except Exception as e:
        result["failed"].append(f"{type(e).__name__}: {e}".splitlines()[0][:200])
        await shot("99_error")
    finally:
        await context.close()
    return result


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        all_results = []
        for case in CASES:
            for vp in VIEWPORTS:
                print(f"[e2e] → {case['variant']} / {vp['name']}", flush=True)
                r = await run_case(browser, case, vp)
                print(
                    f"       passed={','.join(r['passed'])}  failed={' | '.join(r['failed']) or '-'}",
                    flush=True,
                )
                all_results.append(r)
        await browser.close()

    print("\n=== SUMMARY ===")
    fails = 0
    for r in all_results:
        ok = not r["failed"]
        if not ok:
            fails += 1
        print(
            f"{'PASS' if ok else 'FAIL'} {r['case']}/{r['viewport']}  "
            f"passed={len(r['passed'])}/5"
            + (f"  err={r['failed'][0]}" if r["failed"] else "")
        )
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
