import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, MessageCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MeetupRequestButton from '@/components/messaging/MeetupRequestButton';
import { detectPII, PII_BLOCK_MESSAGE } from '@/lib/piiDetection';
import { isMeetupRequest, parseMeetupRequest } from '@/lib/meetup';

interface OrderMeetupCardProps {
  listingId: string | null;
  viewerRole: 'buyer' | 'seller' | 'admin';
}

interface MeetupState {
  conversationId: string | null;
  message: string | null;
  senderId: string | null;
  createdAt: string | null;
}

/**
 * Surfaces the meetup request the buyer sent in Messages, so the handoff plan
 * is visible from the order itself. Reads real conversation messages only.
 */
export default function OrderMeetupCard({ listingId, viewerRole }: OrderMeetupCardProps) {
  const { user } = useAuth();
  const [state, setState] = useState<MeetupState>({
    conversationId: null,
    message: null,
    senderId: null,
    createdAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!listingId || !user) {
      setIsLoading(false);
      return;
    }
    try {
      const { data: convo } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!convo?.id) {
        setState({ conversationId: null, message: null, senderId: null, createdAt: null });
        return;
      }

      const { data: rows } = await supabase
        .from('conversation_messages')
        .select('message, sender_id, created_at')
        .eq('conversation_id', convo.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const latest = (rows || []).find((row) => isMeetupRequest(row.message));
      setState({
        conversationId: convo.id,
        message: latest?.message ?? null,
        senderId: latest?.sender_id ?? null,
        createdAt: latest?.created_at ?? null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [listingId, user]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading || !listingId || !state.conversationId) return null;

  const parsed = state.message ? parseMeetupRequest(state.message) : null;
  const threadHref = `/dashboard/messages/${state.conversationId}`;

  const sendRequest = async (text: string) => {
    if (detectPII(text).hasPII) return { success: false, error: PII_BLOCK_MESSAGE };
    const { error } = await supabase.from('conversation_messages').insert({
      conversation_id: state.conversationId,
      sender_id: user!.id,
      message: text,
    });
    if (error) return { success: false, error: 'We could not send that request. Please try again.' };
    await load();
    return { success: true };
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
          <div>
            <p className="font-medium">Meetup plan</p>
            <p className="text-sm text-muted-foreground">
              {parsed
                ? 'Sent in Messages. Confirm the final time and place in the conversation.'
                : 'No meetup request yet. Agree on a time and place in Messages.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewerRole === 'buyer' && <MeetupRequestButton compact onSubmit={sendRequest} />}
          <Button asChild size="sm" variant="ghost">
            <Link to={threadHref}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Open conversation
            </Link>
          </Button>
        </div>
      </div>

      {parsed && (
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          {parsed.date && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Preferred date</dt>
              <dd className="text-right">{parsed.date}</dd>
            </div>
          )}
          {parsed.timeWindow && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Preferred time</dt>
              <dd className="text-right">{parsed.timeWindow}</dd>
            </div>
          )}
          {parsed.place && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Suggested area</dt>
              <dd className="text-right">{parsed.place}</dd>
            </div>
          )}
          {parsed.notes && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="text-right">{parsed.notes}</dd>
            </div>
          )}
          {state.createdAt && (
            <p className="pt-1 text-xs text-muted-foreground">
              Requested {new Date(state.createdAt).toLocaleString()}
              {state.senderId && state.senderId === user?.id ? ' by you' : ''}
            </p>
          )}
        </dl>
      )}
    </Card>
  );
}
