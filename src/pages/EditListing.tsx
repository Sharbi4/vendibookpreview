import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PublishWizard } from '@/components/listing-wizard/PublishWizard';
import { getGuestDraft } from '@/lib/guestDraft';
import { supabase } from '@/integrations/supabase/client';

const EditListing: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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

      // Check if this is a guest draft the user can access.
      // The guest-draft-access edge function validates the token server-side
      // (RLS no longer allows anon reads of unclaimed drafts).
      const guestDraft = getGuestDraft();
      if (guestDraft && guestDraft.listingId === listingId) {
        const { data, error } = await supabase.functions.invoke('guest-draft-access', {
          body: { action: 'get', id: listingId, token: guestDraft.token },
        });
        if (!error && data?.listing) {
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