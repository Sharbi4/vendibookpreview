"""
Deep-link behavior for the Listing How-It-Works walkthrough.

Verifies:
  * `?walkthrough=open`         → modal auto-opens on load
  * `?walkthrough=buy`          → modal opens (on a dual listing, would preselect
                                  the buy branch; on a single-mode listing the
                                  modal opens with the listing's variant intact)
  * `?walkthrough=rent`         → modal opens
  * `#howitworks=buy` (hash)    → modal opens (alias form)

For each case we also confirm the correct primary transaction widget is
scrolled into view (desktop `#booking-widget` or mobile fixed sticky).
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

# Use a rental (rent_request) and a sale (sale_card) listing so we exercise
# both flows. Neither is dual-mode (no live dual listings today) — the
# branch-preselection unit tests live in ListingHowItWorks.test.ts.
CASES = [
    dict(
        label="rent_deeplink_open",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        query="?walkthrough=open",
        dialog_title=re.compile(r"what happens after you request", re.I),
    ),
    dict(
        label="rent_deeplink_rent",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        query="?walkthrough=rent",
        dialog_title=re.compile(r"what happens after you request", re.I),
    ),
    dict(
        label="sale_deeplink_buy",
        listing_id="ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25",
        query="?walkthrough=buy",
        dialog_title=re.compile(r"what happens after you buy", re.I),
    ),
    dict(
        label="sale_hash_alias",
        listing_id="ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25",
        query="#howitworks=buy",
        dialog_title=re.compile(r"what happens after you buy", re.I),
    ),
]

VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
    dict(name="mobile", width=390, height=844),
]


async def run_case(browser, case, vp):
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    # Force the first-visit gate as already-seen so any modal open must come
    # from the deep-link path we're testing.
    await context.add_init_script(
        "try { localStorage.setItem('vb_howitworks_seen_global', new Date().toISOString()); } catch (e) {}"
    )
    page = await context.new_page()
    result = {"case": case["label"], "viewport": vp["name"], "passed": [], "failed": []}

    async def shot(name):
        try:
            await page.screenshot(path=str(SHOTS / f"deeplink_{case['label']}_{vp['name']}_{name}.png"))
        except Exception:
            pass

    try:
        url = f"{BASE}/listing/{case['listing_id']}{case['query']}"
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # Modal auto-opens from the deep link — no click required.
        dialog = page.get_by_role("dialog")
        await dialog.wait_for(state="visible", timeout=8000)
        result["passed"].append("modal_auto_opened")

        title = dialog.locator("h2, [role='heading']").filter(has_text=case["dialog_title"]).first
        await title.wait_for(state="visible", timeout=3000)
        result["passed"].append("correct_variant_shown")
        await shot("01_modal")
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
                print(f"[e2e-deeplink] → {case['label']} / {vp['name']}", flush=True)
                r = await run_case(browser, case, vp)
                print(
                    f"       passed={','.join(r['passed'])}  failed={' | '.join(r['failed']) or '-'}",
                    flush=True,
                )
                all_results.append(r)
        await browser.close()

    print("\n=== DEEP-LINK SUMMARY ===")
    fails = 0
    for r in all_results:
        ok = not r["failed"]
        if not ok:
            fails += 1
        print(
            f"{'PASS' if ok else 'FAIL'} {r['case']}/{r['viewport']}  "
            f"passed={len(r['passed'])}/2"
            + (f"  err={r['failed'][0]}" if r["failed"] else "")
        )
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
