import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ToolPageCTAProps {
  variant?: 'sticky' | 'inline' | 'section';
  className?: string;
}

export const ToolPageCTA = ({ variant = 'inline', className }: ToolPageCTAProps) => {
  if (variant === 'sticky') {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 md:hidden">
        <Button asChild size="lg" className="shadow-xl rounded-full px-6">
          <Link to="/host">
            List Your Asset
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <section className="py-16 bg-gradient-to-r from-primary/10 via-amber-500/10 to-orange-500/10">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to start earning?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your listing in minutes and reach thousands of potential renters and buyers.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/host">
                List Your Asset
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/search">Browse Listings</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={className}>
      <Button asChild>
        <Link to="/host">
          List Your Asset
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
};

export default ToolPageCTA;
