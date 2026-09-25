import React, { useEffect } from 'react';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { trackEvent } from '@/lib/analytics';
import { LISTING_ROUTES } from '@/lib/listings/routes';

/** Listing creation uses the step-by-step wizard while assisted listing is paused. */
const ListStart: React.FC = () => {
  useEffect(() => {
    trackEvent({
      category: 'Supply',
      action: 'listing_quickstart_viewed',
    });
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="sale-light min-h-screen">
      <SEO
        title="Start your VendiBook listing"
        description="Answer a few quick questions to create your listing draft. Free to publish, and you can save and return anytime."
        canonical={LISTING_ROUTES.quickStart}
      />
      <Header />
      <main
        className="mx-auto max-w-3xl px-4 pb-28 pt-24 sm:pt-28 md:pb-16"
      >
        <QuickStartWizard />
      </main>
    </div>
  );
};

export default ListStart;
