import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Link2, 
  FileText, 
  ImagePlus, 
  Upload, 
  ArrowLeft, 
  Loader2, 
  X, 
  Check,
  Sparkles,
  AlertCircle,
  Video,
  Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  trackImportFlowStarted, 
  trackImportMethodSelected, 
  trackImportContentSubmitted,
  trackImportReviewViewed,
  trackDraftCreatedFromImport,
  trackImportContinueSetupClicked,
  trackImportFinishLaterClicked
} from '@/lib/analytics';
import { ListingCategory, ListingMode, CATEGORY_LABELS, MODE_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';

type ImportMethod = 'url' | 'text' | 'photos';
type ImportStep = 'method' | 'content' | 'review' | 'success';

interface ImportFormData {
  method: ImportMethod | null;
  url: string;
  text: string;
  photos: File[];
  videos: File[];
  // Prefilled/editable fields
  title: string;
  category: ListingCategory | null;
  mode: ListingMode | null;
  location: string;
  price: string;
  highlights: string[];
  // Tracking which fields were auto-filled
  autoFilledFields: Set<string>;
}

const initialFormData: ImportFormData = {
  method: null,
  url: '',
  text: '',
  photos: [],
  videos: [],
  title: '',
  category: null,
  mode: null,
  location: '',
  price: '',
  highlights: [],
  autoFilledFields: new Set(),
};

// File validation constants
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const IMPORT_METHODS = [
  { 
    id: 'url' as ImportMethod, 
    label: 'Paste listing link', 
    description: "We'll use it to prefill your draft.",
    icon: Link2 
  },
  { 
    id: 'text' as ImportMethod, 
    label: 'Paste listing text', 
    description: 'Copy and paste your description.',
    icon: FileText 
  },
  { 
    id: 'photos' as ImportMethod, 
    label: 'Upload photos & videos', 
    description: 'Start with media, add details later.',
    icon: ImagePlus 
  },
];

const CATEGORY_OPTIONS: { value: ListingCategory; label: string }[] = [
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'food_trailer', label: 'Food Trailer' },
  { value: 'ghost_kitchen', label: 'Shared Kitchen' },
  { value: 'vendor_lot', label: 'Vendor Space' },
];

const MODE_OPTIONS: { value: ListingMode; label: string }[] = [
  { value: 'rent', label: 'For Rent' },
  { value: 'sale', label: 'For Sale' },
];

export const ImportListingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState<ImportStep>('method');
  const [formData, setFormData] = useState<ImportFormData>(initialFormData);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  
  // Refs for URL cleanup
  const photoUrlsRef = useRef<string[]>([]);
  const videoUrlsRef = useRef<string[]>([]);
  
  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      photoUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      videoUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Track flow started on mount
  React.useEffect(() => {
    trackImportFlowStarted();
  }, []);

  const updateField = useCallback(<K extends keyof ImportFormData>(
    field: K, 
    value: ImportFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleMethodSelect = (method: ImportMethod) => {
    updateField('method', method);
    trackImportMethodSelected(method);
  };

  const handlePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid format. Use JPG, PNG, or WebP.`);
      } else if (file.size > MAX_IMAGE_SIZE) {
        errors.push(`${file.name}: Too large. Max 10MB allowed.`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      toast({
        title: `${errors.length} file(s) couldn't be added`,
        description: errors.slice(0, 2).join('\n'),
        variant: 'destructive',
      });
    }
    
    if (validFiles.length === 0) return;

    const newPhotos = [...formData.photos, ...validFiles];
    updateField('photos', newPhotos);

    // Create previews using object URLs for better memory management
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      photoUrlsRef.current.push(url);
      setPhotoPreviews(prev => [...prev, url]);
    });
  };

  const handleVideosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    files.forEach(file => {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid format. Use MP4, WebM, or MOV.`);
      } else if (file.size > MAX_VIDEO_SIZE) {
        errors.push(`${file.name}: Too large. Max 100MB allowed.`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      toast({
        title: `${errors.length} video(s) couldn't be added`,
        description: errors.slice(0, 2).join('\n'),
        variant: 'destructive',
      });
    }
    
    if (validFiles.length === 0) return;

    const newVideos = [...formData.videos, ...validFiles];
    updateField('videos', newVideos);

    // Create previews using object URLs
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      videoUrlsRef.current.push(url);
      setVideoPreviews(prev => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = formData.photos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    // Clean up the URL
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index]);
    }
    updateField('photos', newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const removeVideo = (index: number) => {
    const newVideos = formData.videos.filter((_, i) => i !== index);
    const newPreviews = videoPreviews.filter((_, i) => i !== index);
    // Clean up the URL
    if (videoPreviews[index]) {
      URL.revokeObjectURL(videoPreviews[index]);
    }
    updateField('videos', newVideos);
    setVideoPreviews(newPreviews);
  };

  const handleContinueToContent = () => {
    if (!formData.method) return;
    setStep('content');
  };

  const extractInfoFromText = (text: string): Partial<ImportFormData> => {
    const extracted: Partial<ImportFormData> = {
      autoFilledFields: new Set(),
    };

    // Extract title (first line or first sentence)
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      extracted.title = lines[0].substring(0, 100).trim();
      extracted.autoFilledFields?.add('title');
    }

    // Extract price (look for $ followed by numbers)
    const priceMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
    if (priceMatch) {
      extracted.price = priceMatch[0].replace(/[$,]/g, '');
      extracted.autoFilledFields?.add('price');
    }

    // Guess category from keywords
    const lowerText = text.toLowerCase();
    if (lowerText.includes('food truck') || lowerText.includes('foodtruck')) {
      extracted.category = 'food_truck';
      extracted.autoFilledFields?.add('category');
    } else if (lowerText.includes('food trailer') || lowerText.includes('concession trailer')) {
      extracted.category = 'food_trailer';
      extracted.autoFilledFields?.add('category');
    } else if (lowerText.includes('ghost kitchen') || lowerText.includes('commercial kitchen') || lowerText.includes('cloud kitchen')) {
      extracted.category = 'ghost_kitchen';
      extracted.autoFilledFields?.add('category');
    } else if (lowerText.includes('vendor lot') || lowerText.includes('vendor space') || lowerText.includes('parking spot') || lowerText.includes('vending spot')) {
      extracted.category = 'vendor_lot';
      extracted.autoFilledFields?.add('category');
    }

    // Guess mode from keywords
    if (lowerText.includes('for sale') || lowerText.includes('selling') || lowerText.includes('buy now')) {
      extracted.mode = 'sale';
      extracted.autoFilledFields?.add('mode');
    } else if (lowerText.includes('for rent') || lowerText.includes('rental') || lowerText.includes('per day') || lowerText.includes('per week')) {
      extracted.mode = 'rent';
      extracted.autoFilledFields?.add('mode');
    }

    // Extract location (look for city, state patterns)
    const locationMatch = text.match(/(?:in|located in|at)\s+([A-Za-z\s]+,\s*[A-Z]{2})/i);
    if (locationMatch) {
      extracted.location = locationMatch[1].trim();
      extracted.autoFilledFields?.add('location');
    }

    // Generate highlights from key phrases
    const highlights: string[] = [];
    const highlightPatterns = [
      /fully equipped/i,
      /turnkey/i,
      /ready to go/i,
      /low miles/i,
      /new equipment/i,
      /health permit/i,
      /recently inspected/i,
      /generator included/i,
      /commercial grade/i,
      /high traffic/i,
    ];

    highlightPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          highlights.push(match[0].charAt(0).toUpperCase() + match[0].slice(1).toLowerCase());
        }
      }
    });

    // Extract additional highlights from bullet points
    const bulletPoints = text.match(/[•\-\*]\s*([^\n•\-\*]+)/g);
    if (bulletPoints) {
      bulletPoints.slice(0, 5).forEach(point => {
        const cleaned = point.replace(/^[•\-\*]\s*/, '').trim();
        if (cleaned.length > 5 && cleaned.length < 80 && highlights.length < 5) {
          highlights.push(cleaned);
        }
      });
    }

    if (highlights.length > 0) {
      extracted.highlights = highlights.slice(0, 5);
      extracted.autoFilledFields?.add('highlights');
    }

    return extracted;
  };

  const handleCreateDraft = async () => {
    if (!formData.method) {
      toast({
        title: 'Please select an import method',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      trackImportContentSubmitted();
    } catch (e) {
      // Analytics should not block the flow
      console.warn('Analytics tracking failed:', e);
    }

    try {
      let extractedData: Partial<ImportFormData> = {
        autoFilledFields: new Set(),
      };

      // Process based on method
      if (formData.method === 'url') {
        // For URL, we save it but don't try to scrape (graceful degradation)
        // If user has also pasted text, use that
        if (formData.text.trim()) {
          extractedData = extractInfoFromText(formData.text);
        }
      } else if (formData.method === 'text') {
        if (formData.text.trim()) {
          extractedData = extractInfoFromText(formData.text);
        }
      }
      // For photos-only, we just proceed with empty extraction

      // Safely merge extracted data with form data
      setFormData(prev => ({
        ...prev,
        title: extractedData.title || prev.title || '',
        category: extractedData.category || prev.category,
        mode: extractedData.mode || prev.mode,
        location: extractedData.location || prev.location || '',
        price: extractedData.price || prev.price || '',
        highlights: extractedData.highlights || prev.highlights || [],
        autoFilledFields: extractedData.autoFilledFields || new Set(),
      }));

      try {
        trackImportReviewViewed();
      } catch (e) {
        console.warn('Analytics tracking failed:', e);
      }
      
      setStep('review');
    } catch (error) {
      console.error('Error processing import:', error);
      toast({
        title: 'Error processing content',
        description: error instanceof Error ? error.message : 'Please try again or enter details manually.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      toast({ 
        title: 'Please log in to continue', 
        description: 'You need to be signed in to create a listing.',
        variant: 'destructive' 
      });
      return;
    }

    // Validate minimum required fields with specific messages
    const missingFields: string[] = [];
    if (!formData.category) missingFields.push('category');
    if (!formData.mode) missingFields.push('listing type');
    if (!formData.location || !formData.location.trim()) missingFields.push('location');

    if (missingFields.length > 0) {
      toast({
        title: 'Missing required fields',
        description: `Please fill in: ${missingFields.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Determine fulfillment type based on category
      const fulfillmentType = formData.category === 'ghost_kitchen' || formData.category === 'vendor_lot' 
        ? 'on_site' 
        : 'pickup';

      // Generate title if missing - safely access CATEGORY_LABELS
      const categoryLabel = formData.category && CATEGORY_LABELS[formData.category] 
        ? CATEGORY_LABELS[formData.category] 
        : 'Listing';
      const title = formData.title?.trim() || `My ${categoryLabel}`;

      // Parse price safely
      let priceDaily: number | null = null;
      let priceSale: number | null = null;
      
      if (formData.price && formData.price.trim()) {
        const parsedPrice = parseFloat(formData.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          if (formData.mode === 'rent') {
            priceDaily = parsedPrice;
          } else if (formData.mode === 'sale') {
            priceSale = parsedPrice;
          }
        }
      }

      // Create the draft listing
      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert({
          host_id: user.id,
          mode: formData.mode,
          category: formData.category,
          status: 'draft',
          title,
          description: formData.text?.trim() || '',
          highlights: Array.isArray(formData.highlights) ? formData.highlights : [],
          fulfillment_type: fulfillmentType,
          address: formData.location?.trim() || null,
          pickup_location_text: formData.location?.trim() || null,
          price_daily: priceDaily,
          price_sale: priceSale,
        } as any)
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create listing');
      }

      if (!listing || !listing.id) {
        throw new Error('Failed to create listing - no listing ID returned');
      }

      // Upload photos if any
      const uploadedImageUrls: string[] = [];
      if (formData.photos && formData.photos.length > 0) {
        for (const photo of formData.photos) {
          try {
            const fileExt = photo.name.split('.').pop() || 'jpg';
            const fileName = `${listing.id}/${crypto.randomUUID()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('listings')
              .upload(fileName, photo);

            if (!uploadError) {
              const { data: publicUrl } = supabase.storage
                .from('listings')
                .getPublicUrl(fileName);
              if (publicUrl?.publicUrl) {
                uploadedImageUrls.push(publicUrl.publicUrl);
              }
            } else {
              console.warn('Photo upload error:', uploadError);
            }
          } catch (photoError) {
            console.warn('Error uploading photo:', photoError);
            // Continue with other photos
          }
        }
      }

      // Upload videos if any
      const uploadedVideoUrls: string[] = [];
      if (formData.videos && formData.videos.length > 0) {
        for (const video of formData.videos) {
          try {
            const fileExt = video.name.split('.').pop() || 'mp4';
            const fileName = `${listing.id}/${crypto.randomUUID()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('listings')
              .upload(fileName, video);

            if (!uploadError) {
              const { data: publicUrl } = supabase.storage
                .from('listings')
                .getPublicUrl(fileName);
              if (publicUrl?.publicUrl) {
                uploadedVideoUrls.push(publicUrl.publicUrl);
              }
            } else {
              console.warn('Video upload error:', uploadError);
            }
          } catch (videoError) {
            console.warn('Error uploading video:', videoError);
            // Continue with other videos
          }
        }
      }

      // Update listing with image and video URLs if any were uploaded
      if (uploadedImageUrls.length > 0 || uploadedVideoUrls.length > 0) {
        const updateData: Record<string, any> = {};
        
        if (uploadedImageUrls.length > 0) {
          updateData.cover_image_url = uploadedImageUrls[0];
          updateData.image_urls = uploadedImageUrls;
        }
        
        if (uploadedVideoUrls.length > 0) {
          updateData.video_urls = uploadedVideoUrls;
        }
        
        const { error: updateError } = await supabase
          .from('listings')
          .update(updateData)
          .eq('id', listing.id);
        
        if (updateError) {
          console.warn('Error updating listing with media:', updateError);
          // Don't throw - listing was created, media can be added later
        }
      }

      // Track success - don't let analytics errors block the flow
      try {
        trackDraftCreatedFromImport(formData.method || 'unknown');
      } catch (e) {
        console.warn('Analytics tracking failed:', e);
      }
      
      setCreatedListingId(listing.id);
      setStep('success');
    } catch (error) {
      console.error('Error creating draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Error creating draft',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueSetup = () => {
    trackImportContinueSetupClicked();
    if (createdListingId) {
      navigate(`/create-listing/${createdListingId}`);
    }
  };

  const handleFinishLater = () => {
    trackImportFinishLaterClicked();
    navigate('/dashboard');
  };

  const canProceedToReview = () => {
    if (!formData.method) return false;
    if (formData.method === 'url' && !formData.url.trim() && !formData.text.trim()) return false;
    if (formData.method === 'text' && !formData.text.trim()) return false;
    if (formData.method === 'photos' && formData.photos.length === 0 && formData.videos.length === 0) return false;
    return true;
  };

  const canSaveDraft = () => {
    return !!formData.category && !!formData.mode && formData.location.trim().length > 0;
  };

  // Render based on current step
  if (step === 'success') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Draft created</h2>
        <p className="text-muted-foreground mb-8">
          Finish pricing and details to publish.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={handleContinueSetup} size="lg" className="w-full">
            Continue setup
          </Button>
          <Button 
            onClick={handleFinishLater} 
            variant="ghost" 
            size="lg" 
            className="w-full"
          >
            Finish later
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Review your listing</h2>
          <p className="text-muted-foreground">
            Confirm the details we extracted from your content.
          </p>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="title">Title</Label>
              {formData.autoFilledFields.has('title') && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
            </div>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., 2019 Custom Food Truck"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Category</Label>
              {formData.autoFilledFields.has('category') && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
              {!formData.category && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('category', option.value)}
                  className={cn(
                    "px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                    formData.category === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listing Type */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Listing type</Label>
              {formData.autoFilledFields.has('mode') && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
              {!formData.mode && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateField('mode', option.value)}
                  className={cn(
                    "px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                    formData.mode === option.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="location">Location (City, State)</Label>
              {formData.autoFilledFields.has('location') && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
              {!formData.location.trim() && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Required
                </Badge>
              )}
            </div>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g., Houston, TX"
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="price">Price (optional)</Label>
              {formData.autoFilledFields.has('price') && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={formData.mode === 'rent' ? 'per day' : 'sale price'}
                className="pl-7"
              />
            </div>
          </div>

          {/* Highlights */}
          {formData.highlights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Highlights</Label>
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.highlights.map((highlight, index) => (
                  <Badge key={index} variant="outline" className="py-1.5">
                    {highlight}
                    <button
                      onClick={() => {
                        const newHighlights = formData.highlights.filter((_, i) => i !== index);
                        updateField('highlights', newHighlights);
                      }}
                      className="ml-1.5 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Photos preview */}
          {photoPreviews.length > 0 && (
            <div className="space-y-2">
              <Label>Photos ({photoPreviews.length})</Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos preview */}
          {videoPreviews.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos ({videoPreviews.length})
              </Label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {videoPreviews.map((preview, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted relative">
                      <video
                        src={preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <button
                      onClick={() => removeVideo(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={handleSaveDraft} 
            size="lg" 
            disabled={!canSaveDraft() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save draft'
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setStep('content')}
            disabled={isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'content') {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {formData.method === 'url' && 'Paste your listing link'}
            {formData.method === 'text' && 'Paste your listing text'}
            {formData.method === 'photos' && 'Upload your photos & videos'}
          </h2>
          <p className="text-muted-foreground">
            {formData.method === 'url' && "We'll use this to prefill a draft."}
            {formData.method === 'text' && 'Copy and paste your listing description.'}
            {formData.method === 'photos' && 'Start with media, add details in the next step.'}
          </p>
        </div>

        <div className="space-y-4">
          {formData.method === 'url' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">Listing URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => updateField('url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fallback-text" className="text-muted-foreground">
                  Or paste the listing text (recommended)
                </Label>
                <Textarea
                  id="fallback-text"
                  value={formData.text}
                  onChange={(e) => updateField('text', e.target.value)}
                  placeholder="Paste your listing description here..."
                  className="min-h-[120px]"
                />
              </div>
            </>
          )}

          {formData.method === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="text">Listing description</Label>
              <Textarea
                id="text"
                value={formData.text}
                onChange={(e) => updateField('text', e.target.value)}
                placeholder="Paste your listing description here..."
                className="min-h-[200px]"
              />
            </div>
          )}

          {/* Photo upload - shown for all methods */}
          <div className="space-y-2">
            <Label>
              {formData.method === 'photos' ? 'Photos' : 'Add photos (optional)'}
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              3 photos recommended
            </p>
            
            {photoPreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload photos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG, WebP up to 10MB
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotosSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Video upload - shown for all methods */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              {formData.method === 'photos' ? 'Videos' : 'Add videos (optional)'}
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              Show off your listing in action
            </p>
            
            {videoPreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {videoPreviews.map((preview, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted relative">
                      <video
                        src={preview}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <button
                      onClick={() => removeVideo(index)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Video className="w-6 h-6 mb-1 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload videos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  MP4, WebM, MOV up to 100MB
                </p>
              </div>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                multiple
                onChange={handleVideosSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button 
            onClick={handleCreateDraft} 
            size="lg" 
            disabled={!canProceedToReview() || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Create draft'
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setStep('method')}
            disabled={isProcessing}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Step: method selection
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Import a listing</h2>
        <p className="text-muted-foreground">
          Paste your post and we'll create a draft fast.
        </p>
      </div>

      <div className="space-y-3">
        {IMPORT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = formData.method === method.id;
          
          return (
            <Card
              key={method.id}
              className={cn(
                "cursor-pointer transition-all",
                isSelected 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "hover:border-primary/50"
              )}
              onClick={() => handleMethodSelect(method.id)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{method.label}</p>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button 
        onClick={handleContinueToContent} 
        size="lg" 
        className="w-full"
        disabled={!formData.method}
      >
        Continue
      </Button>
    </div>
  );
};
