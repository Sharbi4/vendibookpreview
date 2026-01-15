import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zendesk-webhook-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ZENDESK-WEBHOOK] ${step}${detailsStr}`);
};

interface ZendeskWebhookPayload {
  ticket_id: string;
  ticket_external_id?: string; // We store transaction_id here
  comment: {
    id: string;
    body: string;
    public: boolean;
    created_at: string;
    author: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Initialize Supabase client with service role for inserting
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ZendeskWebhookPayload = await req.json();
    logStep("Payload parsed", { 
      ticket_id: payload.ticket_id,
      comment_id: payload.comment?.id,
      external_id: payload.ticket_external_id 
    });

    // Validate required fields
    if (!payload.ticket_id || !payload.comment?.id || !payload.comment?.body) {
      logStep("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to find the transaction by external_id (which we set as transaction_id)
    let transactionId: string | null = null;
    
    if (payload.ticket_external_id) {
      // First check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(payload.ticket_external_id)) {
        // Verify the transaction exists
        const { data: transaction } = await supabase
          .from("sale_transactions")
          .select("id")
          .eq("id", payload.ticket_external_id)
          .single();
        
        if (transaction) {
          transactionId = transaction.id;
          logStep("Found transaction by external_id", { transactionId });
        }
      }
    }

    // Check if this comment already exists (idempotency)
    const { data: existingComment } = await supabase
      .from("zendesk_ticket_comments")
      .select("id")
      .eq("zendesk_comment_id", payload.comment.id.toString())
      .single();

    if (existingComment) {
      logStep("Comment already exists, skipping", { zendesk_comment_id: payload.comment.id });
      return new Response(
        JSON.stringify({ success: true, message: "Comment already synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the comment
    const { data: insertedComment, error: insertError } = await supabase
      .from("zendesk_ticket_comments")
      .insert({
        transaction_id: transactionId,
        zendesk_ticket_id: payload.ticket_id.toString(),
        zendesk_comment_id: payload.comment.id.toString(),
        author_name: payload.comment.author?.name || "Unknown",
        author_email: payload.comment.author?.email || null,
        author_role: payload.comment.author?.role || "unknown",
        body: payload.comment.body,
        is_public: payload.comment.public ?? true,
        zendesk_created_at: payload.comment.created_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logStep("Error inserting comment", { error: insertError.message });
      return new Response(
        JSON.stringify({ error: "Failed to insert comment", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Comment synced successfully", { 
      id: insertedComment.id,
      zendesk_ticket_id: payload.ticket_id 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        comment_id: insertedComment.id,
        message: "Comment synced successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Unexpected error", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
