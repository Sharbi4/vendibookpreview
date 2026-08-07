import { Link } from 'react-router-dom';
import { PlaidLogo } from '@/components/brand/ProviderLogos';

interface IdentityAddOnNoteProps {
  /** Render the Plaid logo alongside the small print. */
  showLogo?: boolean;
  className?: string;
  align?: 'left' | 'center';
}

/**
 * Shared asterisk footnote for identity verification.
 *
 * Headlines say "Identity verification" plainly; this small print carries the
 * optional/paid add-on qualifier and links to the details page.
 */
export const IdentityAddOnNote = ({
  showLogo = false,
  className = '',
  align = 'left',
}: IdentityAddOnNoteProps) => (
  <p
    className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground/80 ${
      align === 'center' ? 'justify-center' : ''
    } ${className}`}
  >
    {showLogo && <PlaidLogo surface="dark" className="h-3.5" />}
    <span>
      <span aria-hidden="true">*</span> Identity verification is an optional paid add-on powered by
      Plaid — never required to book, buy, sell, or publish.{' '}
      <Link
        to="/identity-verification"
        className="underline underline-offset-4 transition-colors hover:text-foreground"
      >
        See more details
      </Link>
      .
    </span>
  </p>
);

export default IdentityAddOnNote;
