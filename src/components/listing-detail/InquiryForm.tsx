import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { calculateSaleFees, SALE_SELLER_FEE_PERCENT } from '@/lib/commissions';
import { supabase } from '@/integrations/supabase/client';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface InquiryFormProps {
  listingId: string;
  priceSale: number | null;
}

const InquiryForm = ({ listingId, priceSale }: InquiryFormProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const saleFees = priceSale ? calculateSaleFees(priceSale) : null;

  const handlePurchase = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!priceSale) return;

    setIsPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          listing_id: listingId,
          mode: 'sale',
          amount: priceSale,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      toast({
        title: 'Purchase Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please add a message for the seller',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement inquiry submission
    toast({
      title: 'Inquiry sent!',
      description: 'The seller will get back to you soon.',
    });
    
    setMessage('');
    setIsSubmitting(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card sticky top-24">
      <div className="mb-6">
        <span className="text-2xl font-bold text-foreground">
          ${priceSale?.toLocaleString()}
        </span>
        <p className="text-sm text-muted-foreground mt-1">Asking price (No buyer fees)</p>
      </div>

      {/* Fee info for sellers */}
      {saleFees && (
        <div className="mb-6 p-4 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Seller Breakdown
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale price</span>
              <span className="text-foreground">${saleFees.salePrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform fee ({SALE_SELLER_FEE_PERCENT}%)</span>
              <span className="text-destructive">-${saleFees.sellerFee.toLocaleString()}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-medium">
              <span>Seller receives</span>
              <span className="text-primary">${saleFees.sellerReceives.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <Textarea
            placeholder="I'm interested in this listing..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
            required
          />
        </div>

        <Button 
          type="submit"
          variant="outline"
          className="w-full" 
          size="lg"
          disabled={isSubmitting}
        >
          {user ? 'Send Inquiry' : 'Sign in to Inquire'}
        </Button>
      </form>

      <Separator className="my-4" />

      {/* Buy Now Button with Escrow */}
      <Button 
        onClick={handlePurchase}
        className="w-full bg-primary hover:bg-primary/90" 
        size="lg"
        disabled={isPurchasing || !priceSale}
      >
        {isPurchasing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : user ? (
          'Buy Now'
        ) : (
          'Sign in to Purchase'
        )}
      </Button>

      <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Protected by escrow - funds released after confirmation</span>
      </div>
    </div>
  );
};

export default InquiryForm;
