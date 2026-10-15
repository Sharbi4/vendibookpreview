import { supabase } from '@/integrations/supabase/client';
import { sendMarketplaceMessage } from '@/lib/messageSafety';

/**
 * Sends a buyer's message to a seller through normal Vendibook messaging,
 * exactly like MessageHostForm: same conversation row, same
 * send_marketplace_message RPC, so message-risk scanning and the phone/ID
 * trust gate (guard_signup_phone_actions) apply. Returns the conversation id.
 */
export async function sendBuyerMessage(opts: { buyerId: string; listingId: string; hostId: string; body: string }): Promise<string> {
  const { buyerId, listingId, hostId, body } = opts;
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('host_id', hostId)
    .eq('shopper_id', buyerId)
    .maybeSingle();
  if (findError) throw findError;

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ listing_id: listingId, host_id: hostId, shopper_id: buyerId })
      .select('id')
      .single();
    if (createError) throw createError;
    conversationId = created.id as string;
  }

  await sendMarketplaceMessage('conversation', conversationId, body);
  return conversationId;
}
