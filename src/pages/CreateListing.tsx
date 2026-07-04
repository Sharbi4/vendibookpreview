import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ListingWizard } from '@/components/listing-wizard/ListingWizard';

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, hasRole } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Preserve where the user was so they return here after sign-in
        // instead of losing their in-progress listing.
        const redirectTo = `${location.pathname}${location.search}`;
        navigate(`/auth?redirect=${encodeURIComponent(redirectTo)}`);
      } else if (!hasRole('host')) {
        navigate('/dashboard');
      }
    }
  }, [user, isLoading, hasRole, navigate, location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !hasRole('host')) {
    return null;
  }

  return <ListingWizard />;
};

export default CreateListing;

