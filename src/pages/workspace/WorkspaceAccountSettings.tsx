import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import WalkthroughSettings from '@/components/video/WalkthroughSettings';
import { PageHeader, ws } from '@/components/workspace/ui';
import PayoutPreferenceSettings from '@/components/workspace/account/PayoutPreferenceSettings';
import { SettingsRow, SettingsSection } from '@/components/workspace/account/SettingsKit';
import '@/components/workspace/account-settings.css';

/** /dashboard/account/payouts and /dashboard/account/scheduling. */
export default function WorkspaceAccountSettings() {
  const scheduling = useLocation().pathname.endsWith('/scheduling');
  return (
    <WorkspaceShell>
      <div className={ws.page + ' v2-account-settings'}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow={
              <span className="flex items-center gap-1.5">
                <Link to="/dashboard/account" className="rounded-sm transition-colors hover:text-[#1C1B1A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1C1B1A]">Account</Link>
                <ChevronRight aria-hidden="true" className="h-3 w-3" />
                <span>{scheduling ? 'Walkthroughs' : 'Payouts'}</span>
              </span>
            }
            title={scheduling ? 'Walkthrough availability' : 'Payout details'}
            description={scheduling
              ? 'Set the hours buyers can book a live video walkthrough, then save your changes.'
              : 'Choose where Vendibook sends the payouts it reviews. Your PayPal and Square connections are managed separately.'}
          />

          <div className="flex max-w-[760px] flex-col gap-10 sm:gap-12">
            {scheduling ? (
              <section className={ws.surface + ' v2-embedded-section p-5 sm:p-7'} aria-label="Walkthrough availability">
                <WalkthroughSettings />
              </section>
            ) : (
              <>
                <PayoutPreferenceSettings />

                <SettingsSection
                  id="buyer-payments"
                  title="How buyers pay you"
                  description="Equipment sales are paid with PayPal and rental card payments run through Square. PayPal decides which wallet, card or payment options each buyer sees, and no card details are stored on Vendibook."
                >
                  <SettingsRow
                    label="Payment connections"
                    value="PayPal for sales, Square for rentals."
                    muted
                    action={{ label: 'Manage', to: '/dashboard/payments/setup' }}
                  />
                </SettingsSection>

                <SettingsSection id="records" title="Records" description="Receipts and history live on these pages.">
                  <SettingsRow label="Earnings & payouts" value="Balances and payout history." muted action={{ label: 'View', to: '/dashboard/payments' }} />
                  <SettingsRow label="Transactions & receipts" value="Marketplace payments you made or received." muted action={{ label: 'View', to: '/dashboard/transactions' }} />
                  <SettingsRow label="Plans, boosts & services" value="Platform purchases and payment attempts." muted action={{ label: 'View', to: '/account/purchases' }} />
                  <SettingsRow label="Membership" value="Your plan and renewals." muted action={{ label: 'Manage', to: '/account/subscription' }} />
                </SettingsSection>
              </>
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
