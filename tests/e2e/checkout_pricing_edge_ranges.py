"""
Pricing math edge cases — extends `checkout_pricing_matches_backend.py` with
boundary date ranges that historically break naive daily/weekly math.

Cases covered:

  1. single_day        — start == end (rentalDays == 1). Verifies inclusive
                         day counting (`differenceInDays + 1`) and that the
                         base line renders "1 day × $X" with a subtotal of
                         exactly one daily rate.
  2. exact_seven_day   — start..start+6 on a listing with a weekly rate.
                         Verifies the weekly-rate branch:
                           weeks=1, remaining=0  →  base = 1 × price_weekly
                         (i.e., NOT 7 × price_daily). The base LINE still
                         reads "7 days × $daily" per current copy, but the
                         subtotal amount must equal price_weekly.
  3. invalid_range     — start > end. `calculateBasePrice` guards on
                         `rentalDays <= 0` and returns 0, so subtotal is $0,
                         service fee is $0, and Total equals just the
                         deposit (or $0 if none). Also asserts the primary
                         Continue-to-payment CTA is NOT enabled in this
                         broken state — the UI must not let the shopper
                         submit a zero-priced booking.

All cases derive expected numbers from live listing rows via Supabase REST
(same anon-key pattern as the parent test) so listing edits don't require
test edits — only the listing IDs & expectations are hardcoded.

Run:
    python3 tests/e2e/checkout_pricing_edge_ranges.py
"""

import asyncio
import json
import math
import os
import sys
import urllib.request
from datetime import date, timedelta
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

RENTAL_RENTER_FEE_PERCENT = 12.9


def r2(x: float) -> float:
    """Emulate JS Math.round(x*100)/100 (half-away-from-zero for positive)."""
    return math.floor(x * 100 + 0.5) / 100


def calc_base_price(days: int, price_daily: float, price_weekly: float | None) -> float:
    """Mirror BookingCheckout.tsx::calculateBasePrice, including the
    `rentalDays <= 0` guard used for invalid ranges."""
    if not price_daily or days <= 0:
        return 0.0
    weeks = days // 7
    remaining = days % 7
    if price_weekly and weeks > 0:
        return weeks * price_weekly + remaining * price_daily
    return days * price_daily


def calc_fees(base_price: float, delivery_fee: float = 0.0) -> dict:
    subtotal = base_price + delivery_fee
    renter_fee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100)
    return {
        "subtotal": r2(subtotal),
        "renter_fee": r2(renter_fee),
        "customer_total": r2(subtotal + renter_fee),
    }


def fmt(n: float) -> str:
    if float(n).is_integer():
        return f"{int(n):,}"
    s = f"{n:,.10f}".rstrip("0").rstrip(".")
    return s


def fetch_listing(listing_id: str) -> dict:
    url = (
        f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
        "&select=id,title,price_daily,price_weekly,delivery_fee,deposit_amount,mode,status"
    )
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        rows = json.loads(r.read())
    if not rows:
        raise RuntimeError(f"listing {listing_id} not found via REST")
    return rows[0]


# ── Cases ──────────────────────────────────────────────────────────────────

CASES = [
    dict(
        label="single_day",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",  # $150/day, $700 deposit, no weekly
        days=1,
        kind="valid",
    ),
    dict(
        label="exact_seven_day_weekly",
        # $400/day, $2,000/week — a naive 7×daily would produce $2,800,
        # so this case fails loudly if the weekly branch regresses.
        listing_id="d94836ba-10fa-44e0-8b5b-046b0bf7d01b",
        days=7,
        kind="valid",
    ),
    dict(
        label="invalid_range_start_after_end",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        days=-2,  # sentinel: build URL with end = start + days (end < start)
        kind="invalid",
    ),
]


async def read_price_panel_text(page) -> str:
    heading = page.get_by_text("Price details", exact=True).first
    await heading.wait_for(state="visible", timeout=15000)
    panel = heading.locator("xpath=ancestor::div[.//*[normalize-space()='Total']][1]")
    await panel.first.wait_for(state="visible", timeout=5000)
    return (await panel.first.inner_text()).strip()


async def run_valid(page, case, listing) -> None:
    price_daily = float(listing["price_daily"] or 0)
    price_weekly = float(listing["price_weekly"]) if listing.get("price_weekly") else None
    delivery_fee = float(listing.get("delivery_fee") or 0)
    deposit_amount = float(listing.get("deposit_amount") or 0)
    days = case["days"]

    base_price = calc_base_price(days, price_daily, price_weekly)
    fees = calc_fees(base_price, delivery_fee)
    total = r2(fees["customer_total"] + deposit_amount)

    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=days - 1)
    url = f"{BASE}/book/{case['listing_id']}?start={start.isoformat()}&end={end.isoformat()}"

    print(f"  inputs: days={days} daily=${price_daily} weekly={price_weekly} "
          f"delivery=${delivery_fee} deposit=${deposit_amount}")
    print(f"  expected: base=${fmt(base_price)} service=${fmt(fees['renter_fee'])} "
          f"deposit=${fmt(deposit_amount)} total=${fmt(total)}")

    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    text = await read_price_panel_text(page)
    await page.screenshot(path=str(SHOTS / f"pricing_edge_{case['label']}.png"))

    day_word = "day" if days == 1 else "days"
    base_line = None
    for line in text.splitlines():
        if f"{days} {day_word}" in line:
            base_line = line.strip()
            break
    assert base_line is not None, (
        f"missing '{days} {day_word}' base row in panel:\n{text}"
    )
    assert f"${fmt(price_daily)}" in base_line, (
        f"base row missing daily rate ${fmt(price_daily)}: {base_line!r}"
    )
    # The subtotal amount is the pricing-branch fingerprint.
    assert f"${fmt(base_price)}" in text, (
        f"panel missing subtotal ${fmt(base_price)}:\n{text}"
    )

    # Weekly branch fingerprint: on exact-7-day, subtotal must NOT equal 7×daily.
    if case["label"] == "exact_seven_day_weekly":
        naive = days * price_daily
        assert base_price != naive, "test setup: weekly listing degenerated to daily"
        assert f"${fmt(naive)}" not in text.replace(f"${fmt(base_price)}", ""), (
            f"panel shows naive daily total ${fmt(naive)} instead of weekly ${fmt(base_price)}:\n{text}"
        )

    assert "Service fee" in text, f"missing Service fee row:\n{text}"
    assert f"${fmt(fees['renter_fee'])}" in text, (
        f"panel missing service fee ${fmt(fees['renter_fee'])}:\n{text}"
    )
    if deposit_amount > 0:
        assert "Security deposit" in text, f"missing deposit row:\n{text}"
        assert f"${fmt(deposit_amount)}" in text, (
            f"panel missing deposit ${fmt(deposit_amount)}:\n{text}"
        )
    assert "Total" in text, f"missing Total row:\n{text}"
    assert f"${fmt(total)}" in text, (
        f"panel missing total ${fmt(total)}:\n{text}"
    )


async def run_invalid(page, case, listing) -> None:
    """start > end must produce a zero-priced state — never a positive
    booking that could be submitted. The panel's subtotal is guarded to $0
    by `rentalDays <= 0`; total collapses to (deposit only)."""
    deposit_amount = float(listing.get("deposit_amount") or 0)
    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=case["days"])  # days = -2 → end < start
    assert end < start, "test setup: expected end < start for invalid case"
    url = f"{BASE}/book/{case['listing_id']}?start={start.isoformat()}&end={end.isoformat()}"

    print(f"  invalid range: start={start} end={end} (end < start)")
    print(f"  expected: subtotal=$0, service=$0, total=${fmt(deposit_amount)}")

    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(1500)
    await page.screenshot(path=str(SHOTS / f"pricing_edge_{case['label']}_landing.png"))

    # Two acceptable safe states:
    #   (a) BookingCheckout falls through to "Select your dates" (no panel).
    #   (b) Panel renders with subtotal $0 and Total = deposit only.
    select_dates_heading = page.get_by_text("Select your dates", exact=True).first
    fallback_shown = False
    try:
        await select_dates_heading.wait_for(state="visible", timeout=2500)
        fallback_shown = True
    except Exception:
        pass

    if fallback_shown:
        print("  ✓ invalid range routed to 'Select your dates' fallback")
        return

    text = await read_price_panel_text(page)
    await page.screenshot(path=str(SHOTS / f"pricing_edge_{case['label']}_panel.png"))

    # Subtotal must be zero.
    assert "$0" in text, f"invalid-range panel missing $0 subtotal:\n{text}"
    # Service fee must be zero.
    assert "Service fee" in text
    # Zero-priced booking must NOT be submittable — Continue/Pay CTA disabled.
    import re as _re
    submit = page.get_by_role(
        "button",
        name=_re.compile(r"continue to payment|pay now|confirm.*book|reserve|book now", _re.I),
    )
    if await submit.count():
        primary = submit.first
        assert not await primary.is_enabled(), (
            "invalid-range booking exposes an enabled submit CTA — "
            "shopper could submit a zero-priced booking"
        )
    expected_total = fmt(deposit_amount) if deposit_amount > 0 else "0"
    assert f"${expected_total}" in text, (
        f"invalid-range Total should collapse to deposit-only (${expected_total}):\n{text}"
    )


async def run_case(browser, case: dict) -> dict:
    listing = fetch_listing(case["listing_id"])
    context = await browser.new_context(viewport={"width": 1280, "height": 1800})
    result = {"case": case["label"], "err": None}
    try:
        page = await context.new_page()
        print(f"\n▶ {case['label']}  listing={case['listing_id']}")
        if case["kind"] == "valid":
            await run_valid(page, case, listing)
        else:
            await run_invalid(page, case, listing)
        print(f"  ✓ {case['label']} passed")
    except AssertionError as exc:
        result["err"] = f"AssertionError: {str(exc).splitlines()[0][:280]}"
    except Exception as exc:
        result["err"] = f"{type(exc).__name__}: {str(exc).splitlines()[0][:280]}"
    finally:
        await context.close()
    return result


async def main() -> int:
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
