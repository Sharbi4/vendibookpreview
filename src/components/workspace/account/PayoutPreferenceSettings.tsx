import { useState } from 'react';
import { toast } from 'sonner';
import { StatusPill, ws, type StatusTone } from '@/components/workspace/ui';
import PayoutMethodForm from '@/components/account/PayoutMethodForm';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import {
  PAYOUT_METHOD_LABEL,
  PAYOUT_PREFERENCE_DISCLOSURE,
  PAYOUT_STATUS_LABEL,
  type PayoutPreferenceInput,
  type PayoutPreferenceStatus,
} from '@/lib/payouts/methods';
import { SettingsRow, SettingsSection } from './SettingsKit';

const TONE: Record<PayoutPreferenceStatus, StatusTone> = {
  not_set: 'muted',
  pending_review: 'warn',
  verified: 'ok',
  needs_attention: 'alert',
};

/**
 * Payout preference for Vendibook's manual payouts. Same hook, form and save
 * handler as components/account/PaymentsPayoutsSection (payout-preference-save
 * edge function); only the layout differs.
 */
export default function PayoutPreferenceSettings() {
  const { preference, isLoading, isSaving, savePreference } = usePayoutPreference();
  const [editing, setEditing] = useState(false);

  const handleSubmit = async (input: PayoutPreferenceInput) => {
    try {
      const result = await savePreference(input);
      setEditing(false);
      toast.success(
        result?.pending_verification
          ? 'Saved. Vendibook will complete secure verification before your first payout.'
          : 'Payout preference saved.',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save your payout preference.');
    }
  };

  const status: PayoutPreferenceStatus = preference?.status ?? 'not_set';

  return (
    <SettingsSection
      id="payout-method"
      title="Payout method"
      description={PAYOUT_PREFERENCE_DISCLOSURE}
    >
      {editing ? (
        <li className="v2-embedded-section px-5 py-5 sm:px-6 sm:py-6">
          <p className="mb-4 text-[14px] font-semibold text-[#1C1B1A]">{preference ? 'Change payout method' : 'Add a payout method'}</p>
          <PayoutMethodForm
            initialMethod={preference?.method ?? 'paypal'}
            isSaving={isSaving}
            onCancel={() => setEditing(false)}
            onSubmit={handleSubmit}
          />
        </li>
      ) : (
        <SettingsRow
          label="Send my payouts to"
          status={isLoading ? null : <StatusPill tone={TONE[status]}>{PAYOUT_STATUS_LABEL[status]}</StatusPill>}
          value={isLoading
            ? <span className={ws.skeleton + ' block h-4 w-44'} aria-label="Loading" />
            : preference
              ? <>
                  {PAYOUT_METHOD_LABEL[preference.method]}
                  {preference.masked_destination && <span className="text-[#8A847B]"> · {preference.masked_destination}</span>}
                  {preference.method === 'ach' && preference.ach_bank_name && (
                    <span className="text-[#8A847B]"> · {preference.ach_bank_name} {preference.ach_account_type}</span>
                  )}
                </>
              : 'No payout method on file yet. You can list, take bookings and get paid by buyers before you add one.'}
          muted={!preference}
          hint="Supported: PayPal, Venmo, Cash App and direct bank transfer (ACH)."
          action={isLoading ? undefined : { label: preference ? 'Change' : 'Add', onClick: () => setEditing(true) }}
        />
      )}
    </SettingsSection>
  );
}
