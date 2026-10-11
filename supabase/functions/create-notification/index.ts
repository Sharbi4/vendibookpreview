// Creates an in-app notification and (optionally) sends a matching email via
// the premium `generic-notice` template through the Lovable Emails queue.
// No direct Resend usage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCaller, internalOnlyResponse } from "../_shared/internalAuth.ts";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

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
    booking_request: { email: "booking_request_email", inapp: "booking_request_inapp" },
    booking_response: { email: "booking_response_email", inapp: "booking_response_inapp" },
    booking_approved: { email: "booking_response_email", inapp: "booking_response_inapp" },
    booking_declined: { email: "booking_response_email", inapp: "booking_response_inapp" },
    message: { email: "message_email", inapp: "message_inapp" },
    document: { email: "document_email", inapp: "document_inapp" },
    document_uploaded: { email: "document_email", inapp: "document_inapp" },
    document_approved: { email: "document_email", inapp: "document_inapp" },
    document_rejected: { email: "document_email", inapp: "document_inapp" },
    sale: { email: "sale_email", inapp: "sale_inapp" },
    sale_confirmed: { email: "sale_email", inapp: "sale_inapp" },
    dispute: { email: "dispute_email", inapp: "dispute_inapp" },
    dispute_raised: { email: "dispute_email", inapp: "dispute_inapp" },
    dispute_resolved: { email: "dispute_email", inapp: "dispute_inapp" },
  };
  return typeMap[type] || null;
};

const toneForType = (type: string): "neutral" | "success" | "warning" | "danger" | "info" => {
  if (type.includes("approved") || type.includes("confirmed")) return "success";
  if (type.includes("rejected") || type.includes("declined")) return "danger";
  if (type.includes("dispute")) return "warning";
  if (type.includes("request") || type.includes("uploaded")) return "info";
  return "neutral";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isInternalCaller(req)) {
    return internalOnlyResponse(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      user_id,
      type,
      title,
      message,
      link,
      send_email = true,
      email_subject,
    } = (await req.json()) as NotificationRequest;

    console.log("Creating notification:", { user_id, type, title });

    if (!user_id || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "user_id, type, title, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: preferences } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    const preferenceKeys = getPreferenceKey(type);
    const shouldSendInapp = preferences && preferenceKeys
      ? preferences[preferenceKeys.inapp] !== false
      : true;
    const shouldSendEmail = preferences && preferenceKeys
      ? preferences[preferenceKeys.email] !== false
      : true;

    let notification = null;

    if (shouldSendInapp) {
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .insert({ user_id, type, title, message, link })
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
    }

    let emailQueued = false;
    if (send_email && shouldSendEmail) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", user_id)
          .single();

        if (profile?.email) {
          const baseUrl = Deno.env.get("SITE_URL") || "https://vendibook.com";
          const actionLink = link ? (link.startsWith("http") ? link : `${baseUrl}${link}`) : baseUrl;

          const { error: emailError } = await invokeTransactionalEmail({
              templateName: "generic-notice",
              recipientEmail: profile.email,
              idempotencyKey: notification?.id
                ? `notif-${notification.id}`
                : `notif-${user_id}-${type}-${Date.now()}`,
              templateData: {
                preview: email_subject || title,
                kicker: type.replace(/_/g, " "),
                heading: title,
                greeting: `Hi ${profile.full_name || "there"},`,
                paragraphs: [message],
                alert: { tone: toneForType(type), body: title },
                ctaLabel: link ? "View details" : undefined,
                ctaUrl: link ? actionLink : undefined,
                footnote: "Manage your notification preferences from your account settings.",
              },
            });
          if (emailError) throw emailError;
          emailQueued = true;
          console.log("Email enqueued via Lovable Emails:", profile.email);
        }
      } catch (emailError: any) {
        console.error("Failed to enqueue email notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        inapp_sent: shouldSendInapp,
        email_sent: emailQueued,
      }),
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
