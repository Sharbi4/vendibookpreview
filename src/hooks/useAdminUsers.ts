import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  identity_verified: boolean | null;
  stripe_onboarding_complete: boolean | null;
  roles: string[];
  listing_count: number;
}

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, display_name, avatar_url, created_at, identity_verified, stripe_onboarding_complete')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch listing counts per host
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('host_id');

      if (listingsError) throw listingsError;

      // Map roles to users
      const rolesMap = new Map<string, string[]>();
      roles?.forEach((r) => {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      });

      // Count listings per user
      const listingCountMap = new Map<string, number>();
      listings?.forEach((l) => {
        if (l.host_id) {
          listingCountMap.set(l.host_id, (listingCountMap.get(l.host_id) || 0) + 1);
        }
      });

      const users: AdminUser[] = (profiles || []).map((p) => ({
        ...p,
        roles: rolesMap.get(p.id) || [],
        listing_count: listingCountMap.get(p.id) || 0,
      }));

      return users;
    },
  });
};

export const useAdminUserStats = (users: AdminUser[] | undefined) => {
  const total = users?.length || 0;
  const verified = users?.filter((u) => u.identity_verified).length || 0;
  const hosts = users?.filter((u) => u.roles.includes('host')).length || 0;
  const admins = users?.filter((u) => u.roles.includes('admin')).length || 0;
  const stripeConnected = users?.filter((u) => u.stripe_onboarding_complete).length || 0;

  return { total, verified, hosts, admins, stripeConnected };
};
