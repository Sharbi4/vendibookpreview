import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MessageSearchResult {
  id: string;
  message: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
}

/**
 * Full-text message search for the dashboard inbox. Same read as
 * components/messaging/MessageSearch: the member's conversations, then an
 * ILIKE over their messages (both under RLS), newest 20.
 */
export function useMessageTextSearch(userId?: string) {
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const seq = useRef(0);

  const run = useCallback(async (text: string) => {
    if (!userId || !text) return;
    const id = ++seq.current;
    setSearching(true);
    setSearched(true);
    setError(false);
    try {
      const { data: convos, error: convoError } = await supabase
        .from('conversations')
        .select('id')
        .or(`host_id.eq.${userId},shopper_id.eq.${userId}`);
      if (convoError) throw convoError;
      const ids = (convos ?? []).map((c) => c.id);
      if (!ids.length) {
        if (id === seq.current) setResults([]);
        return;
      }
      const { data, error: msgError } = await supabase
        .from('conversation_messages')
        .select('id, message, created_at, conversation_id, sender_id')
        .in('conversation_id', ids)
        .ilike('message', `%${text}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (msgError) throw msgError;
      if (id === seq.current) setResults((data ?? []) as MessageSearchResult[]);
    } catch (e) {
      console.error('Message search error:', e);
      if (id === seq.current) setError(true);
    } finally {
      if (id === seq.current) setSearching(false);
    }
  }, [userId]);

  const reset = useCallback(() => {
    seq.current += 1;
    setResults([]);
    setSearched(false);
    setSearching(false);
    setError(false);
  }, []);

  return { results, searching, searched, error, run, reset };
}
