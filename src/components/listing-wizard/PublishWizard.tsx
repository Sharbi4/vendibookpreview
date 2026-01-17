import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, ExternalLink, Check, Camera, DollarSign, FileText, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORY_LABELS, ListingCategory } from '@/types/listing';
import { PublishChecklist, createChecklistItems } from './PublishChecklist';
import { PublishSuccessModal } from './PublishSuccessModal';
import { cn } from '@/lib/utils';

type PublishStep = 'photos' | 'pricing' | 'details' | 'availability' | 'rules' | 'stripe' | 'review';

interface ListingData {
  id: string;
  mode: 'rent' | 'sale';
  category: ListingCategory;
  title: string;
  description: string;
  address: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  price_daily: number | null;
  price_weekly: number | null;
  price_sale: number | null;
  available_from: string | null;
  available_to: string | null;
  instant_book: boolean;
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

  // Form fields
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [instantBook, setInstantBook] = useState(false);

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

      setListing(data as unknown as ListingData);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setPriceDaily(data.price_daily?.toString() || '');
      setPriceWeekly(data.price_weekly?.toString() || '');
      setPriceSale(data.price_sale?.toString() || '');
      setInstantBook(data.instant_book || false);
      setExistingImages(data.image_urls || []);
      setIsLoading(false);
    };

    fetchListing();
  }, [listingId, navigate, toast]);

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
        updateData = listing.mode === 'sale'
          ? { price_sale: parseFloat(priceSale) || null }
          : {
              price_daily: parseFloat(priceDaily) || null,
              price_weekly: parseFloat(priceWeekly) || null,
              instant_book: instantBook,
            };
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

                  {listing.mode === 'sale' ? (
                    <div className="space-y-2">
                      <Label htmlFor="priceSale">Sale price</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="priceSale"
                          type="number"
                          placeholder="0"
                          value={priceSale}
                          onChange={(e) => setPriceSale(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="priceDaily">Daily rate</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="priceDaily"
                            type="number"
                            placeholder="0"
                            value={priceDaily}
                            onChange={(e) => setPriceDaily(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priceWeekly">Weekly rate (optional)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="priceWeekly"
                            type="number"
                            placeholder="0"
                            value={priceWeekly}
                            onChange={(e) => setPriceWeekly(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 p-4 rounded-lg border border-border cursor-pointer hover:bg-muted/50">
                        <Checkbox
                          checked={instantBook}
                          onCheckedChange={(checked) => setInstantBook(checked === true)}
                        />
                        <div>
                          <span className="font-medium text-foreground">Enable Instant Book</span>
                          <p className="text-sm text-muted-foreground">Allow renters to book and pay instantly</p>
                        </div>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('photos')}>Back</Button>
                    <Button onClick={saveStep} disabled={isSaving || (listing.mode === 'sale' ? !priceSale : !priceDaily)}>
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

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('pricing')}>Back</Button>
                    <Button onClick={saveStep} disabled={isSaving || !title || !description}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Continue
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
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

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep('stripe')}>Back</Button>
                    <Button onClick={handlePublish} disabled={isSaving || !canPublish}>
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
    </div>
  );
};
