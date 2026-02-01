import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-CONTACTS-TO-ZENDESK] ${step}${detailsStr}`);
};

interface SyncContactsRequest {
  // Optional filters
  status?: 'new' | 'contacted' | 'matched' | 'closed' | 'all';
  limit?: number;
  sync_as?: 'users' | 'tickets' | 'both';
}

interface ZendeskUser {
  user: {
    name: string;
    email?: string;
    phone?: string;
    external_id?: string;
    verified?: boolean;
    user_fields?: Record<string, string | number | boolean | null>;
    tags?: string[];
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Sync contacts started");

    // Get credentials
    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const rawSubdomain = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook1";
    const ZENDESK_SUBDOMAIN = rawSubdomain.replace(/\.zendesk\.com.*$/i, '').trim();
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ZENDESK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);

    const data: SyncContactsRequest = await req.json().catch(() => ({}));
    const limit = Math.min(data.limit || 100, 500);
    const syncAs = data.sync_as || 'both';

    logStep("Fetching contacts", { limit, status: data.status, syncAs });

    // Fetch asset_requests (call contacts / leads)
    let query = supabase
      .from('asset_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (data.status && data.status !== 'all') {
      query = query.eq('status', data.status);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`);
    }

    if (!contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0, 
          message: "No contacts to sync" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Found ${contacts.length} contacts to sync`);

    const results = {
      users_created: 0,
      users_updated: 0,
      tickets_created: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const contact of contacts) {
      try {
        const contactEmail = contact.email || `lead-${contact.id}@vendibook-leads.com`;
        const contactName = contact.email?.split('@')[0] || `Lead ${contact.id.slice(0, 8)}`;

        // Sync as Zendesk User
        if (syncAs === 'users' || syncAs === 'both') {
          const zendeskUser: ZendeskUser = {
            user: {
              name: contactName,
              email: contactEmail,
              external_id: `contact-${contact.id}`,
              verified: false,
              tags: ['vendibook', 'lead', 'call-contact', contact.status, contact.asset_type],
              user_fields: {
                contact_id: contact.id,
                contact_type: 'lead',
                asset_type: contact.asset_type,
                city: contact.city,
                state: contact.state || null,
                status: contact.status,
                budget_min: contact.budget_min || null,
                budget_max: contact.budget_max || null,
                notes: contact.notes || null,
                created_at: contact.created_at,
              },
            },
          };

          if (contact.phone) {
            zendeskUser.user.phone = contact.phone;
          }

          // Check if user exists
          const searchResponse = await fetch(
            `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/search.json?external_id=contact-${contact.id}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
              },
            }
          );

          let zendeskUserId: number | null = null;
          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            if (searchResult.users && searchResult.users.length > 0) {
              zendeskUserId = searchResult.users[0].id;
            }
          }

          let userResponse: Response;
          if (zendeskUserId) {
            userResponse = await fetch(
              `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/${zendeskUserId}.json`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${auth}`,
                },
                body: JSON.stringify(zendeskUser),
              }
            );
            if (userResponse.ok) results.users_updated++;
          } else {
            userResponse = await fetch(
              `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users.json`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${auth}`,
                },
                body: JSON.stringify(zendeskUser),
              }
            );
            if (userResponse.ok) results.users_created++;
          }

          if (!userResponse.ok) {
            const errorText = await userResponse.text();
            logStep("User sync failed", { contact_id: contact.id, error: errorText });
          }
        }

        // Sync as Zendesk Ticket
        if (syncAs === 'tickets' || syncAs === 'both') {
          // Check if ticket already exists for this contact
          const ticketSearchResponse = await fetch(
            `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/search.json?query=type:ticket external_id:contact-${contact.id}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
              },
            }
          );

          let ticketExists = false;
          if (ticketSearchResponse.ok) {
            const ticketSearchResult = await ticketSearchResponse.json();
            ticketExists = ticketSearchResult.results && ticketSearchResult.results.length > 0;
          }

          if (!ticketExists) {
            const dateRange = contact.start_date && contact.end_date
              ? `${new Date(contact.start_date).toLocaleDateString()} - ${new Date(contact.end_date).toLocaleDateString()}`
              : 'Flexible';

            const budget = contact.budget_min || contact.budget_max
              ? `$${contact.budget_min || 0} - $${contact.budget_max || 'Any'}`
              : 'Not specified';

            const ticketPayload = {
              ticket: {
                subject: `📞 Lead: ${contact.asset_type} in ${contact.city}${contact.state ? `, ${contact.state}` : ''}`,
                comment: {
                  body: `New Lead / Call Contact\n\n` +
                    `Asset Type: ${contact.asset_type}\n` +
                    `Location: ${contact.city}${contact.state ? `, ${contact.state}` : ''}\n` +
                    `Email: ${contact.email || 'Not provided'}\n` +
                    `Phone: ${contact.phone || 'Not provided'}\n` +
                    `Date Range: ${dateRange}\n` +
                    `Budget: ${budget}\n` +
                    `Notes: ${contact.notes || 'None'}\n\n` +
                    `Status: ${contact.status}\n` +
                    `Submitted: ${new Date(contact.created_at).toLocaleString()}`,
                },
                priority: contact.status === 'new' ? 'high' : 'normal',
                type: 'task',
                status: contact.status === 'closed' ? 'solved' : 'open',
                external_id: `contact-${contact.id}`,
                tags: ['vendibook', 'lead', 'call-contact', contact.status, contact.asset_type],
                requester: {
                  name: contactName,
                  email: contactEmail,
                },
              },
            };

            const ticketResponse = await fetch(
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

            if (ticketResponse.ok) {
              results.tickets_created++;
            } else {
              const errorText = await ticketResponse.text();
              logStep("Ticket creation failed", { contact_id: contact.id, error: errorText });
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (contactError) {
        results.failed++;
        results.errors.push(`${contact.id}: ${contactError instanceof Error ? contactError.message : 'Unknown error'}`);
      }
    }

    const totalSynced = results.users_created + results.users_updated + results.tickets_created;
    logStep("Sync completed", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...results,
        total_synced: totalSynced,
        message: `Synced ${totalSynced} items: ${results.users_created} users created, ${results.users_updated} users updated, ${results.tickets_created} tickets created`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
