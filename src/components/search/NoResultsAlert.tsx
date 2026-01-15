import { useState } from 'react';
import { Search, Bell, MapPin, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NoResultsAlertProps {
  onClearFilters: () => void;
  category?: string;
  mode?: string;
}

const NoResultsAlert = ({ onClearFilters, category, mode }: NoResultsAlertProps) => {
  const [email, setEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !zipCode) {
      toast.error('Please enter your email and zip code');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Basic zip code validation (US format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipCode)) {
      toast.error('Please enter a valid US zip code');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('availability_alerts')
        .insert({
          email: email.trim().toLowerCase(),
          zip_code: zipCode.trim(),
          category: category !== 'all' ? category : null,
          mode: mode !== 'all' ? mode : null,
          radius_miles: 25,
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success("You're all set! We'll notify you when something becomes available.");
    } catch (error: any) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">You're on the list!</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          We'll send you an email as soon as a listing becomes available in your area.
        </p>
        <Button onClick={onClearFilters} variant="outline">
          Continue browsing
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Try adjusting your search or filters to find what you're looking for.
      </p>
      
      <Button onClick={onClearFilters} variant="outline" className="mb-10">
        Clear all filters
      </Button>

      {/* Alert Signup Card */}
      <Card className="max-w-md mx-auto border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h4 className="font-semibold text-lg">Get notified when available</h4>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            Enter your zip code and we'll alert you when a listing becomes available in your area.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-zipcode" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zip Code
              </Label>
              <Input
                id="alert-zipcode"
                type="text"
                placeholder="e.g. 85001"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                maxLength={10}
                className="text-center text-lg font-medium tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="alert-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || !email || !zipCode}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up alert...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Notify Me
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              We'll only email you about new listings. Unsubscribe anytime.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoResultsAlert;
