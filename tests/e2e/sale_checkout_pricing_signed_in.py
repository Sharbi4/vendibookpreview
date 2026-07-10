"""
Sale checkout pricing — authenticated E2E.

Asserts, for each sale checkout route, that the transaction-details view
renders exactly what the backend says the customer owes:

  • Item price = listings.price_sale
  • Delivery / freight row appears iff the listing (or fulfillment choice)
    carries a fee — pure pickup shows no delivery row.
  • Total = price_sale + effective delivery fee.
  • NO upfront deposit row is rendered — sales carry no customer deposit
    (12.9% seller commission on card, $0 buyer fee; PIP is fully free).
    A regression that adds a phantom "Security deposit" row on a sale
    checkout is caught here.

Skip contract: requires `LOVABLE_BROWSER_AUTH_STATUS=injected`. Otherwise
the sale route immediately shows a sign-in prompt / auth gate before the
sticky summary is populated, and we can't distinguish rendering from a
gating regression. Skips cleanly, same convention as
`cta_signed_in_destinations.py`.

Ownership caveat: the injected user must not be the host of the listings
under test (self-transacting is blocked). If the harness's injected user
changes, rotate the listing IDs below.

Run:
    python3 tests/e2e/sale_checkout_pricing_signed_in.py
"""

import asyncio
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SUPABASE_URL = "https://nbrehbwfsmedbelzntqs.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30."
    "EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU"
)

CASES = [
    dict(
        label="sale_card",
        listing_id="d93c53cb-f440-4672-ba6c-912c8266cda8",
        payment="card",
    ),
    dict(
        label="sale_pay_in_person",
        listing_id="cc3c8214-e327-4670-99ed-e1425494cc8c",
        payment="cash",
    ),
]


def fmt(n: float) -> str:
    if float(n).is_integer():
        return f"{int(n):,}"
    s = f"{n:,.10f}".rstrip("0").rstrip(".")
    return s


def fetch_listing(listing_id: str) -> dict:
    url = (
        f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
        "&select=id,title,mode,price_sale,delivery_fee,deposit_amount,"
        "accept_card_payment,accept_cash_payment,host_id,status"
    )
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    })
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.loads(r.read())
    if not rows:
        raise RuntimeError(f"listing {listing_id} not found")
    return rows[0]


async def _restore_session(context, page):
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


async def _read_sticky_summary(page) -> str:
    """The sticky summary is the checkout-wide transaction-details panel —
    always visible on desktop from information → delivery → review. It's
    driven by the same priceSale + currentDeliveryFee state as the review
    step, so testing it is equivalent to testing the wizard's price math."""
    total_label = page.get_by_text(re.compile(r"^Total$"), exact=False).first
    await total_label.wait_for(state="visible", timeout=15000)
    panel = total_label.locator(
        "xpath=ancestor::div[.//*[contains(normalize-space(), 'Item price')]][1]"
    )
    await panel.first.wait_for(state="visible", timeout=5000)
    return (await panel.first.inner_text()).strip()


async def run_case(browser, case) -> dict:
    listing = fetch_listing(case["listing_id"])
    price_sale = float(listing["price_sale"] or 0)
    delivery_fee = float(listing.get("delivery_fee") or 0)
    deposit_amount = float(listing.get("deposit_amount") or 0)
    # Sale checkout defaults to "pickup" fulfillment → currentDeliveryFee=0.
    effective_delivery = 0.0
    expected_total = price_sale + effective_delivery

    print(f"\n▶ {case['label']}  listing={case['listing_id']}")
    print(f"  inputs: price_sale=${price_sale} delivery=${delivery_fee} "
          f"deposit=${deposit_amount} payment={case['payment']}")
    print(f"  expected: item=${fmt(price_sale)} total=${fmt(expected_total)} "
          "(no deposit row for sales)")

    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    result = {"case": case["label"], "err": None}
    try:
        page = await ctx.new_page()
        await _restore_session(ctx, page)

        # Ownership guard — self-transacting is blocked, so if the injected
        # user IS the host we can't reach the checkout summary at all.
        injected_uid = await page.evaluate(
            """() => {
              try {
                const keys = Object.keys(localStorage);
                const authKey = keys.find(k => k.endsWith('-auth-token'));
                if (!authKey) return null;
                const s = JSON.parse(localStorage.getItem(authKey));
                return s?.user?.id || null;
              } catch { return null; }
            }"""
        )
        if injected_uid and injected_uid == listing.get("host_id"):
            raise AssertionError(
                f"injected user {injected_uid} owns listing {case['listing_id']} — "
                "self-transacting is blocked; rotate the test listing ID"
            )

        await page.goto(f"{BASE}/checkout/{case['listing_id']}",
                        wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=10000)
        except Exception:
            pass
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(SHOTS / f"{case['label']}_00_loaded.png"))

        # If we still see the "Sign in to complete checkout" gate, auth
        # injection failed — treat as an env issue, not a test failure.
        gate = page.get_by_text("Sign in to complete checkout", exact=False)
        if await gate.count() and await gate.first.is_visible():
            raise AssertionError(
                "sale checkout still shows sign-in gate — auth injection failed"
            )

        text = await _read_sticky_summary(page)
        await page.screenshot(path=str(SHOTS / f"{case['label']}_01_summary.png"))

        # 1. Item price line with backend price_sale.
        assert "Item price" in text, f"missing Item price row:\n{text}"
        assert f"${fmt(price_sale)}" in text, (
            f"summary missing item price ${fmt(price_sale)}:\n{text}"
        )

        # 2. Delivery row only appears when a fee applies. On the default
        # pickup fulfillment there must be none.
        for label in ("Delivery", "Freight"):
            row = [ln for ln in text.splitlines() if label in ln and "$" in ln]
            assert not row, (
                f"unexpected {label} row on default pickup fulfillment: {row}"
            )

        # 3. NO upfront deposit line — sales never carry a customer deposit.
        assert "Security deposit" not in text, (
            f"sale summary rendered a Security deposit row:\n{text}"
        )
        # Guard against a generic "Deposit" label sneaking in too.
        assert not re.search(r"\bDeposit\b", text), (
            f"sale summary contains a Deposit label:\n{text}"
        )

        # 4. Total equals price_sale (pickup, no fees, no deposit).
        assert "Total" in text, f"missing Total row:\n{text}"
        assert f"${fmt(expected_total)}" in text, (
            f"summary Total should be ${fmt(expected_total)}:\n{text}"
        )

        # 5. Route-specific: card listings offer secure payment; PIP
        # listings surface the "arrange in person" pathway. The submit
        # button copy is a stable proxy for the correct backend flow.
        # (Not asserted here — the review step gates behind form entry;
        # covered by final_review_sheet_consent.py.)

        print(f"  ✓ {case['label']} summary matches backend")
    except AssertionError as e:
        result["err"] = f"AssertionError: {str(e).splitlines()[0][:280]}"
        try:
            await page.screenshot(path=str(SHOTS / f"{case['label']}_99_error.png"))
        except Exception:
            pass
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:280]}"
    finally:
        await ctx.close()
    return result


async def main() -> int:
    if os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "") != "injected":
        print(
            "[e2e] SKIP — signed-in sale pricing suite requires an injected "
            "Supabase session (LOVABLE_BROWSER_AUTH_STATUS != 'injected'). "
            "Sign in via the Lovable preview and re-run.",
            flush=True,
        )
        return 0
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        results = []
        for case in CASES:
            results.append(await run_case(browser, case))
        await browser.close()
    print("\n" + "=" * 60)
    fails = [r for r in results if r["err"]]
    for r in results:
        print(f"{'PASS' if not r['err'] else 'FAIL'} {r['case']}" +
              (f"  err={r['err']}" if r["err"] else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
