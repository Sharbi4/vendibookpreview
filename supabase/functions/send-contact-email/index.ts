import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CONTACT-EMAIL] ${step}${detailsStr}`);
};

// HTML entity encoding to prevent XSS in emails
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Sanitize phone number for tel: links (only allow digits, +, -, spaces, parentheses)
const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d+\-\s()]/g, '');
};

const sendEmail = async (to: string[], subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Vendibook <updates@vendibook.com>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to send email");
  }

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { name, email, phone, subject, message }: ContactRequest = await req.json();
    logStep("Request received", { name, email, subject });

    // Validate required fields
    if (!name || !email || !phone || !subject || !message) {
      logStep("Missing required fields");
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logStep("Invalid email format", { email });
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs (basic length checks)
    if (name.length > 100 || email.length > 255 || phone.length > 20 || subject.length > 200 || message.length > 2000) {
      logStep("Input validation failed: fields too long");
      return new Response(
        JSON.stringify({ error: "Input fields exceed maximum length" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const currentTime = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Sanitize all user inputs for HTML emails to prevent XSS
    const safeName = escapeHtml(name);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const safePhone = sanitizePhone(phone);
    const safePhoneDisplay = escapeHtml(phone);
    // Email is already validated with regex, but escape for display
    const safeEmail = escapeHtml(email);

    // Send notification email to support
    logStep("Sending support notification email");
    
    const supportEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F97316; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .urgent { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
          .value { font-size: 16px; color: #333; margin-top: 4px; }
          .message-box { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e5e5; }
          .cta { background: #F97316; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="urgent">
              <strong>⚡ ACTION REQUIRED:</strong> Call this person within 2 minutes!
            </div>
            
            <div class="field">
              <div class="label">Submitted At</div>
              <div class="value">${currentTime} EST</div>
            </div>

            <div class="field">
              <div class="label">Name</div>
              <div class="value">${safeName}</div>
            </div>
            
            <div class="field">
              <div class="label">📞 Phone Number (CALL NOW!)</div>
              <div class="value" style="font-size: 24px; color: #F97316; font-weight: bold;">
                <a href="tel:${safePhone}" style="color: #F97316; text-decoration: none;">${safePhoneDisplay}</a>
              </div>
            </div>
            
            <div class="field">
              <div class="label">Email</div>
              <div class="value"><a href="mailto:${email}">${safeEmail}</a></div>
            </div>
            
            <div class="field">
              <div class="label">Subject</div>
              <div class="value">${safeSubject}</div>
            </div>
            
            <div class="field">
              <div class="label">Message</div>
              <div class="message-box">${safeMessage}</div>
            </div>
            
            <a href="tel:${safePhone}" class="cta">📞 Call ${safeName} Now</a>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      ["support@vendibook.com"],
      `🔔 URGENT: New Contact Form - ${safeSubject}`,
      supportEmailHtml
    );
    logStep("Support email sent");

    // Send confirmation email to customer
    logStep("Sending customer confirmation email");
    
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #F97316; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: #FEF3C7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Thank You, ${safeName}!</h1>
            <p style="margin:10px 0 0 0; opacity: 0.9;">We have received your message</p>
          </div>
          <div class="content">
            <p>Hi ${safeName},</p>
            
            <p>Thank you for reaching out to Vendibook! We have received your inquiry regarding:</p>
            
            <p><strong>"${safeSubject}"</strong></p>
            
            <div class="highlight">
              <p style="margin:0; font-size: 18px;">📞 <strong>We will call you within 2 minutes</strong></p>
              <p style="margin:10px 0 0 0; color: #666;">during our business hours (Mon-Fri 9am-6pm, Sat 10am-4pm EST)</p>
            </div>
            
            <p>If you submitted this outside of business hours, we will call you first thing when we open.</p>
            
            <p>In the meantime, feel free to browse our marketplace for food trucks, trailers, and mobile food business assets.</p>
            
            <p>Best regards,<br>The Vendibook Team</p>
          </div>
          <div class="footer">
            <p>Vendibook - The marketplace for mobile food businesses</p>
            <p><a href="tel:+18778836342" style="color: #F97316;">1 (877) 883-6342</a> | <a href="mailto:support@vendibook.com">support@vendibook.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      [email],
      `We received your message - Vendibook`,
      customerEmailHtml
    );
    logStep("Customer confirmation email sent");

    // Create Zendesk ticket in background
    try {
      const zendeskResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-zendesk-ticket`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            requester_name: name,
            requester_email: email,
            requester_phone: phone,
            subject: `[Contact Form] ${subject}`,
            description: `Contact form submission from ${name}\n\nPhone: ${phone}\nEmail: ${email}\n\nMessage:\n${message}\n\nSubmitted at: ${currentTime} EST`,
            priority: 'high',
            type: 'question',
            tags: ['vendibook', 'contact-form', 'callback-requested'],
          }),
        }
      );
      
      if (zendeskResponse.ok) {
        const zendeskResult = await zendeskResponse.json();
        logStep("Zendesk ticket created", { ticketId: zendeskResult.ticket_id });
      } else {
        const errorData = await zendeskResponse.json();
        logStep("Zendesk ticket creation failed", { error: errorData });
      }
    } catch (zendeskError: any) {
      logStep("Zendesk integration error (non-blocking)", { error: zendeskError.message });
    }

    logStep("Function completed successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
