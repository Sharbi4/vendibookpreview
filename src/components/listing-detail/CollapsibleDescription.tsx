import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CollapsibleDescriptionProps {
  description: string;
  maxLines?: number;
}

const CollapsibleDescription = ({ description, maxLines = 4 }: CollapsibleDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
