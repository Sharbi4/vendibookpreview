"""
Currency formatting + half-away-from-zero rounding — locks down the exact
strings the checkout price panel prints for backends whose float math
lands on `.5`-cent boundaries.

Backend contract (src/lib/commissions.ts):
    renterFee = Math.round(subtotal * 0.129 * 100) / 100
JS `Math.round` rounds half toward +Infinity for positive values, i.e.,
half-away-from-zero. Bankers' rounding (round-half-to-even) would give a
different cent on any `x.xx5` boundary where the trailing digit is even.
This suite picks bases that exercise that boundary AND verifies the
displayed strings use `Number.prototype.toLocaleString('en-US')` — commas
for thousands, no trailing-zero padding beyond significant decimals.

Cases:
  A. halfaway_no_comma   — base=$225 (3 × $75). fee = 225 × 0.129 = 29.025;
                           half-away → $29.03; bankers → $29.02. Panel
                           MUST show $29.03 and NEVER $29.02.
  B. halfaway_single_day — base=$125 (1 × $125). fee = 16.125; half-away
                           → $16.13; bankers → $16.12. Panel MUST show
                           $16.13 and NEVER $16.12.
  C. thousands_comma     — base=$1,050 (3 × $350). fee=$135.45,
                           total=$1,185.45. Verifies comma insertion at
                           the thousands boundary on the base, subtotal-
                           and-total rows, and that the total is NOT
                           rendered as `$1185.45` (no thousands separator).

Run:
    python3 tests/e2e/pricing_rounding_and_formatting.py
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


def r2_halfaway(x: float) -> float:
    """Half-away-from-zero for positive values — matches JS `Math.round`."""
    return math.floor(x * 100 + 0.5) / 100


def r2_bankers(x: float) -> float:
    """Round-half-to-even (Python's default `round`) — the WRONG behavior
    we're asserting the app does NOT exhibit."""
    return round(x * 100) / 100


def toLocaleString(n: float) -> str:
    """Emulate Number.prototype.toLocaleString('en-US'): comma thousands,
    no trailing-zero padding (12.9 → '12.9', not '12.90')."""
    if float(n).is_integer():
        return f"{int(n):,}"
    s = f"{n:,.10f}".rstrip("0").rstrip(".")
    return s


def fetch_listing(listing_id: str) -> dict:
    url = (
        f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
        "&select=id,title,price_daily,price_weekly,delivery_fee,deposit_amount"
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


CASES = [
    dict(
        label="halfaway_no_comma",
        # $75/day, weekly $400 — weeks=0 for 3 days so weekly branch is
        # NOT engaged; base = 3 × $75 = $225.
        listing_id="2ee148f3-0b56-4739-86b1-b96208fcf1af",
        days=3,
        expected_base=225.0,
    ),
    dict(
        label="halfaway_single_day",
        # $125/day, weekly $650 — 1 day → base $125.
        listing_id="3d4b8b98-aec6-4bdd-9af8-d45470c091c7",
        days=1,
        expected_base=125.0,
    ),
    dict(
        label="thousands_comma",
        # $350/day, weekly $1,800 — 3 days keeps us in daily branch → $1,050.
        listing_id="66edfe50-f200-4560-832c-edc6877ad910",
        days=3,
        expected_base=1050.0,
    ),
]


async def read_price_panel_text(page) -> str:
    heading = page.get_by_text("Price details", exact=True).first
    await heading.wait_for(state="visible", timeout=15000)
    panel = heading.locator(
        "xpath=ancestor::div[.//*[normalize-space()='Total']][1]"
    )
    await panel.first.wait_for(state="visible", timeout=5000)
    return (await panel.first.inner_text()).strip()


async def run_case(browser, case) -> dict:
    listing = fetch_listing(case["listing_id"])
    price_daily = float(listing["price_daily"] or 0)
    deposit_amount = float(listing.get("deposit_amount") or 0)

    # Sanity: our hardcoded expected base must line up with the listing —
    # if a host edits price_daily the test fails loudly instead of silently.
    computed_base = case["days"] * price_daily
    assert computed_base == case["expected_base"], (
        f"listing {case['listing_id']} price drifted: "
        f"{case['days']} × ${price_daily} = ${computed_base}, "
        f"expected ${case['expected_base']}"
    )

    base = case["expected_base"]
    fee_halfaway = r2_halfaway(base * (RENTAL_RENTER_FEE_PERCENT / 100))
    fee_bankers = r2_bankers(base * (RENTAL_RENTER_FEE_PERCENT / 100))
    total = r2_halfaway(base + fee_halfaway + deposit_amount)

    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=case["days"] - 1)
    url = f"{BASE}/book/{case['listing_id']}?start={start.isoformat()}&end={end.isoformat()}"

    print(f"\n▶ {case['label']}  listing={case['listing_id']}")
    print(f"  base=${toLocaleString(base)}  "
          f"fee(half-away)=${toLocaleString(fee_halfaway)}  "
          f"fee(bankers)=${toLocaleString(fee_bankers)}  "
          f"total=${toLocaleString(total)}")

    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    result = {"case": case["label"], "err": None}
    try:
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        await page.wait_for_timeout(1500)
        text = await read_price_panel_text(page)
        await page.screenshot(path=str(SHOTS / f"pricing_fmt_{case['label']}.png"))

        # ── Rounding: the exact half-away string MUST appear.
        fee_str = f"${toLocaleString(fee_halfaway)}"
        assert fee_str in text, (
            f"panel missing half-away fee {fee_str}:\n{text}"
        )
        # ── And the bankers'-rounded string MUST NOT appear anywhere in
        # the panel — that would prove the app is silently using the wrong
        # rounding mode. (Only assert when the two modes actually differ.)
        if case["label"] in ("halfaway_no_comma", "halfaway_single_day"):
            bankers_str = f"${toLocaleString(fee_bankers)}"
            assert fee_halfaway != fee_bankers, (
                "test setup: chosen base does not discriminate rounding modes"
            )
            assert bankers_str not in text, (
                f"panel shows bankers'-rounded fee {bankers_str} — the app "
                f"is not using Math.round (half-away-from-zero):\n{text}"
            )

        # ── Formatting: base line shows toLocaleString base.
        base_str = f"${toLocaleString(base)}"
        assert base_str in text, (
            f"panel missing base amount {base_str}:\n{text}"
        )

        # ── Total: exact rendered string.
        total_str = f"${toLocaleString(total)}"
        assert total_str in text, (
            f"panel missing total {total_str}:\n{text}"
        )

        # ── Thousands-comma fingerprint for the comma case: the panel
        # must NOT contain the un-formatted alternates like "$1050" /
        # "$1185.45" (which would prove `.toLocaleString()` was dropped).
        if case["label"] == "thousands_comma":
            for bad in ("$1050", "$1185.45"):
                # Only worry if the same numeric with a comma is expected.
                assert bad not in text, (
                    f"panel shows un-formatted amount {bad} — locale "
                    f"formatting regressed to plain number:\n{text}"
                )
            assert "$1,050" in text, "base row missing '$1,050' comma"
            assert "$1,185.45" in text, "total row missing '$1,185.45' comma"

        print(f"  ✓ {case['label']} rounding + formatting match backend")
    except AssertionError as e:
        result["err"] = f"AssertionError: {str(e).splitlines()[0][:280]}"
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:280]}"
    finally:
        await ctx.close()
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
