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

    logStep("Callback request received", { name: name?.substring(0, 20), scheduledDate, scheduledTime });

    // Validate required fields
    if (!name || !phone || !scheduledDate || !scheduledTime) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, phone, scheduledDate, scheduledTime" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate and sanitize inputs
    const trimmedName = String(name).trim();
    const trimmedPhone = String(phone).trim();
    
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be between 2 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate phone format (10-20 digits with optional formatting characters)
    const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;
    if (!dateRegex.test(scheduledDate)) {
      return new Response(
        JSON.stringify({ error: "Invalid date format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scheduledDateObj = new Date(scheduledDate);
    const formattedDate = scheduledDateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Escape HTML in name and phone to prevent XSS in email
    const escapedName = trimmedName.replace(/[<>&"']/g, (c) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });
    const escapedPhone = trimmedPhone.replace(/[<>&"']/g, (c) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });

    // Create Zendesk ticket first (primary tracking method)
    let zendeskTicketId: number | null = null;
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
                subject: `📞 [Scheduled Callback] ${trimmedName} - ${formattedDate} at ${scheduledTime} EST`,
                comment: {
                  body: `Callback request from ${trimmedName}\n\nPhone: ${trimmedPhone}\nScheduled Date: ${formattedDate}\nScheduled Time: ${scheduledTime} EST\n\nPlease call this customer at the scheduled time.`,
                },
                priority: 'high',
                type: 'task',
                requester: {
                  name: trimmedName,
                },
                tags: ['vendibook', 'scheduled-callback', 'callback-request'],
                custom_fields: [
                  { id: 'phone', value: trimmedPhone }
                ],
              },
            }),
          }
        );

        if (ticketResponse.ok) {
          const ticketData = await ticketResponse.json();
          zendeskTicketId = ticketData.ticket?.id;
          logStep("Zendesk ticket created", { ticketId: zendeskTicketId });
        } else {
          const errorText = await ticketResponse.text();
          logStep("Zendesk ticket creation failed", { status: ticketResponse.status, error: errorText });
        }
      } catch (zendeskError) {
        logStep("Zendesk error", { error: String(zendeskError) });
      }
    } else {
      logStep("Zendesk API key not configured - skipping ticket creation");
    }

    // Send notification email to support team (non-blocking)
    try {
      await sendEmail(RESEND_API_KEY, {
        from: "Vendibook <noreply@vendibook.com>",
        to: ["support@vendibook.com"],
        subject: `📞 Scheduled Callback: ${escapedName} - ${formattedDate} at ${scheduledTime} EST`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📞 Callback Scheduled</h1>
            </div>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapedName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                    <a href="tel:${encodeURIComponent(trimmedPhone)}" style="color: #FF5124;">${escapedPhone}</a>
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
              ${zendeskTicketId ? `<p style="margin-top: 15px; font-size: 12px; color: #666;">Zendesk Ticket #${zendeskTicketId}</p>` : ''}
              <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #FF5124;">
                <strong>⏰ Reminder:</strong> Call ${escapedName} at <a href="tel:${encodeURIComponent(trimmedPhone)}" style="color: #FF5124; font-weight: bold;">${escapedPhone}</a> on ${formattedDate} at ${scheduledTime} EST.
              </div>
            </div>
          </div>
        `,
      });
      logStep("Support notification email sent");
    } catch (emailError) {
      logStep("Email notification failed (non-blocking)", { error: String(emailError) });
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
