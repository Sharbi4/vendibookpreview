"""
Verify the checkout transaction-details step shows pricing, fees, and deposits
that match the backend-calculated values for the selected mode.

Backend source of truth:
  src/lib/commissions.ts::calculateRentalFees(basePrice, deliveryFee)
  Renter fee = subtotal * 12.9% ; Total = subtotal + renterFee + depositAmount

For each case, we:
  1. Fetch the listing row from Supabase REST with the anon key so pricing
     inputs (price_daily, price_weekly, delivery_fee, deposit_amount) come
     straight from the backend.
  2. Re-run the exact backend formulas in Python for the chosen date range.
  3. Load /book/{id}?start=...&end=... and read the "Price details" panel.
  4. Assert the visible DOM text contains the expected currency strings for
     the base line, service fee, deposit, and total.

Rent mode is the primary focus because sale checkout is auth-gated (Buy Now
sends unauthenticated users to /auth?redirect=/checkout/{id}, so no pricing
panel is reachable without a signed-in session). If `LOVABLE_BROWSER_AUTH_STATUS`
reports an injected session in the future, extend this file with a sale case.

Run:
    python3 tests/e2e/checkout_pricing_matches_backend.py
"""

import asyncio
import json
import math
import os
import re
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
    """Match commissions.ts rounding: Math.round(x * 100) / 100."""
    # JS Math.round is half-away-from-zero for positive numbers; use decimal
    # nearest-even would drift, so emulate JS behaviour with math.floor+0.5.
    return math.floor(x * 100 + 0.5) / 100


def calculate_rental_fees(base_price: float, delivery_fee: float = 0.0) -> dict:
    subtotal = base_price + delivery_fee
    renter_fee = subtotal * (RENTAL_RENTER_FEE_PERCENT / 100)
    customer_total = subtotal + renter_fee
    return {
        "subtotal": r2(subtotal),
        "renter_fee": r2(renter_fee),
        "customer_total": r2(customer_total),
    }


def calc_base_price(days: int, price_daily: float, price_weekly: float | None) -> float:
    """Mirror BookingCheckout.tsx::calculateBasePrice for daily bookings."""
    weeks = days // 7
    remaining = days % 7
    if price_weekly and weeks > 0:
        return weeks * price_weekly + remaining * price_daily
    return days * price_daily


def fmt(n: float) -> str:
    """Match JS Number.prototype.toLocaleString('en-US')."""
    if float(n).is_integer():
        return f"{int(n):,}"
    # JS toLocaleString drops trailing zeros beyond decimals present
    s = f"{n:,.2f}"
    return s


def fetch_listing(listing_id: str) -> dict:
    url = (
        f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
        "&select=id,title,price_daily,price_weekly,price_hourly,delivery_fee,deposit_amount,mode,status"
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


CASES = [
    # 3-day booking, no weekly, has deposit — exercises daily * days path.
    dict(
        label="daily_with_deposit",
        listing_id="b88edd57-967c-4036-a5bb-a89d2e18ee88",
        days=3,
    ),
    # 8-day booking with weekly rate — exercises weekly + remainder path.
    dict(
        label="weekly_plus_day",
        listing_id="55edfe53-5622-438f-b663-7ced764cc9ca",
        days=8,
    ),
]


def label_row(container_text: str, label: str) -> str | None:
    """Return the first line of container_text starting with (or containing) `label`."""
    for line in container_text.splitlines():
        if label.lower() in line.lower():
            return line.strip()
    return None


async def read_price_panel_text(page) -> str:
    """Locate the visible "Price details" panel and return its text content."""
    heading = page.get_by_text("Price details", exact=True).first
    await heading.wait_for(state="visible", timeout=15000)
    # The panel is the heading's parent container. Walk up until we capture the
    # rows for base, service fee, deposit, and total.
    panel = heading.locator("xpath=ancestor::div[.//*[normalize-space()='Total']][1]")
    await panel.first.wait_for(state="visible", timeout=5000)
    return (await panel.first.inner_text()).strip()


async def run_case(pw, case: dict) -> None:
    listing = fetch_listing(case["listing_id"])
    price_daily = float(listing["price_daily"] or 0)
    price_weekly = float(listing["price_weekly"]) if listing.get("price_weekly") else None
    delivery_fee = float(listing.get("delivery_fee") or 0)
    deposit_amount = float(listing.get("deposit_amount") or 0)

    days = case["days"]
    base_price = calc_base_price(days, price_daily, price_weekly)
    fees = calculate_rental_fees(base_price, delivery_fee)
    total = r2(fees["customer_total"] + deposit_amount)

    start = date.today() + timedelta(days=30)
    end = start + timedelta(days=days - 1)  # inclusive day count matches BookingCheckout
    url = f"{BASE}/book/{case['listing_id']}?start={start.isoformat()}&end={end.isoformat()}"

    print(f"\n▶ {case['label']}  listing={case['listing_id']}")
    print(f"  inputs: days={days} daily=${price_daily} weekly={price_weekly} "
          f"delivery=${delivery_fee} deposit=${deposit_amount}")
    print(f"  backend expected: base=${fmt(base_price)} service=${fmt(fees['renter_fee'])} "
          f"deposit=${fmt(deposit_amount)} total=${fmt(total)}")

    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(viewport={"width": 1280, "height": 1800})
    try:
        page = await context.new_page()
        await page.goto(url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)

        text = await read_price_panel_text(page)
        await page.screenshot(path=str(SHOTS / f"pricing_{case['label']}_panel.png"))

        # --- Assertions -------------------------------------------------
        # Row values render in a flex layout so label + amount may land on
        # separate lines in inner_text. Assert (a) the label row exists with
        # the input reference (e.g. "3 days × $150"), (b) each backend-computed
        # currency appears in the panel, and (c) the Total row is present.

        # 1. Base row present with correct per-unit reference.
        base_line = label_row(text, f"{days} day")
        assert base_line is not None, f"missing base-price row in panel:\n{text}"
        assert f"${fmt(price_daily)}" in base_line, (
            f"base row missing daily price ${fmt(price_daily)}: {base_line!r}"
        )
        # Computed subtotal appears somewhere in the panel.
        assert f"${fmt(base_price)}" in text, (
            f"panel missing computed base ${fmt(base_price)}:\n{text}"
        )

        # 2. Service fee label + backend renterFee amount.
        assert "Service fee" in text, f"missing Service fee label:\n{text}"
        assert f"${fmt(fees['renter_fee'])}" in text, (
            f"panel missing service fee ${fmt(fees['renter_fee'])}:\n{text}"
        )

        # 3. Deposit row present iff listing has one.
        if deposit_amount > 0:
            assert "Security deposit" in text, f"missing Security deposit row:\n{text}"
            assert f"${fmt(deposit_amount)}" in text, (
                f"panel missing deposit ${fmt(deposit_amount)}:\n{text}"
            )
        else:
            assert "Security deposit" not in text, (
                "Deposit row rendered but listing has no deposit"
            )

        # 4. Total label present with the backend total amount.
        assert "Total" in text, f"missing Total label:\n{text}"
        assert f"${fmt(total)}" in text, (
            f"panel missing total ${fmt(total)}:\n{text}"
        )

        # 5. Delivery fee row: present iff delivery selected and > 0.
        if delivery_fee > 0 and "Delivery fee" in text:
            assert f"${fmt(delivery_fee)}" in text, (
                f"Delivery fee amount missing: expected ${fmt(delivery_fee)}"
            )

        print(f"  ✓ panel matches backend for {case['label']}")
        await page.close()
    finally:
        await context.close()
        await browser.close()


async def main() -> int:
    async with async_playwright() as pw:
        failures = []
        for case in CASES:
            try:
                await run_case(pw, case)
            except AssertionError as exc:
                failures.append((case["label"], str(exc)))
            except Exception as exc:
                failures.append((case["label"], repr(exc)))

        print("\n" + "=" * 60)
        if failures:
            print(f"FAILED {len(failures)}/{len(CASES)} case(s):")
            for label, err in failures:
                print(f"  - {label}: {err}")
            return 1
        print(f"PASSED all {len(CASES)} pricing cases.")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
