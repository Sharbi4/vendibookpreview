import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYOUT-NOTIFICATION] ${step}${detailsStr}`);
};

type PayoutType = 'rental' | 'sale';
type PayoutStatus = 'completed' | 'failed' | 'pending';

interface PayoutNotificationRequest {
  host_id: string;
  booking_id?: string;
  transaction_id?: string;
  payout_type: PayoutType;
  payout_status: PayoutStatus;
  payout_amount: number;
  listing_title: string;
  transfer_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const payload: PayoutNotificationRequest = await req.json();
    logStep("Received payload", payload as unknown as Record<string, unknown>);

    const { 
      host_id, 
      booking_id, 
      transaction_id,
      payout_type, 
      payout_status, 
      payout_amount, 
      listing_title,
      transfer_id 
    } = payload;

    // Fetch host profile
    const { data: hostProfile, error: hostError } = await supabaseClient
      .from('profiles')
      .select('email, full_name, display_name')
      .eq('id', host_id)
      .maybeSingle();

    if (hostError || !hostProfile?.email) {
      logStep("Host profile not found or no email", { hostError, host_id });
      return new Response(
        JSON.stringify({ error: "Host email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hostName = hostProfile.display_name || hostProfile.full_name || 'Host';
    logStep("Host found", { email: hostProfile.email, name: hostName });

    // Generate email content based on type and status
    let subject: string;
    let htmlContent: string;

    const formattedAmount = payout_amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });

    if (payout_status === 'completed') {
      subject = payout_type === 'rental' 
        ? `💰 Rental Payout Sent - $${formattedAmount} on the way!`
        : `💰 Sale Payout Sent - $${formattedAmount} on the way!`;

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://vendibook.com/images/vendibook-email-logo.png" alt="Vendibook" style="height: 40px; margin-bottom: 16px;">
          </div>
          
          <!-- Success Banner -->
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 12px;">💰</div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 700;">Your Payout is On Its Way!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Funds are being transferred to your bank account</p>
          </div>

          <!-- Greeting -->
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${hostName},
          </p>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Great news! Your ${payout_type === 'rental' ? 'rental' : 'sale'} payout for <strong style="color: #1a1a1a;">${listing_title}</strong> has been successfully processed and transferred to your connected bank account.
          </p>

          <!-- Payout Details Card -->
          <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 16px; padding: 28px; margin: 28px 0; border: 1px solid #86efac;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px; text-align: center;" colspan="2">Payout Amount</td>
              </tr>
              <tr>
                <td style="color: #15803d; font-size: 42px; font-weight: 800; text-align: center; padding-bottom: 16px;" colspan="2">$${formattedAmount}</td>
              </tr>
              <tr>
                <td style="color: #166534; padding: 8px 0; font-size: 14px;">Type:</td>
                <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${payout_type === 'rental' ? 'Rental Earnings' : 'Sale Proceeds'}</td>
              </tr>
              <tr>
                <td style="color: #166534; padding: 8px 0; font-size: 14px;">Listing:</td>
                <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${listing_title}</td>
              </tr>
              ${transfer_id ? `
              <tr>
                <td style="color: #166534; padding: 8px 0; font-size: 14px;">Transfer ID:</td>
                <td style="color: #166534; padding: 8px 0; font-size: 12px; text-align: right; font-family: monospace;">${transfer_id}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Timeline Info -->
          <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #0284c7;">
            <div style="display: flex; align-items: flex-start;">
              <span style="font-size: 20px; margin-right: 12px;">🏦</span>
              <div>
                <h3 style="color: #0369a1; margin: 0 0 8px; font-size: 16px; font-weight: 600;">When will I receive my funds?</h3>
                <p style="color: #0c4a6e; margin: 0; font-size: 14px; line-height: 1.6;">
                  Funds typically arrive in your bank account within <strong>2-3 business days</strong>. The exact timing depends on your bank's processing schedule.
                </p>
              </div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://vendibook.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7B54 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
              View Your Dashboard
            </a>
          </div>

          <!-- Thank You Note -->
          <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center;">
            <p style="color: #6a6a6a; font-size: 14px; margin: 0 0 8px;">
              Thank you for being a valued host on Vendibook! 🙌
            </p>
            <p style="color: #9a9a9a; font-size: 13px; margin: 0;">
              Keep listing and earning with us.
            </p>
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
            <p style="color: #4a4a4a; font-size: 14px; margin: 0;">
              Best regards,<br>
              <strong>The Vendibook Team</strong>
            </p>
            <p style="margin: 12px 0;">
              <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none; font-size: 14px;">1-877-8-VENDI-2</a>
            </p>
            <p style="color: #9a9a9a; font-size: 12px; margin-top: 16px;">
              <a href="https://vendibook.com" style="color: #9a9a9a;">vendibook.com</a>
            </p>
          </div>
        </div>
      `;
    } else if (payout_status === 'failed') {
      subject = `⚠️ Payout Issue - Action Required`;

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <!-- Header with Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://vendibook.com/images/vendibook-email-logo.png" alt="Vendibook" style="height: 40px; margin-bottom: 16px;">
          </div>
          
          <!-- Alert Banner -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 700;">Payout Issue</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">We encountered a problem with your transfer</p>
          </div>

          <!-- Greeting -->
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${hostName},
          </p>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            We tried to transfer your payout of <strong>$${formattedAmount}</strong> for <strong>${listing_title}</strong>, but encountered an issue.
          </p>

          <!-- Issue Details -->
          <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #991b1b; margin: 0 0 12px; font-size: 16px;">What to do:</h3>
            <ol style="color: #7f1d1d; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li>Check that your Stripe account is properly set up</li>
              <li>Verify your bank account details are correct</li>
              <li>Ensure your account is in good standing</li>
            </ol>
          </div>

          <p style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">
            Our team will automatically retry the transfer. If the issue persists, we'll reach out to help you resolve it.
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://vendibook.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7B54 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Check Your Account
            </a>
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
            <p style="color: #4a4a4a; font-size: 14px; margin: 0;">
              Need help? Contact us:<br>
              <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
            </p>
            <p style="color: #4a4a4a; font-size: 14px; margin-top: 16px;">
              Best regards,<br>
              <strong>The Vendibook Team</strong>
            </p>
          </div>
        </div>
      `;
    } else {
      // pending status - informational
      subject = `🕐 Payout Processing - $${formattedAmount}`;

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://vendibook.com/images/vendibook-email-logo.png" alt="Vendibook" style="height: 40px; margin-bottom: 16px;">
          </div>
          
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px; margin-bottom: 12px;">🕐</div>
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; font-weight: 700;">Payout Processing</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">Your transfer is being prepared</p>
          </div>

          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Hi ${hostName}, your payout of <strong>$${formattedAmount}</strong> for <strong>${listing_title}</strong> is being processed. You'll receive another email when the funds are on their way.
          </p>

          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
            <p style="color: #4a4a4a; font-size: 14px; margin: 0;">
              Best regards,<br><strong>The Vendibook Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    // Send the email
    logStep("Sending email", { to: hostProfile.email, subject });

    const emailResponse = await resend.emails.send({
      from: "Vendibook <noreply@updates.vendibook.com>",
      to: [hostProfile.email],
      subject,
      html: htmlContent,
    });

    logStep("Email sent successfully", { emailResponse });

    // Create in-app notification as well
    if (payout_status === 'completed') {
      await supabaseClient.from('notifications').insert({
        user_id: host_id,
        type: 'payout',
        title: 'Payout Sent! 💰',
        message: `Your payout of $${formattedAmount} for "${listing_title}" is on its way to your bank account.`,
        link: '/dashboard',
      });
      logStep("In-app notification created");
    } else if (payout_status === 'failed') {
      await supabaseClient.from('notifications').insert({
        user_id: host_id,
        type: 'payout',
        title: 'Payout Issue ⚠️',
        message: `There was an issue with your payout for "${listing_title}". Please check your Stripe settings.`,
        link: '/dashboard',
      });
      logStep("In-app notification created for failed payout");
    }

    return new Response(
      JSON.stringify({ success: true, email_id: (emailResponse as any)?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("ERROR", { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
