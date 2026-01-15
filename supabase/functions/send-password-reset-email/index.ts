import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetEmailRequest {
  email: string;
  resetLink: string;
  userName?: string;
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

    const { email, resetLink, userName } = await req.json() as PasswordResetEmailRequest;

    console.log("Sending password reset email to:", email);

    if (!email || !resetLink) {
      return new Response(
        JSON.stringify({ error: "email and resetLink are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const siteUrl = Deno.env.get("SITE_URL") || "https://vendibookpreview.lovable.app";
    const logoUrl = `${siteUrl}/images/vendibook-email-logo.png`;

    const emailResponse = await resend.emails.send({
      from: "VendiBook <noreply@updates.vendibook.com>",
      to: email,
      subject: "Reset Your VendiBook Password",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="${logoUrl}" alt="VendiBook" style="max-width: 200px; height: auto; margin-bottom: 16px;" />
              <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Your Mobile Food Business Marketplace</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">🔐</span>
                </div>
                <h1 style="color: #1f2937; font-size: 24px; margin: 0;">Password Reset Request</h1>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                Hi${userName ? ` ${userName}` : ''},
              </p>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We received a request to reset the password for your VendiBook account. Click the button below to create a new password:
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #FF5124 0%, #FF7A50 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              
              <div style="background: #fef3cd; padding: 16px 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
                  <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #FF5124; font-size: 12px; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 8px; margin-top: 8px;">
                ${resetLink}
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
                Need help? Call us at <a href="tel:+18778836342" style="color: #FF5124; text-decoration: none;">1877-8VENDI2</a> or email <a href="mailto:support@vendibook.com" style="color: #FF5124; text-decoration: none;">support@vendibook.com</a>
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} VendiBook. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
