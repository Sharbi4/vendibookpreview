import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULE-CALLBACK] ${step}${detailsStr}`);
};

interface CallbackRequest {
  name: string;
  phone: string;
  scheduledDate: string;
  scheduledTime: string;
}

const sendEmail = async (apiKey: string, emailData: { from: string; to: string[]; subject: string; html: string }) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const ZENDESK_SUBDOMAIN = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook";
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const data: CallbackRequest = await req.json();
    const { name, phone, scheduledDate, scheduledTime } = data;

    logStep("Callback request received", { name, phone, scheduledDate, scheduledTime });

    // Validate inputs
    if (!name || !phone || !scheduledDate || !scheduledTime) {
      throw new Error("Missing required fields");
    }

    const scheduledDateObj = new Date(scheduledDate);
    const formattedDate = scheduledDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send notification to support team
    await sendEmail(RESEND_API_KEY, {
      from: "Vendibook <noreply@vendibook.com>",
      to: ["support@vendibook.com"],
      subject: `📞 Scheduled Callback: ${name} - ${formattedDate} at ${scheduledTime} EST`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📞 Callback Scheduled</h1>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <a href="tel:${phone}" style="color: #FF5124;">${phone}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Date:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold;">Time:</td>
                <td style="padding: 10px 0;">${scheduledTime} EST</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #FF5124;">
              <strong>⏰ Reminder:</strong> Call ${name} at <a href="tel:${phone}" style="color: #FF5124; font-weight: bold;">${phone}</a> on ${formattedDate} at ${scheduledTime} EST.
            </div>
          </div>
        </div>
      `,
    });

    logStep("Support notification email sent");

    // Create Zendesk ticket if configured
    if (ZENDESK_API_KEY) {
      try {
        const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
        const ticketResponse = await fetch(
          `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`,
            },
            body: JSON.stringify({
              ticket: {
                subject: `[Scheduled Callback] ${name} - ${formattedDate} at ${scheduledTime}`,
                description: `Callback request from ${name}\n\nPhone: ${phone}\nScheduled Date: ${formattedDate}\nScheduled Time: ${scheduledTime} EST\n\nPlease call this customer at the scheduled time.`,
                priority: 'high',
                type: 'task',
                requester: {
                  name: name,
                  phone: phone,
                },
                tags: ['vendibook', 'scheduled-callback', 'callback-request'],
              },
            }),
          }
        );

        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          logStep("Zendesk ticket created", { ticketId: ticketData.ticket?.id });
        }
      } catch (zendeskError) {
        logStep("Zendesk error (non-blocking)", { error: String(zendeskError) });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Callback scheduled successfully",
        scheduledFor: `${formattedDate} at ${scheduledTime} EST`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
