import React from 'react';
import SEO from '@/components/SEO';
import RequireAuth from '@/components/auth/RequireAuth';
import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';
import VendiAuthGate from '@/components/vendi-listing/VendiAuthGate';
import { useAuth } from '@/contexts/AuthContext';

// Never carry a previous account's interview or in-flight state into another account.
const AccountBuilder = () => {
  const { user } = useAuth();
  return <VendiListingBuilder key={user?.id ?? 'signed-out'} />;
};

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
      <AccountBuilder />
    </RequireAuth>
  </>
);

export default ListWithVendi;
