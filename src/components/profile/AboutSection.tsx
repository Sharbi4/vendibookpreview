import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Pencil, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AboutSectionProps {
  bio: string | null;
  isOwnProfile?: boolean;
  displayName?: string;
}

const AboutSection = ({ bio, isOwnProfile, displayName }: AboutSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Character limit for truncation
  const CHAR_LIMIT = 150;
  const shouldTruncate = bio && bio.length > CHAR_LIMIT;
  
  // No bio and not own profile - don't show anything
  if (!bio && !isOwnProfile) return null;

  // Empty state for own profile
  if (!bio && isOwnProfile) {
    return (
      <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Quote className="h-4 w-4" />
            <span className="text-sm">Tell your story to connect with customers</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link to="/account?tab=profile">
              <Pencil className="h-3 w-3 mr-1" />
              Add bio
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayedText = shouldTruncate && !isExpanded 
    ? bio.slice(0, CHAR_LIMIT) + '...' 
    : bio;

  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        <Quote className="h-4 w-4 text-primary/50 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayedText}
          </p>
          
          {shouldTruncate && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-0 text-xs text-primary mt-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-0.5" />
                  Read less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-0.5" />
                  Read more
                </>
              )}
            </Button>
          )}
        </div>

        {isOwnProfile && (
          <Button variant="ghost" size="icon" asChild className="h-7 w-7 flex-shrink-0">
            <Link to="/account?tab=profile">
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default AboutSection;
