import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PublishWizard } from '@/components/listing-wizard/PublishWizard';
import { getGuestDraft } from '@/lib/guestDraft';
import { supabase } from '@/integrations/supabase/client';

const EditListing: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!listingId) {
        navigate('/dashboard');
        return;
      }

      // If user is logged in, they can access their own listings
      if (user) {
        setHasAccess(true);
        return;
      }

      // Check if this is a guest draft the user can access
      const guestDraft = getGuestDraft();
      if (guestDraft && guestDraft.listingId === listingId) {
        // Verify the token still exists on the listing
        const { data, error } = await supabase
          .from('listings')
          .select('guest_draft_token')
          .eq('id', listingId)
          .single();

        if (!error && data?.guest_draft_token === guestDraft.token) {
          setHasAccess(true);
          return;
        }
      }

      // No access - redirect to auth
      navigate('/auth?redirect=' + encodeURIComponent(`/create-listing/${listingId}`));
    };

    if (!isLoading) {
      checkAccess();
    }
  }, [user, isLoading, listingId, navigate]);

  if (isLoading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <PublishWizard />;
};

export default EditListing;