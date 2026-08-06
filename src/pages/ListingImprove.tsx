import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ListingSpecsEditor from '@/components/listing/ListingSpecsEditor';
import SpecSuggestionsPanel from '@/components/listing/SpecSuggestionsPanel';
import ListingReadinessCard from '@/components/listing/ListingReadinessCard';
import { useSpecSuggestions, SpecSuggestion } from '@/hooks/useSpecSuggestions';
import { useListingSpecs } from '@/hooks/useListingSpecs';

const ListingImprove: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const initialSection = searchParams.get('section');
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [editorKey, setEditorKey] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['improve-listing', listingId],
    enabled: Boolean(listingId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, category, mode, host_id')
        .eq('id', listingId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const suggestionState = useSpecSuggestions(listingId);
  const { values, saveSection } = useListingSpecs({
    listingId,
    category: listing?.category,
    mode: listing?.mode,
  });

  const handleAccept = async (suggestion: SpecSuggestion, value: unknown) => {
    const bucket = { ...(values[suggestion.section] ?? {}), [suggestion.field]: value };
    const saved = await saveSection(suggestion.section, bucket);
    if (!saved) return false;
    setEditorKey((k) => k + 1);
    return suggestionState.resolve(suggestion.id, 'accepted', value);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!listing || (user?.id && listing.host_id !== user.id)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-muted-foreground">You do not have access to this listing.</p>
        <button className="text-primary hover:underline" onClick={() => navigate('/dashboard')}>
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          <h1 className="truncate font-semibold">Improve {listing.title}</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
        <ListingReadinessCard
          listingId={listing.id}
          category={listing.category}
          mode={listing.mode}
          variant="compact"
        />

        <ListingSpecsEditor
          key={editorKey}
          listingId={listing.id}
          hostId={listing.host_id}
          category={listing.category}
          mode={listing.mode}
          initialSection={initialSection}
          header={
            <SpecSuggestionsPanel
              suggestions={suggestionState.suggestions}
              loading={suggestionState.loading}
              generating={suggestionState.generating}
              onGenerate={suggestionState.generate}
              onAccept={handleAccept}
              onReject={(s) => suggestionState.resolve(s.id, 'rejected')}
            />
          }
        />

        {listing.mode === 'rent' && (
          <RentalTermsEditor
            listingId={listing.id}
            category={listing.category}
            initialSection={initialSection}
          />
        )}

      </div>
    </div>
  );
};

export default ListingImprove;
