import { ShieldCheck, Lock, FileCheck, Eye, CreditCard, RefreshCcw, BadgeCheck, Server } from 'lucide-react';
import type { TrustPoint } from '@/components/journey/TrustModule';

/** Trust points to render next to Stripe Identity verification CTAs. */
export const IDENTITY_TRUST_POINTS: TrustPoint[] = [
  { icon: BadgeCheck, label: 'Stripe Identity', detail: 'Government-grade document + selfie match.' },
  { icon: Lock, label: 'Encrypted end-to-end', detail: 'We never see or store your ID image.' },
  { icon: Eye, label: 'Never public', detail: 'Only a "Verified" badge appears on your profile.' },
  { icon: ShieldCheck, label: 'Fraud protection', detail: 'Keeps bad actors off the marketplace.' },
];

export const IDENTITY_DISCLAIMER =
  'Verification is powered by Stripe Identity. Vendibook does not receive, store, or share your document images.';

/** Trust points to render next to document upload widgets. */
export const DOCUMENT_TRUST_POINTS: TrustPoint[] = [
  { icon: Server, label: 'Private storage', detail: 'Files live in access-controlled storage — only you and your host can see them.' },
  { icon: FileCheck, label: 'Reviewed manually', detail: 'A real person checks each document before approval.' },
  { icon: Lock, label: 'Never shared', detail: 'Documents are never sold, ranked by AI, or shown to advertisers.' },
];

export const DOCUMENT_DISCLAIMER =
  'Vendibook stores documents only for the length of your booking cycle and any required audit window.';

/** Trust points to render next to payment/checkout CTAs. */
export const PAYMENT_TRUST_POINTS: TrustPoint[] = [
  { icon: CreditCard, label: 'Stripe-secured checkout', detail: 'PCI DSS Level 1 processing — we never see card numbers.' },
  { icon: ShieldCheck, label: 'Held, not spent', detail: 'Funds stay in payment protection until both parties confirm.' },
  { icon: RefreshCcw, label: 'Dispute support', detail: 'Open a case anytime — our team reviews within 1 business day.' },
  { icon: Lock, label: 'Address masked', detail: 'Exact pickup location is only shared after payment.' },
];

export const PAYMENT_DISCLAIMER =
  'Vendibook is not the seller of record for individual items. See our Terms for the full protection policy.';

/** Compact trust points for the protected-sale deposit step. */
export const DEPOSIT_TRUST_POINTS: TrustPoint[] = [
  { icon: ShieldCheck, label: 'Payment Protection-held deposit', detail: 'Deposit is captured but not released until handoff is confirmed.' },
  { icon: RefreshCcw, label: 'Refundable', detail: 'Full refund if the seller cancels or fails identity checks.' },
  { icon: CreditCard, label: 'Balance later', detail: 'You only pay the balance once you meet in person.' },
];
