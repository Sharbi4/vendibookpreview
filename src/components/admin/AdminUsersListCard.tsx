import { format } from 'date-fns';
import { Shield, BadgeCheck, CreditCard, List, FileEdit, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSyncToZendesk } from '@/hooks/useSyncToZendesk';
import type { AdminUser } from '@/hooks/useAdminUsers';

interface AdminUsersListCardProps {
  user: AdminUser;
}

const AdminUsersListCard = ({ user }: AdminUsersListCardProps) => {
  const { syncCustomer, isSyncing } = useSyncToZendesk();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSyncToZendesk = async () => {
    await syncCustomer(user.id);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.full_name || user.display_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">
                {user.full_name || user.display_name || 'Unnamed User'}
              </span>
              {user.roles.includes('admin') && (
                <Badge variant="default" className="bg-primary text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
              {user.roles.includes('host') && (
                <Badge variant="secondary" className="text-xs">
                  Host
                </Badge>
              )}
              {user.identity_verified && (
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              {user.stripe_onboarding_complete && (
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
                  <CreditCard className="h-3 w-3 mr-1" />
                  Stripe
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email || 'No email'}</p>
          </div>

          <div className="flex items-center gap-6">
            {user.draft_count > 0 && (
              <div className="text-center text-sm hidden sm:block">
                <div className="flex items-center gap-1 text-amber-600">
                  <FileEdit className="h-3.5 w-3.5" />
                  <span>Drafts</span>
                </div>
                <p className="font-semibold text-amber-600">{user.draft_count}</p>
              </div>
            )}
            {user.listing_count > 0 && (
              <div className="text-center text-sm hidden sm:block">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <List className="h-3.5 w-3.5" />
                  <span>Listings</span>
                </div>
                <p className="font-semibold text-foreground">{user.listing_count}</p>
              </div>
            )}
            <div className="text-right text-sm text-muted-foreground hidden sm:block">
              <p>Joined</p>
              <p className="font-medium text-foreground">
                {format(new Date(user.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncToZendesk}
              disabled={isSyncing}
              className="ml-2"
              title="Sync to Zendesk"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline ml-1">Zendesk</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminUsersListCard;
