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
    const baseUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
    const actionLink = `${baseUrl}${link}`;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@vendibook.com>",
      to: recipient_email,
      subject: `New message from ${sender_name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">VendiBook</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #111; margin-top: 0;">New message from ${sender_name}</h2>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f97316;">
              <p style="color: #666; font-size: 14px; margin: 0; font-style: italic;">"${message_preview}"</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${actionLink}" style="display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Message</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              You received this email because you have message notifications enabled. 
              <a href="${baseUrl}/notification-preferences" style="color: #f97316;">Manage preferences</a>
            </p>
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
