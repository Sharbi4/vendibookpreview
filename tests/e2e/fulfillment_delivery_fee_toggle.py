"""
Fulfillment fee toggle — asserts the transaction-details panel adds /
removes the backend delivery fee exactly as the fulfillment selection
changes, and that on-site rentals never carry one.

Backend contract (src/pages/BookingCheckout.tsx):
    currentDeliveryFee = fulfillmentSelected === 'delivery'
                         && listing.delivery_fee ? listing.delivery_fee : 0;
    fees = calculateRentalFees(basePrice, currentDeliveryFee);
        // subtotal = base + delivery
        // renterFee = round((base + delivery) * 0.129)
    total = fees.customerTotal + (depositAmount || 0);

The fulfillment radio group is only rendered when
`isMobileAsset && listing.fulfillment_type === 'both'` — i.e., food-truck
or food-trailer listings. For those categories BookingCheckout also gates
the Fulfillment accordion behind the Business info step, so the test
fills that step programmatically via the visible form before toggling.

Cases:
  A. mobile_both_pickup_default — pizza trailer with $400/day daily,
     $45 delivery_fee. Pickup default → NO Delivery fee row; total is
     base + service fee only.
  B. mobile_both_delivery_toggle — same listing after clicking the
     Delivery radio → Delivery fee row shows exactly $45, service fee
     recomputes on the new subtotal (base + $45), Total reflects both.
  C. mobile_both_pickup_toggle_back — clicking Pickup again removes the
     Delivery fee row and reverts service fee + Total to Case A values.
  D. on_site_no_toggle — commissary kitchen listing (fulfillment_type
     'on_site'). Fulfillment radio is not rendered at all; the panel
     must not display any Delivery / Freight / Fulfillment fee row, and
     Total equals base + service fee (no delivery, no deposit surcharge
     beyond listing's deposit_amount).

Run:
    python3 tests/e2e/fulfillment_delivery_fee_toggle.py
"""

import asyncio
import json
import math
import os
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path
from playwright.async_api import async_playwright, TimeoutError as PWTimeout

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

MOBILE_BOTH_LISTING = "33ee8fd3-f9fd-44b3-af28-64d94eb7f9e9"   # Pizza trailer
ON_SITE_LISTING     = "24594068-25df-4bbe-b142-7bad96aacf39"   # Commissary kitchen
DAYS = 3


def r2(x: float) -> float:
    """Match JS Math.round(x*100)/100 (half-away-from-zero for positive)."""
    return math.floor(x * 100 + 0.5) / 100


def fmt(n: float) -> str:
    """Emulate Number.prototype.toLocaleString('en-US')."""
    if float(n).is_integer():
        return f"{int(n):,}"
    return f"{n:,.10f}".rstrip("0").rstrip(".")


def calc_base(days: int, daily: float, weekly: float | None) -> float:
    if days <= 0 or not daily:
        return 0.0
    weeks, rem = divmod(days, 7)
    if weekly and weeks > 0:
        return weeks * weekly + rem * daily
    return days * daily


def fees(base: float, delivery: float = 0.0) -> dict:
    subtotal = base + delivery
    renter = r2(subtotal * (RENTAL_RENTER_FEE_PERCENT / 100))
    return {"subtotal": r2(subtotal), "renter": renter,
            "total": r2(subtotal + renter)}


def fetch_listing(listing_id: str) -> dict:
    url = (
        f"{SUPABASE_URL}/rest/v1/listings?id=eq.{listing_id}"
        "&select=id,title,category,fulfillment_type,price_daily,price_weekly,"
        "delivery_fee,deposit_amount"
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


async def read_price_panel(page) -> str:
    heading = page.get_by_text("Price details", exact=True).first
    await heading.wait_for(state="visible", timeout=15000)
    panel = heading.locator(
        "xpath=ancestor::div[.//*[normalize-space()='Total']][1]"
    )
    await panel.first.wait_for(state="visible", timeout=5000)
    return (await panel.first.inner_text()).strip()


async def assert_panel(page, *, base, delivery, deposit, expect_delivery_row, note):
    """Read the price panel and assert every row matches backend math for
    the current fulfillment selection."""
    text = await read_price_panel(page)
    f = fees(base, delivery)
    total = r2(f["total"] + deposit)
    base_s = f"${fmt(base)}"
    fee_s = f"${fmt(f['renter'])}"
    total_s = f"${fmt(total)}"

    print(f"    [{note}] base={base_s} delivery=${fmt(delivery)} "
          f"fee={fee_s} total={total_s}")

    assert base_s in text, f"[{note}] missing base {base_s}:\n{text}"
    assert "Service fee" in text, f"[{note}] missing Service fee label"
    assert fee_s in text, f"[{note}] missing service fee {fee_s}:\n{text}"
    assert "Total" in text, f"[{note}] missing Total row"
    assert total_s in text, f"[{note}] wrong total, expected {total_s}:\n{text}"

    if expect_delivery_row:
        assert "Delivery fee" in text, (
            f"[{note}] Delivery fee row missing when delivery selected:\n{text}"
        )
        assert f"${fmt(delivery)}" in text, (
            f"[{note}] Delivery fee amount ${fmt(delivery)} missing:\n{text}"
        )
    else:
        # Pickup / on_site: no delivery/freight line at all.
        for bad in ("Delivery fee", "Freight"):
            assert bad not in text, (
                f"[{note}] unexpected '{bad}' row while pickup/on-site:\n{text}"
            )
    return text


async def fill_business_info(page):
    """The Fulfillment accordion for food_truck/food_trailer categories
    is gated behind Business info. Fill the four required fields via the
    visible form (labels bound to hidden radio inputs) and click
    Continue. This unlocks canAccessStep(STEP_FULFILLMENT)."""
    # Business Info accordion is auto-opened (activeStep initializes to 1).
    # Wait for licence-type radios to be present.
    await page.locator("label[for='license-llc']").first.wait_for(
        state="visible", timeout=10000
    )
    await page.locator("label[for='license-llc']").first.click()
    await page.locator("label[for='employees-just_me']").first.click()
    await page.locator("#cuisineType").first.fill("E2E test cuisine")
    await page.locator("#intendedUse").first.fill("E2E automated fulfillment test")

    # Continue button lives inside the BusinessInfoStep — find it inside
    # the currently-open accordion.
    cont = page.get_by_role("button", name="Continue").first
    await cont.wait_for(state="visible", timeout=5000)
    for _ in range(20):
        if await cont.is_enabled():
            break
        await page.wait_for_timeout(150)
    assert await cont.is_enabled(), "Business info Continue never enabled"
    await cont.click()
    await page.wait_for_timeout(500)


async def open_fulfillment_step(page):
    """After business info completes, the Fulfillment accordion may auto-
    open. If it doesn't, click its header. Then wait for the pickup radio
    to be in the DOM."""
    pickup_label = page.locator("label[for='checkout-pickup']").first
    try:
        await pickup_label.wait_for(state="visible", timeout=2500)
        return
    except PWTimeout:
        pass
    header = page.get_by_role("button", name=lambda n: n and "Fulfillment" in n).first
    await header.click()
    await pickup_label.wait_for(state="visible", timeout=8000)


async def case_mobile_both(browser, listing):
    """Cases A + B + C on the same page load — toggling shouldn't require
    reloads and the transitions themselves are part of the contract."""
    daily = float(listing["price_daily"])
    weekly = float(listing["price_weekly"]) if listing.get("price_weekly") else None
    delivery = float(listing["delivery_fee"] or 0)
    deposit = float(listing.get("deposit_amount") or 0)
    base = calc_base(DAYS, daily, weekly)

    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=DAYS - 1)
    url = f"{BASE}/book/{listing['id']}?start={start.isoformat()}&end={end.isoformat()}"

    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    result = {"case": "mobile_both_toggle", "err": None}
    try:
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(SHOTS / "fulfill_A_00_loaded.png"))

        # ── Case A: pickup default. Delivery row must NOT be present.
        await assert_panel(
            page, base=base, delivery=0.0, deposit=deposit,
            expect_delivery_row=False, note="A/pickup-default",
        )

        # Unlock the fulfillment radio group.
        await fill_business_info(page)
        await open_fulfillment_step(page)
        await page.screenshot(path=str(SHOTS / "fulfill_A_01_after_bizinfo.png"))

        # Re-assert Case A after unlocking (nothing about pricing should
        # have moved just from opening an accordion).
        await assert_panel(
            page, base=base, delivery=0.0, deposit=deposit,
            expect_delivery_row=False, note="A/pickup-after-bizinfo",
        )

        # ── Case B: click Delivery. Fee row appears, service fee & total
        # recompute on the new subtotal.
        await page.locator("label[for='checkout-delivery']").first.click()
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(SHOTS / "fulfill_B_delivery.png"))
        await assert_panel(
            page, base=base, delivery=delivery, deposit=deposit,
            expect_delivery_row=True, note="B/delivery",
        )

        # ── Case C: toggle Pickup back. Delivery row disappears, values
        # restore exactly.
        await page.locator("label[for='checkout-pickup']").first.click()
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(SHOTS / "fulfill_C_pickup_back.png"))
        await assert_panel(
            page, base=base, delivery=0.0, deposit=deposit,
            expect_delivery_row=False, note="C/pickup-back",
        )

        print("  ✓ mobile-both fulfillment toggle matches backend")
    except AssertionError as e:
        result["err"] = f"AssertionError: {str(e).splitlines()[0][:280]}"
        try:
            await page.screenshot(path=str(SHOTS / "fulfill_99_error.png"))
        except Exception:
            pass
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:280]}"
    finally:
        await ctx.close()
    return result


async def case_on_site(browser, listing):
    """On-site listings never expose the fulfillment radio and must never
    show a Delivery / Freight row regardless of listing config."""
    daily = float(listing["price_daily"])
    weekly = float(listing["price_weekly"]) if listing.get("price_weekly") else None
    deposit = float(listing.get("deposit_amount") or 0)
    base = calc_base(DAYS, daily, weekly)

    start = date.today() + timedelta(days=45)
    end = start + timedelta(days=DAYS - 1)
    url = f"{BASE}/book/{listing['id']}?start={start.isoformat()}&end={end.isoformat()}"

    ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
    result = {"case": "on_site_no_toggle", "err": None}
    try:
        page = await ctx.new_page()
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass
        await page.wait_for_timeout(600)
        await page.screenshot(path=str(SHOTS / "fulfill_D_on_site.png"))

        # No delivery radio at all.
        assert await page.locator("label[for='checkout-delivery']").count() == 0, (
            "on_site listing exposed a Delivery radio — should be hidden"
        )
        assert await page.locator("label[for='checkout-pickup']").count() == 0, (
            "on_site listing exposed a Pickup radio — should be hidden"
        )

        await assert_panel(
            page, base=base, delivery=0.0, deposit=deposit,
            expect_delivery_row=False, note="D/on-site",
        )
        print("  ✓ on-site listing carries no delivery fee")
    except AssertionError as e:
        result["err"] = f"AssertionError: {str(e).splitlines()[0][:280]}"
    except Exception as e:
        result["err"] = f"{type(e).__name__}: {str(e).splitlines()[0][:280]}"
    finally:
        await ctx.close()
    return result


async def main() -> int:
    mobile = fetch_listing(MOBILE_BOTH_LISTING)
    on_site = fetch_listing(ON_SITE_LISTING)
    assert mobile["fulfillment_type"] == "both" and mobile["delivery_fee"], (
        "test listing must be fulfillment='both' with a delivery_fee"
    )
    assert on_site["fulfillment_type"] == "on_site", (
        "test listing must be fulfillment='on_site'"
    )

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        results = []
        print(f"\n▶ mobile-both  listing={mobile['id']} daily=${mobile['price_daily']} "
              f"weekly={mobile['price_weekly']} delivery=${mobile['delivery_fee']}")
        results.append(await case_mobile_both(browser, mobile))
        print(f"\n▶ on-site      listing={on_site['id']} daily=${on_site['price_daily']} "
              f"weekly={on_site['price_weekly']}")
        results.append(await case_on_site(browser, on_site))
        await browser.close()

    print("\n" + "=" * 60)
    fails = [r for r in results if r["err"]]
    for r in results:
        print(f"{'PASS' if not r['err'] else 'FAIL'} {r['case']}" +
              (f"  err={r['err']}" if r["err"] else ""))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
