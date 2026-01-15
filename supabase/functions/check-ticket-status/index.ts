import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

    if (!ZENDESK_API_KEY) {
      throw new Error("ZENDESK_API_KEY is not configured");
    }

    const data: TicketStatusRequest = await req.json();
    const { email, ticketId } = data;

    logStep("Request received", { email: email ? '***@***' : undefined, ticketId });

    if (!email && !ticketId) {
      throw new Error("Either email or ticketId is required");
    }

    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
    let tickets: ZendeskTicket[] = [];

    if (ticketId) {
      // Search for specific ticket by ID
      const response = await fetch(
        `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets/${ticketId}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ticket) {
          tickets = [{
            id: data.ticket.id,
            subject: data.ticket.subject,
            status: data.ticket.status,
            created_at: data.ticket.created_at,
            updated_at: data.ticket.updated_at,
            priority: data.ticket.priority || 'normal',
          }];
        }
      } else if (response.status !== 404) {
        logStep("Zendesk API error", { status: response.status });
      }
    } else if (email) {
      // Search for tickets by requester email
      const searchQuery = encodeURIComponent(`type:ticket requester:${email}`);
      const response = await fetch(
        `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=${searchQuery}&sort_by=created_at&sort_order=desc`,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        tickets = (data.results || []).slice(0, 10).map((ticket: any) => ({
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
