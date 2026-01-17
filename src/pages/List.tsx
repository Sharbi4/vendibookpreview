import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload, PenLine } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStartWizard } from '@/components/listing-wizard/QuickStartWizard';
import { ImportListingWizard } from '@/components/listing-wizard/ImportListingWizard';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ListingMode = 'choose' | 'import' | 'scratch';

const ListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<ListingMode>('choose');

  useEffect(() => {
    // Track page view
    trackEvent({
      category: 'Supply',
      action: 'start_listing_page_viewed',
    });
  }, []);

  // No auth redirect needed - allow anonymous users to start listings
  // Auth will be gated at the Details step in the PublishWizard

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleBack = () => {
    if (mode === 'choose') {
      navigate(-1);
    } else {
      setMode('choose');
    }
  };

  const renderContent = () => {
    if (mode === 'import') {
      return <ImportListingWizard />;
    }

    if (mode === 'scratch') {
      return <QuickStartWizard />;
    }

    // Choose mode
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">List your asset</h2>
          <p className="text-muted-foreground">
            How would you like to get started?
          </p>
        </div>

        <div className="space-y-3">
          {/* Import option - primary */}
          <Card
            className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'import',
              });
              setMode('import');
            }}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">Import a listing</p>
                <p className="text-sm text-muted-foreground">
                  Paste your post and we'll create a draft fast.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Start from scratch option */}
          <Card
            className="cursor-pointer transition-all hover:border-primary/50"
            onClick={() => {
              trackEvent({
                category: 'Supply',
                action: 'listing_mode_selected',
                label: 'scratch',
              });
              setMode('scratch');
            }}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <PenLine className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg">Start from scratch</p>
                <p className="text-sm text-muted-foreground">
                  Create a new listing step by step.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
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

      {/* Content */}
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {renderContent()}
      </div>
    </div>
  );
};

export default ListPage;
