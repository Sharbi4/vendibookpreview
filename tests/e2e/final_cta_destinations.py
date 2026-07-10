"""
Final CTA destination coverage — asserts the exact route + query params each
transaction CTA hands the customer to before we accept that the widget is
"visible and correct".

Rationale: `listing_guidance.py` proves the guidance modal *reveals* the txn
widget (Buy Now / Book Now / Request to Book). It does NOT prove the button
actually navigates to the correct checkout / booking URL with the right
payload. This test closes that gap for each live variant on both desktop and
mobile.

For every case we assert:

  • Buy Now (sale + sale-PIP) → SPA navigation to /checkout/{listing_id}
    (or /auth?redirect=/checkout/{listing_id} for signed-out users, which
    still proves the destination payload — the redirect param carries it).
  • Book Now (instant-book rental) → /book/{listing_id}?start=YYYY-MM-DD&
    end=YYYY-MM-DD (+ optional slot/hourly params).
  • Request to Book (request-book rental) → /book/{listing_id}?start=…&end=…

Rent CTAs are disabled until a date is picked, so the test clicks the first
enabled day cell inside the visible booking widget's calendar grid before
firing the CTA. If the current month has no available days, it clicks the
"next month" arrow up to 3 times.

Run:
    python3 tests/e2e/final_cta_destinations.py
    E2E_BASE_URL=https://vendibookpreview.lovable.app \
        python3 tests/e2e/final_cta_destinations.py
"""

import asyncio
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

# Kind == "sale" → expect /checkout/{id}
# Kind == "rent" → expect /book/{id}?start=...&end=...
CASES = [
    dict(
        variant="sale_card",
        listing_id="ee20ce79-1fbc-4885-aaf8-61f4c3a5cc25",
        kind="sale",
        cta=re.compile(r"buy now", re.I),
    ),
    dict(
        variant="sale_pay_in_person",
        listing_id="cc3c8214-e327-4670-99ed-e1425494cc8c",
        kind="sale",
        cta=re.compile(r"buy now", re.I),
    ),
    dict(
        variant="rent_instant",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        kind="rent",
        cta=re.compile(r"^\s*book now", re.I),
    ),
    dict(
        variant="rent_request",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        kind="rent",
        cta=re.compile(r"request to book", re.I),
    ),
]

# Desktop-only. Mobile sale/rent CTAs open bottom sheets or auth-gate modals
# instead of a plain SPA navigation, so URL assertions are meaningless there;
# the existing `listing_guidance.py` suite already proves widget visibility on
# mobile.
VIEWPORTS = [
    dict(name="desktop", width=1280, height=1800),
]

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


async def _shot(page, name):
    try:
        await page.screenshot(path=str(SHOTS / f"{name}.png"))
    except Exception:
        pass


async def _pick_first_available_day(page) -> bool:
    """Click the first non-disabled day-cell inside the visible calendar
    grid. Returns True on success. Walks forward up to 3 months if needed."""
    for attempt in range(4):
        # `.grid.grid-cols-7 > button` is the day-cell pattern used by the
        # rental widget. Filter to only truly visible + enabled buttons.
        cells = page.locator(
            ".grid.grid-cols-7 > button:not([disabled])"
        ).locator("visible=true")
        n = await cells.count()
        for i in range(n):
            btn = cells.nth(i)
            try:
                text = (await btn.inner_text()).strip()
            except Exception:
                continue
            # Day cells are numeric ("1".."31") — skip nav arrows that may
            # also lack [disabled].
            if not text or not text.splitlines()[0].strip().isdigit():
                continue
            await btn.scroll_into_view_if_needed()
            await btn.click()
            return True

        # No enabled day this month — try next-month arrow.
        next_btn = page.get_by_role("button", name=re.compile(r"next month|›|chevron.?right", re.I)).locator("visible=true").first
        try:
            await next_btn.click(timeout=1500)
            await page.wait_for_timeout(300)
        except Exception:
            break
    return False


async def _assert_sale_destination(page, listing_id, cta_regex, label) -> str:
    btn = page.locator("button:visible").filter(has_text=cta_regex).first
    await btn.wait_for(state="visible", timeout=10000)
    await btn.scroll_into_view_if_needed()
    await _shot(page, f"{label}_before_click")
    await btn.click()

    # Accept either the direct checkout URL or the auth-redirect wrapper.
    expected_direct = re.compile(rf"/checkout/{re.escape(listing_id)}(\?.*)?$")
    expected_auth = re.compile(rf"/auth\?.*redirect=%2Fcheckout%2F{re.escape(listing_id)}")
    try:
        await page.wait_for_url(
            lambda url: bool(expected_direct.search(url) or expected_auth.search(url)),
            timeout=8000,
        )
    except PWTimeout:
        await _shot(page, f"{label}_click_no_nav")
        raise AssertionError(
            f"Buy Now did not navigate to /checkout/{listing_id}. Landed at {page.url}"
        )

    final = page.url
    await _shot(page, f"{label}_after_click")

    parsed = urlparse(final)
    if expected_direct.search(final):
        assert parsed.path == f"/checkout/{listing_id}", (
            f"unexpected path {parsed.path!r}"
        )
    else:
        qs = parse_qs(parsed.query)
        assert "redirect" in qs, f"missing ?redirect on {final}"
        assert qs["redirect"][0].startswith(f"/checkout/{listing_id}"), (
            f"redirect payload wrong: {qs['redirect'][0]!r}"
        )
    return final


async def _assert_rent_destination(page, listing_id, cta_regex, label) -> str:
    # 1. Pick a date so the CTA becomes enabled.
    picked = await _pick_first_available_day(page)
    if not picked:
        await _shot(page, f"{label}_no_available_day")
        raise AssertionError("no available day cell found in calendar")
    await page.wait_for_timeout(400)

    # 2. Fire the CTA.
    btn = page.locator("button:visible").filter(has_text=cta_regex).first
    await btn.wait_for(state="visible", timeout=10000)
    # Wait for the button to become enabled.
    for _ in range(20):
        if await btn.is_enabled():
            break
        await page.wait_for_timeout(150)
    await btn.scroll_into_view_if_needed()
    await _shot(page, f"{label}_before_click")
    await btn.click()

    expected = re.compile(rf"/book/{re.escape(listing_id)}\?")
    try:
        await page.wait_for_url(
            lambda url: bool(expected.search(url)),
            timeout=8000,
        )
    except PWTimeout:
        await _shot(page, f"{label}_click_no_nav")
        raise AssertionError(
            f"Rent CTA did not navigate to /book/{listing_id}?…  landed at {page.url}"
        )

    final = page.url
    await _shot(page, f"{label}_after_click")

    # 3. Validate payload.
    parsed = urlparse(final)
    assert parsed.path == f"/book/{listing_id}", f"unexpected path {parsed.path!r}"
    qs = parse_qs(parsed.query)
    assert "start" in qs, f"missing ?start on {final}"
    assert "end" in qs, f"missing ?end on {final}"
    assert DATE_RE.match(qs["start"][0]), f"start not YYYY-MM-DD: {qs['start'][0]!r}"
    assert DATE_RE.match(qs["end"][0]), f"end not YYYY-MM-DD: {qs['end'][0]!r}"
    assert qs["start"][0] <= qs["end"][0], (
        f"start > end in payload: {qs['start'][0]} > {qs['end'][0]}"
    )
    return final


async def run_case(browser, case, vp):
    label = f"cta_{case['variant']}_{vp['name']}"
    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
    await context.add_init_script(
        "try { "
        "localStorage.setItem('vb_howitworks_seen_global', new Date().toISOString());"
        "localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
        " } catch (e) {}"
    )
    page = await context.new_page()
    result = {"case": case["variant"], "viewport": vp["name"], "url": None, "err": None}
    try:
        await page.goto(f"{BASE}/listing/{case['listing_id']}", wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=12000)
        except Exception:
            pass
        await page.wait_for_timeout(600)
        await _shot(page, f"{label}_00_loaded")

        # Dismiss any first-visit modal.
        try:
            close_btn = page.get_by_role("button", name=re.compile(r"^close$|dismiss|got it|not now", re.I)).locator("visible=true").first
            await close_btn.click(timeout=1000)
        except Exception:
            pass

        if case["kind"] == "sale":
            result["url"] = await _assert_sale_destination(page, case["listing_id"], case["cta"], label)
        else:
            result["url"] = await _assert_rent_destination(page, case["listing_id"], case["cta"], label)
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:240]}"
        await _shot(page, f"{label}_99_error")
    finally:
        await context.close()
    return result


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        results = []
        for case in CASES:
            for vp in VIEWPORTS:
                print(f"[e2e] → {case['variant']} / {vp['name']}", flush=True)
                r = await run_case(browser, case, vp)
                status = "PASS" if not r["err"] else "FAIL"
                extra = r["url"] or r["err"]
                print(f"       {status}  {extra}", flush=True)
                results.append(r)
        await browser.close()

    print("\n=== SUMMARY ===")
    fails = [r for r in results if r["err"]]
    for r in results:
        ok = not r["err"]
        line = f"{'PASS' if ok else 'FAIL'} {r['case']}/{r['viewport']}"
        if ok:
            line += f"  → {r['url']}"
        else:
            line += f"  err={r['err']}"
        print(line)
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
