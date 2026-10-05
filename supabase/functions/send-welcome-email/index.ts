import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";
import { getCaller, isBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  role: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, fullName, role }: WelcomeEmailRequest = await req.json();
    // Only the backend, or a signed-in member for their own address, may send.
    if (!(await isBackendCaller(req))) {
      const caller = await getCaller(req);
      if (!caller?.email || !email || caller.email.toLowerCase() !== String(email).trim().toLowerCase()) {
        return forbiddenResponse(corsHeaders);
      }
    }
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await sendTransactionalEmailInternal({
      templateName: "welcome",
      recipientEmail: email,
      idempotencyKey: `welcome-${email}-${Date.now()}`,
      templateData: { name: fullName, role },
    });

    if (!resp.ok) {
      throw new Error(`transactional email send failed (${resp.status}): ${resp.body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-welcome-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
