import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { isAdminOrBackendCaller, isBackendCaller, getCaller, isAllowedTestRecipient, forbiddenResponse } from "../_shared/callerGuard.ts";

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
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();
  try {
    const data: AbandonedListingEmailRequest = await req.json();
    if (!data.to) {
      return new Response(JSON.stringify({ error: "Recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await isBackendCaller(req))) {
      // Admin-initiated sends: only to the draft owner, the admin, or a Vendibook mailbox.
      const caller = await getCaller(req);
      let ownerEmail: string | null = null;
      if (data.listingId) {
        const { data: l } = await admin.from("listings").select("host_id").eq("id", data.listingId).maybeSingle();
        if (l?.host_id) {
          const { data: p } = await admin.from("profiles").select("email").eq("id", l.host_id).maybeSingle();
          ownerEmail = p?.email ?? null;
        }
      }
      const to = String(data.to).trim().toLowerCase();
      if (!(ownerEmail && to === ownerEmail.trim().toLowerCase()) && !isAllowedTestRecipient(to, caller?.email)) {
        return new Response(JSON.stringify({ error: "Recipient must be the listing owner" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
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
