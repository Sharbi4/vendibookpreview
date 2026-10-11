import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { maskContactDetails } from '../../../supabase/functions/_shared/contactPatterns';

interface CollapsibleDescriptionProps {
  description: string;
  maxLines?: number;
  /**
   * Hide phone numbers, emails, links and payment/chat handles (default on).
   * The listing owner sees their own text unmasked. Keeps first contact on
   * Vendibook, where members are verified and messages are risk-scanned.
   */
  maskContacts?: boolean;
}

const CollapsibleDescription = ({ description: rawDescription, maxLines = 4, maskContacts = true }: CollapsibleDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = maskContacts ? maskContactDetails(rawDescription, '[contact via Vendibook]') : rawDescription;
  
  // Check if content needs collapsing
  const needsCollapse = description.length > 300 || description.split('\n').length > maxLines;

  if (!needsCollapse) {
    return (
      <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
        {description}
      </p>
    );
  }

  return (
    <div>
      <div className={isExpanded ? '' : 'relative'}>
        <p
          className={`text-foreground/80 whitespace-pre-line leading-relaxed ${
            !isExpanded ? 'line-clamp-4' : ''
          }`}
        >
          {description}
        </p>
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      <Button
        variant="link"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 p-0 h-auto font-semibold underline underline-offset-4 text-foreground hover:text-foreground/80"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </Button>
    </div>
  );
};

export default CollapsibleDescription;
