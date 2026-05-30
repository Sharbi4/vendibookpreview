import { ShieldCheck } from 'lucide-react';

interface ConciergeTrustLineProps {
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Standardized concierge trust message used above every Tell-Vendibook CTA.
 * Keep copy consistent across surfaces.
 */
export const ConciergeTrustLine = ({ variant = 'dark', className = '' }: ConciergeTrustLineProps) => {
  const textColor = variant === 'dark' ? 'text-foreground/70' : 'text-muted-foreground';
  return (
    <p
      className={`flex items-start gap-2 text-[12px] sm:text-[13px] leading-relaxed ${textColor} ${className}`}
    >
      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary/80" strokeWidth={2} />
      <span>
        <span className="font-medium text-foreground/90">Need help?</span> Vendibook can help
        confirm availability, pricing, and next steps before you book.
      </span>
    </p>
  );
};

export default ConciergeTrustLine;
