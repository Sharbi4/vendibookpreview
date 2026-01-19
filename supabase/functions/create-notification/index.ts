import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  send_email?: boolean;
  email_subject?: string;
}

// Map notification types to preference keys
const getPreferenceKey = (type: string): { email: string; inapp: string } | null => {
  const typeMap: Record<string, { email: string; inapp: string }> = {
    booking_request: { email: 'booking_request_email', inapp: 'booking_request_inapp' },
    booking_response: { email: 'booking_response_email', inapp: 'booking_response_inapp' },
    booking_approved: { email: 'booking_response_email', inapp: 'booking_response_inapp' },
    booking_declined: { email: 'booking_response_email', inapp: 'booking_response_inapp' },
    message: { email: 'message_email', inapp: 'message_inapp' },
    document: { email: 'document_email', inapp: 'document_inapp' },
    document_uploaded: { email: 'document_email', inapp: 'document_inapp' },
    document_approved: { email: 'document_email', inapp: 'document_inapp' },
    document_rejected: { email: 'document_email', inapp: 'document_inapp' },
    sale: { email: 'sale_email', inapp: 'sale_inapp' },
    sale_confirmed: { email: 'sale_email', inapp: 'sale_inapp' },
    dispute: { email: 'dispute_email', inapp: 'dispute_inapp' },
    dispute_raised: { email: 'dispute_email', inapp: 'dispute_inapp' },
    dispute_resolved: { email: 'dispute_email', inapp: 'dispute_inapp' },
  };
  return typeMap[type] || null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      type, 
      title, 
      message, 
      link, 
      send_email = true,
      email_subject,
    } = await req.json() as NotificationRequest;

    console.log("Creating notification:", { user_id, type, title });

    if (!user_id || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "user_id, type, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const preferenceKeys = getPreferenceKey(type);
    
    // Default to true if no preferences exist
    const shouldSendInapp = preferences && preferenceKeys 
      ? preferences[preferenceKeys.inapp] !== false 
      : true;
    const shouldSendEmail = preferences && preferenceKeys 
      ? preferences[preferenceKeys.email] !== false 
      : true;

    console.log("Notification preferences:", { shouldSendInapp, shouldSendEmail, type });

    let notification = null;

    // Create in-app notification if enabled
    if (shouldSendInapp) {
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id,
          type,
          title,
          message,
          link,
        })
        .select()
        .single();

      if (notifError) {
        console.error("Failed to create notification:", notifError);
        return new Response(
          JSON.stringify({ error: "Failed to create notification" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      notification = notifData;
      console.log("In-app notification created:", notification.id);
    } else {
      console.log("In-app notification skipped due to user preferences");
    }

    // Send email if requested and enabled
    if (send_email && shouldSendEmail && resendApiKey) {
      try {
        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (profile?.email) {
          const resend = new Resend(resendApiKey);
          
          const baseUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
          const actionLink = link ? `${baseUrl}${link}` : baseUrl;

          await resend.emails.send({
            from: "VendiBook <noreply@vendibook.com>",
            to: profile.email,
            subject: email_subject || title,
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
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">VendiBook</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #111; margin-top: 0;">${title}</h2>
                  <p style="color: #666; font-size: 16px;">Hi ${profile.full_name || "there"},</p>
                  <p style="color: #666; font-size: 16px;">${message}</p>
                  ${link ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${actionLink}" style="display: inline-block; background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Details</a>
                  </div>
                  ` : ""}
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #999; font-size: 12px; text-align: center;">
                    This email was sent by VendiBook. You can manage your notification preferences in your account settings.
                  </p>
                </div>
              </body>
              </html>
            `,
          });

          console.log("Email notification sent to:", profile.email);
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
    } else if (!shouldSendEmail) {
      console.log("Email notification skipped due to user preferences");
    }

    return new Response(
      JSON.stringify({ success: true, notification, inapp_sent: shouldSendInapp, email_sent: shouldSendEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
