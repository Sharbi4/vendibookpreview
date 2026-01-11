import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ListingWizard } from '@/components/listing-wizard/ListingWizard';

const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, hasRole } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!hasRole('host')) {
        navigate('/dashboard');
      }
    }
  }, [user, isLoading, hasRole, navigate]);

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
