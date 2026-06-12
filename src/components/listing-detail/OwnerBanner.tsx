import { useState } from 'react';
import { AlertTriangle, Edit, BarChart3, Trash2, Loader2, Pause, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type ListingStatus = 'draft' | 'published' | 'paused' | string;

interface OwnerBannerProps {
  listingId: string;
  variant?: 'card' | 'inline';
  className?: string;
  status?: ListingStatus;
}

export const OwnerBanner = ({ listingId, variant = 'inline', className = '', status }: OwnerBannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ListingStatus | undefined>(status);
  const [toggling, setToggling] = useState(false);

  const isPaused = currentStatus === 'paused';
  const canTogglePause = currentStatus === 'published' || currentStatus === 'paused';

  const handleTogglePause = async () => {
    if (!user || !canTogglePause) return;
    const next: ListingStatus = isPaused ? 'published' : 'paused';
    setToggling(true);
    try {
      const updates: Record<string, any> = { status: next };
      if (next === 'published') updates.published_at = new Date().toISOString();
      const { error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', listingId)
        .eq('host_id', user.id);
      if (error) throw error;
      setCurrentStatus(next);
      toast({
        title: next === 'paused' ? 'Listing paused' : 'Listing resumed',
        description:
          next === 'paused'
            ? 'It is hidden from search and cannot be booked or purchased.'
            : 'It is live again and visible to shoppers.',
      });
    } catch (err: any) {
      console.error('Toggle pause error:', err);
      toast({
        title: 'Could not update listing',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('host_id', user.id);
      if (error) throw error;
      toast({ title: 'Listing deleted', description: 'Your listing has been removed.' });
      navigate('/dashboard/listings');
    } catch (err: any) {
      console.error('Delete listing error:', err);
      toast({
        title: 'Could not delete listing',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  const deleteDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the listing and its photos from Vendibook. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete listing
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const pauseLabelLong = isPaused ? 'Resume Listing' : 'Pause Listing';
  const pauseLabelShort = isPaused ? 'Resume' : 'Pause';
  const PauseIcon = isPaused ? Play : Pause;

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border border-amber-200 bg-amber-50 p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">This is your listing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isPaused
                ? "Your listing is paused and hidden from search. Resume it any time."
                : "You can't book or purchase your own listing. Use the options below to manage it."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/create-listing/${listingId}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Listing
                </Link>
              </Button>
              {canTogglePause && (
                <Button size="sm" variant="outline" onClick={handleTogglePause} disabled={toggling}>
                  {toggling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PauseIcon className="h-4 w-4 mr-2" />}
                  {pauseLabelLong}
                </Button>
              )}
              <Button asChild size="sm" variant="ghost">
                <Link to="/dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Dashboard
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
        {deleteDialog}
      </div>
    );
  }

  return (
    <>
      <Alert className={`border-amber-200 bg-amber-50 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-sm text-foreground">
            {isPaused
              ? 'This listing is paused — hidden from search.'
              : "This is your listing. You can't book or purchase it."}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link to={`/create-listing/${listingId}`}>
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Link>
            </Button>
            {canTogglePause && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTogglePause}
                disabled={toggling}
                className="h-7 text-xs"
              >
                {toggling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <PauseIcon className="h-3 w-3 mr-1" />}
                {pauseLabelShort}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </AlertDescription>
      </Alert>
      {deleteDialog}
    </>
  );
};

export default OwnerBanner;
