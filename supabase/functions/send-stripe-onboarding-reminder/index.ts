import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-ONBOARDING-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const resend = new Resend(resendKey);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find users who:
    // 1. Have a Stripe account ID (started onboarding)
    // 2. Have NOT completed onboarding
    // 3. Started onboarding more than 24 hours ago
    // 4. Started onboarding less than 7 days ago (don't spam forever)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteUsers, error: queryError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, stripe_onboarding_started_at')
      .not('stripe_account_id', 'is', null)
      .or('stripe_onboarding_complete.is.null,stripe_onboarding_complete.eq.false')
      .lt('stripe_onboarding_started_at', twentyFourHoursAgo)
      .gt('stripe_onboarding_started_at', sevenDaysAgo);

    if (queryError) {
      throw new Error(`Database query error: ${queryError.message}`);
    }

    logStep("Found incomplete onboarding users", { count: incompleteUsers?.length ?? 0 });

    if (!incompleteUsers || incompleteUsers.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No users need reminders",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of incompleteUsers) {
      if (!user.email) {
        logStep("Skipping user without email", { userId: user.id });
        continue;
      }

      const firstName = user.full_name?.split(' ')[0] || 'there';
      const dashboardUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/dashboard`;

      try {
        const { error: emailError } = await resend.emails.send({
          from: "Vendibook <updates@vendibook.com>",
          to: [user.email],
          subject: "Complete your Vendibook payment setup",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Vendibook</h1>
                </div>
                
                <h2 style="color: #1a1a1a; font-size: 20px;">Hey ${firstName}! 👋</h2>
                
                <p>We noticed you started setting up your Stripe account on Vendibook but haven't finished yet.</p>
                
                <p>Completing your payment setup only takes a few minutes and will allow you to:</p>
                
                <ul style="padding-left: 20px;">
                  <li>✅ Publish your listings</li>
                  <li>✅ Accept bookings from customers</li>
                  <li>✅ Receive payouts directly to your bank account</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://vendibook.lovable.app/dashboard" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Complete Setup
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  If you have any questions or need help, just reply to this email and we'll be happy to assist!
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  You're receiving this email because you started the payment setup process on Vendibook.
                  <br><br>
                  Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a>
                  <br>
                  © ${new Date().getFullYear()} Vendibook. All rights reserved.
                </p>
              </body>
            </html>
          `,
        });

        if (emailError) {
          logStep("Failed to send email", { userId: user.id, error: emailError.message });
          errors.push(`User ${user.id}: ${emailError.message}`);
        } else {
          logStep("Email sent successfully", { userId: user.id, email: user.email });
          sentCount++;
        }
      } catch (sendError) {
        const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
        logStep("Error sending email", { userId: user.id, error: errorMsg });
        errors.push(`User ${user.id}: ${errorMsg}`);
      }
    }

    logStep("Completed sending reminders", { sent: sentCount, errors: errors.length });

    return new Response(JSON.stringify({ 
      success: true,
      sent: sentCount,
      total: incompleteUsers.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
