import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface InlineLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Subtle premium inline link for education/trust copy.
 * Normal body text with a restrained underline and hover color change —
 * not button-like, not orange by default. Keyboard accessible.
 */
export const InlineLink = ({ to, children, className }: InlineLinkProps) => (
  <Link
    to={to}
    className={cn(
      'font-medium text-foreground/90 underline decoration-foreground/30 decoration-1 underline-offset-4',
      'transition-colors hover:text-primary hover:decoration-primary/60',
      'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
      className,
    )}
  >
    {children}
  </Link>
);

export default InlineLink;
