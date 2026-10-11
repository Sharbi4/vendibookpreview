import { useRef, useState } from 'react';
import { Archive, MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type Props = {
  listing: { id: string; title: string; status: string };
  onPause: (id: string) => Promise<unknown>;
  onResume: (id: string) => Promise<unknown>;
  onArchive: (id: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
};

export default function ListingManageMenu({ listing, onPause, onResume, onArchive, onDelete }: Props) {
  const [action, setAction] = useState<'archive' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async (callback: Props['onPause']) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try { await callback(listing.id); setAction(null); }
    finally { lock.current = false; setBusy(false); }
  };
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="v2-btn-outline v2-btn-sm" disabled={busy} aria-label={`Manage ${listing.title || 'listing'}`}>
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" /> Manage
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white text-stone-900 border-stone-200 rounded-xl shadow-xl">
        {listing.status === 'published' && <DropdownMenuItem onSelect={() => void run(onPause)} className="gap-2"><Pause className="h-4 w-4" />Pause listing</DropdownMenuItem>}
        {listing.status === 'paused' && <DropdownMenuItem onSelect={() => void run(onResume)} className="gap-2"><Play className="h-4 w-4" />Resume listing</DropdownMenuItem>}
        {listing.status !== 'archived' && <DropdownMenuItem onSelect={() => setAction('archive')} className="gap-2"><Archive className="h-4 w-4" />Archive listing</DropdownMenuItem>}
        <DropdownMenuItem onSelect={() => setAction('delete')} className="gap-2 text-red-700 focus:text-red-800"><Trash2 className="h-4 w-4" />Delete listing</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialog open={!!action} onOpenChange={(open) => { if (!open && !busy) setAction(null); }}>
      <AlertDialogContent className="bg-[#fffdf9] text-stone-900 border-stone-200 rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{action === 'delete' ? 'Delete this listing?' : 'Archive this listing?'}</AlertDialogTitle>
          <AlertDialogDescription className="text-stone-600">
            {action === 'delete'
              ? `“${listing.title || 'Untitled listing'}” will be removed from your listings and the marketplace. Existing transaction records are retained. This cannot be undone from your dashboard.`
              : `“${listing.title || 'Untitled listing'}” will leave the marketplace and remain in your Archived tab. Existing bookings and transactions are unchanged.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep listing</AlertDialogCancel>
          <button type="button" disabled={busy} className="v2-btn" onClick={() => void run(action === 'delete' ? onDelete : onArchive)}>
            {busy ? 'Saving…' : action === 'delete' ? 'Delete listing' : 'Archive listing'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
