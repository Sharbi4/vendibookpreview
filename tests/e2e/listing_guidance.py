"""
Listing-Detail Transaction Guidance — end-to-end coverage.

For every active listing configuration currently in production and on both
desktop and mobile viewports, this suite:

    1. Loads the listing detail page.
    2. Locates the visible "How This Listing Works" guidance section by its
       stable `data-testid` hook (NOT copy).
    3. Opens the walkthrough modal via the inline testid CTA.
    4. Clicks the final CTA inside the modal via its testid hook.
    5. Asserts the correct primary transaction control for that variant
       becomes visible after the CTA runs — again keyed on testids, not on
       user-facing text.

Copy or DOM refactors that keep the same hooks should not break this suite.

Run:
    python3 tests/e2e/listing_guidance.py
    E2E_BASE_URL=https://vendibookpreview.lovable.app python3 tests/e2e/listing_guidance.py
"""

import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

sys.path.insert(0, str(Path(__file__).parent))
from _selectors import TID, visible, any_buy_now, any_rent_cta  # noqa: E402

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

# Live listing per variant. `variant` matches the `data-variant` attribute
# rendered on the guidance section.  `txn_selector` matches the primary txn
# control that should be reachable after the walkthrough's final CTA runs.
CASES = [
    dict(
        variant="sale_card",
        listing_id="d93c53cb-f440-4672-ba6c-912c8266cda8",
        txn_selector=any_buy_now(),
    ),
    dict(
        variant="sale_pay_in_person",
        listing_id="cc3c8214-e327-4670-99ed-e1425494cc8c",
        txn_selector=any_buy_now(),
    ),
    dict(
        variant="rent_instant",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        txn_selector=f'{visible(TID["rental_cta"])}[data-instant-book="true"],'
                     f'{visible(TID["rent_cta_widget"])}[data-instant-book="true"]',
    ),
    dict(
        variant="rent_request",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        txn_selector=f'{visible(TID["rental_cta"])}[data-instant-book="false"],'
                     f'{visible(TID["rent_cta_widget"])}[data-instant-book="false"]',
    ),
]

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]


async def run_case(browser, case, vp):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
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
        await page.goto(f"{BASE}/listing/{case['listing_id']}", wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # 1. Guidance section for the expected variant is present + visible.
        section_sel = f'{visible(TID["section"])}[data-variant="{case["variant"]}"]'
        section = page.locator(section_sel).first
        await section.wait_for(state="visible", timeout=15000)
        # Heading must render inside that section (no text matching needed).
        await section.locator(TID["heading"]).first.wait_for(state="visible", timeout=5000)
        result["passed"].append("inline_section")
        await shot("01_section")

        # 2. Open the modal via the inline testid CTA.
        open_btn = section.locator(TID["open_cta"]).first
        await open_btn.scroll_into_view_if_needed()
        await open_btn.click()
        dialog_sel = f'{TID["dialog"]}[data-variant="{case["variant"]}"]'
        dialog = page.locator(dialog_sel).first
        await dialog.wait_for(state="visible", timeout=5000)
        result["passed"].append("modal_open")
        await shot("02_modal")

        # 3. Click the final CTA inside the dialog by testid.
        final_btn = dialog.locator(TID["final_cta"]).first
        await final_btn.wait_for(state="visible", timeout=5000)
        await final_btn.click()
        result["passed"].append("final_cta_clicked")

        # 4. Modal closes.
        await dialog.wait_for(state="hidden", timeout=5000)
        result["passed"].append("modal_closed")

        # 5. The transaction control for this variant is visible on the page.
        await page.wait_for_timeout(800)  # let smooth scroll settle
        txn = page.locator(case["txn_selector"]).first
        await txn.wait_for(state="visible", timeout=10000)
        result["passed"].append("txn_control_visible")
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
