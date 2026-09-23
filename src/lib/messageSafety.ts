import { supabase } from '@/integrations/supabase/client';

// Keep this adapter until the generated database types include the messaging migration.
export const messagingRpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: { message: string } | null }>)(name, args);

export function messageSendError(error: unknown): string {
  const message = (error as { message?: string })?.message;
  return message || 'Your message was not sent. Please try again.';
}

export async function sendMarketplaceMessage(kind: 'conversation' | 'booking', thread: string, body: string,
  attachment?: { url: string | null; name: string; type: string; size?: number }) {
  const { data, error } = await messagingRpc('send_marketplace_message', { kind, thread, body, attachment: attachment ?? null });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || 'Your message was not sent.');
  return data.message;
}
