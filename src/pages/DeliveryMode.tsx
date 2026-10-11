import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import DeliveryModePanel from '@/components/delivery/DeliveryModePanel';
import DeliveryTrackingPanel from '@/components/delivery/DeliveryTrackingPanel';

/** Seller / assigned-driver "Delivery mode" for one order. */
export default function DeliveryMode() {
  const { kind, id } = useParams<{ kind: 'sale' | 'booking'; id: string }>();
  const saleId = kind === 'sale' ? (id ?? null) : null;
  const bookingId = kind === 'booking' ? (id ?? null) : null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Delivery mode | Vendibook" description="Share live delivery location with the buyer on this Vendibook order." noindex />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/orders/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to order
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Delivery mode</h1>
          <p className="text-sm text-muted-foreground">
            Share your live location with the buyer while you're delivering this order.
          </p>
        </div>
        <DeliveryModePanel saleTransactionId={saleId} bookingId={bookingId} />
        <DeliveryTrackingPanel saleTransactionId={saleId} bookingId={bookingId} />
      </div>
    </div>
  );
}
