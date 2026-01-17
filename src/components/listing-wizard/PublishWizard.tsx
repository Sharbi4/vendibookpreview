import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, ExternalLink, Check, Camera, DollarSign, FileText, Calendar, CreditCard, ChevronRight, Save, Sparkles, TrendingUp, TrendingDown, Target, Wallet, Info, Banknote, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, ListingCategory, FreightPayer } from '@/types/listing';
import { PublishChecklist, createChecklistItems } from './PublishChecklist';
import { PublishSuccessModal } from './PublishSuccessModal';
import { AuthGateModal } from './AuthGateModal';
import { getGuestDraft, clearGuestDraft } from '@/lib/guestDraft';
import { cn } from '@/lib/utils';
import { FreightSettingsCard } from '@/components/freight';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  calculateRentalFees,
  calculateSaleFees,
  formatCurrency,
  RENTAL_HOST_FEE_PERCENT,
  SALE_SELLER_FEE_PERCENT,
} from '@/lib/commissions';

type PublishStep = 'photos' | 'pricing' | 'details' | 'availability' | 'rules' | 'stripe' | 'review';

interface ListingData {
  id: string;
  mode: 'rent' | 'sale';
  category: ListingCategory;
  title: string;
  description: string;
  address: string | null;
  pickup_location_text: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  instant_book: boolean;
  vendibook_freight_enabled: boolean;
  freight_payer: FreightPayer;
  accept_card_payment: boolean;
  accept_cash_payment: boolean;
}

interface RentalSuggestions {
  daily_low: number;
  daily_suggested: number;
  daily_high: number;
  weekly_low: number;
  weekly_suggested: number;
  weekly_high: number;
  reasoning: string;
}

interface SaleSuggestions {
  sale_low: number;
  sale_suggested: number;
  sale_high: number;
  reasoning: string;
}

export const PublishWizard: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnboardingComplete, isLoading: isStripeLoading, connectStripe, isConnecting } = useStripeConnect();

  const [step, setStep] = useState<PublishStep>('photos');
  const [listing, setListing] = useState<ListingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isGuestDraft, setIsGuestDraft] = useState(false);

  // Form fields
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [instantBook, setInstantBook] = useState(false);
  
  // New pricing fields
  const [vendibookFreightEnabled, setVendibookFreightEnabled] = useState(false);
  const [freightPayer, setFreightPayer] = useState<FreightPayer>('buyer');
  const [acceptCardPayment, setAcceptCardPayment] = useState(true);
  const [acceptCashPayment, setAcceptCashPayment] = useState(false);
  
  // AI suggestions state
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [rentalSuggestions, setRentalSuggestions] = useState<RentalSuggestions | null>(null);
  const [saleSuggestions, setSaleSuggestions] = useState<SaleSuggestions | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!listingId) return;

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error || !data) {
        toast({ title: 'Listing not found', variant: 'destructive' });
        navigate('/dashboard');
        return;
      }

      // Check if this is a guest draft (no host_id but has guest_draft_token)
      const guestDraft = getGuestDraft();
      if (!data.host_id && guestDraft?.listingId === listingId) {
        setIsGuestDraft(true);
      }

      setListing(data as unknown as ListingData);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPriceDaily(data.price_daily?.toString() || '');
      setPriceWeekly(data.price_weekly?.toString() || '');
      setPriceSale(data.price_sale?.toString() || '');
      setInstantBook(data.instant_book || false);
      setExistingImages(data.image_urls || []);
      setVendibookFreightEnabled(data.vendibook_freight_enabled || false);
      setFreightPayer((data.freight_payer as FreightPayer) || 'buyer');
      setAcceptCardPayment(data.accept_card_payment ?? true);
      setAcceptCashPayment(data.accept_cash_payment ?? false);
      setIsLoading(false);
    };

    fetchListing();
  }, [listingId, navigate, toast]);

  // Claim guest draft when user signs in
  const handleAuthSuccess = async (userId: string) => {
    if (!listing || !listingId) return;

    const guestDraft = getGuestDraft();
    if (!guestDraft || guestDraft.listingId !== listingId) return;

    try {
      // Claim the draft by setting the host_id
      const { error } = await supabase
        .from('listings')
        .update({ 
          host_id: userId,
          guest_draft_token: null, // Clear the token after claiming
        })
        .eq('id', listingId)
        .eq('guest_draft_token', guestDraft.token);

      if (error) throw error;

      // Clear localStorage
      clearGuestDraft();
      setIsGuestDraft(false);
      setShowAuthModal(false);

      toast({
        title: 'Draft claimed!',
        description: 'Your listing is now saved to your account.',
      });
    } catch (error) {
      console.error('Error claiming draft:', error);
      toast({
        title: 'Error claiming draft',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Gate check for Details step - require auth before saving
  const handleDetailsSave = async () => {
    if (!user && isGuestDraft) {
      // Show auth modal instead of saving
      setShowAuthModal(true);
      return;
    }
    // Proceed with normal save
    await saveStep();
  };

  // Calculate payout estimates
  const rentalPayoutEstimates = useMemo(() => {
    const dailyPrice = parseFloat(priceDaily) || 0;
    const weeklyPrice = parseFloat(priceWeekly) || 0;
    
    return {
      daily: dailyPrice > 0 ? calculateRentalFees(dailyPrice) : null,
      weekly: weeklyPrice > 0 ? calculateRentalFees(weeklyPrice) : null,
    };
  }, [priceDaily, priceWeekly]);

  const estimatedFreightCost = 500; // Placeholder
  
  const salePayoutEstimate = useMemo(() => {
    const salePriceNum = parseFloat(priceSale) || 0;
    if (salePriceNum <= 0) return null;
    
    const isSellerPaidFreight = vendibookFreightEnabled && freightPayer === 'seller';
    const freightCost = vendibookFreightEnabled ? estimatedFreightCost : 0;
    
    return calculateSaleFees(salePriceNum, freightCost, isSellerPaidFreight);
  }, [priceSale, vendibookFreightEnabled, freightPayer]);

  const getLocation = () => {
    if (listing?.address) return listing.address;
    if (listing?.pickup_location_text) return listing.pickup_location_text;
    return '';
  };

  const handleGetSuggestions = async () => {
    if (!title || !listing?.category) {
      toast({
        title: 'Missing information',
        description: 'Please add a title and category first to get pricing suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-pricing', {
        body: {
          title: title,
          category: listing.category,
          location: getLocation(),
          mode: listing.mode,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      if (listing.mode === 'rent') {
        setRentalSuggestions(data as RentalSuggestions);
      } else {
        setSaleSuggestions(data as SaleSuggestions);
      }

      toast({
        title: 'Suggestions ready!',
        description: 'AI pricing suggestions have been generated based on your listing details.',
      });
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        title: 'Could not get suggestions',
        description: error instanceof Error ? error.message : 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const applyRentalSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!rentalSuggestions) return;
    
    const dailyKey = `daily_${type}` as keyof RentalSuggestions;
    const weeklyKey = `weekly_${type}` as keyof RentalSuggestions;
    
    setPriceDaily(String(rentalSuggestions[dailyKey]));
    setPriceWeekly(String(rentalSuggestions[weeklyKey]));
  };

  const applySaleSuggestion = (type: 'low' | 'suggested' | 'high') => {
    if (!saleSuggestions) return;
    
    const key = `sale_${type}` as keyof SaleSuggestions;
    setPriceSale(String(saleSuggestions[key]));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [...existingImages];
    
    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}/${listingId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      urls.push(publicUrl);
    }
    
    return urls;
  };

  const saveStep = async () => {
    if (!listing) return;
    setIsSaving(true);

    try {
      let updateData: any = {};

      if (step === 'photos' && images.length > 0) {
        const imageUrls = await uploadImages();
        updateData = {
          image_urls: imageUrls,
          cover_image_url: imageUrls[0] || null,
        };
        setExistingImages(imageUrls);
        setImages([]);
      } else if (step === 'pricing') {
        if (listing.mode === 'sale') {
          updateData = { 
            price_sale: parseFloat(priceSale) || null,
            vendibook_freight_enabled: vendibookFreightEnabled,
            freight_payer: freightPayer,
            accept_card_payment: acceptCardPayment,
            accept_cash_payment: acceptCashPayment,
          };
        } else {
          updateData = {
            price_daily: parseFloat(priceDaily) || null,
            price_weekly: parseFloat(priceWeekly) || null,
            instant_book: instantBook,
          };
        }
      } else if (step === 'details') {
        updateData = { title, description };
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id);

        if (error) throw error;
        
        // Update local state
        setListing(prev => prev ? { ...prev, ...updateData } : null);
      }

      // Move to next step
      const steps: PublishStep[] = ['photos', 'pricing', 'details', listing.mode === 'rent' ? 'availability' : 'rules', 'stripe', 'review'].filter(Boolean) as PublishStep[];
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        setStep(steps[currentIndex + 1]);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: 'Error saving', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!listing || !isOnboardingComplete) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('listings')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', listing.id);

      if (error) throw error;

      // Track analytics
      console.log('[ANALYTICS] Listing published', { listingId: listing.id });

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error publishing:', error);
      toast({ title: 'Error publishing', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStripeConnect = async () => {
    try {
      await connectStripe();
    } catch (error) {
      toast({ title: 'Error connecting Stripe', variant: 'destructive' });
    }
  };

  // Checklist state
  const checklistState = {
    hasPhotos: existingImages.length >= 3 || images.length >= 3 || (existingImages.length + images.length) >= 3,
    hasPricing: listing?.mode === 'sale' ? !!priceSale : !!priceDaily,
    hasAvailability: true, // Optional
    hasDescription: title.length > 0 && description.length > 0,
    hasStripe: isOnboardingComplete,
    hasVerification: false, // Optional
    isRental: listing?.mode === 'rent',
  };

  const checklistItems = createChecklistItems(checklistState, step);
  const canPublish = checklistItems.filter(i => i.required).every(i => i.completed);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Save & exit
            </button>
            <h1 className="font-semibold">
              {CATEGORY_LABELS[listing.category]} · {listing.mode === 'rent' ? 'For Rent' : 'For Sale'}
            </h1>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar Checklist - Desktop */}
          <div className="hidden lg:block">
            <PublishChecklist
              items={checklistItems}
              onItemClick={(id) => setStep(id as PublishStep)}
              className="sticky top-24"
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Mobile Checklist */}
            <div className="lg:hidden mb-6">
              <PublishChecklist
                items={checklistItems}
                onItemClick={(id) => setStep(id as PublishStep)}
              />
            </div>

            <div className="bg-card rounded-2xl shadow-sm border p-6 md:p-8">
              {/* Step: Photos */}
              {step === 'photos' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Add photos</h2>
                    <p className="text-muted-foreground">Upload at least 3 photos. 5+ recommended.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {existingImages.map((url, index) => (
                      <div key={`existing-${index}`} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {images.map((file, index) => (
                      <div key={`new-${index}`} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-sm hover:bg-black/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                      <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Add photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <Button onClick={saveStep} disabled={isSaving || (existingImages.length + images.length) < 3}>
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step: Pricing */}
              {step === 'pricing' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Set your price</h2>
                    <p className="text-muted-foreground">
                      {listing.mode === 'sale' ? 'Enter your asking price.' : 'Set daily and weekly rates.'}
                    </p>
                  </div>

                  {/* AI Suggestions Button */}
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground mb-1">AI Pricing Assistant</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Get smart pricing suggestions based on your listing title, category, and location.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGetSuggestions}
                          disabled={isLoadingSuggestions}
                          className="border-primary/30 hover:bg-primary/5"
                        >
                          {isLoadingSuggestions ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing market...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Get AI Suggestions
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {listing.mode === 'sale' ? (
                    <>
                      {/* Sale Suggestions Display */}
                      {saleSuggestions && (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Suggested Pricing
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('low')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingDown className="w-3 h-3" />
                                Quick Sale
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_low.toLocaleString()}</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('suggested')}
                              className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-primary text-xs mb-1">
                                <Target className="w-3 h-3" />
                                Recommended
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_suggested.toLocaleString()}</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applySaleSuggestion('high')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingUp className="w-3 h-3" />
                                Premium
                              </div>
                              <div className="font-semibold text-foreground">${saleSuggestions.sale_high.toLocaleString()}</div>
                            </button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground italic">
                            {saleSuggestions.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Sale Price Input */}
                      <div className="space-y-2">
                        <Label htmlFor="priceSale" className="text-base font-medium">Asking Price *</Label>
                        <div className="relative max-w-sm">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="priceSale"
                            type="number"
                            placeholder="0"
                            value={priceSale}
                            onChange={(e) => setPriceSale(e.target.value)}
                            className="pl-8 text-xl"
                          />
                        </div>
                      </div>

                      {/* Payout Estimate for Sales */}
                      {salePayoutEstimate && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-foreground max-w-md">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <Wallet className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-foreground">
                                  {vendibookFreightEnabled && freightPayer === 'seller' 
                                    ? 'Seller Payout Estimate (Free Shipping)' 
                                    : 'Estimated Payout'}
                                </h4>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Item price:</span>
                                <span className="text-sm text-foreground">
                                  {formatCurrency(salePayoutEstimate.salePrice)}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-muted-foreground">Platform commission:</span>
                                <span className="text-sm text-destructive">
                                  -{formatCurrency(salePayoutEstimate.sellerFee)}
                                </span>
                              </div>
                              
                              {salePayoutEstimate.freightDeduction > 0 && (
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm text-muted-foreground">Freight (seller-paid):</span>
                                  <span className="text-sm text-destructive">
                                    -{formatCurrency(salePayoutEstimate.freightDeduction)}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-300/30">
                                <span className="text-sm font-medium text-foreground">Estimated payout:</span>
                                <span className="font-semibold text-green-600 text-lg">
                                  {formatCurrency(salePayoutEstimate.sellerReceives)}
                                </span>
                              </div>
                              
                              <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Platform fee is {SALE_SELLER_FEE_PERCENT}% of the sale price</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Payment Method Options */}
                      <div className="pt-6 border-t">
                        <div className="flex items-center gap-2 mb-4">
                          <CreditCard className="w-5 h-5 text-primary" />
                          <h3 className="text-lg font-semibold">Accepted Payment Methods</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select how buyers can pay for your item. You can enable both options.
                        </p>

                        <div className="space-y-4">
                          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                            <Checkbox
                              id="accept_card_payment"
                              checked={acceptCardPayment}
                              onCheckedChange={(checked) => setAcceptCardPayment(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="accept_card_payment"
                                className="flex items-center gap-2 text-base font-medium cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4 text-primary" />
                                Pay by Card (Online)
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Accept secure online payments via Stripe. Funds are deposited to your connected Stripe account after sale confirmation.
                              </p>
                              {acceptCardPayment && (
                                <div className="mt-2 p-2 bg-primary/5 rounded text-xs text-muted-foreground">
                                  <Info className="w-3 h-3 inline mr-1" />
                                  Requires Stripe Connect setup to receive payments.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start space-x-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                            <Checkbox
                              id="accept_cash_payment"
                              checked={acceptCashPayment}
                              onCheckedChange={(checked) => setAcceptCashPayment(!!checked)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor="accept_cash_payment"
                                className="flex items-center gap-2 text-base font-medium cursor-pointer"
                              >
                                <Banknote className="w-4 h-4 text-green-600" />
                                Pay in Person
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Accept cash or other payments at pickup/delivery. You'll arrange payment directly with the buyer.
                              </p>
                            </div>
                          </div>

                          {!acceptCardPayment && !acceptCashPayment && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <p className="text-sm text-destructive flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Please select at least one payment method.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Freight Settings */}
                      <div className="pt-6 border-t">
                        <FreightSettingsCard
                          enabled={vendibookFreightEnabled}
                          payer={freightPayer}
                          onEnabledChange={(enabled) => setVendibookFreightEnabled(enabled)}
                          onPayerChange={(payer) => setFreightPayer(payer)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Rental Suggestions Display */}
                      {rentalSuggestions && (
                        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
                          <h4 className="font-medium text-foreground flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Suggested Pricing
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('low')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingDown className="w-3 h-3" />
                                Budget
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_low}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_low}/week</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('suggested')}
                              className="p-3 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-primary text-xs mb-1">
                                <Target className="w-3 h-3" />
                                Recommended
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_suggested}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_suggested}/week</div>
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => applyRentalSuggestion('high')}
                              className="p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                            >
                              <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                <TrendingUp className="w-3 h-3" />
                                Premium
                              </div>
                              <div className="font-semibold text-foreground">${rentalSuggestions.daily_high}/day</div>
                              <div className="text-xs text-muted-foreground">${rentalSuggestions.weekly_high}/week</div>
                            </button>
                          </div>
                          
                          <p className="text-sm text-muted-foreground italic">
                            {rentalSuggestions.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Rental Pricing Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="priceDaily" className="text-base font-medium">Daily Rate *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="priceDaily"
                              type="number"
                              placeholder="0"
                              value={priceDaily}
                              onChange={(e) => setPriceDaily(e.target.value)}
                              className="pl-8 text-lg"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priceWeekly" className="text-base font-medium">Weekly Rate (optional)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              id="priceWeekly"
                              type="number"
                              placeholder="0"
                              value={priceWeekly}
                              onChange={(e) => setPriceWeekly(e.target.value)}
                              className="pl-8 text-lg"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Payout Estimate for Rentals */}
                      {(rentalPayoutEstimates.daily || rentalPayoutEstimates.weekly) && (
                        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-foreground">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                              <Wallet className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground mb-2">Estimated Payout</h4>
                              <div className="space-y-2">
                                {rentalPayoutEstimates.daily && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Daily rental:</span>
                                    <div className="text-right">
                                      <span className="font-semibold text-green-600">
                                        {formatCurrency(rentalPayoutEstimates.daily.hostReceives)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({formatCurrency(rentalPayoutEstimates.daily.hostFee)} fee)
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {rentalPayoutEstimates.weekly && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Weekly rental:</span>
                                    <div className="text-right">
                                      <span className="font-semibold text-green-600">
                                        {formatCurrency(rentalPayoutEstimates.weekly.hostReceives)}
                                      </span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({formatCurrency(rentalPayoutEstimates.weekly.hostFee)} fee)
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
                                <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                <span>Platform fee is {RENTAL_HOST_FEE_PERCENT}% of the rental price</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Instant Book Toggle */}
                      <div className="pt-4 border-t">
                        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="p-2 bg-amber-500/10 rounded-lg">
                                <Zap className="w-5 h-5 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-foreground">Instant Book</h4>
                                  <InfoTooltip 
                                    content="When enabled, renters can book and pay immediately. Documents are still reviewed - if rejected, the booking is cancelled and payment is fully refunded." 
                                  />
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Allow renters to book immediately without waiting for approval.
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={instantBook}
                              onCheckedChange={(checked) => setInstantBook(checked)}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setStep('photos')}>Back</Button>
                    <Button 
                      onClick={saveStep} 
                      disabled={isSaving || (listing.mode === 'sale' ? (!priceSale || (!acceptCardPayment && !acceptCashPayment)) : !priceDaily)}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Details */}
              {step === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Add details</h2>
                    <p className="text-muted-foreground">Help renters understand your listing.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., 2020 Custom Food Truck"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your listing, key features, and what makes it special..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep('pricing')}>Back</Button>
                      <Button onClick={handleDetailsSave} disabled={isSaving || !title || !description}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {!user && isGuestDraft ? 'Save & Continue' : 'Continue'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                    {/* Guest reminder */}
                    {!user && isGuestDraft && (
                      <p className="text-xs text-muted-foreground text-center">
                        Sign-in required to save your details.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Stripe */}
              {step === 'stripe' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Connect Stripe</h2>
                    <p className="text-muted-foreground">Required to receive payments.</p>
                  </div>

                  {isOnboardingComplete ? (
                    <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-800 dark:text-emerald-200">Stripe connected</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">You're ready to receive payments</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl border border-border bg-muted/30 text-center">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground mb-2">Set up payouts</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect your Stripe account to get paid when you receive bookings or sales.
                      </p>
                      <Button onClick={handleStripeConnect} disabled={isConnecting}>
                        {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Connect Stripe
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
                    <Button onClick={() => setStep('review')} disabled={!isOnboardingComplete}>
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {step === 'review' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Review & publish</h2>
                    <p className="text-muted-foreground">Your listing is ready to go live.</p>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    {existingImages[0] && (
                      <img src={existingImages[0]} alt="" className="w-full h-48 object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-foreground">{title}</h3>
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{description}</p>
                      <p className="text-primary font-semibold mt-2">
                        {listing.mode === 'sale'
                          ? `$${parseFloat(priceSale).toLocaleString()}`
                          : `$${priceDaily}/day`}
                      </p>
                    </div>
                  </div>

                  {/* Stripe Connect Panel - Clear messaging */}
                  {!isOnboardingComplete && (
                    <div className="p-5 rounded-xl border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-6 h-6 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                            Connect Stripe to get paid
                          </h3>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                            To go live and receive payments, you need to connect your Stripe account. Takes about 2 minutes.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={handleStripeConnect} disabled={isConnecting}>
                              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Connect Stripe (2 min)
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                              <Save className="w-4 h-4 mr-1" />
                              Save Draft
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('stripe')}>Back</Button>
                    <Button onClick={handlePublish} disabled={isSaving || !canPublish || !isOnboardingComplete}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Publish
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PublishSuccessModal
        open={showSuccessModal}
        onOpenChange={(open) => {
          if (!open) navigate('/dashboard');
          setShowSuccessModal(open);
        }}
        listing={listing ? {
          id: listing.id,
          title,
          coverImageUrl: existingImages[0] || null,
          category: listing.category,
          mode: listing.mode,
          address: listing.address,
          priceDaily: parseFloat(priceDaily) || null,
          priceWeekly: parseFloat(priceWeekly) || null,
          priceSale: parseFloat(priceSale) || null,
        } : null}
        onViewListing={() => navigate(`/listing/${listing?.id}`)}
      />

      {/* Auth Gate Modal */}
      <AuthGateModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onAuthSuccess={handleAuthSuccess}
        draftId={listingId}
      />
    </div>
  );
};
