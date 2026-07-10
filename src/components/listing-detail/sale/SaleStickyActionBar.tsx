import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';

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
  const navigate = useNavigate();
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<'buy' | 'offer' | null>(null);

  if (isOwner) return null;
  const isAvailable = status === 'published';

  const handleBuy = () => {
    if (!user) {
      setPendingAction('buy');
      setShowAuthGate(true);
      return;
    }
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
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-pb"
        style={{
          background: 'linear-gradient(180deg, rgba(18,22,28,0.78) 0%, rgba(12,15,19,0.92) 100%)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          borderTop: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 -18px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="px-3 py-3 grid grid-cols-2 gap-2.5 items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleOffer}
            disabled={!isAvailable || !priceSale}
            className="h-14 text-base font-bold gap-2 rounded-2xl border-0 bg-cta-glass hover:bg-white/10 text-white"
          >
            <Tag className="h-4 w-4" />
            Make Offer
          </Button>
          <Button
            size="lg"
            onClick={handleBuy}
            disabled={!isAvailable}
            data-testid="sale-sticky-buy-now"
            className="h-14 text-base font-bold gap-2 rounded-2xl bg-cta-primary hover:opacity-95 shadow-cta-primary text-white border-0"
          >
            <ShoppingCart className="h-5 w-5" />
            Buy Now
          </Button>
        </div>
      </div>



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
