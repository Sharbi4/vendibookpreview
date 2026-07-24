import { Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoListingCardProps {
  href?: string;
  title: string;
  imageUrl?: string | null;
  subtitle?: string;
  meta?: string;
  status?: {
    label: string;
    tone?: 'success' | 'warning' | 'muted' | 'info';
  };
  /** Rich status affordance — when provided, replaces the plain chip. */
  statusNode?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

const toneStyles = {
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  muted: 'bg-muted text-muted-foreground border-border',
  info: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
} as const;

/**
 * Compact photo-forward row card. Used across orders, bookings, listings tabs.
 * Whole row is clickable when href is set; the `right` and `statusNode` slots
 * stay interactive so status chips can open popovers.
 */
const PhotoListingCard = ({
  href,
  title,
  imageUrl,
  subtitle,
  meta,
  status,
  statusNode,
  right,
  className,
}: PhotoListingCardProps) => {
  const inner = (
    <div className={cn(
      'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-md border border-border bg-card hover:bg-muted/30 transition-colors',
      className,
    )}>
      <div className="h-16 w-20 sm:h-20 sm:w-28 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          {statusNode ? (
            <span onClick={(e) => e.stopPropagation()} className="inline-flex">{statusNode}</span>
          ) : status ? (
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full border', toneStyles[status.tone ?? 'muted'])}>
              {status.label}
            </span>
          ) : null}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        {meta && <p className="text-[11px] text-muted-foreground mt-1">{meta}</p>}
      </div>
      {right && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {right}
        </div>
      )}
    </div>
  );

  if (href) return <Link to={href} className="block no-underline">{inner}</Link>;
  return inner;
};

export default PhotoListingCard;
