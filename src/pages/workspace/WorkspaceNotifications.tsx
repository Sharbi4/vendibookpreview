import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCheck,
  DollarSign,
  FileText,
  Landmark,
  MessageCircle,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { toDashboardTarget } from '@/lib/navigation/dashboardTargets';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Bell> = {
  booking_request: Calendar,
  booking_approved: CheckCheck,
  booking_declined: AlertCircle,
  message: MessageCircle,
  payment: DollarSign,
  sale: DollarSign,
  dispute: AlertCircle,
  document: FileText,
  review: Star,
  verification: ShieldCheck,
  product_update: Landmark,
  default: Bell,
};

type Filter = 'all' | 'unread';

function bucket(created: string) {
  const age = Date.now() - new Date(created).getTime();
  if (age < 1000 * 60 * 60 * 24) return 'Today';
  if (age < 1000 * 60 * 60 * 24 * 7) return 'This week';
  return 'Earlier';
}

export default function WorkspaceNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.id);

  const groups = useMemo(() => {
    const visible = filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications;
    const order = ['Today', 'This week', 'Earlier'];
    const map = new Map<string, Notification[]>();
    visible.forEach((n) => {
      const key = bucket(n.created_at);
      map.set(key, [...(map.get(key) ?? []), n]);
    });
    return order.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [notifications, filter]);

  const open = (n: Notification) => {
    if (!n.read_at) markAsRead(n.id);
    const target = toDashboardTarget(n.link);
    if (target) navigate(target);
  };

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Updates</p>
          <h1>Notifications</h1>
          <p>
            {unreadCount > 0
              ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}.`
              : 'You are all caught up.'}
          </p>
        </header>

        <div className="v2-filter-row">
          <button
            type="button"
            className={cn('v2-filter', filter === 'all' && 'is-active')}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={cn('v2-filter', filter === 'unread' && 'is-active')}
            onClick={() => setFilter('unread')}
          >
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
          <span className="flex-1" />
          {unreadCount > 0 && (
            <button type="button" className="v2-btn-quiet" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
          <Link to="/dashboard/notifications/settings" className="v2-btn-quiet">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="v2-skeleton h-20" />
            <div className="v2-skeleton h-20" />
            <div className="v2-skeleton h-20" />
          </div>
        ) : groups.length === 0 ? (
          <div className="v2-empty">
            <Bell />
            <h3>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
            <p>
              Booking requests, messages, payments and listing updates will appear here as they
              happen.
            </p>
            <Link to="/dashboard/notifications/settings" className="v2-btn-outline">
              Choose what Vendibook sends you
            </Link>
          </div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label}>
              <p className="v2-group-label">{label}</p>
              <div className="v2-panel">
                {items.map((n) => {
                  const Icon = ICONS[n.type] || ICONS.default;
                  const unread = !n.read_at;
                  return (
                    <div key={n.id} className="v2-activity-row">
                      <button
                        type="button"
                        className="flex flex-1 items-start gap-3 text-left min-w-0"
                        onClick={() => open(n)}
                      >
                        <span className={cn('v2-activity-icon', unread && 'is-active')}>
                          <Icon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className={cn('block', !unread && 'font-medium')}>{n.title}</strong>
                          <small className="block">{n.message}</small>
                          <small className="block opacity-70">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </small>
                        </span>
                      </button>
                      <div className="flex items-center gap-1 self-start">
                        {unread && (
                          <button
                            type="button"
                            className="v2-btn-quiet"
                            onClick={() => markAsRead(n.id)}
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          className="v2-btn-quiet"
                          aria-label="Delete notification"
                          onClick={() => deleteNotification(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </WorkspaceShell>
  );
}
