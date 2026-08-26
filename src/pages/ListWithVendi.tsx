import React from 'react';
import { Helmet } from 'react-helmet-async';
import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';

const ListWithVendi: React.FC = () => (
  <>
    <Helmet>
      <title>List with Vendi — Free Guided Listing Builder | Vendibook</title>
      <meta
        name="description"
        content="Create your food truck, trailer, kitchen, or vendor space listing in a guided conversation. Free, self-serve, and live in minutes on Vendibook."
      />
      <link rel="canonical" href="https://vendibook.com/list-with-vendi" />
      <meta name="robots" content="index,follow" />
    </Helmet>
    <VendiListingBuilder />
  </>
);

export default ListWithVendi;
