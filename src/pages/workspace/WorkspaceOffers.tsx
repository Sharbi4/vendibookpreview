import { useSearchParams } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import { HostOffersSection, type OfferFocusAction } from '@/components/dashboard/HostOffersSection';
import { BuyerOffersSection } from '@/components/dashboard/BuyerOffersSection';
import { useBuyerOffers } from '@/hooks/useBuyerOffers';

const ACTIONS: OfferFocusAction[] = ['review', 'accept', 'counter', 'decline'];

/**
 * Offers in one place: offers buyers made on your listings (accept, counter,
 * decline) and offers you made as a buyer. Offer emails deep-link here with
 * ?offer=<id>&action=accept|counter|decline; the link only focuses the offer
 * and opens the matching dialog — every response is still the seller's click.
 */
export default function WorkspaceOffers() {
  const [params] = useSearchParams();
  const { offers: myOffers = [] } = useBuyerOffers();
  const focusOfferId = params.get('offer');
  const rawAction = params.get('action') as OfferFocusAction | null;
  const focusAction = rawAction && ACTIONS.includes(rawAction) ? rawAction : focusOfferId ? 'review' : null;

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Offers</p>
          <h1>Offers</h1>
          <p>Offers stay open for 48 hours. Respond before they expire.</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Offers on your listings</h2>
          <HostOffersSection focusOfferId={focusOfferId} focusAction={focusAction} showEmpty />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Offers you've made</h2>
          {myOffers.length ? (
            <BuyerOffersSection />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              You haven't made any offers yet. Look for "Make an offer" on listings that accept offers.
            </p>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
