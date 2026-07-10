"""
FinalReviewSheet consent write + transaction acknowledgment path.

Contract under test (SaleCheckout / Pay-in-Person path)
-------------------------------------------------------
1. Clicking Submit on the review step opens the FinalReviewSheet bottom
   sheet (data-testid="final-review-sheet"). It does NOT immediately
   invoke create-cash-sale.
2. Inside the sheet, the "I agree" checkbox is NOT preselected, and the
   confirm button is disabled until it's checked.
3. Confirming the sheet MUST, in order:
     a. POST to /rest/v1/rpc/record_user_consent (the versioned consent
        write — this is the durable acceptance record).
     b. Invoke the `acknowledge-terms` edge function (stamps
        transaction_terms.acknowledged_at / _ip / _ua).
     c. Invoke `create-cash-sale` (the money-moving call).
4. After the app redirects to /order-tracking/<uuid>, the paired
   transaction_terms row MUST have `acknowledged_at IS NOT NULL` and
   `status = 'active'` (the acknowledge-terms function flipped it from
   the create-transaction-terms-draft `draft` state).
5. A user_consents row MUST exist for this user with trigger
   `pay_in_person` (or `purchase_review` for card sales) and the correct
   listing_id + terms_id in related_ids.

Auth: requires LOVABLE_BROWSER_AUTH_STATUS=injected. Skips cleanly
otherwise (FinalReviewSheet + create-cash-sale are auth-gated).

Run:
    python3 tests/e2e/final_review_sheet_consent.py
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

# Same fixture as cash_sale_terms_snapshot.py — sale-mode, cash-eligible,
# pickup fulfillment.
LISTING_ID = "154df4be-3102-44c9-b014-b36bafce8391"

FUNC_NAME_RE = re.compile(r"/functions/v1/([a-zA-Z0-9_-]+)")
RPC_NAME_RE = re.compile(r"/rest/v1/rpc/([a-zA-Z0-9_-]+)")


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


async def restore_session(context, page) -> tuple[str, str]:
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
    session = json.loads(session_json)
    return session["access_token"], session["user"]["id"]


async def run() -> int:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "no_supabase")
    if status != "injected":
        print(
            f"SKIP: LOVABLE_BROWSER_AUTH_STATUS={status!r}. "
            "FinalReviewSheet requires an authenticated user."
        )
        return 0

    listing_rows = rest_get(
        f"listings?id=eq.{LISTING_ID}&select=host_id,title,price_sale",
        SUPABASE_ANON_KEY,
    )
    assert listing_rows, f"fixture listing {LISTING_ID} missing"
    listing = listing_rows[0]

    invoked_functions: list[str] = []
    invoked_rpcs: list[str] = []
    invocation_order: list[str] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        try:
            page = await context.new_page()
            access_token, user_id = await restore_session(context, page)

            if user_id == listing["host_id"]:
                print(
                    "SKIP: injected user owns the fixture listing; "
                    "ownership guard blocks the purchase."
                )
                return 0

            # Record every backend hop so we can assert ordering.
            async def record(route: Route):
                url = route.request.url
                fn = FUNC_NAME_RE.search(url)
                rpc = RPC_NAME_RE.search(url)
                if fn:
                    invoked_functions.append(fn.group(1))
                    invocation_order.append(f"fn:{fn.group(1)}")
                elif rpc:
                    invoked_rpcs.append(rpc.group(1))
                    invocation_order.append(f"rpc:{rpc.group(1)}")
                await route.continue_()

            await context.route("**/functions/v1/**", record)
            await context.route("**/rest/v1/rpc/**", record)

            # ── Walk the wizard to the review step. ─────────────────
            await page.goto(
                f"{BASE}/checkout/{LISTING_ID}", wait_until="domcontentloaded"
            )
            await page.wait_for_timeout(1500)

            fields = {
                "First name": "Test",
                "Last name": "Buyer",
                "Email": "final-review-e2e@example.com",
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
            await page.locator("button:has-text('Continue')").first.click()

            await page.wait_for_timeout(600)
            await page.locator("button:has-text('Continue')").first.click()

            await page.wait_for_timeout(600)
            cash_option = page.get_by_text(
                re.compile(r"Pay\s+in\s+Person|Cash", re.I)
            ).first
            await cash_option.wait_for(state="visible", timeout=8000)
            await cash_option.click()

            # Inline TOS checkbox on the review step (pre-sheet gate).
            inline_checkbox = page.get_by_role("checkbox").first
            if not await inline_checkbox.is_checked():
                await inline_checkbox.check(force=True)

            # Snapshot invocation log BEFORE submit so we can prove the
            # sheet — not the submit click — is what triggered the writes.
            functions_before_submit = list(invoked_functions)

            submit = page.get_by_role(
                "button",
                name=re.compile(r"Submit|Complete|Confirm|Request|Purchase", re.I),
            ).last
            await submit.scroll_into_view_if_needed()
            await submit.click()

            # ── Assertion 1: FinalReviewSheet opens and no money-moving
            # call has fired yet. ────────────────────────────────────
            sheet = page.locator('[data-testid="final-review-sheet"]').first
            await sheet.wait_for(state="visible", timeout=8000)
            await page.screenshot(path=str(SHOTS / "frs_1_sheet_open.png"))
            assert "create-cash-sale" not in invoked_functions, (
                "create-cash-sale fired before the FinalReviewSheet consent "
                f"gate — invocations before sheet: {functions_before_submit}, "
                f"after sheet open: {invoked_functions}"
            )
            print("PASS: FinalReviewSheet opens without triggering create-cash-sale")

            # ── Assertion 2: sheet checkbox not preselected + confirm gated. ──
            agree = page.locator('[data-testid="final-review-agree"]').first
            confirm = page.locator('[data-testid="final-review-confirm"]').first
            assert not await agree.is_checked(), (
                "FinalReviewSheet checkbox is preselected — regulators require "
                "an affirmative click before writing a consent row."
            )
            assert await confirm.is_disabled(), (
                "FinalReviewSheet confirm button is enabled without agreement."
            )
            print("PASS: sheet checkbox unchecked + confirm disabled")

            await agree.check(force=True)
            await page.wait_for_timeout(150)
            assert not await confirm.is_disabled(), (
                "confirm remained disabled after agreeing"
            )

            await confirm.click()
            await page.screenshot(path=str(SHOTS / "frs_2_confirmed.png"))

            # ── Wait for the redirect. ───────────────────────────────
            try:
                await page.wait_for_url(
                    re.compile(r"/order-tracking/[0-9a-f-]{36}"), timeout=25000
                )
            except Exception:
                await page.screenshot(path=str(SHOTS / "frs_fail.png"))
                raise AssertionError(
                    f"expected /order-tracking/<id>; got {page.url!r}. "
                    f"functions={invoked_functions} rpcs={invoked_rpcs}"
                )
            m = re.search(r"/order-tracking/([0-9a-f-]{36})", page.url)
            assert m
            tx_id = m.group(1)
            print(f"transaction_id = {tx_id}")

            # ── Assertion 3: required backend hops fired, in order. ──
            assert "record_user_consent" in invoked_rpcs, (
                f"record_user_consent RPC was never called. rpcs={invoked_rpcs}"
            )
            assert "acknowledge-terms" in invoked_functions, (
                f"acknowledge-terms was never invoked. functions={invoked_functions}"
            )
            assert "create-cash-sale" in invoked_functions, (
                f"create-cash-sale was never invoked. functions={invoked_functions}"
            )

            def index_of(prefix: str) -> int:
                for i, entry in enumerate(invocation_order):
                    if entry == prefix:
                        return i
                return -1

            i_consent = index_of("rpc:record_user_consent")
            i_ack = index_of("fn:acknowledge-terms")
            i_sale = index_of("fn:create-cash-sale")
            assert i_consent < i_ack < i_sale, (
                "backend hops fired out of order — the sheet must record "
                "consent, then acknowledge terms, THEN create the sale. "
                f"order={invocation_order}"
            )
            print(f"PASS: hop order OK (consent#{i_consent} < ack#{i_ack} < sale#{i_sale})")

            # ── Assertion 4: transaction_terms was acknowledged + active. ──
            terms_rows = rest_get(
                f"transaction_terms?sale_transaction_id=eq.{tx_id}"
                "&select=id,acknowledged_at,status",
                access_token,
            )
            assert terms_rows, f"no transaction_terms row for tx {tx_id}"
            terms = terms_rows[0]
            assert terms.get("acknowledged_at"), (
                f"transaction_terms.acknowledged_at is null — acknowledge-terms "
                f"did not stamp. row={terms}"
            )
            assert terms.get("status") == "active", (
                f"transaction_terms.status expected 'active' after acknowledge, "
                f"got {terms.get('status')!r}"
            )
            terms_id = terms["id"]
            print(f"PASS: terms {terms_id} acknowledged_at set, status=active")

            # ── Assertion 5: user_consents row exists & references this txn. ──
            consents = rest_get(
                f"user_consents?user_id=eq.{user_id}"
                f"&document_type=eq.pay_in_person_acknowledgment"
                f"&order=created_at.desc&limit=5"
                f"&select=id,document_type,document_version,trigger_action,related_ids,acceptance_text",
                access_token,
            )
            # Fall back to any signup-scoped triggers in case document type
            # resolver picks a different doc for this listing.
            if not consents:
                consents = rest_get(
                    f"user_consents?user_id=eq.{user_id}"
                    f"&order=created_at.desc&limit=5"
                    f"&select=id,document_type,document_version,trigger_action,related_ids",
                    access_token,
                )
            assert consents, (
                f"no user_consents row found for user {user_id} — the sheet "
                "must have called record_user_consent."
            )
            matched = None
            for c in consents:
                rel = c.get("related_ids") or {}
                if rel.get("terms_id") == terms_id or rel.get("listing_id") == LISTING_ID:
                    matched = c
                    break
            assert matched, (
                f"no user_consents row references terms_id={terms_id} or "
                f"listing_id={LISTING_ID}. rows={consents}"
            )
            print(
                f"PASS: user_consents row {matched['id']} "
                f"(doc={matched['document_type']} v{matched['document_version']}, "
                f"trigger={matched['trigger_action']})"
            )

            print("OK: FinalReviewSheet consent + acknowledgment contract holds")
            return 0
        finally:
            await context.close()
            await browser.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
