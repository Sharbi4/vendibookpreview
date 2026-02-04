import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface VerificationBannerProps {
  userId: string;
}

const VerificationBanner = ({ userId }: VerificationBannerProps) => {
  const storageKey = `verification_banner_dismissed_${userId}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Verify your identity to unlock booking and build trust with hosts.
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            asChild
          >
            <Link to="/verify-identity">Verify Now</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={handleDismiss}
            aria-label="Dismiss verification banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default VerificationBanner;
