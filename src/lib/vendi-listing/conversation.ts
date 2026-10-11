import { supabase } from '@/integrations/supabase/client';

export type VendiMessage = { id: string; role: 'vendi' | 'user'; content: string; createdAt?: string };

/** Append-only, owner-private history. Retrying a save cannot duplicate messages. */
export function mergeMessages(saved: VendiMessage[], local: VendiMessage[]): VendiMessage[] {
  const seen = new Set<string>();
  return [...saved, ...local].filter((message) => {
    if (seen.has(message.id)) return false;
    seen.add(message.id);
    return true;
  });
}

export async function loadConversation(listingId: string): Promise<VendiMessage[]> {
  const { data, error } = await supabase.from('vendi_listing_messages' as never)
    .select('id,role,content,created_at').eq('listing_id', listingId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1000);
  if (error) throw error;
  return (data as unknown as Array<{ id: string; role: VendiMessage['role']; content: string; created_at: string }> ?? [])
    .reverse().map((row) => ({ id: row.id, role: row.role, content: row.content, createdAt: row.created_at }));
}

export async function saveConversation(listingId: string, userId: string, messages: VendiMessage[]): Promise<void> {
  if (!messages.length) return;
  const base = Date.now() - messages.length;
  const rows = messages.map((message, i) => ({
    listing_id: listingId, user_id: userId, id: message.id,
    role: message.role, content: message.content,
    created_at: message.createdAt ?? new Date(base + i).toISOString(),
  }));
  const { error } = await supabase.from('vendi_listing_messages' as never)
    .upsert(rows as never, { onConflict: 'listing_id,id', ignoreDuplicates: true });
  if (error) throw error;
}
