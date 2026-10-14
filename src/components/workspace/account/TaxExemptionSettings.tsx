import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaxExemptionManager, useTaxExemptions } from '@/components/tax/TaxExemptButton';
import { StatusPill, ws } from '@/components/workspace/ui';
import { SettingsRow, SettingsSection } from './SettingsKit';

/** Sales tax exemption row; the existing TaxExemptionManager opens in a dialog. */
export default function TaxExemptionSettings({ id = 'tax' }: { id?: string }) {
  const [open, setOpen] = useState(false);
  const exemptions = useTaxExemptions();
  const list = exemptions.data ?? [];
  const states = [...new Set(list.map((e) => e.state))];

  return (
    <>
      <SettingsSection
        id={id}
        title="Tax exemption"
        description="For purchases made for resale or by a tax-exempt organization."
      >
        <SettingsRow
          label="Exemption certificates"
          status={!exemptions.isLoading && !exemptions.isError && states.length ? <StatusPill tone="ok">Active</StatusPill> : null}
          value={exemptions.isLoading ? <span className={ws.skeleton + ' block h-4 w-36'} aria-label="Loading" />
            : exemptions.isError ? 'We couldn’t load your certificates.'
            : states.length ? `Exempt in ${states.join(', ')}`
            : 'No certificates on file'}
          muted={!states.length}
          hint={!exemptions.isLoading && !exemptions.isError ? 'A certificate applies to your checkouts in that state once saved. Vendibook reviews each one.' : undefined}
          action={exemptions.isError
            ? { label: 'Try again', onClick: () => void exemptions.refetch() }
            : !exemptions.isLoading ? { label: states.length ? 'Manage' : 'Add', onClick: () => setOpen(true) } : undefined}
        />
      </SettingsSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sale-light commerce-readable max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sales tax exemption</DialogTitle>
            <DialogDescription className="text-[#57514b]">
              Upload your state exemption or resale certificate. It applies to your checkouts in that state right away. Vendibook reviews every certificate and may ask for more information.
            </DialogDescription>
          </DialogHeader>
          <TaxExemptionManager />
        </DialogContent>
      </Dialog>
    </>
  );
}
