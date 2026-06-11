import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Plus, CreditCard, Shield, Calendar, MessageSquare } from 'lucide-react';

interface NextBestActionProps {
  publishedListings: number;
  draftListings: number;
  isStripeConnected: boolean;
  isIdentityVerified: boolean;
  pendingRequests: number;
  pendingOffers: number;
  firstName?: string;
}

interface Action {
  icon: typeof Plus;
  title: string;
  desc: string;
  cta: string;
  href: string;
  urgent?: boolean;
}

export const NextBestAction = ({
  publishedListings,
  draftListings,
  isStripeConnected,
  isIdentityVerified,
  pendingRequests,
  pendingOffers,
  firstName}: NextBestActionProps) => {
  // Priority-ordered logic
  let action: Action | null = null;

  if (pendingRequests > 0) {
    action = {
      icon: Calendar,
      title: `Respond to ${pendingRequests} booking request${pendingRequests > 1 ? 's' : ''}`,
      desc: 'Hosts who reply within 1 hour book up to 40% more often.',
      cta: 'Review requests',
      href: '/host/bookings',
      urgent: true};
  } else if (pendingOffers > 0) {
    action = {
      icon: MessageSquare,
      title: `${pendingOffers} pending offer${pendingOffers > 1 ? 's' : ''} need${pendingOffers === 1 ? 's' : ''} a reply`,
      desc: 'Counter, accept, or decline to keep the deal moving.',
      cta: 'Review offers',
      href: '/dashboard?tab=overview',
      urgent: true};
  } else if (publishedListings === 0 && draftListings === 0) {
    action = {
      icon: Plus,
      title: 'Create your first listing',
      desc: 'Get discovered by thousands of buyers and renters in minutes.',
      cta: 'Start listing',
      href: '/list?start=true'};
  } else if (draftListings > 0) {
    action = {
      title: `Finish your draft${draftListings > 1 ? 's' : ''} (${draftListings})`,
      desc: 'Drafts don\'t earn — publish to start getting bookings.',
      cta: 'Resume draft',
      href: '/host/listings'};
  } else if (!isStripeConnected) {
    action = {
      icon: CreditCard,
      title: 'Connect payouts to get paid',
      desc: 'Required to accept bookings and receive your earnings.',
      cta: 'Connect now',
      href: '/dashboard?tab=financials',
      urgent: true};
  } else if (!isIdentityVerified) {
    action = {
      icon: Shield,
      title: 'Verify your identity',
      desc: 'Verified hosts earn the trust badge — and 2x more bookings.',
      cta: 'Verify ID',
      href: '/verify-identity'};
  } else {
    action = {
      icon: CheckCircle2,
      title: `You're all set${firstName ? `, ${firstName}` : ''}!`,
      desc: 'Share your storefront to drive more traffic to your listings.',
      cta: 'View storefront',
      href: '/account'};
  }

  const Icon = action.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      {/* Subtle accent glow */}
      <div
        className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-50 ${
          action.urgent ? 'bg-primary/20' : 'bg-foreground/5'
        }`}
      />

      <div className="relative flex items-start gap-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
            action.urgent
              ? 'bg-primary text-primary-foreground'
              : 'bg-foreground text-background'
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Next best action
            </span>
            {action.urgent && (
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                • Urgent
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {action.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{action.desc}</p>
          <Link
            to={action.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            {action.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
