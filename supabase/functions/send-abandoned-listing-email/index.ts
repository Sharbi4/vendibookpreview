import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AbandonedListingEmailRequest {
  to: string;
  firstName?: string;
  category?: string;
  photoCount?: number;
  lastStep?: string;
  listingId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const data: AbandonedListingEmailRequest = await req.json();
    if (!data.to) {
      return new Response(JSON.stringify({ error: "Recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await invokeTransactionalEmail({
        templateName: "listing-draft-nudge",
        recipientEmail: data.to,
        idempotencyKey: `abandoned-${data.to}-${data.listingId || data.lastStep || "draft"}`,
        templateData: {
          name: data.firstName,
          category: data.category,
          photoCount: data.photoCount,
          lastStep: data.lastStep,
          listingId: data.listingId,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-abandoned-listing-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
