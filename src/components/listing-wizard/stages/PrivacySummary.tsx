import React from 'react';
import { Eye, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrivacySummaryProps {
  className?: string;
}

const PUBLIC_ITEMS = [
  'Title, description, photos and video',
  'Category, mode, condition and operational status',
  'Price or rates, and whether you accept offers',
  'Known problems you disclosed and what is included',
  'General city, state and ZIP code',
  'Pickup and delivery options',
];

const PRIVATE_ITEMS = [
  'Your complete street address (shared only after a confirmed transaction)',
  'Your phone number and email address',
  'Any private minimum offer amount',
  'Ownership and identity documents',
];

/** Explicit public-vs-private summary shown on the confirm stage. */
export const PrivacySummary: React.FC<PrivacySummaryProps> = ({ className }) => (
  <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="h-4 w-4" aria-hidden="true" />
        Public — buyers will see this
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {PUBLIC_ITEMS.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4" aria-hidden="true" />
        Private — stays with you
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {PRIVATE_ITEMS.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  </div>
);

export default PrivacySummary;
