import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import ListingPathChoice from '@/components/listing/ListingPathChoice';
import { trackEvent } from '@/lib/analytics';
import { LISTING_ROUTES } from '@/lib/listings/routes';

/**
 * `/list/start` — listing entry. The very first screen is the path choice
 * (assisted "List with Vendi" vs the existing manual wizard). Choosing the
 * manual path (`?path=self`) renders the untouched QuickStart wizard.
 */
const ListStart: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const manual = searchParams.get('path') === 'self';

  useEffect(() => {
    trackEvent({
      category: 'Supply',
      action: manual ? 'listing_quickstart_viewed' : 'listing_path_choice_viewed',
    });
    window.scrollTo({ top: 0 });
  }, [manual]);

  const chooseManual = () => {
    const next = new URLSearchParams(searchParams);
    next.set('path', 'self');
    setSearchParams(next, { replace: true });
  };

  const searchWithoutPath = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('path');
    const qs = next.toString();
    return qs ? `?${qs}` : '';
  };

  return (
    <div className="sale-light min-h-screen">
      <SEO
        title="Start your VendiBook listing"
        description="Answer a few quick questions to create your listing draft. Free to publish, and you can save and return anytime."
        canonical={LISTING_ROUTES.quickStart}
      />
      <Header />
      <main
        className={`mx-auto px-4 pb-28 pt-24 sm:pt-28 md:pb-16 ${manual ? 'max-w-3xl' : 'max-w-5xl'}`}
      >
        {manual ? (
          <QuickStartWizard />
        ) : (
          <>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                List on Vendibook
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How would you like to build your listing?
              </h1>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Both paths are free and end with the same live listing. Pick whichever feels
                easier — you can switch at any time.
              </p>
            </div>
            <div className="mt-8 sm:mt-10">
              <ListingPathChoice onChooseManual={chooseManual} search={searchWithoutPath()} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ListStart;
