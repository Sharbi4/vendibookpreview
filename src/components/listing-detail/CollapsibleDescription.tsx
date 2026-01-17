import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleDescriptionProps {
  description: string;
  maxLines?: number;
}

const CollapsibleDescription = ({ description, maxLines = 3 }: CollapsibleDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Rough check if content needs collapsing (more than ~150 chars or multiple lines)
  const needsCollapse = description.length > 200 || description.split('\n').length > maxLines;

  if (!needsCollapse) {
    return (
      <p className="text-muted-foreground whitespace-pre-line text-sm">
        {description}
      </p>
    );
  }

  return (
    <div>
      <div className={isExpanded ? '' : 'relative'}>
        <p
          className={`text-muted-foreground whitespace-pre-line text-sm ${
            !isExpanded ? 'line-clamp-3' : ''
          }`}
        >
          {description}
        </p>
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-primary hover:text-primary/80 p-0 h-auto"
      >
        {isExpanded ? (
          <>
            Read less <ChevronUp className="h-4 w-4 ml-1" />
          </>
        ) : (
          <>
            Read more <ChevronDown className="h-4 w-4 ml-1" />
          </>
        )}
      </Button>
    </div>
  );
};

export default CollapsibleDescription;
