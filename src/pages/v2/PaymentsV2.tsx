import WorkspaceShell from '@/components/v2/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import PayoutsPanel from '@/components/dashboard/tabs/PayoutsPanel';
import TransactionsDisputesTab from '@/components/dashboard/tabs/TransactionsDisputesTab';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';

export default function PaymentsV2() {
  return <WorkspaceShell><div className="v2-page-stack"><header className="v2-page-heading"><p className="v2-eyebrow">Money center</p><h1>Payments</h1><p>Your seller readiness, earnings, purchases, receipts, charges, and disputes.</p></header>
    <section className="v2-paypal-module"><div className="v2-paypal-header"><div><p>Payment partner</p><PayPalWordmark className="h-6" /></div><span>Business account connection</span></div><div className="v2-paypal-body"><h2>Get ready to receive payments</h2><p>Connect a PayPal Business account when onboarding is available. Publishing a listing does not require this step.</p></div><SellerPayPalConnect showWhenDisabled /></section>
    <section className="v2-embedded-section"><PayoutsPanel /></section><section className="v2-embedded-section"><TransactionsDisputesTab /></section>
  </div></WorkspaceShell>;
}