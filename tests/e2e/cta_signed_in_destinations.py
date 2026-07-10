"""
Signed-in CTA destination coverage — mirrors `final_cta_destinations.py` /
`cta_prerequisite_gating.py` but with a live Lovable-injected Supabase
session restored into the browser context.

For each variant we assert the *authenticated* click bypasses `/auth`
entirely and lands on the exact checkout / booking URL:

  • Sale Buy Now  → /checkout/{listing_id}
  • Rent instant  → /book/{listing_id}?start=YYYY-MM-DD&end=YYYY-MM-DD
  • Rent request  → /book/{listing_id}?start=YYYY-MM-DD&end=YYYY-MM-DD

The payload rules match the signed-out prereq test: for rentals we pick a
specific calendar day and confirm `?start=` reflects THAT pick, proving the
calendar remains the prereq driver even after auth.

Skip behaviour: when `LOVABLE_BROWSER_AUTH_STATUS` is anything other than
`injected` we skip the run with a clear message — mirrors the pattern used
by `final_review_sheet_consent.py` and `cash_sale_terms_snapshot.py`.

Ownership caveat: the injected user MUST NOT own the listings under test
(the marketplace rule forbids self-transacting; sale Buy Now / rent CTAs
render disabled for owners). If the harness rotates the injected user, swap
the listing IDs for ones the new user does not own.

Run:
    python3 tests/e2e/cta_signed_in_destinations.py
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

sys.path.insert(0, str(Path(__file__).parent))
from _selectors import TID, visible, any_buy_now  # noqa: E402

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

CASES = [
    dict(
        variant="sale_card",
        listing_id="d93c53cb-f440-4672-ba6c-912c8266cda8",
        kind="sale",
        cta_selector=any_buy_now(),
    ),
    dict(
        variant="sale_pay_in_person",
        listing_id="cc3c8214-e327-4670-99ed-e1425494cc8c",
        kind="sale",
        cta_selector=any_buy_now(),
    ),
    dict(
        variant="rent_instant",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        kind="rent",
        cta_selector=(
            f'{visible(TID["rental_cta"])}[data-instant-book="true"],'
            f'{visible(TID["rent_cta_widget"])}[data-instant-book="true"]'
        ),
    ),
    dict(
        variant="rent_request",
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        kind="rent",
        cta_selector=(
            f'{visible(TID["rental_cta"])}[data-instant-book="false"],'
            f'{visible(TID["rent_cta_widget"])}[data-instant-book="false"]'
        ),
    ),
]

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


async def _shot(page, name):
    try:
        await page.screenshot(path=str(SHOTS / f"{name}.png"))
    except Exception:
        pass


async def _restore_session(context, page):
    """Inject the Lovable-managed Supabase session into localStorage +
    cookies BEFORE any authenticated navigation. Uses page.evaluate (never
    add_init_script) so tokens stay scoped to localhost."""
    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")

    if cookies_json:
        cookies = json.loads(cookies_json)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)

    await page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem("
            f"{json.dumps(storage_key)}, {json.dumps(session_json)})"
        )


async def _prep_context(browser):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    await ctx.add_init_script(
        "try {"
        "localStorage.setItem('vb_howitworks_seen_global', new Date().toISOString());"
        "localStorage.setItem('vb_walkthrough_seen_v1', new Date().toISOString());"
        "} catch (e) {}"
    )
    return ctx


async def _assert_sale(page, listing_id, cta_selector, label):
    btn = page.locator(cta_selector).first
    await btn.wait_for(state="visible", timeout=10000)
    try:
        await btn.scroll_into_view_if_needed(timeout=3000)
    except Exception:
        pass
    await _shot(page, f"{label}_before_click")

    try:
        await btn.click(timeout=6000)
    except PWTimeout:
        await btn.evaluate("el => el.click()")

    try:
        await page.wait_for_url(
            lambda u: urlparse(u).path == f"/checkout/{listing_id}",
            timeout=8000,
        )
    except PWTimeout:
        await _shot(page, f"{label}_click_no_nav")
        raise AssertionError(
            f"signed-in Buy Now did not reach /checkout/{listing_id} — "
            f"landed at {page.url}"
        )
    await _shot(page, f"{label}_after_click")

    parsed = urlparse(page.url)
    assert parsed.path == f"/checkout/{listing_id}", (
        f"unexpected checkout path {parsed.path!r}"
    )
    assert parsed.path != "/auth" and "redirect=" not in (parsed.query or ""), (
        f"signed-in shopper was still auth-gated: {page.url}"
    )
    return page.url


async def _pick_rent_day(page, label):
    cells = page.locator(visible(TID["calendar_day_enabled"]))
    n = await cells.count()
    assert n, "no enabled calendar days available"
    target_idx = min(2, n - 1)
    target = cells.nth(target_idx)
    picked_key = await target.get_attribute("data-day-key")
    assert picked_key and DATE_RE.match(picked_key), (
        f"calendar cell missing data-day-key ({picked_key!r})"
    )
    await target.scroll_into_view_if_needed()
    # Two-click pattern: overrides the smart-default startDate so the CTA
    # payload is authoritatively the user's pick (see cta_prerequisite_gating).
    await target.click()
    await page.wait_for_timeout(150)
    await target.click()
    await page.wait_for_timeout(400)
    await _shot(page, f"{label}_picked_{picked_key}")
    return picked_key


async def _assert_rent(page, listing_id, cta_selector, label):
    picked = await _pick_rent_day(page, label)

    btn = page.locator(cta_selector).first
    await btn.wait_for(state="visible", timeout=10000)
    for _ in range(30):
        if await btn.is_enabled():
            break
        await page.wait_for_timeout(150)
    assert await btn.is_enabled(), (
        f"rent CTA still disabled after picking {picked}"
    )
    await btn.scroll_into_view_if_needed()
    await _shot(page, f"{label}_before_click")
    await btn.click()

    try:
        await page.wait_for_url(
            lambda u: urlparse(u).path == f"/book/{listing_id}",
            timeout=8000,
        )
    except PWTimeout:
        await _shot(page, f"{label}_click_no_nav")
        raise AssertionError(
            f"signed-in rent CTA did not reach /book/{listing_id} — landed at {page.url}"
        )
    await _shot(page, f"{label}_after_click")

    parsed = urlparse(page.url)
    assert parsed.path == f"/book/{listing_id}", f"unexpected path {parsed.path!r}"
    assert parsed.path != "/auth", (
        f"signed-in shopper was still auth-gated: {page.url}"
    )
    qs = parse_qs(parsed.query)
    assert qs.get("start", [None])[0] == picked, (
        f"CTA start={qs.get('start')} does not match picked {picked}"
    )
    assert qs.get("end", [None])[0] and DATE_RE.match(qs["end"][0]), (
        f"missing/invalid ?end on {page.url}"
    )
    assert qs["start"][0] <= qs["end"][0], (
        f"start > end in payload: {qs['start'][0]} > {qs['end'][0]}"
    )
    return page.url


async def run_case(browser, case):
    label = f"signed_in_{case['variant']}"
    ctx = await _prep_context(browser)
    page = await ctx.new_page()
    result = {"case": case["variant"], "url": None, "err": None}
    try:
        await _restore_session(ctx, page)
        await page.goto(f"{BASE}/listing/{case['listing_id']}",
                        wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=12000)
        except Exception:
            pass
        await page.wait_for_timeout(600)
        await _shot(page, f"{label}_00_loaded")

        # Dismiss stray first-visit modals if present.
        try:
            close_btn = page.get_by_role(
                "button", name=re.compile(r"^close$|dismiss|got it|not now", re.I)
            ).locator("visible=true").first
            await close_btn.click(timeout=1000)
        except Exception:
            pass

        if case["kind"] == "sale":
            result["url"] = await _assert_sale(
                page, case["listing_id"], case["cta_selector"], label
            )
        else:
            result["url"] = await _assert_rent(
                page, case["listing_id"], case["cta_selector"], label
            )
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:240]}"
        await _shot(page, f"{label}_99_error")
    finally:
        await ctx.close()
    return result


async def main():
    auth_status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "")
    if auth_status != "injected":
        print(
            f"[e2e] SKIP — signed-in CTA suite requires an injected Supabase "
            f"session (LOVABLE_BROWSER_AUTH_STATUS={auth_status!r}). Sign in "
            f"through the Lovable preview and re-run.",
            flush=True,
        )
        return

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        results = []
        for case in CASES:
            print(f"[e2e] → signed_in / {case['variant']}", flush=True)
            r = await run_case(browser, case)
            print(f"       {'PASS' if not r['err'] else 'FAIL'}  "
                  f"{r['url'] or r['err']}", flush=True)
            results.append(r)
        await browser.close()

    print("\n=== SUMMARY ===")
    for r in results:
        ok = not r["err"]
        line = f"{'PASS' if ok else 'FAIL'} {r['case']}"
        line += f"  → {r['url']}" if ok else f"  err={r['err']}"
        print(line)
    if any(r["err"] for r in results):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
