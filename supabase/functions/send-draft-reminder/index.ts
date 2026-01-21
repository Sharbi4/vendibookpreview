import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DRAFT-REMINDER] ${step}${detailsStr}`);
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

    // Find draft listings older than 24 hours that haven't been nudged
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: draftListings, error: queryError } = await supabaseClient
      .from('listings')
      .select('id, title, host_id, created_at')
      .eq('status', 'draft')
      .lt('created_at', twentyFourHoursAgo)
      .gt('created_at', sevenDaysAgo);

    if (queryError) {
      throw new Error(`Database query error: ${queryError.message}`);
    }

    logStep("Found draft listings", { count: draftListings?.length ?? 0 });

    if (!draftListings || draftListings.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No drafts need reminders",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get unique host IDs
    const hostIds = [...new Set(draftListings.map(l => l.host_id))];

    // Fetch host profiles that haven't been nudged recently
    const { data: hosts, error: hostsError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, draft_nudge_sent_at')
      .in('id', hostIds)
      .or('draft_nudge_sent_at.is.null,draft_nudge_sent_at.lt.' + twentyFourHoursAgo);

    if (hostsError) {
      throw new Error(`Failed to fetch hosts: ${hostsError.message}`);
    }

    logStep("Eligible hosts for nudge", { count: hosts?.length ?? 0 });

    let sentCount = 0;
    const errors: string[] = [];

    for (const host of hosts || []) {
      if (!host.email) {
        logStep("Skipping host without email", { hostId: host.id });
        continue;
      }

      // Get this host's drafts
      const hostDrafts = draftListings.filter(l => l.host_id === host.id);
      const draftTitles = hostDrafts.map(d => d.title || 'Untitled').slice(0, 3).join(', ');
      const firstName = host.full_name?.split(' ')[0] || 'there';

      try {
        const { error: emailError } = await resend.emails.send({
          from: "VendiBook <noreply@updates.vendibook.com>",
          to: [host.email],
          subject: "Your listing is almost ready to go live!",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  @font-face {
                    font-family: 'Sofia Pro Soft';
                    src: url('https://vendibook-docs.s3.us-east-1.amazonaws.com/documents/sofiaprosoftlight-webfont.woff') format('woff');
                    font-weight: 300;
                    font-style: normal;
                  }
                </style>
              </head>
              <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">Vendibook</h1>
                </div>
                
                <h2 style="color: #1a1a1a; font-size: 20px;">Hey ${firstName}! 👋</h2>
                
                <p>You started a listing but haven't published it yet:</p>
                
                <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: 600;">${draftTitles}</p>
                  ${hostDrafts.length > 3 ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">+ ${hostDrafts.length - 3} more draft(s)</p>` : ''}
                </div>
                
                <p>Finish adding your details and pricing to start earning:</p>
                
                <ul style="padding-left: 20px;">
                  <li>✅ Add photos that showcase your asset</li>
                  <li>✅ Set competitive pricing</li>
                  <li>✅ Connect Stripe to get paid</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://vendibook.com/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Complete Your Listing
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Need help? Reply to this email or call us.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
                  <br>
                  © ${new Date().getFullYear()} Vendibook. All rights reserved.
                </p>
              </body>
            </html>
          `,
        });

        if (emailError) {
          logStep("Failed to send email", { hostId: host.id, error: emailError.message });
          errors.push(`Host ${host.id}: ${emailError.message}`);
        } else {
          // Update nudge timestamp
          await supabaseClient
            .from('profiles')
            .update({ draft_nudge_sent_at: new Date().toISOString() })
            .eq('id', host.id);

          logStep("Email sent successfully", { hostId: host.id, email: host.email });
          sentCount++;
        }
      } catch (sendError) {
        const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
        logStep("Error sending email", { hostId: host.id, error: errorMsg });
        errors.push(`Host ${host.id}: ${errorMsg}`);
      }
    }

    logStep("Completed sending reminders", { sent: sentCount, errors: errors.length });

    return new Response(JSON.stringify({ 
      success: true,
      sent: sentCount,
      total: hosts?.length ?? 0,
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
