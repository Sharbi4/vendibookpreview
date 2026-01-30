import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, parseISO, differenceInDays } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const EASTERN_TZ = 'America/New_York';

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
  daysSinceLastUser: number | null;
  daysSinceLastListing: number | null;
  daysSinceLastNewsletter: number | null;
}

export interface CadenceStats {
  avgDaysBetweenUsers: number;
  avgDaysBetweenListings: number;
  avgDaysBetweenNewsletters: number;
  usersPerWeek: number;
  listingsPerWeek: number;
  newslettersPerWeek: number;
  totalDays: number;
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
  cadence: CadenceStats;
}

export const useAdminDailyReport = (startDate: Date = new Date('2025-01-15')) => {
  return useQuery({
    queryKey: ['admin-daily-report', startDate.toISOString()],
    queryFn: async (): Promise<DailyReportData> => {
      const endDate = toZonedTime(new Date(), EASTERN_TZ);
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      // Helper to get Eastern date string from ISO timestamp
      const getEasternDateStr = (isoTimestamp: string): string => {
        const zonedDate = toZonedTime(parseISO(isoTimestamp), EASTERN_TZ);
        return format(zonedDate, 'yyyy-MM-dd');
      };

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

      // Track dates of events for cadence calculation
      const userSignupDates: Date[] = [];
      const listingPublishDates: Date[] = [];
      const newsletterDates: Date[] = [];

      // Process data by day (in Eastern time)
      const rows: DailyReportRow[] = days.map((day, dayIndex) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        // Filter events for this day (using Eastern timezone)
        const dayEvents = analyticsEvents.filter(e => {
          const eventDate = getEasternDateStr(e.created_at);
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

        // New signups for this day (in Eastern time)
        const daySignups = profiles.filter(p => {
          const signupDate = getEasternDateStr(p.created_at);
          return signupDate === dayStr;
        });
        
        // Track signup dates for cadence
        daySignups.forEach(() => userSignupDates.push(day));
        
        const signupDetails = daySignups.map(p => {
          const roles = userRoleMap.get(p.id) || ['user'];
          return `${p.full_name || p.email || 'Unknown'} (${roles.join(', ')})`;
        }).join('; ');

        // Newsletter signups for this day (in Eastern time)
        const dayNewsletters = newsletters.filter(n => {
          const date = getEasternDateStr(n.created_at);
          return date === dayStr;
        });
        
        // Track newsletter dates for cadence
        dayNewsletters.forEach(() => newsletterDates.push(day));

        // Drafts created this day (in Eastern time)
        const dayDrafts = listings.filter(l => {
          const date = getEasternDateStr(l.created_at);
          return date === dayStr && l.status === 'draft';
        });
        const draftDetails = dayDrafts.map(l => 
          `${l.title || 'Untitled'} (${l.category}, ${l.mode})`
        ).join('; ');

        // Listings published this day (in Eastern time)
        const dayPublished = listings.filter(l => {
          if (!l.published_at) return false;
          const date = getEasternDateStr(l.published_at);
          return date === dayStr;
        });
        
        // Track listing publish dates for cadence
        dayPublished.forEach(() => listingPublishDates.push(day));
        
        const listingDetails = dayPublished.map(l => 
          `${l.title || 'Untitled'} (${l.category}, ${l.mode})`
        ).join('; ');

        // Calculate days since last events
        const daysSinceLastUser = userSignupDates.length > 1 
          ? differenceInDays(day, userSignupDates[userSignupDates.length - 2]) 
          : null;
        const daysSinceLastListing = listingPublishDates.length > 1 
          ? differenceInDays(day, listingPublishDates[listingPublishDates.length - 2]) 
          : null;
        const daysSinceLastNewsletter = newsletterDates.length > 1 
          ? differenceInDays(day, newsletterDates[newsletterDates.length - 2]) 
          : null;

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
          daysSinceLastUser: daySignups.length > 0 ? daysSinceLastUser : null,
          daysSinceLastListing: dayPublished.length > 0 ? daysSinceLastListing : null,
          daysSinceLastNewsletter: dayNewsletters.length > 0 ? daysSinceLastNewsletter : null,
        };
      });

      // Calculate cadence stats
      const totalDays = differenceInDays(endDate, startDate) + 1;
      const totalWeeks = totalDays / 7;

      const calculateAvgDaysBetween = (dates: Date[]): number => {
        if (dates.length < 2) return 0;
        let totalGap = 0;
        for (let i = 1; i < dates.length; i++) {
          totalGap += differenceInDays(dates[i], dates[i - 1]);
        }
        return Math.round((totalGap / (dates.length - 1)) * 10) / 10;
      };

      const cadence: CadenceStats = {
        avgDaysBetweenUsers: calculateAvgDaysBetween(userSignupDates),
        avgDaysBetweenListings: calculateAvgDaysBetween(listingPublishDates),
        avgDaysBetweenNewsletters: calculateAvgDaysBetween(newsletterDates),
        usersPerWeek: Math.round((userSignupDates.length / totalWeeks) * 10) / 10,
        listingsPerWeek: Math.round((listingPublishDates.length / totalWeeks) * 10) / 10,
        newslettersPerWeek: Math.round((newsletterDates.length / totalWeeks) * 10) / 10,
        totalDays,
      };

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

      return { rows: rows.reverse(), totals, cadence }; // Most recent first
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
