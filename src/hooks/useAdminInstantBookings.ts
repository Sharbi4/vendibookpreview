import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InstantBooking {
  id: string;
  listing_id: string;
  shopper_id: string;
  host_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string | null;
  is_instant_book: boolean | null;
  created_at: string;
  listing?: {
    title: string;
    cover_image_url: string | null;
  };
  shopper?: {
    full_name: string | null;
    email: string | null;
  };
  host?: {
    full_name: string | null;
  };
  documents?: {
    id: string;
    document_type: string;
    status: string;
    file_url: string;
  }[];
}

export const useAdminInstantBookings = () => {
  return useQuery({
    queryKey: ['admin-instant-bookings'],
    queryFn: async () => {
      // Fetch instant book bookings with related data
      const { data: bookings, error } = await supabase
        .from('booking_requests')
        .select(`
          id,
          listing_id,
          shopper_id,
          host_id,
          start_date,
          end_date,
          total_price,
          status,
          payment_status,
          is_instant_book,
          created_at
        `)
        .eq('is_instant_book', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!bookings) return [];

      // Fetch related data
      const listingIds = [...new Set(bookings.map(b => b.listing_id))];
      const shopperIds = [...new Set(bookings.map(b => b.shopper_id))];
      const hostIds = [...new Set(bookings.map(b => b.host_id))];
      const bookingIds = bookings.map(b => b.id);

      const [listingsResult, shoppersResult, hostsResult, documentsResult] = await Promise.all([
        supabase.from('listings').select('id, title, cover_image_url').in('id', listingIds),
        supabase.from('profiles').select('id, full_name, email').in('id', shopperIds),
        supabase.from('profiles').select('id, full_name').in('id', hostIds),
        supabase.from('booking_documents').select('id, booking_id, document_type, status, file_url').in('booking_id', bookingIds),
      ]);

      const listingsMap = new Map((listingsResult.data || []).map(l => [l.id, l]));
      const shoppersMap = new Map((shoppersResult.data || []).map(s => [s.id, s]));
      const hostsMap = new Map((hostsResult.data || []).map(h => [h.id, h]));
      
      // Group documents by booking
      const documentsMap = new Map<string, typeof documentsResult.data>();
      (documentsResult.data || []).forEach(doc => {
        const existing = documentsMap.get(doc.booking_id) || [];
        existing.push(doc);
        documentsMap.set(doc.booking_id, existing);
      });

      return bookings.map(booking => ({
        ...booking,
        listing: listingsMap.get(booking.listing_id),
        shopper: shoppersMap.get(booking.shopper_id),
        host: hostsMap.get(booking.host_id),
        documents: documentsMap.get(booking.id) || [],
      })) as InstantBooking[];
    },
  });
};

export const useAdminInstantBookStats = () => {
  const { data: bookings } = useAdminInstantBookings();
  
  if (!bookings) {
    return {
      total: 0,
      pendingDocs: 0,
      approved: 0,
      rejected: 0,
      awaitingPayment: 0,
    };
  }

  // Count bookings where documents are pending
  const pendingDocs = bookings.filter(b => 
    b.documents?.some(d => d.status === 'pending')
  ).length;

  // Count bookings where all docs approved and booking approved
  const approved = bookings.filter(b => 
    b.status === 'approved' && 
    b.documents?.length > 0 &&
    b.documents.every(d => d.status === 'approved')
  ).length;

  // Count rejected (any doc rejected)
  const rejected = bookings.filter(b => 
    b.documents?.some(d => d.status === 'rejected')
  ).length;

  // Awaiting payment
  const awaitingPayment = bookings.filter(b => 
    b.payment_status !== 'paid' && b.status === 'pending'
  ).length;

  return {
    total: bookings.length,
    pendingDocs,
    approved,
    rejected,
    awaitingPayment,
  };
};
