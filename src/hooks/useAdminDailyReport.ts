import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

// Test/admin accounts to exclude
const EXCLUDED_EMAILS = [
  'ellemh13@gmail.com',
  'ellemh13@@gmailc.om',
  'darlingsherla@gmail.com',
  'atlasmom421@gmail.com',
  'shawnnaharbin@vendibook.com',
];

interface DailyReportRow {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  newSignups: number;
  newSignupDetails: string;
  newsletterSignups: number;
  draftsCreated: number;
  draftDetails: string;
  listingsPublished: number;
  listingDetails: string;
}

export interface DailyReportData {
  rows: DailyReportRow[];
  totals: {
    pageViews: number;
    uniqueVisitors: number;
    avgBounceRate: number;
    newSignups: number;
    newsletterSignups: number;
    draftsCreated: number;
    listingsPublished: number;
  };
}

export const useAdminDailyReport = (startDate: Date = new Date('2025-01-15')) => {
  return useQuery({
    queryKey: ['admin-daily-report', startDate.toISOString()],
    queryFn: async (): Promise<DailyReportData> => {
      const endDate = new Date();
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      // Get excluded user IDs
      const { data: excludedProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('email', EXCLUDED_EMAILS);
      
      const excludedUserIds = new Set((excludedProfiles || []).map(p => p.id));

      // Fetch all data in parallel
      const [
        profilesData,
        newsletterData,
        listingsData,
        analyticsData,
        userRolesData,
      ] = await Promise.all([
        // New user signups
        supabase
          .from('profiles')
          .select('id, email, full_name, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        
        // Newsletter signups
        supabase
          .from('newsletter_subscribers')
          .select('id, email, created_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        
        // Listings (both drafts and published)
        supabase
          .from('listings')
          .select('id, title, category, mode, status, host_id, created_at, published_at')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true }),
        
        // Analytics events for page views
        supabase
          .from('analytics_events')
          .select('id, event_name, session_id, user_id, created_at')
          .gte('created_at', startDate.toISOString())
          .in('event_name', ['page_view', 'pageview', 'session_start'])
          .order('created_at', { ascending: true }),
        
        // User roles for new users
        supabase
          .from('user_roles')
          .select('user_id, role, created_at')
          .gte('created_at', startDate.toISOString()),
      ]);

      const profiles = (profilesData.data || []).filter(p => !excludedUserIds.has(p.id));
      const newsletters = newsletterData.data || [];
      const listings = (listingsData.data || []).filter(l => !excludedUserIds.has(l.host_id));
      const analyticsEvents = analyticsData.data || [];
      const userRoles = userRolesData.data || [];

      // Create a map of user roles
      const userRoleMap = new Map<string, string[]>();
      userRoles.forEach(ur => {
        const roles = userRoleMap.get(ur.user_id) || [];
        roles.push(ur.role);
        userRoleMap.set(ur.user_id, roles);
      });

      // Process data by day
      const rows: DailyReportRow[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        // Filter events for this day
        const dayEvents = analyticsEvents.filter(e => {
          const eventDate = format(parseISO(e.created_at), 'yyyy-MM-dd');
          return eventDate === dayStr;
        });

        // Calculate page views (count page_view events)
        const pageViews = dayEvents.filter(e => 
          e.event_name === 'page_view' || e.event_name === 'pageview'
        ).length;

        // Calculate unique visitors (unique session_ids)
        const uniqueSessions = new Set(dayEvents.map(e => e.session_id).filter(Boolean));
        const uniqueVisitors = uniqueSessions.size;

        // Calculate bounce rate (sessions with only 1 event)
        const sessionEventCounts = new Map<string, number>();
        dayEvents.forEach(e => {
          if (e.session_id) {
            sessionEventCounts.set(e.session_id, (sessionEventCounts.get(e.session_id) || 0) + 1);
          }
        });
        const totalSessions = sessionEventCounts.size;
        const bouncedSessions = Array.from(sessionEventCounts.values()).filter(count => count === 1).length;
        const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

        // New signups for this day
        const daySignups = profiles.filter(p => {
          const signupDate = format(parseISO(p.created_at), 'yyyy-MM-dd');
          return signupDate === dayStr;
        });
        const signupDetails = daySignups.map(p => {
          const roles = userRoleMap.get(p.id) || ['user'];
          return `${p.full_name || p.email || 'Unknown'} (${roles.join(', ')})`;
        }).join('; ');

        // Newsletter signups for this day
        const dayNewsletters = newsletters.filter(n => {
          const date = format(parseISO(n.created_at), 'yyyy-MM-dd');
          return date === dayStr;
        });

        // Drafts created this day
        const dayDrafts = listings.filter(l => {
          const date = format(parseISO(l.created_at), 'yyyy-MM-dd');
          return date === dayStr && l.status === 'draft';
        });
        const draftDetails = dayDrafts.map(l => 
          `${l.title || 'Untitled'} (${l.category}, ${l.mode})`
        ).join('; ');

        // Listings published this day
        const dayPublished = listings.filter(l => {
          if (!l.published_at) return false;
          const date = format(parseISO(l.published_at), 'yyyy-MM-dd');
          return date === dayStr;
        });
        const listingDetails = dayPublished.map(l => 
          `${l.title || 'Untitled'} (${l.category}, ${l.mode})`
        ).join('; ');

        return {
          date: format(day, 'MMM dd, yyyy'),
          pageViews,
          uniqueVisitors,
          bounceRate,
          newSignups: daySignups.length,
          newSignupDetails: signupDetails || '-',
          newsletterSignups: dayNewsletters.length,
          draftsCreated: dayDrafts.length,
          draftDetails: draftDetails || '-',
          listingsPublished: dayPublished.length,
          listingDetails: listingDetails || '-',
        };
      });

      // Calculate totals
      const totals = {
        pageViews: rows.reduce((sum, r) => sum + r.pageViews, 0),
        uniqueVisitors: rows.reduce((sum, r) => sum + r.uniqueVisitors, 0),
        avgBounceRate: Math.round(rows.reduce((sum, r) => sum + r.bounceRate, 0) / rows.length) || 0,
        newSignups: rows.reduce((sum, r) => sum + r.newSignups, 0),
        newsletterSignups: rows.reduce((sum, r) => sum + r.newsletterSignups, 0),
        draftsCreated: rows.reduce((sum, r) => sum + r.draftsCreated, 0),
        listingsPublished: rows.reduce((sum, r) => sum + r.listingsPublished, 0),
      };

      return { rows: rows.reverse(), totals }; // Most recent first
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
