import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function removalCopy(status: unknown) {
  if (status === 'spam_sender_deleted') return {
    title: 'This message was identified as spam',
    body: "We've removed the message and deleted the sender's account. You don't need to reply or take any action on the original message.",
  };
  if (status === 'spam_removed') return {
    title: 'This message was identified as spam',
    body: "We've removed this message. You don't need to reply or take any action on the original message.",
  };
  return {
    title: 'This conversation is no longer available',
    body: 'It may have been removed, or the link may belong to a different account. Messages identified as spam are removed to protect our members. If you think this is a mistake, contact support.',
  };
}

export default function UnavailableConversation({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const notice = useQuery({
    queryKey: ['removed-conversation', user?.id, conversationId],
    enabled: Boolean(user),
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_removed_conversation_notice', { _conversation_id: conversationId });
      if (error) throw error;
      return data as string | null;
    },
  });
  const copy = removalCopy(notice.data);
  return <section role="status" className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-[#faf7f2] px-6 py-14 text-center text-[#29241f]">
    <ShieldAlert className="h-9 w-9 text-[#a94719]" aria-hidden="true" />
    {notice.isLoading && user ? <p>Checking message status…</p> : <>
      <h3 className="text-xl font-semibold">{copy.title}</h3>
      <p className="max-w-md text-sm leading-6 text-[#62584f]">{copy.body}</p>
      {notice.data && <p className="max-w-md text-sm text-[#62584f]">Do not use links or share payment details from that message.</p>}
    </>}
    <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cfc3b6] bg-white px-4 font-semibold text-[#29241f]" to="/dashboard/messages"><ArrowLeft className="h-4 w-4" />Back to messages</Link>
    <Link to="/contact" className="text-sm text-[#733311] underline underline-offset-4">Contact support</Link>
  </section>;
}
