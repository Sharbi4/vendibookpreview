import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AddressRequestEmail {
  to: string;
  firstName: string;
  listingTitle: string;
  listingId?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const data: AddressRequestEmail = await req.json();
    if (!data.to) {
      return new Response(JSON.stringify({ error: "Recipient required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await invokeTransactionalEmail({
        templateName: "support-reply",
        recipientEmail: data.to,
        idempotencyKey: `signage-addr-${data.listingId || data.to}-${Date.now()}`,
        templateData: {
          name: data.firstName,
          subject: `Free QR signage for ${data.listingTitle}`,
          message: `Hi ${data.firstName}, we'd love to ship you free QR signage for "${data.listingTitle}". Reply with your shipping address and we'll get it on the way.`,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-qr-signage-address-request error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
