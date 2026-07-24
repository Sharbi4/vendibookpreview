import { Link } from 'react-router-dom';
import { Bell, Settings2, Loader2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import EmptyState from '../shared/EmptyState';
import { cn } from '@/lib/utils';

const NotificationsTab = () => {
  const { user } = useAuth();
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(user?.id) as any;

  return (
    <div className="max-w-[840px] mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => markAllAsRead?.()}>
              <Check className="h-3.5 w-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/notification-preferences">
              <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Preferences
            </Link>
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Booking updates, payments, and messages will land here. Tune what you receive in Preferences."
          ctaLabel="Notification preferences"
          ctaHref="/notification-preferences"
        />
      ) : (
        <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {notifications.map((n: any) => {
            const unread = !n.read_at;
            const inner = (
              <div className={cn('flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors', unread && 'bg-primary/5')}>
                <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', unread ? 'bg-primary' : 'bg-transparent')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.title ?? n.type}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id} onClick={() => unread && markAsRead?.(n.id)}>
                {n.link ? <Link to={n.link}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default NotificationsTab;
