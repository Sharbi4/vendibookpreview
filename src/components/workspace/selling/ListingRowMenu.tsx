import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ExternalLink, MoreHorizontal, Pause, Play, Share2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { btn } from './buttons';

type Props = {
  listing: { id: string; title: string; status: string };
  onPause: (id: string) => Promise<unknown>;
  onResume: (id: string) => Promise<unknown>;
  onArchive: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onShare: () => void;
  /** Also show Pause/Resume as a visible button next to the menu (desktop rows). */
  showPauseButton?: boolean;
};

const item = 'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-[#1C1B1A] focus:bg-[#F6F2EC] focus:text-[#1C1B1A]';

/**
 * Row actions for one listing: Pause/Resume, View, Share, Archive and Delete.
 * Same handlers and the same archive/delete confirmations as ListingManageMenu.
 */
export default function ListingRowMenu({ listing, onPause, onResume, onArchive, onDelete, onShare, showPauseButton }: Props) {
  const [action, setAction] = useState<'archive' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const name = listing.title?.trim() || 'Untitled listing';

  const run = async (callback: Props['onPause']) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await callback(listing.id);
      setAction(null);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const canPause = listing.status === 'published';
  const canResume = listing.status === 'paused';

  return (
    <>
      {showPauseButton && (canPause || canResume) && (
        <button type="button" disabled={busy} className={cn(btn.outline, 'hidden xl:inline-flex')} onClick={() => void run(canPause ? onPause : onResume)}>
          {canPause ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
          {canPause ? 'Pause' : 'Resume'}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={btn.icon} disabled={busy} aria-label={`More actions for ${name}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-52 rounded-xl border-[#ECE6DD] bg-white p-1.5 text-[#1C1B1A] shadow-[0_12px_32px_-12px_rgba(28,27,26,0.25)]">
          <DropdownMenuItem asChild className={item}>
            <Link to={`/listing/${listing.id}`}><ExternalLink className="h-4 w-4 text-[#8A847B]" />View listing</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onShare} className={item}><Share2 className="h-4 w-4 text-[#8A847B]" />Share link</DropdownMenuItem>
          {(canPause || canResume) && <DropdownMenuSeparator className="bg-[#F1ECE5]" />}
          {canPause && <DropdownMenuItem onSelect={() => void run(onPause)} className={item}><Pause className="h-4 w-4 text-[#8A847B]" />Pause listing</DropdownMenuItem>}
          {canResume && <DropdownMenuItem onSelect={() => void run(onResume)} className={item}><Play className="h-4 w-4 text-[#8A847B]" />Resume listing</DropdownMenuItem>}
          <DropdownMenuSeparator className="bg-[#F1ECE5]" />
          {listing.status !== 'archived' && <DropdownMenuItem onSelect={() => setAction('archive')} className={item}><Archive className="h-4 w-4 text-[#8A847B]" />Archive listing</DropdownMenuItem>}
          <DropdownMenuItem onSelect={() => setAction('delete')} className={cn(item, 'text-[#B42318] focus:text-[#9F1F15]')}><Trash2 className="h-4 w-4" />Delete listing</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!action} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}>
        <AlertDialogContent className="rounded-2xl border-[#ECE6DD] bg-white text-[#1C1B1A]">
          <AlertDialogHeader>
            <AlertDialogTitle>{action === 'delete' ? 'Delete this listing?' : 'Archive this listing?'}</AlertDialogTitle>
            <AlertDialogDescription className="text-[#5E5953]">
              {action === 'delete'
                ? `“${name}” will be removed from your listings and the marketplace. Existing transaction records are retained. This cannot be undone from your dashboard.`
                : `“${name}” will leave the marketplace and remain in your Archived tab. Existing bookings and transactions are unchanged.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={busy} className="rounded-full">Keep listing</AlertDialogCancel>
            <button
              type="button"
              disabled={busy}
              className={cn(btn.solid, 'h-10', action === 'delete' && 'bg-[#B42318] hover:bg-[#9F1F15]')}
              onClick={() => void run(action === 'delete' ? onDelete : onArchive)}
            >
              {busy ? 'Saving…' : action === 'delete' ? 'Delete listing' : 'Archive listing'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
