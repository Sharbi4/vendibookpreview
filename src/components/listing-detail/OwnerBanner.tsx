import { AlertTriangle, Edit, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OwnerBannerProps {
  listingId: string;
  variant?: 'card' | 'inline';
  className?: string;
}

export const OwnerBanner = ({ listingId, variant = 'inline', className = '' }: OwnerBannerProps) => {
  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">This is your listing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You can't book or purchase your own listing. Use the options below to manage it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/edit-listing/${listingId}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Listing
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <span className="text-sm text-foreground">
          This is your listing. You can't book or purchase it.
        </span>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link to={`/edit-listing/${listingId}`}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default OwnerBanner;
