import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepositNotificationRequest {
  email: string;
  renterName: string;
  listingTitle: string;
  bookingId: string;
  startDate: string;
  endDate: string;
  originalDeposit: number;
  refundAmount: number;
  deductionAmount: number;
  refundType: 'full' | 'partial' | 'forfeit';
  notes?: string;
  hostName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const data: DepositNotificationRequest = await req.json();
    if (!data.email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await invokeTransactionalEmail({
        templateName: "payment-receipt",
        recipientEmail: data.email,
        idempotencyKey: `deposit-${data.bookingId}-${data.refundType}`,
        templateData: {
          name: data.renterName,
          listingTitle: data.listingTitle,
          bookingId: data.bookingId,
          startDate: data.startDate,
          endDate: data.endDate,
          originalDeposit: data.originalDeposit,
          refundAmount: data.refundAmount,
          deductionAmount: data.deductionAmount,
          refundType: data.refundType,
          notes: data.notes,
          hostName: data.hostName,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-deposit-notification error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
