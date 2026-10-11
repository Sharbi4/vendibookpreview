import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TICKET-STATUS] ${step}${detailsStr}`);
};

interface TicketStatusRequest {
  email?: string;
  ticketId?: string;
}

interface ZendeskTicket {
  id: number;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  priority: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const ZENDESK_SUBDOMAIN = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook";
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook.com";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ZENDESK_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Service is not configured");
    }

    // Authentication required — ticket subjects/status are private to the requester.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Please sign in to view your tickets" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Please sign in to view your tickets" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the caller's own account email. A client-supplied email or ticket
    // ID is never trusted on its own — results are always scoped to tickets
    // whose requester is the signed-in account.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    const callerEmail = (profile?.email || user.email || "").trim();
    if (!callerEmail) {
      return new Response(
        JSON.stringify({ success: true, tickets: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: TicketStatusRequest = await req.json().catch(() => ({}));
    const { ticketId } = data;

    logStep("Request received", { user: user.id, ticketId });

    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
    let tickets: ZendeskTicket[] = [];

    // Always search by the caller's own verified email, then (optionally)
    // filter to the requested ticket ID. This guarantees a caller can only
    // ever see tickets they requested, regardless of the ID/email supplied.
    const searchQuery = encodeURIComponent(`type:ticket requester:${callerEmail}`);
    const response = await fetch(
      `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=${searchQuery}&sort_by=created_at&sort_order=desc`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (response.ok) {
      const searchData = await response.json();
      let results = searchData.results || [];
      if (ticketId) {
        const wanted = String(ticketId).trim();
        results = results.filter((t: { id: number }) => String(t.id) === wanted);
      }
      tickets = results.slice(0, 10).map((ticket: {
        id: number;
        subject: string;
        status: string;
        created_at: string;
        updated_at: string;
        priority?: string;
      }) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        priority: ticket.priority || 'normal',
      }));
    } else {
      logStep("Zendesk search error", { status: response.status });
    }

    logStep("Tickets found", { count: tickets.length });

    return new Response(
      JSON.stringify({
        success: true,
        tickets,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
