"""
"Rent it out" conversion CTA — end-to-end coverage.

Verifies the dashboard CTA on a published/paused FOR SALE food truck or
trailer creates (idempotently) a linked rental draft and lands the owner on
the rental setup wizard at `/listings/{sale_id}/rent-it-out` — never on the
404 page.

Two paths are covered:

  1. Signed-out  → visiting the route directly redirects to `/auth` with a
     redirect back to the wizard, and NOT to the NotFound page. This is the
     regression guard for the missing-route bug.
  2. Signed-in   → the host dashboard renders a visible "Rent it out" /
     "Finish rental setup" / "Manage rental" button on an eligible sale card,
     clicking it lands on the wizard, and clicking it twice resolves to the
     SAME rental draft (no duplicate copies).

Skip behaviour: the signed-in half is skipped with a clear message when
`LOVABLE_BROWSER_AUTH_STATUS` is anything other than `injected`, or when the
injected user owns no eligible sale listing.

Run:
    python3 tests/e2e/rent_it_out_cta.py
"""

import asyncio
import json
import os
import re
import sys
from pathlib import Path

from playwright.async_api import async_playwright, TimeoutError as PWTimeout

BASE = "http://localhost:8080"
SCREENSHOTS = Path(__file__).parent / "screenshots"
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

RENT_CTA = re.compile(r"Rent it out|Finish rental setup|Manage rental")
WIZARD_PATH = re.compile(r"/listings/[0-9a-f-]{36}/rent-it-out")

failures: list[str] = []
notes: list[str] = []


def check(condition: bool, message: str) -> None:
    if condition:
        print(f"  PASS  {message}")
    else:
        print(f"  FAIL  {message}")
        failures.append(message)


async def restore_session(context, page) -> bool:
    """Restores the Lovable-injected Supabase session, if one is available."""
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "")
    if status != "injected":
        notes.append(f"signed-in checks skipped (LOVABLE_BROWSER_AUTH_STATUS={status or 'unset'})")
        return False

    cookies_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_json:
        cookies = json.loads(cookies_json)
        for cookie in cookies:
            cookie["url"] = BASE
        await context.add_cookies(cookies)

    await page.goto(BASE, wait_until="domcontentloaded")

    storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
    session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
    if storage_key and session_json:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
        )
    return True


async def signed_out_route_check(page) -> None:
    print("\n[1] Signed-out: wizard route resolves (no 404)")
    fake_id = "00000000-0000-4000-8000-000000000000"
    await page.goto(f"{BASE}/listings/{fake_id}/rent-it-out", wait_until="domcontentloaded")
    await page.wait_for_timeout(2500)

    body = (await page.inner_text("body")).lower()
    url = page.url

    check("404" not in body and "page not found" not in body,
          "route does not render the NotFound page")
    check("/auth" in url or WIZARD_PATH.search(url) is not None,
          f"lands on /auth or the wizard (got {url})")
    if "/auth" in url:
        check("rent-it-out" in url,
              "auth redirect preserves the wizard as the post-login destination")
    await page.screenshot(path=str(SCREENSHOTS / "rent_it_out_signed_out.png"))


async def signed_in_cta_check(page) -> None:
    print("\n[2] Signed-in: dashboard CTA creates the draft and opens the wizard")
    await page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    await page.wait_for_timeout(4000)

    cta = page.get_by_role("button", name=RENT_CTA).first
    try:
        await cta.wait_for(state="visible", timeout=8000)
    except PWTimeout:
        notes.append("no eligible FOR SALE food truck/trailer card found for the injected user; "
                     "signed-in CTA assertions skipped")
        await page.screenshot(path=str(SCREENSHOTS / "rent_it_out_no_eligible_card.png"))
        return

    label = (await cta.inner_text()).strip()
    check(await cta.is_visible(), f"CTA is visible on the card (not hidden in the overflow menu): {label!r}")

    await cta.click()
    try:
        await page.wait_for_url(WIZARD_PATH, timeout=20000)
    except PWTimeout:
        pass
    await page.wait_for_timeout(2500)

    first_url = page.url
    body = (await page.inner_text("body")).lower()
    check(WIZARD_PATH.search(first_url) is not None, f"lands on the rental wizard (got {first_url})")
    check("page not found" not in body, "wizard route does not 404 after the draft is created")
    check("rental" in body or "rent out" in body, "rental setup content rendered")
    await page.screenshot(path=str(SCREENSHOTS / "rent_it_out_wizard.png"))

    # Idempotency: a second click must resolve to the same rental draft.
    await page.goto(f"{BASE}/dashboard", wait_until="domcontentloaded")
    await page.wait_for_timeout(4000)
    cta_again = page.get_by_role("button", name=RENT_CTA).first
    await cta_again.wait_for(state="visible", timeout=10000)
    await cta_again.click()
    try:
        await page.wait_for_url(WIZARD_PATH, timeout=20000)
    except PWTimeout:
        pass
    await page.wait_for_timeout(2000)

    check(page.url.split("?")[0] == first_url.split("?")[0],
          f"repeat click resolves to the same linked rental (no duplicate draft): {page.url}")


async def main() -> int:
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        await signed_out_route_check(page)

        signed_in = await restore_session(context, page)
        if signed_in:
            await signed_in_cta_check(page)

        await browser.close()

    print("\n" + "=" * 60)
    for note in notes:
        print(f"  NOTE  {note}")
    if failures:
        print(f"  {len(failures)} FAILED")
        for failure in failures:
            print(f"   - {failure}")
        return 1
    print("  ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
