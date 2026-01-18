import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PENDING-REQUEST-REMINDER] ${step}${detailsStr}`);
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

    // Find pending booking requests older than 60 minutes that haven't been nudged
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingRequests, error: queryError } = await supabaseClient
      .from('booking_requests')
      .select(`
        id,
        created_at,
        start_date,
        end_date,
        total_price,
        host_id,
        host_nudge_sent_at,
        listing:listings(title)
      `)
      .eq('status', 'pending')
      .lt('created_at', sixtyMinutesAgo)
      .gt('created_at', twentyFourHoursAgo)
      .or('host_nudge_sent_at.is.null,host_nudge_sent_at.lt.' + sixtyMinutesAgo);

    if (queryError) {
      throw new Error(`Database query error: ${queryError.message}`);
    }

    logStep("Found pending requests", { count: pendingRequests?.length ?? 0 });

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending requests need reminders",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Group by host
    const requestsByHost = new Map<string, typeof pendingRequests>();
    for (const request of pendingRequests) {
      const hostRequests = requestsByHost.get(request.host_id) || [];
      hostRequests.push(request);
      requestsByHost.set(request.host_id, hostRequests);
    }

    // Fetch host profiles
    const hostIds = [...requestsByHost.keys()];
    const { data: hosts, error: hostsError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', hostIds);

    if (hostsError) {
      throw new Error(`Failed to fetch hosts: ${hostsError.message}`);
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const host of hosts || []) {
      if (!host.email) {
        logStep("Skipping host without email", { hostId: host.id });
        continue;
      }

      const hostRequests = requestsByHost.get(host.id) || [];
      const firstName = host.full_name?.split(' ')[0] || 'there';

      try {
        const requestsList = hostRequests.slice(0, 3).map(r => {
          const listing = r.listing as { title?: string } | null;
          const listingTitle = listing?.title || 'Your listing';
          const startDate = new Date(r.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return `<li style="margin-bottom: 8px;"><strong>${listingTitle}</strong> — ${startDate} — $${r.total_price}</li>`;
        }).join('');

        const { error: emailError } = await resend.emails.send({
          from: "VendiBook <noreply@updates.vendibook.com>",
          to: [host.email],
          subject: `⏰ You have ${hostRequests.length} pending booking request${hostRequests.length > 1 ? 's' : ''}`,
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
                
                <h2 style="color: #1a1a1a; font-size: 20px;">Hey ${firstName}! ⏰</h2>
                
                <p>You have booking request${hostRequests.length > 1 ? 's' : ''} waiting for your response:</p>
                
                <div style="background: #FFF7ED; border-left: 4px solid #FF5124; padding: 16px; margin: 20px 0;">
                  <ul style="margin: 0; padding-left: 20px;">
                    ${requestsList}
                  </ul>
                  ${hostRequests.length > 3 ? `<p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">+ ${hostRequests.length - 3} more request(s)</p>` : ''}
                </div>
                
                <p><strong>Quick responses lead to more bookings!</strong> Hosts who respond within 2 hours are 3x more likely to get repeat customers.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://vendibookpreview.lovable.app/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    Review Requests
                  </a>
                </div>
                
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
          // Update nudge timestamp on all requests for this host
          const requestIds = hostRequests.map(r => r.id);
          await supabaseClient
            .from('booking_requests')
            .update({ host_nudge_sent_at: new Date().toISOString() })
            .in('id', requestIds);

          // Also create in-app notification
          await supabaseClient.from('notifications').insert({
            user_id: host.id,
            type: 'booking_reminder',
            title: 'Pending Booking Requests',
            message: `You have ${hostRequests.length} booking request${hostRequests.length > 1 ? 's' : ''} waiting for your response.`,
            link: '/dashboard',
          });

          logStep("Email sent successfully", { hostId: host.id, email: host.email, requestCount: hostRequests.length });
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
