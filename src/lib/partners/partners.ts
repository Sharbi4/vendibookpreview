import { supabase } from '@/integrations/supabase/client';

export interface ServicePartner {
  id: string;
  company_name: string;
  category: string;
  logo_url: string | null;
  description: string | null;
  service_area: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  contact_form_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_sponsored: boolean;
  is_featured: boolean;
  display_order: number;
}

export const PARTNER_CATEGORIES: { key: string; label: string }[] = [
  { key: 'financing', label: 'Financing' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'inspection', label: 'Inspections' },
  { key: 'transport', label: 'Transport' },
  { key: 'kitchen', label: 'Commercial kitchens' },
  { key: 'commissary', label: 'Commissaries' },
  { key: 'builder', label: 'Food truck builders' },
  { key: 'wrap', label: 'Wrap & branding' },
  { key: 'pos', label: 'POS' },
  { key: 'fire', label: 'Fire suppression' },
  { key: 'cleaning', label: 'Hood cleaning' },
  { key: 'repair', label: 'Equipment repair' },
];

export async function listActivePartners(): Promise<ServicePartner[]> {
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: unknown) => {
          order: (col: string, opts?: { ascending?: boolean }) => {
            order: (col: string) => Promise<{ data: ServicePartner[] | null; error: Error | null }>;
          };
        };
      };
    };
  })
    .from('service_partners')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export interface CreateLeadInput {
  partnerId: string;
  service: string;
  location?: string;
  budget?: string;
  timeline?: string;
  notes?: string;
  listingId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  consentGranted: boolean;
}

export async function submitPartnerLead(input: CreateLeadInput): Promise<{ id: string }> {
  if (!input.consentGranted) throw new Error('Consent is required to share your info.');
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('You must be signed in to submit a partner request.');

  const row = {
    user_id: user.user.id,
    partner_id: input.partnerId,
    listing_id: input.listingId ?? null,
    service: input.service,
    location: input.location ?? null,
    budget: input.budget ?? null,
    timeline: input.timeline ?? null,
    notes: input.notes ?? null,
    contact_name: input.contactName ?? null,
    contact_email: input.contactEmail ?? null,
    contact_phone: input.contactPhone ?? null,
    consent_granted: true,
    consent_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      insert: (r: unknown) => {
        select: (c: string) => {
          single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
        };
      };
    };
  })
    .from('partner_leads')
    .insert(row)
    .select('id')
    .single();
  if (error) throw error;
  if (!data) throw new Error('Lead not saved.');
  return { id: data.id };
}
