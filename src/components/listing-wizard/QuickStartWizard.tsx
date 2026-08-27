import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Truck, Store, Building2, MapPin, Tag, ShoppingBag, MapPinned, Loader2, Check, CheckCircle2, AlertCircle} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { ListingCategory, ListingMode, CATEGORY_LABELS } from '@/types/listing';
import { cn } from '@/lib/utils';
import { trackDraftCreated, trackEvent } from '@/lib/analytics';
import {
  createOrResumeListingDraft,
  CreationSessionRetiredError,
  rotateCreationSessionKey,
} from '@/lib/listings/creationSession';


const LIST_GATEWAY = '/list';

type QuickStartStep = 'category' | 'mode' | 'location' | 'created';

interface QuickStartData {
  category: ListingCategory | null;
  mode: ListingMode | null;
  location: string;
  zipCode: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
}

const categoryOptions = [
  { value: 'food_truck' as ListingCategory, label: 'Food Truck', icon: Truck },
  { value: 'food_trailer' as ListingCategory, label: 'Food Trailer', icon: Truck },
  { value: 'ghost_kitchen' as ListingCategory, label: 'Shared Kitchen', icon: Building2 },
  { value: 'vendor_lot' as ListingCategory, label: 'Vendor Space', icon: MapPin }];

const modeOptions = [
  { value: 'rent' as ListingMode, label: 'For Rent', icon: Tag, description: 'Rent by day or week' },
  { value: 'sale' as ListingMode, label: 'For Sale', icon: ShoppingBag, description: 'Sell to a new owner' }];

const VALID_MODES: ListingMode[] = ['rent', 'sale'];
const VALID_CATEGORIES = categoryOptions.map((o) => o.value);

/** Reads `?mode=` / `?category=` deep-link intent. Unknown values are ignored. */
const readDeepLinkIntent = (params: URLSearchParams) => {
  const rawMode = (params.get('mode') || '').toLowerCase();
  const rawCategory = (params.get('category') || '').toLowerCase();
  const mode = (VALID_MODES as string[]).includes(rawMode) ? (rawMode as ListingMode) : null;
  const category = (VALID_CATEGORIES as string[]).includes(rawCategory)
    ? (rawCategory as ListingCategory)
    : null;
  return { mode, category };
};

const QUICKSTART_STORAGE_KEY = 'vendibook_quickstart_draft';
const QUICKSTART_RESUME_KEY = 'vendibook_quickstart_resume';

const loadPersistedQuickStart = (): { data: QuickStartData; step: QuickStartStep } | null => {
  try {
    const raw = sessionStorage.getItem(QUICKSTART_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const QUICKSTART_STEPS: QuickStartStep[] = ['category', 'mode', 'location', 'created'];
const isQuickStartStep = (v: string | null): v is QuickStartStep =>
  !!v && (QUICKSTART_STEPS as string[]).includes(v);

export const QuickStartWizard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const persisted = typeof window !== 'undefined' ? loadPersistedQuickStart() : null;

  // Deep-link intent from landing pages (`?mode=sale&category=food_truck`).
  // Invalid values fall back to asking the question normally.
  const intentRef = useRef(readDeepLinkIntent(searchParams));
  const intent = intentRef.current;

  const seededCategory = intent.category ?? persisted?.data?.category ?? null;
  const seededMode = intent.mode ?? persisted?.data?.mode ?? null;

  /** First screen that still needs an answer. */
  const firstUnansweredStep = (): QuickStartStep => {
    if (!seededCategory) return 'category';
    if (!seededMode) return 'mode';
    return 'location';
  };

  // The step lives in the URL (?qs=) so browser back/forward moves between
  // wizard screens instead of leaving the flow entirely.
  const urlStep = searchParams.get('qs');
  const [step, setStepState] = useState<QuickStartStep>(
    isQuickStartStep(urlStep) ? urlStep : (persisted?.step ?? firstUnansweredStep()),
  );

  const goToStep = useCallback(
    (next: QuickStartStep, replace = false) => {
      setStepState(next);
      const params = new URLSearchParams(window.location.search);
      if (params.get('qs') === next) return;
      params.set('qs', next);
      setSearchParams(params, { replace });
    },
    [setSearchParams],
  );

  // Write the initial step into the URL without adding a history entry.
  const didSeedUrl = useRef(false);
  useEffect(() => {
    if (didSeedUrl.current) return;
    didSeedUrl.current = true;
    if (!isQuickStartStep(searchParams.get('qs'))) goToStep(step, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL → state (browser back / forward).
  useEffect(() => {
    const s = searchParams.get('qs');
    if (isQuickStartStep(s) && s !== step) setStepState(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setStep = goToStep;

  const [data, setData] = useState<QuickStartData>({
    ...(persisted?.data ?? {
    location: '',
    zipCode: '',
    city: '',
    state: '',
      latitude: null,
      longitude: null,
    }),
    // Deep-link intent wins over stale session values.
    category: seededCategory,
    mode: seededMode,
  });
  const [isCreating, setIsCreating] = useState(false);
  /** Synchronous in-flight guard (state updates are async and race-prone). */
  const creatingRef = useRef(false);

  const [isLookingUpZip, setIsLookingUpZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipConfirmed, setZipConfirmed] = useState(!!persisted?.data?.latitude);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  // Persist wizard progress so it survives sign-in redirects and refreshes.
  useEffect(() => {
    if (step === 'created') return;
    try {
      sessionStorage.setItem(
        QUICKSTART_STORAGE_KEY,
        JSON.stringify({ data, step })
      );
    } catch {}
  }, [data, step]);

  const lookupZipCode = useCallback(async (zip: string) => {
    if (zip.length !== 5) return;

    setIsLookingUpZip(true);
    setZipError(null);
    setZipConfirmed(false);

    try {
      const { data: geoData, error } = await invokeEdge<{ results?: any[] }>('geocode-location', {
        body: { query: zip, limit: 1 }}, { retries: 2 });

      if (error) throw new Error(error);

      const result = geoData?.results?.[0];
      if (!result) {
        setZipError("We couldn't find that ZIP code. Double-check the digits or try a nearby ZIP.");
        return;
      }

      const city = (result.city || result.text || '').trim();
      const state = (result.state || result.context || '').trim();
      const [lng, lat] = Array.isArray(result.center) ? result.center : [];

      if (!city || !state || typeof lat !== 'number' || typeof lng !== 'number') {
        setZipError("We found the ZIP, but couldn't confirm the city/state. Try a nearby ZIP code.");
        return;
      }

      setData(prev => ({
        ...prev,
        city,
        state,
        latitude: lat,
        longitude: lng,
        location: `${city}, ${state}`}));
      setZipConfirmed(true);
    } catch (error) {
      console.error('[QuickStartWizard] ZIP lookup failed:', error);
      setZipError("We're having trouble looking up that ZIP right now. Please try again.");
    } finally {
      setIsLookingUpZip(false);
    }
  }, []);

  const handleZipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);

    setData(prev => ({
      ...prev,
      zipCode: val,
      ...(val.length < 5
        ? { city: '', state: '', latitude: null, longitude: null, location: '' }
        : {})}));

    if (val.length < 5) {
      setZipConfirmed(false);
      setZipError(null);
    }
  }, []);

  useEffect(() => {
    if (data.zipCode.length === 5) {
      const timer = window.setTimeout(() => lookupZipCode(data.zipCode), 300);
      return () => window.clearTimeout(timer);
    }
  }, [data.zipCode, lookupZipCode]);

  const handleCategorySelect = (category: ListingCategory) => {
    setData(prev => ({ ...prev, category }));
    // Mode already answered by the deep link — don't ask again.
    setStep(intent.mode ? 'location' : 'mode');
  };

  /** Back target that respects skipped (pre-answered) screens. */
  const backFromMode = () => (intent.category ? navigate(LIST_GATEWAY) : setStep('category'));
  const backFromLocation = () => {
    if (intent.mode) {
      if (intent.category) navigate(LIST_GATEWAY);
      else setStep('category');
      return;
    }
    setStep('mode');
  };

  const handleModeSelect = (mode: ListingMode) => {
    setData(prev => ({ ...prev, mode }));
    setStep('location');
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData(prev => ({ ...prev, location: e.target.value }));
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Use the geocode-location edge function for reverse geocoding
            const { data: geocodeData } = await supabase.functions.invoke('geocode-location', {
              body: { 
                query: `${position.coords.latitude},${position.coords.longitude}`,
                limit: 1 
              }
            });
            
            if (geocodeData?.results?.[0]?.placeName) {
              setData(prev => ({ 
                ...prev, 
                location: geocodeData.results[0].placeName 
              }));
            } else {
              // Fallback to coordinates if geocoding fails
              setData(prev => ({ 
                ...prev, 
                location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
              }));
            }
          } catch {
            setData(prev => ({ 
              ...prev, 
              location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` 
            }));
          }
        },
        () => {
          toast({ title: 'Could not get location', variant: 'destructive' });
        }
      );
    }
  };

  const handleCreateDraft = async () => {
    if (!data.category || !data.mode) return;
    // In-flight guard: a double click, a remount-triggered resume and the
    // click handler must never issue two create calls.
    if (creatingRef.current) return;

    // User must be authenticated to create a listing
    if (!user) {
      // Mark that we want to auto-resume draft creation after sign-in.
      try { sessionStorage.setItem(QUICKSTART_RESUME_KEY, '1'); } catch {}
      toast({
        title: 'Almost there — sign in to save your listing',
        description: "We saved your progress. Sign in and we'll finish creating your draft."});
      navigate(`/auth?redirect=${encodeURIComponent(`/list/start${window.location.search}`)}`);
      return;
    }

    creatingRef.current = true;
    setIsCreating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // User exists but has no active session — most commonly they just
        // signed up and haven't confirmed their email yet. Guide them
        // instead of showing a generic red error.
        try { sessionStorage.setItem(QUICKSTART_RESUME_KEY, '1'); } catch {}
        toast({
          title: 'Check your email to confirm your account',
          description: "We saved your listing progress. Click the confirmation link, then return to /list and we'll finish creating your draft.",
        });
        return;
      }

      // Idempotent: the durable creation-session key means remounts, retries,
      // the post-sign-in auto-resume effect and duplicate clicks all resolve
      // to the SAME draft row instead of inserting another one.
      const listingId = await createOrResumeListingDraft({
        userId: user.id,
        flow: 'manual',
        mode: data.mode,
        category: data.category,
        location: data.location || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        latitude: data.latitude,
        longitude: data.longitude,
      });
      await refreshProfile();

      // Draft now has its own identity; retire the key so the seller's NEXT
      // quick start creates a genuinely new listing.
      rotateCreationSessionKey(user.id, 'manual');
      setCreatedListingId(listingId);
      setStep('created', true);

      // Clear persisted quick-start progress now that the draft is safely on the server.
      try {
        sessionStorage.removeItem(QUICKSTART_STORAGE_KEY);
        sessionStorage.removeItem(QUICKSTART_RESUME_KEY);
      } catch {}

      // Track analytics event
      trackDraftCreated(data.category || undefined);

    } catch (error) {
      console.error('Error creating draft:', error);
      if (error instanceof CreationSessionRetiredError) {
        // The previous session's listing already went live — mint a fresh key
        // so the seller can start a genuinely new listing.
        rotateCreationSessionKey(user.id, 'manual');
      }
      const raw = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Error creating draft',
        description: raw || 'Please try again — your progress is saved.',
        variant: 'destructive'});
    } finally {
      creatingRef.current = false;
      setIsCreating(false);
    }
  };


  // Auto-resume draft creation after user returns from sign-in with progress intact.
  useEffect(() => {
    if (!user) return;
    let shouldResume = false;
    try {
      shouldResume = sessionStorage.getItem(QUICKSTART_RESUME_KEY) === '1';
    } catch {}
    if (shouldResume && data.category && data.mode && data.latitude && data.longitude && !isCreating && step !== 'created') {
      try { sessionStorage.removeItem(QUICKSTART_RESUME_KEY); } catch {}
      handleCreateDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const handleContinueSetup = () => {
    if (createdListingId) {
      navigate(`/create-listing/${createdListingId}`);
    }
  };

  const handleSaveForLater = () => {
    navigate('/dashboard');
  };

  // Only count screens the visitor actually sees — deep-linked answers are skipped.
  const visibleSteps: QuickStartStep[] = [
    ...(intent.category ? [] : (['category'] as QuickStartStep[])),
    ...(intent.mode ? [] : (['mode'] as QuickStartStep[])),
    'location',
  ];
  const totalSteps = visibleSteps.length;
  const stepNumber = Math.max(1, visibleSteps.indexOf(step) + 1);
  const minutesLeft = Math.max(1, totalSteps - stepNumber + 1);

  // Created confirmation screen
  if (step === 'created') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Draft created!</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Now add photos and pricing to publish your listing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button onClick={handleContinueSetup} variant="cta" className="flex-1" size="lg">
            Continue setup
          </Button>
          <Button onClick={handleSaveForLater} variant="outline" className="flex-1 rounded-2xl" size="lg">
            Save for later
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Entry header + compact progress */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Create a listing
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          A few quick questions to get started
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Free to publish. Your progress saves as you go, so you can come back anytime.
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Step {stepNumber} of {totalSteps}
          </span>
          <span>About {minutesLeft} min left</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round((stepNumber / totalSteps) * 100)}%` }}
          />
        </div>
      </div>

      {/* Step: Category */}
      {step === 'category' && (
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(LIST_GATEWAY)}
            className="pl-0 text-xs sm:text-sm text-muted-foreground"
          >
            ← Back
          </Button>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_18px_40px_-30px_rgba(24,20,16,0.35)]">
            {/* Header */}
            <div className="relative border-b border-border bg-secondary/60 px-4 sm:px-6 py-4 sm:py-5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">What are you listing?</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Choose one to get started.</p>
            </div>
            {/* Content */}
            <div className="relative bg-card p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {categoryOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = data.category === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleCategorySelect(option.value)}
                      className={cn(
                        "relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-border bg-card text-center transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "hover:border-foreground/20 hover:shadow-[0_10px_30px_-24px_rgba(24,20,16,0.5)]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center",
                        isSelected
                          ? "bg-primary"
                          : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="font-semibold text-foreground text-sm sm:text-base">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Mode */}
      {step === 'mode' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_18px_40px_-30px_rgba(24,20,16,0.35)]">
            {/* Header */}
            <div className="relative border-b border-border bg-secondary/60 px-4 sm:px-6 py-4 sm:py-5">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Rent or sell?</h1>
              <p className="text-sm sm:text-base text-muted-foreground">You can change this later.</p>
            </div>
            {/* Content */}
            <div className="relative bg-card p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {modeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = data.mode === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleModeSelect(option.value)}
                      className={cn(
                        "relative overflow-hidden p-4 sm:p-5 rounded-2xl border border-border bg-card text-center transition-all",
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "hover:border-foreground/20 hover:shadow-[0_10px_30px_-24px_rgba(24,20,16,0.5)]"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-2 sm:mb-3 flex items-center justify-center",
                        isSelected
                          ? "bg-primary"
                          : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className="font-semibold text-foreground block mb-1 text-sm sm:text-base">{option.label}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={backFromMode} className="mt-2 min-w-[96px] rounded-2xl">
            ← Back
          </Button>

        </div>
      )}

      {/* Step: Location (ZIP Code → City/State confirmation) */}
      {step === 'location' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(24,20,16,0.04),0_18px_40px_-30px_rgba(24,20,16,0.35)]">
            <div className="relative border-b border-border bg-secondary/60 px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Where is it located?</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Start with your ZIP code and we’ll instantly place the listing in the right market.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                  
                  Takes about 2 seconds
                </div>
              </div>
            </div>

            <div className="relative bg-card p-4 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="font-medium text-sm sm:text-base">ZIP Code *</Label>
                    <div className="relative max-w-[220px]">
                      <Input
                        id="zipCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="postal-code"
                        maxLength={5}
                        value={data.zipCode}
                        onChange={handleZipChange}
                        placeholder="e.g. 85714"
                        className={cn(
                          "h-12 text-xl font-semibold tracking-[0.3em] text-center",
                          zipConfirmed && "border-emerald-500 focus-visible:ring-emerald-500",
                          zipError && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {isLookingUpZip && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {zipConfirmed && !isLookingUpZip && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Use the 5-digit ZIP where the truck, trailer, kitchen, or space is based.</p>
                  </div>

                  {zipError && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div className="space-y-2">
                          <p className="text-sm text-destructive">{zipError}</p>
                          {data.zipCode.length === 5 && (
                            <Button type="button" variant="link" className="h-auto p-0 text-destructive" onClick={() => lookupZipCode(data.zipCode)}>
                              Try again
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {zipConfirmed && data.city && data.state && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 animate-in fade-in-50 slide-in-from-top-2 duration-300">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Your listing will appear in</p>
                          <p className="mt-1 text-lg font-bold text-foreground">{data.city}, {data.state}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Your exact street address stays private and gets added later in the full setup.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">What happens next</p>
                  <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                    <li><span className="font-medium text-foreground">1.</span> We place your listing in the right city.</li>
                    <li><span className="font-medium text-foreground">2.</span> You finish pricing, photos, and details.</li>
                    <li><span className="font-medium text-foreground">3.</span> Your exact address stays private until booking is confirmed.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={backFromLocation}
                className="min-w-[96px] rounded-2xl"
              >
                ← Back
              </Button>

              <Button 
                variant="cta"
                onClick={handleCreateDraft} 
                disabled={isCreating || !zipConfirmed}
                className="flex-1 rounded-2xl"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Start Listing'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
