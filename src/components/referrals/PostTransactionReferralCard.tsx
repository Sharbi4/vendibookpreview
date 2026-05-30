import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Variant = 'purchase' | 'rental' | 'listing';

const COPY: Record<Variant, { headline: string; body: string }> = {
  purchase: {
    headline: "Know someone who'd love Vendibook?",
    body: 'Refer a buyer and earn $500 when they complete a purchase.',
  },
  rental: {
    headline: "Know someone who'd love Vendibook?",
    body: 'Refer a renter and earn $50 when they complete their first booking.',
  },
  listing: {
    headline: "Know someone who'd love Vendibook?",
    body: 'Refer another seller and earn $150 when their first transaction clears.',
  },
};

export function PostTransactionReferralCard({ variant }: { variant: Variant }) {
  const { headline, body } = COPY[variant];
  return (
    <div
      className="mt-8 rounded-xl px-5 py-5 sm:px-6 sm:py-6"
      style={{ backgroundColor: '#F7F5F3' }}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        One more thing
      </p>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        {headline}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{body}</p>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link to={`/referral?source=post_transaction_${variant}`}>
          See how it works
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export default PostTransactionReferralCard;
