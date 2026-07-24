import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  imageUrl?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  className?: string;
}

/**
 * Inviting empty state — never a blank block.
 * Shows either a subtle icon or a soft image, one CTA, calm copy.
 */
const EmptyState = ({
  icon: Icon,
  imageUrl,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      'rounded-2xl border border-border bg-card px-6 py-12 text-center flex flex-col items-center',
      className,
    )}
  >
    {imageUrl ? (
      <div className="h-24 w-24 rounded-2xl overflow-hidden mb-4 bg-muted">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    ) : Icon ? (
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    ) : null}
    <h3 className="text-base font-medium text-foreground">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
    )}
    {ctaLabel && (ctaHref || onCta) && (
      <div className="mt-5">
        {ctaHref ? (
          <Button asChild size="sm" className="rounded-lg">
            <Link to={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : (
          <Button size="sm" onClick={onCta} className="rounded-lg">
            {ctaLabel}
          </Button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
