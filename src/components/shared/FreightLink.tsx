import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** Education/product page for Vendibook Freight. */
export const FREIGHT_PAGE_PATH = '/vendibook-freight';
/** High-intent freight quote intake page (standalone shipments). */
export const FREIGHT_QUOTE_PATH = '/ship-your-food-truck';

interface FreightLinkProps {
  /** Defaults to the Freight education page. */
  to?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Inline underline link used wherever "Vendibook Freight" is mentioned in
 * customer-facing copy, so every mention is one tap away from the Freight page.
 */
export const FreightLink = ({
  to = FREIGHT_PAGE_PATH,
  children = 'Vendibook Freight',
  className,
}: FreightLinkProps) => (
  <Link
    to={to}
    className={cn(
      'font-medium text-primary underline underline-offset-2 decoration-primary/40 transition-colors hover:text-primary/80 hover:decoration-primary',
      className,
    )}
  >
    {children}
  </Link>
);

/**
 * Turns plain copy strings into React nodes with every "Vendibook Freight"
 * mention (including the legacy "VendiBook" casing) wrapped in a FreightLink.
 * Returns the original string untouched when there is no mention.
 */
export const linkifyFreight = (text: string, to?: string): ReactNode => {
  const parts = text.split(/Vendi[Bb]ook Freight/g);
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i === 0 ? [part] : [<FreightLink key={`freight-${i}`} to={to} />, part],
  );
};
