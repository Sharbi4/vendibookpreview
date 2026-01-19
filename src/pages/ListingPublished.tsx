import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Stamp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShareKit, ShareKitListing } from '@/components/listing-wizard/ShareKit';
import { ListingCategory, ListingMode } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';

const ListingPublished: React.FC = () => {
  const [searchParams] = useSearchParams();
  const listingIdFromParams = useParams<{ listingId: string }>().listingId;
  // Support both route param and query param for listing_id
  const listingId = listingIdFromParams || searchParams.get('listing_id');
  const notaryPaid = searchParams.get('notary_paid') === 'true';
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [listing, setListing] = useState<ShareKitListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Show toast for notary payment success
    if (notaryPaid) {
      toast({
        title: "Notary Fee Paid",
        description: "Your $45 Proof Notary add-on has been activated. Your listing is now live!",
      });
    }
  }, [notaryPaid, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!listingId) {
      navigate('/dashboard');
      return;
    }

    const fetchListing = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Listing not found');
          return;
        }

        // Check ownership
        if (data.host_id !== user?.id) {
          setError('You do not have access to this listing');
          return;
        }

        setListing({
          id: data.id,
          title: data.title,
          coverImageUrl: data.cover_image_url,
          category: data.category as ListingCategory,
          mode: data.mode as ListingMode,
          address: data.address,
          priceDaily: data.price_daily,
          priceWeekly: data.price_weekly,
          priceSale: data.price_sale,
          highlights: data.highlights || [],
          availableFrom: data.available_from,
          availableTo: data.available_to,
        });
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchListing();
    }
  }, [listingId, user, authLoading, navigate]);

  const handleClose = () => {
    navigate('/dashboard');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <h1 className="font-semibold">Share your listing</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Notary Payment Success Banner */}
      {notaryPaid && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Stamp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Proof Notary Add-On Activated
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Your $45 notary fee has been charged. Both parties will receive notarization links when the sale completes.
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Share Kit */}
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <ShareKit listing={listing} onClose={handleClose} />
      </div>
    </div>
  );
};

export default ListingPublished;
