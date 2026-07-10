"""
End-to-end guard for the Pay-in-Person (cash) sale path.

Contract under test
-------------------
1. Completing the SaleCheckout wizard with `paymentMethod === 'cash'` MUST
   invoke the `create-cash-sale` Edge Function.
2. It MUST NOT invoke `create-checkout` (the Stripe path) at any point.
3. `create-cash-sale` MUST write a paired `transaction_terms` row whose
   `sale_transaction_id` matches the new sale row and whose `total_cents`
   equals `price_sale * 100` (cents, integer).

How this test proves each bullet
--------------------------------
- Route interception on every `*.functions/v1/*` request records the
  invoked function name. After submit we assert 'create-cash-sale' is in
  the log and 'create-checkout' is not.
- After the app redirects to /order-tracking/<uuid> we read the id, then
  query the Data API with the authenticated user's access token for both
  the sale row (to read `price_sale`) and the paired terms row.
- We assert `terms.sale_transaction_id === tx.id` and
  `terms.total_cents === round(tx.amount * 100)`.

Auth
----
Requires an injected Lovable-managed Supabase session
(`LOVABLE_BROWSER_AUTH_STATUS=injected`). When absent the test exits
with a skip code and a clear reason — SaleCheckout is auth-gated and
`create-cash-sale` refuses anon requests.

Run:
    python3 tests/e2e/cash_sale_terms_snapshot.py
"""

import asyncio
import json
import os
import re
import sys
import urllib.request
from pathlib import Path
from playwright.async_api import async_playwright, Route

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
SUPABASE_URL = "https://nbrehbwfsmedbelzntqs.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30."
    "EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU"
)

# Sale-mode listing that accepts cash and is owned by a different host
# than any test user. Selected from `listings` where mode='sale',
# accept_cash_payment=true, fulfillment_type='pickup'. Cheapest of the
# set to keep displayed numbers short.
LISTING_ID = "154df4be-3102-44c9-b014-b36bafce8391"

FUNC_NAME_RE = re.compile(r"/functions/v1/([a-zA-Z0-9_-]+)")


def rest_get(path: str, token: str) -> list[dict]:
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


async def restore_session(context, page) -> str:
    """Restore the injected Supabase session into localhost storage and
    return the access token for REST calls."""
    session_json = os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"]
    storage_key = os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"]
    cookies_raw = os.environ.get("LOVABLE_BROWSER_SUPABASE_COOKIES_JSON")
    if cookies_raw:
        cookies = json.loads(cookies_raw)
        for c in cookies:
            c["url"] = BASE
        await context.add_cookies(cookies)
    await page.goto(BASE, wait_until="domcontentloaded")
    await page.evaluate(
        f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
    )
    return json.loads(session_json)["access_token"]


async def click_when_ready(page, selector: str, timeout: int = 8000) -> None:
    loc = page.locator(selector).first
    await loc.wait_for(state="visible", timeout=timeout)
    await loc.scroll_into_view_if_needed()
    await loc.click()


async def run() -> int:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "no_supabase")
    if status != "injected":
        print(
            f"SKIP: LOVABLE_BROWSER_AUTH_STATUS={status!r}. "
            "SaleCheckout requires an authenticated user; the cash path is "
            "unreachable without a Lovable-injected Supabase session."
        )
        return 0

    # ── Fetch listing once so assertions use backend-of-record values. ──
    rows = rest_get(
        f"listings?id=eq.{LISTING_ID}&select=id,title,price_sale,host_id,mode,accept_cash_payment",
        SUPABASE_ANON_KEY,
    )
    assert rows, f"fixture listing {LISTING_ID} missing"
    listing = rows[0]
    price_sale = float(listing["price_sale"])
    expected_total_cents = round(price_sale * 100)
    print(
        f"fixture: {listing['title']!r} price_sale=${price_sale} "
        f"expected total_cents={expected_total_cents}"
    )

    invoked: list[dict] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        try:
            page = await context.new_page()
            access_token = await restore_session(context, page)

            # Refuse to run if the injected user owns the listing — the
            # ownership guard in create-cash-sale would (correctly) 403.
            me = rest_get("profiles?select=id", access_token)
            if me and me[0]["id"] == listing["host_id"]:
                print(
                    "SKIP: injected user owns the fixture listing; "
                    "cash-sale ownership guard would block the purchase."
                )
                return 0

            # ── Record every Edge Function invocation. ────────────────
            async def record(route: Route):
                m = FUNC_NAME_RE.search(route.request.url)
                if m:
                    invoked.append({"name": m.group(1), "method": route.request.method})
                await route.continue_()

            await context.route("**/functions/v1/**", record)

            # ── Walk the wizard: info → delivery → review → submit. ───
            await page.goto(
                f"{BASE}/checkout/{LISTING_ID}", wait_until="domcontentloaded"
            )
            await page.wait_for_timeout(1500)

            # Step 1 — Information. Fill any required buyer fields that
            # aren't already populated from the profile.
            fields = {
                "First name": "Test",
                "Last name": "Buyer",
                "Email": "cash-e2e@example.com",
                "Phone": "5551234567",
                "Address": "123 Main St",
                "City": "Phoenix",
                "State": "AZ",
                "ZIP code": "85001",
            }
            for label, value in fields.items():
                inp = page.get_by_label(re.compile(rf"^{label}", re.I)).first
                try:
                    if await inp.is_visible(timeout=500):
                        if not (await inp.input_value()):
                            await inp.fill(value)
                except Exception:
                    pass

            await page.screenshot(path=str(SHOTS / "cash_e2e_1_info.png"))
            await click_when_ready(page, "button:has-text('Continue')")

            # Step 2 — Delivery / fulfillment. Default 'pickup' is valid
            # for this listing; just advance.
            await page.wait_for_timeout(600)
            await page.screenshot(path=str(SHOTS / "cash_e2e_2_delivery.png"))
            await click_when_ready(page, "button:has-text('Continue')")

            # Step 3 — Review: choose Cash / Pay in Person, agree, submit.
            await page.wait_for_timeout(600)
            # Radio / card labelled "Pay in Person" or "Cash".
            cash_option = page.get_by_text(
                re.compile(r"Pay\s+in\s+Person|Cash", re.I)
            ).first
            await cash_option.wait_for(state="visible", timeout=8000)
            await cash_option.click()

            # Terms checkbox — role=checkbox nearest the ToS text.
            checkbox = page.get_by_role("checkbox").first
            if not await checkbox.is_checked():
                await checkbox.check(force=True)

            await page.screenshot(path=str(SHOTS / "cash_e2e_3_review.png"))

            # Submit — button copy varies ("Submit request", "Complete
            # purchase"), so match by role.
            submit = page.get_by_role(
                "button",
                name=re.compile(
                    r"Submit|Complete|Confirm|Request|Purchase", re.I
                ),
            ).last
            await submit.scroll_into_view_if_needed()
            await submit.click()

            # ── Wait for navigation to /order-tracking/<uuid>. ────────
            try:
                await page.wait_for_url(
                    re.compile(r"/order-tracking/[0-9a-f-]{36}"), timeout=20000
                )
            except Exception:
                await page.screenshot(path=str(SHOTS / "cash_e2e_fail.png"))
                raise AssertionError(
                    f"expected redirect to /order-tracking/<id>; got {page.url!r}"
                )
            await page.screenshot(path=str(SHOTS / "cash_e2e_4_tracking.png"))

            m = re.search(r"/order-tracking/([0-9a-f-]{36})", page.url)
            assert m, f"could not parse tx id from {page.url!r}"
            tx_id = m.group(1)
            print(f"transaction_id = {tx_id}")

            # ── Assertion 1: create-cash-sale invoked, create-checkout not. ──
            names = [i["name"] for i in invoked]
            print(f"invoked functions ({len(names)}): {sorted(set(names))}")
            assert "create-cash-sale" in names, (
                f"create-cash-sale was never invoked. observed: {names}"
            )
            assert "create-checkout" not in names, (
                "create-checkout was invoked during a Pay-in-Person purchase — "
                f"cash path must not touch Stripe. observed: {names}"
            )

            # ── Assertion 2: transaction_terms row exists and matches. ──
            terms_rows = rest_get(
                f"transaction_terms?sale_transaction_id=eq.{tx_id}"
                "&select=id,sale_transaction_id,total_cents,payment_method,transaction_mode",
                access_token,
            )
            assert terms_rows, (
                f"no transaction_terms row found for sale_transaction_id={tx_id}"
            )
            assert len(terms_rows) == 1, (
                f"expected exactly one terms row, got {len(terms_rows)}: {terms_rows}"
            )
            terms = terms_rows[0]
            assert terms["sale_transaction_id"] == tx_id, (
                f"terms.sale_transaction_id={terms['sale_transaction_id']!r} != {tx_id!r}"
            )
            assert terms["payment_method"] == "pay_in_person", (
                f"terms.payment_method={terms['payment_method']!r} != 'pay_in_person'"
            )
            assert terms["transaction_mode"] == "sale", (
                f"terms.transaction_mode={terms['transaction_mode']!r} != 'sale'"
            )
            assert int(terms["total_cents"]) == expected_total_cents, (
                f"terms.total_cents={terms['total_cents']} != "
                f"expected {expected_total_cents} (from price_sale ${price_sale})"
            )

            # ── Assertion 3: terms_id back-link written on the sale row. ──
            sale_rows = rest_get(
                f"sale_transactions?id=eq.{tx_id}&select=id,terms_id,amount",
                access_token,
            )
            assert sale_rows, f"sale row {tx_id} not readable via REST"
            assert sale_rows[0]["terms_id"] == terms["id"], (
                f"sale.terms_id={sale_rows[0]['terms_id']!r} != terms.id={terms['id']!r}"
            )

            print(
                "PASS: cash purchase submitted, no Stripe checkout call, "
                "terms snapshot linked with matching total_cents."
            )
            return 0
        finally:
            await context.close()
            await browser.close()


if __name__ == "__main__":
    try:
        code = asyncio.run(run())
    except AssertionError as e:
        print(f"FAIL: {e}")
        code = 1
    except Exception as e:
        print(f"ERROR: {e!r}")
        code = 2
    sys.exit(code)
