// Sends a password reset email via the premium Satin Lux `generic-notice`
// template, routed through the Lovable Emails queue (no direct Resend usage).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

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
    const { email, resetLink, userName } = (await req.json()) as PasswordResetEmailRequest;

    if (!email || !resetLink) {
      return new Response(
        JSON.stringify({ error: "email and resetLink are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const greeting = userName ? `Hi ${userName},` : "Hi there,";

    const { error } = await invokeTransactionalEmail({
        templateName: "generic-notice",
        recipientEmail: email,
        // One token per address; reusing the same key suppresses duplicates within the window.
        idempotencyKey: `password-reset-${email.toLowerCase()}-${Date.now()}`,
        templateData: {
          preview: "Reset your Vendibook password",
          kicker: "Account security",
          heading: "Reset your password",
          greeting,
          paragraphs: [
            "We received a request to reset the password for your Vendibook account. Use the secure link below to choose a new one.",
            "If you didn't ask for this, you can safely ignore this email — your password will stay the same.",
          ],
          alert: {
            tone: "warning",
            title: "Security notice",
            body: "This link expires in 1 hour. For your safety, never share it with anyone.",
          },
          ctaLabel: "Reset password",
          ctaUrl: resetLink,
          footnote: "Need help? Call (725) 755-9598 or email support@vendibook.com.",
        },
      });

    if (error) {
      console.error("Failed to enqueue password reset email:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Failed to send" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password reset email enqueued for:", email);
    return new Response(
      JSON.stringify({ success: true }),
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
