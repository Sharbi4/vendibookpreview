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
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/85 backdrop-blur-xl border-t border-white/10 safe-pb"
        style={{ boxShadow: '0 -12px 32px -8px rgba(0,0,0,0.5)' }}
      >
        <div className="px-3 py-3 grid grid-cols-[1fr_auto] gap-2.5 items-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleOffer}
            disabled={!isAvailable || !priceSale}
            className="h-12 text-base font-semibold gap-2 border-primary/40 bg-background/40 hover:bg-background/60"
          >
            <Tag className="h-4 w-4" />
            Make Offer
          </Button>
          <Button
            size="lg"
            onClick={handleBuy}
            disabled={!isAvailable}
            className="h-12 text-base font-semibold gap-2 px-6 bg-gradient-to-r from-primary to-[hsl(14_100%_50%)] hover:opacity-95 shadow-glow-orange"
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
