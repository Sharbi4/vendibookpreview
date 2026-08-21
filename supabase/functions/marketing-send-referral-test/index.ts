// marketing-send-referral-test — Sends the Vendibook referral program marketing email
// as a TEST to MARKETING_TEST_EMAIL + support@vendibook.com. Matches the visual
// system used by the most recent Resend transactional email (Vendibook Report).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  FROM_EMAIL,
  FROM_NAME,
  REPLY_TO_EMAIL,
  LOGO_LIGHT_URL,
  LOGO_DARK_URL,
  MAILING_ADDRESS,
  VENDIBOOK_BASE_URL,
} from "../_shared/marketing-templates/constants.ts";
import { MK, FONT, radius } from "../_shared/marketing-templates/brand.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Palette derives from the master email design system — no local colors.
const COLORS = {
  bgDark: MK.surface,
  bgWhite: MK.surface,
  bgWarm: MK.canvas,
  orange: MK.orangeOnWhite,
  textDark: MK.text,
  textMuted: MK.textMuted,
  divider: MK.border,
};

function renderReferralEmail(opts: {
  recipientEmail: string;
  dashboardUrl: string;
  termsUrl: string;
}): string {
  const { recipientEmail, dashboardUrl, termsUrl } = opts;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>You could earn $500 just for sharing Vendibook</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgWarm};font-family:${FONT};color:${COLORS.textDark};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Refer a buyer, seller, or renter and get paid when they transact. Up to $500 per qualifying referral.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bgWarm};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLORS.bgWhite};border:1px solid ${COLORS.divider};border-radius:${radius.card};overflow:hidden;">

        <!-- Header bar -->
        <tr>
          <td style="background:${COLORS.bgDark};padding:28px 32px;" align="left">
            <img src="${LOGO_LIGHT_URL}" alt="Vendibook" width="140" style="display:block;width:140px;height:auto;border:0;" />
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:48px 40px 12px 40px;" align="left">
            <p style="margin:0 0 14px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.orange};font-weight:700;">Referral Program</p>
            <h1 style="margin:0 0 18px 0;font-size:34px;line-height:1.15;font-weight:800;color:${COLORS.textDark};letter-spacing:-0.5px;">
              You could earn $500 just for sharing Vendibook.
            </h1>
            <p style="margin:0;font-size:17px;line-height:1.55;color:${COLORS.textMuted};">
              Refer a buyer, seller, or renter — get paid when they transact. No cap on how much you can earn.
            </p>
          </td>
        </tr>

        <!-- Primary CTA -->
        <tr>
          <td style="padding:32px 40px 8px 40px;" align="left">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:${MK.orange};border-radius:${radius.button};">
                <a href="${dashboardUrl}" style="display:inline-block;padding:16px 28px;font-size:15px;font-weight:700;letter-spacing:0.3px;color:#ffffff;text-decoration:none;">
                  Get My Referral Link &rarr;
                </a>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Earning tiers -->
        <tr>
          <td style="padding:40px 40px 8px 40px;" align="left">
            <p style="margin:0 0 18px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.textMuted};font-weight:700;">What You Can Earn</p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:18px 0;border-top:1px solid ${COLORS.divider};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:28px;font-weight:800;color:${COLORS.orange};letter-spacing:-0.5px;width:110px;" valign="top">$500</td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${COLORS.textDark};">Refer a buyer</p>
                        <p style="margin:0;font-size:14px;line-height:1.5;color:${COLORS.textMuted};">When they purchase a food truck, trailer, or commercial equipment.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 0;border-top:1px solid ${COLORS.divider};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:28px;font-weight:800;color:${COLORS.orange};letter-spacing:-0.5px;width:110px;" valign="top">$150</td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${COLORS.textDark};">Refer a seller or host</p>
                        <p style="margin:0;font-size:14px;line-height:1.5;color:${COLORS.textMuted};">When they list and complete their first transaction.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 0;border-top:1px solid ${COLORS.divider};border-bottom:1px solid ${COLORS.divider};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:28px;font-weight:800;color:${COLORS.orange};letter-spacing:-0.5px;width:110px;" valign="top">$50</td>
                      <td valign="top">
                        <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:${COLORS.textDark};">Refer a renter</p>
                        <p style="margin:0;font-size:14px;line-height:1.5;color:${COLORS.textMuted};">When they book a commercial kitchen or commissary.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Opportunity framing -->
        <tr>
          <td style="padding:40px 40px 8px 40px;" align="left">
            <p style="margin:0 0 14px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${COLORS.textMuted};font-weight:700;">Why This Matters</p>
            <p style="margin:0 0 14px 0;font-size:16px;line-height:1.65;color:${COLORS.textDark};">
              You already know the people who are building the next food truck, opening the next ghost kitchen, or upgrading their fleet. Vendibook is where they go to make it happen.
            </p>
            <p style="margin:0;font-size:16px;line-height:1.65;color:${COLORS.textDark};">
              Send them your link. When they transact, we pay you. It's that simple.
            </p>
          </td>
        </tr>

        <!-- Secondary CTA -->
        <tr>
          <td style="padding:36px 40px 48px 40px;" align="left">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:${MK.orange};border-radius:${radius.button};">
                <a href="${dashboardUrl}" style="display:inline-block;padding:16px 28px;font-size:15px;font-weight:700;letter-spacing:0.3px;color:#ffffff;text-decoration:none;">
                  Get My Referral Link &rarr;
                </a>
              </td></tr>
            </table>
            <p style="margin:18px 0 0 0;font-size:13px;color:${COLORS.textMuted};">
              <a href="${termsUrl}" style="color:${COLORS.textMuted};text-decoration:underline;">Full program terms</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${COLORS.bgWarm};padding:28px 40px;border-top:1px solid ${COLORS.divider};" align="left">
            <img src="${LOGO_LIGHT_URL}" alt="Vendibook" width="100" style="display:block;width:100px;height:auto;border:0;margin-bottom:14px;" />
            <p style="margin:0 0 6px 0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
              ${MAILING_ADDRESS}
            </p>
            <p style="margin:0 0 6px 0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
              Sent to ${recipientEmail}.
            </p>
            <p style="margin:0;font-size:12px;color:${COLORS.textMuted};line-height:1.5;">
              <a href="${VENDIBOOK_BASE_URL}" style="color:${COLORS.textMuted};text-decoration:underline;">vendibook.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const overrideTo: string | undefined = body?.to;

    const recipients = new Set<string>();
    if (overrideTo) {
      recipients.add(overrideTo);
    } else {
      const testEmail = Deno.env.get("MARKETING_TEST_EMAIL");
      if (testEmail) recipients.add(testEmail);
      recipients.add("support@vendibook.com");
    }

    const dashboardUrl = `${VENDIBOOK_BASE_URL}/referral/dashboard`;
    const termsUrl = `${VENDIBOOK_BASE_URL}/referral/terms`;
    const subject = "You could earn $500 just for sharing Vendibook";

    const results: Array<{ to: string; ok: boolean; id?: string; error?: string }> = [];

    for (const to of recipients) {
      const html = renderReferralEmail({ recipientEmail: to, dashboardUrl, termsUrl });
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to: [to],
          subject: `[TEST] ${subject}`,
          html,
          reply_to: REPLY_TO_EMAIL,
          tags: [
            { name: "type", value: "marketing_test" },
            { name: "campaign", value: "referral_program_launch" },
          ],
        }),
      });
      const result = await r.json();
      if (!r.ok) {
        console.error("Resend referral test failed", to, result);
        results.push({ to, ok: false, error: result?.message || `HTTP ${r.status}` });
      } else {
        results.push({ to, ok: true, id: result.id });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-send-referral-test error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
