import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { btn } from './buttons';


/** Listing photo with a quiet fallback. */
export function Thumb({ src, className }: { src?: string | null; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-lg bg-[#F3EEE7]', className)}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon aria-hidden="true" className="h-4 w-4 text-[#8A847B]" />
      )}
    </span>
  );
}

/** Error line with a retry button, used where a query failed (never shown as "nothing here"). */
export function LoadError({ what, onRetry, className }: { what: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6', className)}>
      <div>
        <p className="text-[14px] font-semibold text-[#1C1B1A]">Your {what} couldn’t be loaded.</p>
        <p className="mt-0.5 text-[13px] leading-5 text-[#5E5953]">Nothing has changed. Check your connection and try again.</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className={btn.outlineMd}>
          Try again
        </button>
      )}
    </div>
  );
}
