import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, CheckCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

const IdentityVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('checking');
  const { user, profile, isVerified, refreshProfile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (isVerified) {
      setVerificationStatus('verified');
    } else {
      checkVerificationStatus();
    }
  }, [user, authLoading, isVerified]);

  const checkVerificationStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      
      if (error) {
        console.error('Error checking verification:', error);
        setVerificationStatus('not_started');
        return;
      }

      setVerificationStatus(data.status || 'not_started');
      
      if (data.verified) {
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setVerificationStatus('not_started');
    }
  };

  const startVerification = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-identity-verification');
      
      if (error) {
        toast({
          title: 'Verification Error',
          description: 'Could not start identity verification. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data.url) {
        // Open Stripe Identity verification in new tab
        window.open(data.url, '_blank');
        setVerificationStatus('pending');
        toast({
          title: 'Verification Started',
          description: 'Complete the verification in the new tab, then return here.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const skipForNow = () => {
    navigate('/');
  };

  if (authLoading || verificationStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (verificationStatus === 'verified' || isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Identity Verified!</h1>
          <p className="text-muted-foreground mb-8">
            Your identity has been successfully verified. You now have full access to Vendibook.
          </p>
          <Button onClick={() => navigate('/')} className="rounded-xl">
            Continue to Vendibook
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-vendibook-cream to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Shield className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">Verify Your Identity</h1>
          
          <p className="text-muted-foreground mb-6">
            To ensure a safe marketplace for everyone, we require identity verification for all users. 
            This helps protect both hosts and renters.
          </p>

          {verificationStatus === 'pending' || verificationStatus === 'processing' ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-amber-800">Verification in Progress</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Complete the verification in the other tab. Once done, click the button below to check your status.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={checkVerificationStatus}
                className="w-full rounded-xl mb-3"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Check Verification Status
              </Button>
            </>
          ) : (
            <Button
              onClick={startVerification}
              className="w-full rounded-xl mb-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Start Verification
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={skipForNow}
            className="w-full text-muted-foreground"
          >
            Skip for now
          </Button>

          <p className="text-xs text-muted-foreground mt-6">
            Powered by Stripe Identity. Your data is securely encrypted and protected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default IdentityVerification;
