import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import MessageHostButton from '@/components/messaging/MessageHostButton';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import ConversationThread from '@/components/messaging/ConversationThread';
import { EmptyState, PageHeader, ws } from '@/components/workspace/ui';
import { InboxList } from '@/components/workspace/inbox/InboxList';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';
import '@/components/workspace/inbox/inbox.css';
import '@/components/messaging/messaging.css';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function WorkspaceMessages() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const listingId = params.get('listing');
  const bookingId = params.get('booking');
  const inbox = useConversations();
  const { refetch } = inbox;

  // Threads opened on this page, with when they were opened. ConversationThread
  // marks a thread read as soon as it loads (the shell's unread dot follows via
  // realtime), so the list shows those rows as read until the next refetch
  // confirms it, unless a newer message has arrived since.
  const [opened, setOpened] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!conversationId) return;
    setOpened((prev) => ({ ...prev, [conversationId]: Date.now() }));
  }, [conversationId]);

  // Re-read the list shortly after a thread opens (or closes on mobile), and
  // when the tab regains focus, so unread counts and previews stay current.
  useEffect(() => {
    const t = window.setTimeout(() => { void refetch(); }, 1200);
    return () => window.clearTimeout(t);
  }, [conversationId, refetch]);
  useEffect(() => {
    const onFocus = () => { void refetch(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  const unreadFor = useCallback((c: Conversation) => {
    const count = c.unread_count ?? 0;
    if (!count) return 0;
    if (c.id === conversationId) return 0;
    const seenAt = opened[c.id];
    const lastAt = c.last_message?.created_at ? Date.parse(c.last_message.created_at) : 0;
    return seenAt && lastAt <= seenAt ? 0 : count;
  }, [conversationId, opened]);

  const unreadThreads = useMemo(() => inbox.conversations.filter((c) => unreadFor(c) > 0).length, [inbox.conversations, unreadFor]);

  const listing = useQuery({
    queryKey: ['message-listing-context', listingId],
    enabled: !!listingId && !conversationId,
    queryFn: async () => {
      const { data, error } = await supabase.from('listings').select('id, title, host_id').eq('id', listingId!).single();
      if (error) throw error;
      return data;
    },
  });

  // Nothing to list and no thread requested: one clear empty state instead of two empty panes.
  const inboxEmpty = !inbox.isLoading && !inbox.isError && inbox.conversations.length === 0 && !conversationId;

  const description = inbox.isLoading
    ? 'Conversations with buyers, renters, hosts and sellers.'
    : unreadThreads > 0
      ? `${plural(unreadThreads, 'conversation')} waiting on a reply.`
      : inbox.conversations.length > 0
        ? 'You’re all caught up. Conversations with buyers, renters, hosts and sellers.'
        : 'Conversations with buyers, renters, hosts and sellers.';

  const threadPane = conversationId ? (
    <ConversationThread conversationId={conversationId} />
  ) : (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <p className="text-[17px] font-semibold tracking-[-0.01em] text-[#1C1B1A]">
        {inbox.conversations.length ? 'Select a conversation' : 'Your inbox is ready'}
      </p>
      <p className={cn(ws.body, 'mt-1.5 max-w-sm')}>
        {inbox.conversations.length
          ? 'Pick a conversation on the left to read the thread and reply.'
          : 'Messages about your listings, offers and bookings will open here.'}
      </p>
    </div>
  );

  return (
    <WorkspaceShell>
      <div className={cn(ws.page, 'ws-inbox')}>
        <div className="flex flex-col gap-6 sm:gap-8">
          <PageHeader
            eyebrow="Inbox"
            title="Messages"
            description={description}
            className={cn(conversationId && 'max-md:hidden')}
          />

          {!conversationId && listingId && (
            <section aria-label="Contact the host" className={cn(ws.surface, 'px-5 py-5 sm:px-6')}>
              {listing.isLoading ? (
                <div aria-busy="true" className="space-y-2">
                  <span className={cn(ws.skeleton, 'block h-4 w-56 max-w-full')} />
                  <span className={cn(ws.skeleton, 'block h-3 w-40 max-w-full')} />
                  <span className="sr-only" role="status">Loading the listing</span>
                </div>
              ) : listing.data ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className={ws.eyebrow}>Ask about this listing</p>
                    <h2 className="mt-1.5 truncate text-[16px] font-semibold text-[#1C1B1A]">{listing.data.title}</h2>
                    <p className={cn(ws.sectionNote, 'mt-0.5')}>Open your conversation with the host. Messages stay on Vendibook.</p>
                  </div>
                  <MessageHostButton
                    listingId={listing.data.id}
                    hostId={listing.data.host_id}
                    bookingId={bookingId || undefined}
                    variant="default"
                    label="Message the host"
                    className="h-10 shrink-0 rounded-full px-5 text-[13.5px] font-semibold"
                  />
                </div>
              ) : (
                <p role="alert" className="text-[13.5px] text-[#5E5953]">
                  The host couldn’t be loaded.{' '}
                  <button type="button" className={ws.link} onClick={() => listing.refetch()}>Try again</button>{' '}
                  or <Link to="/account/support" className={ws.link}>contact support</Link>.
                </p>
              )}
            </section>
          )}

          {bookingId && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-[#ECE6DD] bg-white px-5 py-3">
              <p className="text-[13.5px] text-[#5E5953]">This conversation is about one of your bookings.</p>
              <Link to={`/dashboard/bookings/${encodeURIComponent(bookingId)}`} className={ws.actionLink}>
                Booking details <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {inboxEmpty ? (
            <section aria-label="Conversations" className={ws.surface}>
              <EmptyState
                title="No conversations yet"
                body="When you message a seller, or a buyer asks about one of your listings, the conversation opens here. Every message stays on Vendibook and is screened for scams."
                action={{ label: 'Browse the marketplace', to: '/search' }}
                secondary={{ label: 'List an asset', to: '/list' }}
              />
            </section>
          ) : (
          <section
            aria-label="Conversations"
            className={cn(
              ws.surface,
              'overflow-hidden',
              'md:grid md:h-[clamp(560px,calc(100dvh-300px),880px)] md:grid-cols-[minmax(280px,340px)_1fr]',
            )}
          >
            <div className={cn('min-h-0 md:border-r md:border-[#ECE6DD]', conversationId ? 'hidden md:block' : 'block')}>
              <InboxList
                conversations={inbox.conversations}
                isLoading={inbox.isLoading}
                isError={inbox.isError}
                onRetry={() => void refetch()}
                activeId={conversationId}
                userId={user?.id}
                unreadFor={unreadFor}
              />
            </div>
            <div
              className={cn(
                'min-h-0 min-w-0 flex-col',
                conversationId ? 'flex h-[calc(100dvh-250px)] min-h-[440px] md:h-auto md:min-h-0' : 'hidden md:flex',
              )}
            >
              {threadPane}
            </div>
          </section>
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
