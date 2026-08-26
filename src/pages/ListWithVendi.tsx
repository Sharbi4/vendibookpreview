import React from 'react';
import SEO from '@/components/SEO';
import RequireAuth from '@/components/auth/RequireAuth';
import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';
import VendiAuthGate from '@/components/vendi-listing/VendiAuthGate';

const ListWithVendi: React.FC = () => (
  <>
    <SEO
      title="List with Vendi — Free Guided Listing Builder | Vendibook"
      description="Create your food truck, trailer, kitchen, or vendor space listing in a guided conversation. Free, self-serve, and live in minutes on Vendibook."
      canonical="https://vendibook.com/list-with-vendi"
    />
    {/* Route-level gate: the interview, draft creation, and media uploads are
        never mounted for unauthenticated visitors. */}
    <RequireAuth fallback={<VendiAuthGate />}>
      <VendiListingBuilder />
    </RequireAuth>
  </>
);

export default ListWithVendi;
