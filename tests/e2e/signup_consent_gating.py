"""
Signup consent gating — /auth?mode=signup

Contract under test
-------------------
1. The Terms + Privacy acceptance checkbox rendered in AuthFormPanel is
   NEVER preselected — regulators & the consent memo require an
   affirmative click by the user before we may write a consent row.
2. The primary "Create account" submit button is disabled until that
   checkbox is checked. Marketing opt-in is separate and does NOT gate
   submit.
3. After checking the box, the submit button becomes enabled.

Why this test exists
--------------------
Session-deferred consent (see src/lib/pendingSignupConsent.ts) only
survives an email-verification round-trip if we know the user actually
ticked the checkbox in-session. A regression that preselects the box or
disables gating would silently produce false consent records.

The test never submits the form — it only asserts UI gating, so it
runs without network side effects or new auth users.

Run:
    python3 tests/e2e/signup_consent_gating.py
"""

import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

TOS_TID = '[data-testid="signup-tos-checkbox"]'
MARKETING_TID = '[data-testid="signup-marketing-checkbox"]'


async def submit_button(page):
    """The submit button carries no dedicated testid, so match by role
    + accessible name variants shipped in AuthFormPanel."""
    import re
    return page.get_by_role(
        "button", name=re.compile(r"Create\s+account|Sign\s+up", re.I)
    ).last


async def run() -> int:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        try:
            await page.goto(f"{BASE}/auth?mode=signup", wait_until="domcontentloaded")

            tos = page.locator(TOS_TID).first
            await tos.wait_for(state="visible", timeout=8000)

            # ── Assertion 1: not preselected. ────────────────────────
            checked = await tos.is_checked()
            assert not checked, (
                "signup TOS checkbox is preselected — consent must require an "
                "affirmative click. Fix: remove any defaultChecked / initial "
                "state=true from AuthFormPanel."
            )
            print("PASS: TOS checkbox is not preselected")

            # Marketing box, if present, must also not be preselected —
            # marketing opt-in is separate and revocable.
            marketing = page.locator(MARKETING_TID).first
            if await marketing.count():
                assert not await marketing.is_checked(), (
                    "marketing opt-in checkbox is preselected — must be opt-in."
                )
                print("PASS: marketing opt-in is not preselected")

            # ── Fill enough of the form that only consent is blocking. ──
            # AuthFormPanel validates client-side, but the submit button
            # gating we care about is TOS-only. Filling avoids a false
            # "empty inputs disable the button" pass.
            import re
            for label, value in [
                ("First name", "Consent"),
                ("Last name", "Gate"),
                ("Email", "consent-gate-e2e@example.com"),
                ("Password", "S3cret-Passw0rd!"),
                ("Phone", "5551234567"),
            ]:
                inp = page.get_by_label(re.compile(rf"^{label}", re.I)).first
                try:
                    if await inp.is_visible(timeout=500):
                        await inp.fill(value)
                except Exception:
                    pass

            btn = await submit_button(page)
            await btn.wait_for(state="visible", timeout=4000)
            await page.screenshot(path=str(SHOTS / "signup_gate_1_before.png"))

            # ── Assertion 2: submit disabled while checkbox unchecked. ──
            disabled_before = await btn.is_disabled()
            assert disabled_before, (
                "Create-account button is enabled without TOS acceptance — "
                "the form must gate submission on the signup consent checkbox."
            )
            print("PASS: submit disabled without TOS acceptance")

            # ── Tick the checkbox and re-check gating. ────────────────
            await tos.check(force=True)
            assert await tos.is_checked(), "checkbox did not become checked"
            await page.screenshot(path=str(SHOTS / "signup_gate_2_agreed.png"))

            # Give React a tick to propagate disabled state.
            await page.wait_for_timeout(200)

            disabled_after = await btn.is_disabled()
            assert not disabled_after, (
                "Create-account button remained disabled after checking the "
                "TOS box — gating must release once consent is affirmed."
            )
            print("PASS: submit enabled after TOS acceptance")

            print("OK: signup consent gating contract holds")
            return 0
        finally:
            await context.close()
            await browser.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))
