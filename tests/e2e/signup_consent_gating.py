"""
Signup consent gating — /auth?mode=signup

Contract under test
-------------------
1. The Terms + Privacy acceptance checkbox rendered in AuthFormPanel is
   NEVER preselected — regulators & the consent memo require an
   affirmative click by the user before we may write a consent row.
2. Clicking "Create Account" without agreeing MUST:
     a. Surface a visible terms validation error.
     b. NOT hit the Supabase `/auth/v1/signup` endpoint (no user gets
        created, no orchestrator side effects).
3. After checking the box, the terms error clears. (We stop short of
   actually submitting so the test never creates a real auth user.)

Why this test exists
--------------------
Session-deferred consent (see src/lib/pendingSignupConsent.ts) only
survives an email-verification round-trip if we know the user actually
ticked the checkbox in-session. A regression that preselects the box, or
lets signup happen without agreement, would silently produce false or
missing consent records.

Run:
    python3 tests/e2e/signup_consent_gating.py
"""

import asyncio
import os
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Route

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)
BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")

TOS_TID = '[data-testid="signup-tos-checkbox"]'
MARKETING_TID = '[data-testid="signup-marketing-checkbox"]'


async def run() -> int:
    signup_hits: list[str] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Belt-and-braces: block any /auth/v1/signup POST so a false pass
        # can never create a real auth user. We also record every hit so
        # assertion (2b) can prove nothing tried.
        async def guard(route: Route):
            signup_hits.append(route.request.method + " " + route.request.url)
            await route.abort()

        await context.route("**/auth/v1/signup**", guard)

        try:
            await page.goto(f"{BASE}/auth?mode=signup", wait_until="domcontentloaded")

            tos = page.locator(TOS_TID).first
            await tos.wait_for(state="visible", timeout=8000)

            # ── Assertion 1: not preselected. ────────────────────────
            assert not await tos.is_checked(), (
                "signup TOS checkbox is preselected — consent must require an "
                "affirmative click. Fix: remove any defaultChecked / initial "
                "state=true from AuthFormPanel."
            )
            print("PASS: TOS checkbox is not preselected")

            marketing = page.locator(MARKETING_TID).first
            if await marketing.count():
                assert not await marketing.is_checked(), (
                    "marketing opt-in checkbox is preselected — must be opt-in."
                )
                print("PASS: marketing opt-in is not preselected")

            # ── Fill valid inputs so only consent is blocking. ───────
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

            await page.screenshot(path=str(SHOTS / "signup_gate_1_before.png"))

            # ── Assertion 2: submit without agreement blocks + errors. ──
            submit = page.get_by_role(
                "button", name=re.compile(r"Create\s+Account", re.I)
            ).last
            await submit.scroll_into_view_if_needed()
            await submit.click()

            # Terms error should appear (role="alert" or aria-invalid).
            terms_error = page.get_by_role("alert").filter(
                has_text=re.compile(r"Terms|agree", re.I)
            ).first
            try:
                await terms_error.wait_for(state="visible", timeout=3000)
            except Exception:
                aria_invalid = await tos.get_attribute("aria-invalid")
                assert aria_invalid == "true", (
                    "expected a terms validation error after submitting "
                    "without agreement; none appeared and the checkbox is not "
                    "marked aria-invalid. Signup consent is not being enforced."
                )
            await page.screenshot(path=str(SHOTS / "signup_gate_2_error.png"))
            print("PASS: submit without agreement surfaces terms error")

            # Give the request-guard time to catch anything the click may
            # have kicked off, then confirm no signup attempt was made.
            await page.wait_for_timeout(400)
            assert not signup_hits, (
                "Submit called supabase /auth/v1/signup even though the TOS "
                f"checkbox was unchecked: {signup_hits}"
            )
            print("PASS: no /auth/v1/signup request while unagreed")

            # ── Assertion 3: ticking clears the error. ───────────────
            await tos.check(force=True)
            assert await tos.is_checked()
            await page.wait_for_timeout(150)
            still_showing = await page.get_by_role("alert").filter(
                has_text=re.compile(r"Terms|agree", re.I)
            ).count()
            assert still_showing == 0, (
                "terms validation error should clear once the box is ticked"
            )
            print("PASS: terms error clears after acceptance")

            print("OK: signup consent gating contract holds")
            return 0
        finally:
            await context.close()
            await browser.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(run()))

