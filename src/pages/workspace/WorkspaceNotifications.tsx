import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmptyState, PageHeader, ws } from '@/components/workspace/ui';
import { fullStamp, groupByDay, inboxStamp, notificationTarget } from '@/components/workspace/inbox/inboxFormat';
import { useClearReadNotifications } from '@/components/workspace/inbox/useClearReadNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'unread';

/** Quiet category label from the notification type ("booking_approved" → "Booking"). */
function categoryOf(type: string): string | null {
  const t = type.toLowerCase();
  if (t.startsWith('booking') || t.startsWith('rental')) return 'Booking';
  if (t.startsWith('offer')) return 'Offer';
  if (t.startsWith('sale') || t.startsWith('purchase') || t.startsWith('buyer_action')) return 'Sale';
  if (t.startsWith('payment') || t.startsWith('payout')) return 'Payments';
  if (t.startsWith('message')) return 'Message';
  if (t.startsWith('dispute')) return 'Dispute';
  if (t.startsWith('document')) return 'Document';
  if (t.startsWith('review')) return 'Review';
  if (t.startsWith('verification')) return 'Verification';
  if (t.startsWith('walkthrough')) return 'Walkthrough';
  if (t.startsWith('handoff')) return 'Handoff';
  if (t.startsWith('listing')) return 'Listing';
  if (t.startsWith('subscription')) return 'Plan';
  return null;
}

export default function WorkspaceNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const { notifications, unreadCount, isLoading, refetch, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id);
  const clearRead = useClearReadNotifications(user?.id);

  // useNotifications hides query errors behind an empty list; read the shared
  // query's state so a failed load isn't shown as "no notifications".
  const loadFailed = queryClient.getQueryState(['notifications', user?.id])?.status === 'error';

  const readCount = notifications.length - unreadCount;
  const visible = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications),
    [notifications, filter],
  );
  const groups = useMemo(() => groupByDay(visible), [visible]);

  const open = (n: Notification) => {
    if (!n.read_at) markAsRead(n.id);
    const target = notificationTarget(n.link);
    if (target.kind === 'route') navigate(target.to);
    else if (target.kind === 'external') window.open(target.href, '_blank', 'noopener,noreferrer');
  };

  const doClearRead = () => {
    clearRead.mutate(undefined, {
      onSuccess: () => toast.success(readCount === 1 ? 'Cleared 1 read notification.' : `Cleared ${readCount} read notifications.`),
      onError: () => toast.error('Couldn’t clear notifications. Please try again.'),
    });
    setConfirmClear(false);
  };

  const description = isLoading
    ? 'Bookings, offers, sales, payments and account updates.'
    : unreadCount > 0
      ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}. Open one to mark it read.`
      : notifications.length
        ? 'You’re all caught up.'
        : 'Bookings, offers, sales, payments and account updates.';

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className="flex flex-col gap-8 sm:gap-10">
          <PageHeader
            eyebrow="Updates"
            title="Notifications"
            description={description}
            actions={
              <>
                {unreadCount > 0 && (
                  <button type="button" className={ws.secondary} onClick={() => markAllAsRead()}>
                    Mark all as read
                  </button>
                )}
                {(isLoading || notifications.length > 0 || loadFailed) && (
                  <Link to="/dashboard/notifications/settings" className={ws.secondary}>
                    Settings
                  </Link>
                )}
              </>
            }
          />

          {loadFailed && !notifications.length ? (
            <section role="alert" className={cn(ws.surface, 'px-5 py-8 sm:px-8')}>
              <p className="text-[16px] font-semibold text-[#1C1B1A]">Notifications didn’t load.</p>
              <p className={cn(ws.body, 'mt-1.5')}>Check your connection and try again. Nothing has been lost.</p>
              <button type="button" className={cn(ws.secondary, 'mt-5')} onClick={() => void refetch()}>Try again</button>
            </section>
          ) : isLoading ? (
            <section aria-busy="true" className={cn(ws.surface, 'divide-y divide-[#F1ECE5]')}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span className="flex-1 space-y-2">
                    <span className={cn(ws.skeleton, 'block h-4 w-48 max-w-full')} />
                    <span className={cn(ws.skeleton, 'block h-3 w-72 max-w-full')} />
                  </span>
                </div>
              ))}
              <span className="sr-only" role="status">Loading notifications</span>
            </section>
          ) : notifications.length === 0 ? (
            <section className={ws.surface}>
              <EmptyState
                title="No notifications yet"
                body="Booking requests, offers, sales, payments and listing updates will show up here as they happen. Choose which ones also reach you by email or text."
                action={{ label: 'Notification settings', to: '/dashboard/notifications/settings' }}
              />
            </section>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Filter notifications" className="inline-flex rounded-full bg-[#F3EEE7] p-0.5">
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
                      {f === 'all' ? 'All' : `Unread${unreadCount ? ` · ${unreadCount}` : ''}`}
                    </button>
                  ))}
                </div>
                {readCount > 0 && (
                  <button type="button" className={ws.actionLink} onClick={() => setConfirmClear(true)} disabled={clearRead.isPending}>
                    {clearRead.isPending ? 'Clearing…' : 'Clear read'}
                  </button>
                )}
              </div>

              {groups.length === 0 ? (
                <section className={ws.surface}>
                  <div className="px-5 py-10 sm:px-8">
                    <p className="text-[17px] font-semibold tracking-[-0.01em] text-[#1C1B1A]">You’re all caught up.</p>
                    <p className={cn(ws.body, 'mt-1.5')}>No unread notifications.</p>
                    <button type="button" className={cn(ws.link, 'mt-4 inline-block')} onClick={() => setFilter('all')}>Show all notifications</button>
                  </div>
                </section>
              ) : (
                groups.map(([label, items]) => (
                  <section key={label} aria-labelledby={`notif-${label}`}>
                    <h2 id={`notif-${label}`} className={cn(ws.eyebrow, 'mb-3 px-1')}>{label}</h2>
                    <ul className={cn(ws.surface, 'divide-y divide-[#F1ECE5] overflow-hidden')}>
                      {items.map((n) => {
                        const unread = !n.read_at;
                        const target = notificationTarget(n.link);
                        const category = categoryOf(n.type);
                        return (
                          <li key={n.id} className="group relative flex items-start gap-1 transition-colors hover:bg-[#FCFAF7]">
                            <button
                              type="button"
                              onClick={() => open(n)}
                              className="flex min-w-0 flex-1 items-start gap-3 py-4 pl-5 pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1C1B1A] sm:pl-6"
                            >
                              <span className="mt-[7px] flex h-2 w-2 shrink-0 items-center justify-center" aria-hidden="true">
                                {unread && <span className="h-2 w-2 rounded-full bg-[#FF5124]" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-baseline gap-x-2">
                                  <span className={cn('text-[14px] leading-5 text-[#1C1B1A]', unread ? 'font-bold' : 'font-medium')}>
                                    {unread && <span className="sr-only">Unread: </span>}
                                    {n.title}
                                  </span>
                                </span>
                                {n.message && (
                                  <span className={cn('mt-0.5 block text-[13.5px] leading-5', unread ? 'text-[#3D3934]' : 'text-[#6F6961]')}>{n.message}</span>
                                )}
                                <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[#8A847B]">
                                  <time dateTime={n.created_at} title={fullStamp(n.created_at)} className="tabular-nums">{inboxStamp(n.created_at)}</time>
                                  {category && <><span aria-hidden="true">·</span><span>{category}</span></>}
                                </span>
                              </span>
                              {target.kind !== 'none' && (
                                <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#B5AEA4] transition-colors group-hover:text-[#1C1B1A]" />
                              )}
                            </button>
                            <div className="shrink-0 py-3 pr-3 sm:pr-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#6F6961] transition-colors hover:bg-[#F3EEE7] hover:text-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1C1B1A]"
                                    aria-label={`More actions for ${n.title}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {unread && <DropdownMenuItem onSelect={() => markAsRead(n.id)}>Mark as read</DropdownMenuItem>}
                                  <DropdownMenuItem onSelect={() => deleteNotification(n.id)}>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear read notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {readCount === 1 ? 'the 1 notification' : `the ${readCount} notifications`} you’ve already read. Unread ones stay. Your bookings, offers, messages and payments aren’t affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Keep them</AlertDialogCancel>
            <AlertDialogAction onClick={doClearRead}>Clear read</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceShell>
  );
}
