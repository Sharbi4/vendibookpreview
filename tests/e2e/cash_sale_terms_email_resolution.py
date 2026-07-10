"""
End-to-end guard: cash sales store the correct terms_id, AND
send-sale-notification resolves the SAME transaction_terms row via
terms_id when composing downstream cash purchase emails.

What this test proves
---------------------
1. Calling `create-cash-sale` with the buyer's session produces:
     - a `sale_transactions` row with `terms_id` populated (not null),
     - a `transaction_terms` row whose `id == sale.terms_id` and whose
       `sale_transaction_id == sale.id`,
     - matching pricing (`total_cents = round(amount * 100)`,
       `payment_method='pay_in_person'`, `transaction_mode='sale'`).
2. Fetching `transaction_terms` by `id = sale.terms_id` (the exact
   lookup send-sale-notification performs first) returns the SAME row
   as the legacy fallback lookup by `sale_transaction_id = sale.id`.
   → downstream cash emails cannot pick a different snapshot.
3. Invoking `send-sale-notification` with
   `notification_type='cash_purchase_request'` succeeds (HTTP 200,
   `success:true`, `isCashSale:true`), which requires the terms_id
   lookup + snapshot embedding to have worked without throwing.

No real customer emails are exercised beyond the queue enqueue that
already fires for every cash sale creation — this test only *asserts*
the state; it does not resend to third-party inboxes.

Auth
----
Requires an injected Lovable-managed Supabase session
(`LOVABLE_BROWSER_AUTH_STATUS=injected`). Skips cleanly otherwise —
`create-cash-sale` refuses anonymous callers.

Run:
    python3 tests/e2e/cash_sale_terms_email_resolution.py
"""

import asyncio
import json
import os
import sys
import urllib.error
import urllib.request

# Use the injected session; do NOT open a browser — this is a pure
# API-level fixture test so it stays fast and predictable.

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")  # unused, kept for parity
SUPABASE_URL = "https://nbrehbwfsmedbelzntqs.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5icmVoYndmc21lZGJlbHpudHFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDgzMTMsImV4cCI6MjA4MzY4NDMxM30."
    "EkA-lGUmkLQ9rPAO-unLxGGGHVmPDdVR8awlA2ShVpU"
)

# Cheapest published sale-mode listing that accepts cash + pickup, so
# the pending_cash sale row this test creates carries a small dollar
# amount. Picked from `listings` where mode='sale', accept_cash_payment
# =true, fulfillment_type='pickup', status='published'.
LISTING_ID = "67b22e91-5540-4c75-a1d7-8d60f04afc22"


def _req(url: str, token: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict | list | None]:
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"raw": raw.decode(errors="replace")}
        return e.code, payload


def rest_get(path: str, token: str) -> list[dict]:
    status, body = _req(f"{SUPABASE_URL}/rest/v1/{path}", token)
    assert status == 200, f"REST {path} → {status}: {body!r}"
    assert isinstance(body, list)
    return body


def fn_invoke(name: str, token: str, body: dict) -> tuple[int, dict | list | None]:
    return _req(f"{SUPABASE_URL}/functions/v1/{name}", token, "POST", body)


async def run() -> int:
    status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS", "no_supabase")
    if status != "injected":
        print(
            f"SKIP: LOVABLE_BROWSER_AUTH_STATUS={status!r}. "
            "create-cash-sale refuses anonymous callers; test needs an "
            "injected Lovable-managed Supabase session."
        )
        return 0

    session = json.loads(os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"])
    access_token = session["access_token"]
    buyer_id = session["user"]["id"]

    # Fixture listing sanity-check
    listings = rest_get(
        f"listings?id=eq.{LISTING_ID}"
        "&select=id,title,price_sale,host_id,accept_cash_payment,mode",
        SUPABASE_ANON_KEY,
    )
    assert listings, f"fixture listing {LISTING_ID} missing"
    listing = listings[0]
    assert listing["accept_cash_payment"], "fixture listing must accept cash"
    assert listing["mode"] == "sale", "fixture listing must be sale mode"

    if listing["host_id"] == buyer_id:
        print(
            "SKIP: injected user owns the fixture listing; "
            "create-cash-sale ownership guard would 403."
        )
        return 0

    amount = float(listing["price_sale"])
    expected_total_cents = round(amount * 100)
    print(
        f"fixture: {listing['title']!r} price_sale=${amount} "
        f"expected total_cents={expected_total_cents}"
    )

    # ── 1) Create a cash sale via the edge function (no UI). ─────────
    code, payload = fn_invoke(
        "create-cash-sale",
        access_token,
        {
            "listing_id": LISTING_ID,
            "amount": amount,
            "fulfillment_type": "pickup",
            "buyer_name": "Terms E2E",
            "buyer_email": session["user"].get("email") or "terms-e2e@example.com",
            "buyer_phone": "5551234567",
        },
    )
    assert code == 200, f"create-cash-sale → {code}: {payload!r}"
    assert isinstance(payload, dict), payload
    tx_id = payload.get("transaction_id")
    returned_terms_id = payload.get("terms_id")
    assert tx_id and returned_terms_id, (
        f"create-cash-sale response missing ids: {payload!r}"
    )
    print(f"created sale={tx_id} returned terms_id={returned_terms_id}")

    # ── 2) sale.terms_id must be persisted on the row. ───────────────
    sales = rest_get(
        f"sale_transactions?id=eq.{tx_id}"
        "&select=id,terms_id,amount,status,payment_intent_id,seller_id",
        access_token,
    )
    assert sales, f"sale row {tx_id} not readable"
    sale = sales[0]
    assert sale["terms_id"], f"sale.terms_id is NULL on cash sale: {sale!r}"
    assert sale["terms_id"] == returned_terms_id, (
        f"sale.terms_id={sale['terms_id']!r} ≠ create-cash-sale return "
        f"value {returned_terms_id!r}"
    )
    assert sale["status"] == "pending_cash", f"unexpected status {sale['status']!r}"
    assert sale["payment_intent_id"] is None, (
        "cash sale must have no Stripe payment_intent_id — otherwise "
        "send-sale-notification treats it as a card sale (isCashSale=false)"
    )

    # ── 3) The row that terms_id points to must match the paired
    #    snapshot (what the fallback path resolves).
    #    ⇒ downstream emails resolve the SAME transaction_terms
    #      regardless of which branch runs.
    by_id = rest_get(
        f"transaction_terms?id=eq.{sale['terms_id']}"
        "&select=id,sale_transaction_id,total_cents,payment_method,"
        "transaction_mode,terms_version,snapshot",
        access_token,
    )
    by_sale = rest_get(
        f"transaction_terms?sale_transaction_id=eq.{tx_id}"
        "&select=id,sale_transaction_id,total_cents,payment_method,"
        "transaction_mode,terms_version,snapshot",
        access_token,
    )
    assert by_id and by_sale, (
        f"missing terms rows — by_id={by_id!r} by_sale={by_sale!r}"
    )
    assert len(by_sale) == 1, (
        f"expected exactly one paired terms row, got {len(by_sale)}"
    )
    assert by_id[0]["id"] == by_sale[0]["id"], (
        "primary lookup (terms.id = sale.terms_id) and fallback "
        "lookup (terms.sale_transaction_id = sale.id) returned "
        "different rows — downstream emails could render a "
        "different snapshot depending on the branch taken. "
        f"by_id={by_id[0]['id']!r} by_sale={by_sale[0]['id']!r}"
    )

    terms = by_id[0]
    assert terms["sale_transaction_id"] == tx_id
    assert terms["payment_method"] == "pay_in_person"
    assert terms["transaction_mode"] == "sale"
    assert int(terms["total_cents"]) == expected_total_cents, (
        f"terms.total_cents={terms['total_cents']} ≠ "
        f"expected {expected_total_cents}"
    )

    # Snapshot pricing must match what the email will render.
    pricing = (terms.get("snapshot") or {}).get("pricing") or {}
    assert pricing.get("total_cents") == expected_total_cents, (
        f"snapshot.pricing.total_cents={pricing.get('total_cents')} ≠ "
        f"expected {expected_total_cents}"
    )
    assert pricing.get("commission_cents") == 0, (
        "Pay-in-Person sales must record 0 commission in the snapshot"
    )

    # ── 4) send-sale-notification must succeed for cash_purchase_request.
    #    Its code path reads transaction_terms BY terms_id first; if that
    #    throws, the function returns HTTP 500. We assert 200 + success.
    code, resp = fn_invoke(
        "send-sale-notification",
        access_token,
        {
            "transaction_id": tx_id,
            "notification_type": "cash_purchase_request",
        },
    )
    assert code == 200, f"send-sale-notification → {code}: {resp!r}"
    assert isinstance(resp, dict), resp
    assert resp.get("success") is True, f"function reported failure: {resp!r}"
    assert resp.get("isCashSale") is True, (
        f"function did not classify this sale as cash: {resp!r}"
    )
    print(
        f"send-sale-notification ok: sent={resp.get('sent')} "
        f"errors={resp.get('errors')} "
    )

    print(
        "PASS: cash sale stores terms_id; downstream cash "
        "notification resolves the same transaction_terms row."
    )
    return 0


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
