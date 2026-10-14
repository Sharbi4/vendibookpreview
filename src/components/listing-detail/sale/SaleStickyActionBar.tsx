import { useSaleActionState } from '@/hooks/useSaleActionState';
import SaleAvailabilityNote from '@/components/commerce/SaleAvailabilityNote';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import MessageHostForm from '@/components/messaging/MessageHostForm';

interface SaleStickyActionBarProps {
  listingId: string;
  hostId: string;
  priceSale: number | null;
  status: 'draft' | 'published' | 'paused';
  listingTitle: string;
  isOwner: boolean;
}

export const SaleStickyActionBar = ({
  listingId,
  hostId,
  priceSale,
  status,
  listingTitle,
  isOwner,
}: SaleStickyActionBarProps) => {
  const { user } = useAuth();
  const saleActions = useSaleActionState(listingId);
  const navigate = useNavigate();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  // Low-commitment first touch: works logged out (guest inquiry).
  const [showAsk, setShowAsk] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | null>(null);

  if (isOwner) return null;
  const isAvailable = status === 'published';

  // Checkout shows the order before asking guests to sign in.
  const handleBuy = () => {
    navigate(`/checkout/${listingId}`);
  };

  const handleOffer = () => {
    if (!user) {
      setPendingAction('offer');
      setShowAuthGate(true);
      return;
    }
    setShowOfferModal(true);
  };

  const handleAuthSuccess = () => {
    setShowAuthGate(false);
    if (pendingAction === 'buy') navigate(`/checkout/${listingId}`);
    else if (pendingAction === 'offer') setShowOfferModal(true);
    setPendingAction(null);
  };

  return (
    <>
      <div
        /* The global mobile nav is hidden on listing pages, so this bar owns the bottom edge. */
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-pb"
        style={{
          background: 'rgba(14,17,21,0.94)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 -6px 20px rgba(0,0,0,0.22)',
        }}
      >
        <SaleAvailabilityNote listingId={listingId} />
        {/* Compact on purpose: 44px touch targets, one row, never wider than the screen. */}
        <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1.35fr)] items-center gap-2 px-3 py-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAsk(true)}
            aria-label="Ask the seller a question"
            className="h-11 w-11 rounded-xl border-0 bg-cta-glass text-white hover:bg-white/10"
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </Button>
          <Button
            variant="outline"
            onClick={handleOffer}
            disabled={!saleActions.canOffer || (!isAvailable || !priceSale)}
            className="h-11 min-w-0 gap-1.5 rounded-xl border-0 bg-cta-glass px-2 text-[14px] font-semibold text-white hover:bg-white/10"
          >
            <Tag className="h-4 w-4 shrink-0" />
            <span className="truncate">Make offer</span>
          </Button>
          <Button
            onClick={handleBuy}
            disabled={!saleActions.canRequest || (!isAvailable)}
            data-testid="sale-sticky-buy-now"
            variant="cta"
            className="h-11 min-w-0 gap-1.5 rounded-xl px-2 text-[14px] font-semibold"
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span className="truncate">Request to buy</span>
          </Button>
        </div>
      </div>



      <Dialog open={showAsk} onOpenChange={setShowAsk}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ask the seller</DialogTitle>
          </DialogHeader>
          <MessageHostForm listingId={listingId} hostId={hostId} listingTitle={listingTitle} />
        </DialogContent>
      </Dialog>

      <AuthGateOfferModal
        open={showAuthGate}
        onOpenChange={setShowAuthGate}
        onAuthSuccess={handleAuthSuccess}
      />

      {priceSale && (
        <MakeOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          listingId={listingId}
          sellerId={hostId}
          listingTitle={listingTitle}
          askingPrice={priceSale}
        />
      )}
    </>
  );
};

export default SaleStickyActionBar;
