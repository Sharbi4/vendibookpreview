import { Link } from 'react-router-dom';
import { FileEdit, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface Draft {
  id: string;
  title: string;
  category: string;
  mode: string;
  cover_image_url: string | null;
  updated_at: string;
}

interface DraftsSectionProps {
  drafts: Draft[];
  onDelete: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  food_truck: 'Food Truck',
  food_trailer: 'Food Trailer',
  ghost_kitchen: 'Shared Kitchen',
  vendor_lot: 'Vendor Space',
};

const DraftsSection = ({ drafts, onDelete }: DraftsSectionProps) => {
  if (drafts.length === 0) return null;

  return (
    <div className="relative rounded-2xl p-[2px] overflow-hidden shadow-lg">
      {/* Animated gradient border - matching ActionRequiredBanner */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'linear-gradient(270deg, hsl(25 95% 53%), hsl(15 80% 45%), hsl(350 60% 35%), hsl(25 95% 53%))',
          backgroundSize: '300% 300%',
          animation: 'gradient-shift 4s ease infinite',
        }}
      />
      
      {/* Inner content */}
      <div className="relative rounded-[14px] bg-background p-4">
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(25 95% 53%), hsl(350 60% 35%))',
            }}
          >
            <FileEdit className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Resume Your Drafts</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {drafts.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {drafts.slice(0, 3).map((draft) => (
            <div 
              key={draft.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                {draft.cover_image_url ? (
                  <img 
                    src={draft.cover_image_url} 
                    alt={draft.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileEdit className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {draft.title || 'Untitled Draft'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[draft.category] || draft.category} • {draft.mode === 'rent' ? 'For Rent' : 'For Sale'} • Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{draft.title || 'Untitled Draft'}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => onDelete(draft.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="h-8 text-xs text-primary hover:text-primary"
                >
                  <Link to={`/create-listing/${draft.id}`}>
                    Continue
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {drafts.length > 3 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            +{drafts.length - 3} more draft{drafts.length - 3 > 1 ? 's' : ''} in Listings tab
          </p>
        )}
      </div>

      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default DraftsSection;
