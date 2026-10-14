import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState, ws } from '@/components/workspace/ui';
import type { Conversation } from '@/hooks/useConversations';
import { getCounterpartyName } from '@/lib/displayName';
import { cn } from '@/lib/utils';
import { fullStamp, inboxStamp } from './inboxFormat';
import { useMessageTextSearch } from './useMessageTextSearch';

type Filter = 'all' | 'unread';

export interface InboxListProps {
  conversations: Conversation[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  activeId?: string;
  userId?: string;
  /** Unread count shown for a row; the open thread is marked read, so it reads 0. */
  unreadFor: (c: Conversation) => number;
}

const counterpart = (c: Conversation, userId?: string) => (userId === c.host_id ? c.shopper : c.host);

/** Dashboard conversation list: search, All/Unread filter, unread dot + bold. */
export function InboxList({ conversations, isLoading, isError, onRetry, activeId, userId, unreadFor }: InboxListProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const textSearch = useMessageTextSearch(userId);
  const q = query.trim().toLowerCase();

  const unreadThreads = conversations.filter((c) => unreadFor(c) > 0).length;

  const rows = useMemo(() => {
    return conversations.filter((c) => {
      if (filter === 'unread' && unreadFor(c) <= 0) return false;
      if (!q) return true;
      const name = getCounterpartyName(counterpart(c, userId), 'Vendibook member').toLowerCase();
      return (
        name.includes(q) ||
        (c.listing?.title ?? '').toLowerCase().includes(q) ||
        (c.last_message?.message ?? '').toLowerCase().includes(q)
      );
    });
  }, [conversations, filter, q, userId, unreadFor]);

  const nameFor = (conversationId: string) => {
    const c = conversations.find((x) => x.id === conversationId);
    return c ? getCounterpartyName(counterpart(c, userId), 'Vendibook member') : 'Conversation';
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q) void textSearch.run(query.trim());
  };

  const clear = () => {
    setQuery('');
    textSearch.reset();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-[#ECE6DD] px-4 pb-3 pt-4">
        <form role="search" onSubmit={submit} className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A847B]" />
          <label htmlFor="inbox-search" className="sr-only">Search conversations</label>
          <input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (!e.target.value) textSearch.reset(); }}
            placeholder="Search names, listings, messages"
            className="h-10 w-full rounded-full border border-[#E2DBD0] bg-[#FCFAF7] pl-9 pr-9 text-[13.5px] text-[#1C1B1A] placeholder:text-[#8A847B] focus:border-[#1C1B1A] focus:bg-white focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#5E5953] hover:bg-[#F3EEE7] hover:text-[#1C1B1A]">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </form>
        <div className="flex items-center justify-between gap-3">
          <div role="group" aria-label="Filter conversations" className="inline-flex rounded-full bg-[#F3EEE7] p-0.5">
            {(['all', 'unread'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors',
                  filter === f ? 'bg-white text-[#1C1B1A] shadow-[0_1px_2px_rgba(28,27,26,0.12)]' : 'text-[#5E5953] hover:text-[#1C1B1A]',
                )}
              >
                {f === 'all' ? 'All' : `Unread${unreadThreads ? ` · ${unreadThreads}` : ''}`}
              </button>
            ))}
          </div>
          {q && !textSearch.searched && (
            <button type="button" onClick={() => void textSearch.run(query.trim())} className={ws.actionLink} disabled={textSearch.searching}>
              {textSearch.searching ? 'Searching…' : 'Search message text'}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {textSearch.searched && q ? (
          <section aria-label="Messages matching your search">
            <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
              <p className={ws.eyebrow}>Messages</p>
              <button type="button" onClick={textSearch.reset} className={ws.actionLink}>Back to conversations</button>
            </div>
            {textSearch.searching ? (
              <p role="status" className="px-4 py-3 text-[13px] text-[#5E5953]">Searching your messages…</p>
            ) : textSearch.error ? (
              <p role="alert" className="px-4 py-3 text-[13px] text-[#5E5953]">
                Search didn’t finish. <button type="button" className={ws.link} onClick={() => void textSearch.run(query.trim())}>Try again</button>
              </p>
            ) : textSearch.results.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-[#5E5953]">No messages contain “{query.trim()}”.</p>
            ) : (
              <ul className="divide-y divide-[#F1ECE5]">
                {textSearch.results.map((r) => (
                  <li key={r.id}>
                    <Link to={`/dashboard/messages/${r.conversation_id}`} className="block px-4 py-3 transition-colors hover:bg-[#FCFAF7]">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13.5px] font-semibold text-[#1C1B1A]">{nameFor(r.conversation_id)}</span>
                        <span className="shrink-0 text-[12px] tabular-nums text-[#8A847B]" title={fullStamp(r.created_at)}>{inboxStamp(r.created_at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#5E5953]">{r.message}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : isLoading ? (
          <ul aria-busy="true" className="divide-y divide-[#F1ECE5]">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="flex gap-3 px-4 py-4">
                <span className={cn(ws.skeleton, 'h-10 w-10 shrink-0 rounded-full')} />
                <span className="flex-1 space-y-2 pt-0.5">
                  <span className={cn(ws.skeleton, 'block h-3.5 w-32')} />
                  <span className={cn(ws.skeleton, 'block h-3 w-48 max-w-full')} />
                </span>
              </li>
            ))}
            <li className="sr-only" role="status">Loading conversations</li>
          </ul>
        ) : isError && conversations.length === 0 ? (
          <div role="alert" className="px-4 py-8">
            <p className="text-[14px] font-semibold text-[#1C1B1A]">Conversations didn’t load.</p>
            <p className="mt-1 text-[13px] leading-5 text-[#5E5953]">Your messages are safe. Check your connection and try again.</p>
            <button type="button" onClick={onRetry} className={cn(ws.secondary, 'mt-4')}>Try again</button>
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            title="No conversations yet"
            body="When you message a seller, or a buyer asks about one of your listings, the conversation shows up here."
            action={{ label: 'Browse the marketplace', to: '/search' }}
            className="px-4 sm:px-5"
          />
        ) : rows.length === 0 ? (
          <div className="px-4 py-8">
            <p className="text-[14px] font-semibold text-[#1C1B1A]">{filter === 'unread' && !q ? 'You’re all caught up.' : 'No conversations match.'}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#5E5953]">
              {filter === 'unread' && !q ? 'Every message has been read.' : 'Try a different name or listing, or search the message text.'}
            </p>
            <button type="button" onClick={() => { setFilter('all'); clear(); }} className={cn(ws.link, 'mt-3 inline-block')}>Show all conversations</button>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1ECE5]">
            {rows.map((c) => {
              const unread = unreadFor(c);
              const active = c.id === activeId;
              const other = counterpart(c, userId);
              const name = getCounterpartyName(other, 'Vendibook member');
              const own = c.last_message?.sender_id === userId;
              const preview = c.last_message?.message
                ? `${own ? 'You: ' : ''}${c.last_message.message === 'Sent an attachment' ? 'Sent an attachment' : c.last_message.message}`
                : 'No messages yet';
              const at = c.last_message?.created_at ?? c.last_message_at ?? c.updated_at;
              return (
                <li key={c.id}>
                  <Link
                    to={`/dashboard/messages/${c.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex gap-3 px-4 py-3.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1C1B1A]',
                      active ? 'bg-[#F6F2EC]' : 'hover:bg-[#FCFAF7]',
                    )}
                  >
                    {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#1C1B1A]" />}
                    {/* Listing photo with the member's avatar tucked in the corner; avatar alone when there's no photo. */}
                    <span className="relative mt-0.5 h-11 w-11 shrink-0">
                      {c.listing?.cover_image_url ? (
                        <>
                          <img src={c.listing.cover_image_url} alt="" loading="lazy" className="h-11 w-11 rounded-[12px] object-cover ring-1 ring-black/5" />
                          <Avatar className="absolute -bottom-1 -right-1 h-6 w-6 ring-2 ring-white">
                            <AvatarImage src={other?.avatar_url || undefined} alt="" />
                            <AvatarFallback className="bg-[#EFE9E1] text-[10px] font-semibold text-[#5E5953]">{name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </>
                      ) : (
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={other?.avatar_url || undefined} alt="" />
                          <AvatarFallback className="bg-[#EFE9E1] text-[13px] font-semibold text-[#5E5953]">{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn('truncate text-[14px] leading-5 text-[#1C1B1A]', unread > 0 ? 'font-bold' : 'font-medium')}>{name}</span>
                        <span className={cn('shrink-0 text-[12px] tabular-nums', unread > 0 ? 'font-semibold text-[#1C1B1A]' : 'text-[#8A847B]')} title={fullStamp(at)}>
                          {inboxStamp(at)}
                        </span>
                      </span>
                      <span className="block truncate text-[12.5px] leading-5 text-[#8A847B]">
                        <span className="font-medium text-[#6F6961]">{userId === c.host_id ? 'Your listing' : 'Their listing'}</span>
                        {c.listing?.title && <> · {c.listing.title}</>}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={cn('min-w-0 flex-1 truncate text-[13px] leading-5', unread > 0 ? 'font-semibold text-[#1C1B1A]' : 'text-[#5E5953]')}>{preview}</span>
                        {unread > 0 && (
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#FF5124]" />
                            <span className="sr-only">{unread} unread</span>
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
