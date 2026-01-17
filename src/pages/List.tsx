import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { trackEvent } from '@/lib/analytics';

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, hasRole } = useAuth();

  useEffect(() => {
    // Track page view
    trackEvent({
      category: 'Supply',
      action: 'start_listing_page_viewed',
    });
  }, []);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth?redirect=/list');
    }
  }, [user, isLoading, navigate]);

  // Auto-assign host role if needed (handled by auth flow)
  useEffect(() => {
    if (user && !hasRole('host')) {
      // The role will be assigned when the listing is created
    }
  }, [user, hasRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="font-semibold">List your asset</h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Quick Start Wizard */}
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <QuickStartWizard />
      </div>
    </div>
  );
};

export default ListPage;
