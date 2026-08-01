import { Link } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import {
  LISTING_UNAVAILABLE_BODY,
  LISTING_UNAVAILABLE_TITLE,
} from '@/lib/listings/publicVisibility';

/**
 * Neutral page shown when a shopper opens the direct URL of a listing that is
 * not publicly available. Deliberately leaks no private detail (no title,
 * price, photos, host, or purchase controls) and is never indexed.
 */
export default function ListingUnavailable({ browseHref = '/search' }: { browseHref?: string }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Listing no longer available"
        description="This listing is no longer available on Vendibook."
        noindex
      />
      <Header />
      <main className="flex-1 container py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {LISTING_UNAVAILABLE_TITLE}
        </h1>
        <p className="text-muted-foreground mb-8">{LISTING_UNAVAILABLE_BODY}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="dark-shine" asChild>
            <Link to={browseHref}>
              <SearchIcon className="h-4 w-4 mr-2" />
              Browse similar listings
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
