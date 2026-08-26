import React from 'react';
import SEO from '@/components/SEO';
import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';

const ListWithVendi: React.FC = () => (
  <>
    <SEO
      title="List with Vendi — Free Guided Listing Builder | Vendibook"
      description="Create your food truck, trailer, kitchen, or vendor space listing in a guided conversation. Free, self-serve, and live in minutes on Vendibook."
      canonical="https://vendibook.com/list-with-vendi"
    />
    <VendiListingBuilder />
  </>
);

export default ListWithVendi;
