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
  phone?: string;
  email?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  // White Glove popup fields
  restaurantName?: string;
  source?: string;
  preferredTime?: string;
  preferredContact?: 'phone' | 'email';
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
    const rawSubdomain = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook1";
    // Extract just the subdomain in case the full domain was provided
    const ZENDESK_SUBDOMAIN = rawSubdomain.replace(/\.zendesk\.com.*$/i, '').trim();
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "shawnnaharbin@vendibook.com";

    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const data: CallbackRequest = await req.json();
    const { name, phone, email, scheduledDate, scheduledTime, restaurantName, source, preferredTime, preferredContact } = data;

    // Determine if this is a White Glove request (no scheduled date/time, has source)
    const isWhiteGlove = source === 'white-glove-kitchen-popup' || (!scheduledDate && !scheduledTime);

    logStep("Callback request received", { 
      name: name?.substring(0, 20), 
      scheduledDate, 
      scheduledTime,
      source,
      isWhiteGlove,
      preferredContact
    });

    // Validate required fields - White Glove needs name and email (phone is optional)
    if (isWhiteGlove) {
      if (!name || !email) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: name, email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For scheduled callbacks, require name and phone
      if (!name || !phone) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: name, phone" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // For non-White Glove, also require scheduledDate and scheduledTime
    if (!isWhiteGlove && (!scheduledDate || !scheduledTime)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: scheduledDate, scheduledTime" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate and sanitize inputs
    const trimmedName = String(name).trim();
    const trimmedPhone = phone ? String(phone).trim() : '';
    const trimmedEmail = email ? String(email).trim() : '';
    
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be between 2 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate phone format if provided (10-20 digits with optional formatting characters)
    if (trimmedPhone) {
      const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Validate email format if provided
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Escape HTML in name and phone to prevent XSS in email
    const escapedName = trimmedName.replace(/[<>&"']/g, (c) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });
    const escapedPhone = trimmedPhone.replace(/[<>&"']/g, (c) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    });
    const escapedRestaurantName = restaurantName ? String(restaurantName).trim().replace(/[<>&"']/g, (c) => {
      const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[c] || c;
    }) : null;

    // Prepare formatted date/time for scheduled callbacks
    let formattedDate = '';
    let formattedTime = scheduledTime || '';
    
    if (!isWhiteGlove && scheduledDate) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;
      if (!dateRegex.test(scheduledDate)) {
        return new Response(
          JSON.stringify({ error: "Invalid date format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const scheduledDateObj = new Date(scheduledDate);
      formattedDate = scheduledDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Create Zendesk ticket (primary tracking method)
    let zendeskTicketId: number | null = null;
    if (ZENDESK_API_KEY) {
      try {
        const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
        
        // Different ticket content based on request type
        let ticketSubject: string;
        let ticketBody: string;
        let ticketTags: string[];
        
        if (isWhiteGlove) {
          ticketSubject = `🤝 [White Glove] Kitchen Listing Request - ${trimmedName}${escapedRestaurantName ? ` (${escapedRestaurantName})` : ''}`;
          ticketBody = `White Glove Service Request\n\n` +
            `Name: ${trimmedName}\n` +
            `Restaurant: ${escapedRestaurantName || 'Not provided'}\n` +
            `Email: ${trimmedEmail}\n` +
            `Phone: ${trimmedPhone || 'Not provided'}\n` +
            `Preferred Contact Method: ${preferredContact || 'phone'}\n` +
            `Source: ${source || 'white-glove-kitchen-popup'}\n` +
            `Preferred Contact Time: ${preferredTime || 'ASAP'}\n\n` +
            `Action Required: Contact this kitchen owner via their preferred method to help them create their listing.`;
          ticketTags = ['vendibook', 'white-glove', 'kitchen-listing', 'callback-request'];
        } else {
          ticketSubject = `📞 [Scheduled Callback] ${trimmedName} - ${formattedDate} at ${formattedTime} EST`;
          ticketBody = `Callback request from ${trimmedName}\n\n` +
            `Phone: ${trimmedPhone}\n` +
            `Scheduled Date: ${formattedDate}\n` +
            `Scheduled Time: ${formattedTime} EST\n\n` +
            `Please call this customer at the scheduled time.`;
          ticketTags = ['vendibook', 'scheduled-callback', 'callback-request'];
        }
        
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
                subject: ticketSubject,
                comment: { body: ticketBody },
                priority: isWhiteGlove ? 'urgent' : 'high',
                type: 'task',
                requester: { name: trimmedName },
                tags: ticketTags,
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
          logStep("Zendesk ticket created", { ticketId: zendeskTicketId, isWhiteGlove });
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
      const emailSubject = isWhiteGlove 
        ? `🤝 White Glove Request: ${escapedName}${escapedRestaurantName ? ` - ${escapedRestaurantName}` : ''}`
        : `📞 Scheduled Callback: ${escapedName} - ${formattedDate} at ${formattedTime} EST`;
      
      const emailHtml = isWhiteGlove
        ? `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); padding: 20px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🤝 White Glove Service Request</h1>
              </div>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 12px 12px;">
                <p style="margin-bottom: 15px; color: #333;">A busy kitchen owner needs help creating their listing:</p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">Name:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapedName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Restaurant:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapedRestaurantName || 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                      <a href="tel:${encodeURIComponent(trimmedPhone)}" style="color: #FF5124;">${escapedPhone}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; font-weight: bold;">Contact Time:</td>
                    <td style="padding: 10px 0;">${preferredTime === 'asap' ? 'ASAP' : preferredTime || 'ASAP'}</td>
                  </tr>
                </table>
                ${zendeskTicketId ? `<p style="margin-top: 15px; font-size: 12px; color: #666;">Zendesk Ticket #${zendeskTicketId}</p>` : ''}
                <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
                  <strong>🎯 Action:</strong> Call ${escapedName} at <a href="tel:${encodeURIComponent(trimmedPhone)}" style="color: #FF5124; font-weight: bold;">${escapedPhone}</a> to build their kitchen listing.
                </div>
              </div>
            </div>
          </body>
          </html>
        `
        : `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
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
                  <td style="padding: 10px 0;">${formattedTime} EST</td>
                </tr>
              </table>
              ${zendeskTicketId ? `<p style="margin-top: 15px; font-size: 12px; color: #666;">Zendesk Ticket #${zendeskTicketId}</p>` : ''}
              <div style="margin-top: 20px; padding: 15px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #FF5124;">
                <strong>⏰ Reminder:</strong> Call ${escapedName} at <a href="tel:${encodeURIComponent(trimmedPhone)}" style="color: #FF5124; font-weight: bold;">${escapedPhone}</a> on ${formattedDate} at ${formattedTime} EST.
              </div>
            </div>
          </div>
          </body>
          </html>
        `;

      await sendEmail(RESEND_API_KEY, {
        from: "Vendibook <noreply@vendibook.com>",
        to: ["support@vendibook.com"],
        subject: emailSubject,
        html: emailHtml,
      });
      logStep("Support notification email sent");
    } catch (emailError) {
      logStep("Email notification failed (non-blocking)", { error: String(emailError) });
    }


    const responseMessage = isWhiteGlove
      ? "Request submitted successfully. Our team will call you soon!"
      : `Callback scheduled for ${formattedDate} at ${formattedTime} EST`;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: responseMessage,
        ticketId: zendeskTicketId,
        ...(isWhiteGlove ? {} : { scheduledFor: `${formattedDate} at ${formattedTime} EST` })
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
