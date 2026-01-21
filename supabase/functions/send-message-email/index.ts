import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageEmailRequest {
  recipient_email: string;
  sender_name: string;
  message_preview: string;
  link: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipient_email, sender_name, message_preview, link } = await req.json() as MessageEmailRequest;

    console.log("Sending message email to:", recipient_email);

    if (!recipient_email) {
      return new Response(
        JSON.stringify({ error: "recipient_email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;
    const actionLink = `${siteUrl}${link}`;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: recipient_email,
      subject: `New message from ${sender_name}`,
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
        <body style="font-family: 'Sofia Pro Soft', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="display: inline-block; background-color: #ffffff; padding: 16px 24px; border-radius: 12px; margin-bottom: 16px;">
                <img src="${logoUrl}" alt="VendiBook" style="max-width: 360px; height: auto;" />
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">💬</span>
                </div>
                <h1 style="color: #1f2937; font-size: 24px; margin: 0;">New Message</h1>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                You have a new message from <strong style="color: #1f2937;">${sender_name}</strong>:
              </p>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #FF5124;">
                <p style="color: #4b5563; font-size: 15px; margin: 0; font-style: italic; line-height: 1.6;">"${message_preview}"</p>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Message</a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                You received this email because you have message notifications enabled.
              </p>
              <p style="margin: 8px 0 0 0;">
                <a href="${siteUrl}/notification-preferences" style="color: #FF5124; font-size: 12px; text-decoration: none;">Manage preferences</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0 0;">
                Need help? Call <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1-877-8-VENDI-2</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Message email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending message email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
