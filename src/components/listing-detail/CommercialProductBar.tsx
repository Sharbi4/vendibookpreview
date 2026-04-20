import { Link } from 'react-router-dom';
import { ChevronRight, Star, Share2, GitCompare, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FavoriteButton } from '@/components/listing/FavoriteButton';
import { CATEGORY_LABELS } from '@/types/listing';

interface CommercialProductBarProps {
  listingId: string;
  category: keyof typeof CATEGORY_LABELS;
  mode: 'rent' | 'sale';
  title: string;
  rating?: number;
  reviewCount?: number;
  onShare: () => void;
}

/**
 * Amazon/Best Buy style sub-header bar with breadcrumbs, quick rating,
 * SKU/ID, and commerce actions (share, favorite, compare).
 */
export const CommercialProductBar = ({
  listingId,
  category,
  mode,
  title,
  rating,
  reviewCount,
  onShare,
}: CommercialProductBarProps) => {
  const categoryLabel = CATEGORY_LABELS[category];
  const modeLabel = mode === 'rent' ? 'Rent' : 'Sale';
  const shortId = listingId.slice(0, 8).toUpperCase();

  return (
    <div className="border-b border-border/60 bg-card/40 backdrop-blur-sm">
      <div className="container py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground transition-colors">Vendibook</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              to={`/search?mode=${mode}`}
              className="hover:text-foreground transition-colors"
            >
              For {modeLabel}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <Link
              to={`/search?category=${category}&mode=${mode}`}
              className="hover:text-foreground transition-colors"
            >
              {categoryLabel}
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground/80 truncate max-w-[160px] md:max-w-xs" title={title}>
              {title}
            </span>
          </nav>

          {/* Commerce actions */}
          <div className="flex items-center gap-1 text-xs">
            {rating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
              <a
                href="#reviews"
                className="hidden sm:flex items-center gap-1 px-2 py-1 rounded hover:bg-muted/50 transition-colors"
              >
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviewCount})</span>
              </a>
            )}
            <span className="hidden md:flex items-center gap-1 px-2 py-1 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span>ID: {shortId}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1.5"
              onClick={onShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <FavoriteButton
              listingId={listingId}
              category={category}
              size="sm"
              variant="underline"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs gap-1.5 hidden md:flex"
              asChild
            >
              <Link to={`/search?category=${category}&mode=${mode}`}>
                <GitCompare className="h-3.5 w-3.5" />
                Compare
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommercialProductBar;
