import { useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

interface GetAlertsCardProps {
  category?: string;
  location?: string;
  radius?: number;
}

export const GetAlertsCard = ({ category, location, radius }: GetAlertsCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // Build zip code from search params if available
  const zipCode = searchParams.get('zip') || location || '';

  const handleEnableAlerts = async () => {
    // If not logged in, redirect to auth
    if (!user) {
      // Store intent to return here
      localStorage.setItem('alert_return_url', window.location.href);
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const userEmail = user.email;
      if (!userEmail) {
        toast.error('No email found for your account.');
        return;
      }

      const { error } = await supabase
        .from('availability_alerts')
        .insert({
          email: userEmail,
          zip_code: zipCode || '00000', // Default if no location
          category: category || null,
          radius_miles: radius || 25,
          mode: 'rent',
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('You already have alerts enabled for this search!');
          setIsEnabled(true);
        } else {
          throw error;
        }
      } else {
        setIsEnabled(true);
        toast.success('Alerts enabled! We\'ll email you weekly.');
        
        // Track analytics
        trackEvent({
          category: 'Activation',
          action: 'alerts_enabled',
          label: category || 'all',
          metadata: { zip_code: zipCode, radius },
        });
      }
    } catch (err) {
      console.error('Alert subscription error:', err);
      toast.error('Failed to enable alerts. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEnabled) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Alerts enabled</p>
          <p className="text-xs text-muted-foreground">We'll email you when new listings match your search.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Get alerts for new listings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Weekly digest when new matches appear.</p>
          <Button 
            onClick={handleEnableAlerts}
            size="sm" 
            className="h-8 mt-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enabling...' : 'Enable alerts'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GetAlertsCard;
