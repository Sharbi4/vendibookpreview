import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InlinePhoneVerification from '@/components/comms/InlinePhoneVerification';
import { StatusPill, ws } from '@/components/workspace/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SettingsRow, SettingsSection } from './SettingsKit';
import { maskPhone } from './maskPhone';

/**
 * Phone + identity status. Phone comes from the member's own
 * signup_phone_verifications row (RLS: own row only); identity from
 * profiles.identity_verified. Verifying a phone uses the existing
 * InlinePhoneVerification flow (same edge function and RPC as the signup gate);
 * identity goes to /verify-identity.
 */
export default function VerificationSettings({ id = 'verification', identityVerified, loading }: { id?: string; identityVerified: boolean; loading?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [phoneOpen, setPhoneOpen] = useState(false);

  const phoneQ = useQuery({
    queryKey: ['signup-phone-verified', user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signup_phone_verifications')
        .select('phone_e164, verified_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { phone_e164: string; verified_at: string } | null;
    },
  });

  const phoneLoading = phoneQ.isLoading;
  const phoneVerified = !!phoneQ.data;
  const skeleton = <span className={ws.skeleton + ' block h-4 w-32'} aria-label="Loading" />;

  return (
    <>
      <SettingsSection
        id={id}
        title="Verification"
        description="A verified mobile number and identity are needed to message sellers, make offers and buy. Rentals and new listings need the mobile number only."
      >
        <SettingsRow
          label="Mobile number"
          status={phoneLoading || phoneQ.isError ? null : phoneVerified
            ? <StatusPill tone="ok">Verified</StatusPill>
            : <StatusPill tone="warn">Not verified</StatusPill>}
          value={phoneLoading ? skeleton
            : phoneQ.isError ? 'We couldn’t check your mobile number.'
            : phoneVerified ? maskPhone(phoneQ.data?.phone_e164) ?? 'Verified'
            : 'Verify by text in under a minute.'}
          muted={!phoneVerified}
          action={phoneQ.isError
            ? { label: 'Try again', onClick: () => void phoneQ.refetch() }
            : !phoneLoading && !phoneVerified ? { label: 'Verify', onClick: () => setPhoneOpen(true) } : undefined}
        />
        <SettingsRow
          label="Identity"
          status={loading ? null : identityVerified
            ? <StatusPill tone="ok">Verified</StatusPill>
            : <StatusPill tone="muted">Not verified</StatusPill>}
          value={loading ? skeleton : identityVerified ? 'Your ID has been checked.' : 'Checked securely with Plaid.'}
          muted={!identityVerified}
          action={!loading && !identityVerified ? { label: 'Verify', to: '/verify-identity' } : undefined}
        />
      </SettingsSection>

      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent className="sale-light commerce-readable sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your mobile number</DialogTitle>
            <DialogDescription className="text-[#57514b]">We’ll text a six-digit code to confirm it’s you.</DialogDescription>
          </DialogHeader>
          <InlinePhoneVerification
            onVerified={() => {
              setPhoneOpen(false);
              void queryClient.invalidateQueries({ queryKey: ['signup-phone-verified'] });
              toast.success('Mobile number verified.');
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
