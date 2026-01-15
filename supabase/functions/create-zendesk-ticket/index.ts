import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ZENDESK-TICKET] ${step}${detailsStr}`);
};

interface ZendeskTicketRequest {
  // Requester info
  requester_name: string;
  requester_email: string;
  requester_phone?: string;
  // Ticket info
  subject: string;
  description: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  type?: 'question' | 'incident' | 'problem' | 'task';
  tags?: string[];
  // Custom fields
  custom_fields?: Record<string, string | number | boolean>;
}

interface ZendeskApiTicket {
  ticket: {
    subject: string;
    description: string;
    priority: string;
    type: string;
    requester: {
      name: string;
      email: string;
      phone?: string;
    };
    tags?: string[];
    custom_fields?: Array<{ id: number; value: string | number | boolean }>;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const ZENDESK_SUBDOMAIN = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook";
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";

    if (!ZENDESK_API_KEY) {
      throw new Error("ZENDESK_API_KEY is not configured");
    }

    const data: ZendeskTicketRequest = await req.json();
    
    logStep("Request received", { 
      subject: data.subject, 
      requester: data.requester_email,
      type: data.type,
      priority: data.priority,
    });

    // Validate required fields
    if (!data.requester_name || !data.requester_email || !data.subject || !data.description) {
      throw new Error("Missing required fields: requester_name, requester_email, subject, description");
    }

    // Build the Zendesk ticket payload
    const ticketPayload: ZendeskApiTicket = {
      ticket: {
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'normal',
        type: data.type || 'question',
        requester: {
          name: data.requester_name,
          email: data.requester_email,
        },
        tags: data.tags || ['vendibook', 'web-form'],
      },
    };

    // Add phone if provided
    if (data.requester_phone) {
      ticketPayload.ticket.requester.phone = data.requester_phone;
    }

    // Add custom fields if provided
    if (data.custom_fields) {
      ticketPayload.ticket.custom_fields = Object.entries(data.custom_fields).map(
        ([id, value]) => ({ id: parseInt(id), value })
      );
    }

    logStep("Creating Zendesk ticket", { payload: ticketPayload });

    // Create the ticket via Zendesk API
    // Using email/token authentication
    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);
    
    const response = await fetch(
      `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/tickets.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify(ticketPayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Zendesk API error", { status: response.status, error: errorText });
      throw new Error(`Zendesk API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    logStep("Ticket created successfully", { ticketId: result.ticket?.id });

    return new Response(
      JSON.stringify({ 
        success: true,
        ticket_id: result.ticket?.id,
        message: "Support ticket created successfully",
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
