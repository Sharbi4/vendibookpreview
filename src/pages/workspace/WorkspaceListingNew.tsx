import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import ListingPathChoice from '@/components/listing/ListingPathChoice';
import { trackEvent } from '@/lib/analytics';

/**
 * `/dashboard/listings/new` — listing creation inside the workspace.
 * Same QuickStart wizard and draft logic as `/list/start`; only the shell
 * and the follow-on routes differ so sellers never leave the dashboard.
 */
export default function WorkspaceListingNew() {
  const [searchParams, setSearchParams] = useSearchParams();
  const manual = searchParams.get('path') === 'self';

  useEffect(() => {
    trackEvent({
      category: 'Supply',
      action: manual ? 'listing_quickstart_viewed' : 'listing_path_choice_viewed',
      label: 'dashboard',
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
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <div>
            <p className="v2-eyebrow">Seller control center</p>
            <h1>Create a listing</h1>
            <p>Free to publish. Your progress saves as you go.</p>
          </div>
          <Link to="/dashboard/listings" className="v2-btn-quiet">
            <ArrowLeft />
            My listings
          </Link>
        </header>

        <div className="v2-card sale-light v2-wizard-embed">
          {manual ? (
            <QuickStartWizard
              resumeTo={(id) => `/dashboard/listings/${id}/edit`}
              gatewayTo="/dashboard/listings/new"
              saveForLaterTo="/dashboard/listings"
            />
          ) : (
            <ListingPathChoice onChooseManual={chooseManual} search={searchWithoutPath()} />
          )}
        </div>
      </div>
    </WorkspaceShell>
  );
}
