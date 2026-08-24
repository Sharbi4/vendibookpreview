import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  firstName?: string;
  listingTitle?: string;
  listingPrice?: string;
  listingLocation?: string;
  listingId?: string;
  photoCount?: number;
  videoCount?: number;
  missingItem?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Admin-only: this endpoint sends a real email to a caller-supplied address.
    const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const { data: userData } = bearer
      ? await admin.auth.getUser(bearer)
      : { data: { user: null } as any };
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const data: TestEmailRequest = await req.json();
    if (!data.to) {
      return new Response(JSON.stringify({ error: "Recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error } = await invokeTransactionalEmail({
        templateName: "listing-draft-nudge",
        recipientEmail: data.to,
        idempotencyKey: `test-draft-${data.to}-${Date.now()}`,
        templateData: {
          name: data.firstName,
          listingTitle: data.listingTitle,
          listingPrice: data.listingPrice,
          listingLocation: data.listingLocation,
          listingId: data.listingId,
          missingItem: data.missingItem,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-test-draft-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
