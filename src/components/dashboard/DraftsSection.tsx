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
  ghost_kitchen: 'Ghost Kitchen',
  vendor_lot: 'Vendor Lot',
};

const DraftsSection = ({ drafts, onDelete }: DraftsSectionProps) => {
  if (drafts.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200/50 dark:border-amber-800/30">
      <div className="flex items-center gap-2 mb-3">
        <FileEdit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">Resume Your Drafts</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-0">
          {drafts.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {drafts.slice(0, 3).map((draft) => (
          <div 
            key={draft.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-card/80 border border-border/50 hover:border-primary/30 transition-all group"
          >
            {/* Thumbnail */}
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {draft.title || 'Untitled Draft'}
              </p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[draft.category] || draft.category} • {draft.mode === 'rent' ? 'For Rent' : 'For Sale'} • Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
              </p>
            </div>

            {/* Actions */}
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
                <Link to={`/edit-listing/${draft.id}`}>
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
  );
};

export default DraftsSection;
