/**
 * listing-spec-suggest
 *
 * Parses a seller's own listing description into PROPOSED structured facts.
 * Suggestions are stored separately from confirmed public facts and are never
 * applied automatically — the seller confirms, edits or rejects each one.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SECTION_FIELDS: Record<string, string[]> = {
  cooking: ['griddle', 'fryers', 'range_burners', 'oven', 'other'],
  refrigeration: ['reach_in', 'freezers', 'prep_table', 'condition_notes'],
  electrical: ['shore_power', 'generator', 'inverter_battery', 'panel_notes'],
  propane: ['tank_count', 'tank_size_lbs', 'tanks_included', 'last_inspection'],
  plumbing: ['fresh_water_gal', 'grey_water_gal', 'water_heater', 'sinks'],
  hood: ['hood_type', 'hood_width_in', 'suppression_system', 'grease_trap'],
  dimensions: ['box_length_ft', 'overall_length_ft', 'width_ft', 'height_ft', 'gvwr_lbs'],
  mechanical: ['engine', 'transmission', 'axles', 'hitch_type', 'tire_condition'],
  inspections: ['title_status', 'health_permit', 'fire_inspection', 'service_records'],
  inclusions: ['smallwares', 'pos_system', 'signage_wrap', 'excluded_items'],
  viewing: ['viewing_availability', 'test_drive', 'transport_help'],
  site: ['surface', 'power_available', 'water_available', 'restrooms', 'foot_traffic'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const listingId = typeof body?.listingId === 'string' ? body.listingId : null;
    if (!listingId) return json({ error: 'listingId is required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: listing, error: listingError } = await admin
      .from('listings')
      .select('id, host_id, title, description, category, mode')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) return json({ error: 'Could not load listing' }, 500);
    if (!listing || listing.host_id !== userId) return json({ error: 'Not found' }, 404);

    const description = `${listing.title ?? ''}\n\n${listing.description ?? ''}`.trim();
    if (description.length < 30) return json({ suggestions: 0 });

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is unavailable right now' }, 503);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content:
              'You extract structured facts that are EXPLICITLY stated in a seller-written listing description. Never infer, estimate or assume. If a fact is not stated in the text, omit it. Return JSON only.',
          },
          {
            role: 'user',
            content:
              `Allowed sections and fields: ${JSON.stringify(SECTION_FIELDS)}\n\n` +
              `Description:\n"""${description.slice(0, 6000)}"""\n\n` +
              'Return {"suggestions":[{"section","field","value","source_text","confidence"}]} where source_text is the exact quoted phrase from the description and confidence is 0-1.',
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiResponse.status === 429) return json({ error: 'Too many requests, try again shortly' }, 429);
    if (aiResponse.status === 402) return json({ error: 'AI credits exhausted' }, 402);
    if (!aiResponse.ok) return json({ error: 'AI request failed' }, 502);

    const aiJson = await aiResponse.json();
    let parsed: { suggestions?: Array<Record<string, unknown>> } = {};
    try {
      parsed = JSON.parse(aiJson?.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = {};
    }

    const rows = (parsed.suggestions ?? [])
      .filter((s) => {
        const section = String(s.section ?? '');
        const field = String(s.field ?? '');
        return SECTION_FIELDS[section]?.includes(field) && s.value !== undefined && s.value !== null && s.value !== '';
      })
      .slice(0, 40)
      .map((s) => ({
        listing_id: listingId,
        section: String(s.section),
        field: String(s.field),
        suggested_value: s.value as unknown,
        source_text: typeof s.source_text === 'string' ? s.source_text.slice(0, 500) : null,
        confidence: typeof s.confidence === 'number' ? Math.max(0, Math.min(1, s.confidence)) : null,
        source: 'ai',
        status: 'suggested',
        updated_at: new Date().toISOString(),
      }));

    if (rows.length) {
      await admin
        .from('listing_spec_suggestions')
        .upsert(rows, { onConflict: 'listing_id,section,field' });
    }

    return json({ suggestions: rows.length });
  } catch (error) {
    console.error('listing-spec-suggest failed', error);
    return json({ error: 'Unexpected error' }, 500);
  }
});
