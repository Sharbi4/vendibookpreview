import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Check, Loader2, Maximize2, Video, X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type MediaStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface MediaTrayItem {
  id: string;
  url: string;
  kind: 'image' | 'video';
  status?: MediaStatus;
  /** Group key — reordering only happens between items of the same group. */
  group: string;
}

interface Props {
  items: MediaTrayItem[];
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  size?: 'sm' | 'md';
  /** Renders the "Cover" badge on the first image. */
  showCover?: boolean;
  className?: string;
}

/**
 * Thumbnail tray with view / reorder / remove controls for listing media.
 * Videos render a real muted preview frame; tapping any tile opens a
 * full-size preview so the seller can check media before publishing.
 */
export const MediaTray = ({
  items, onMove, onRemove, onRetry, size = 'md', showCover = true, className,
}: Props) => {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = items.find((i) => i.id === previewId) ?? null;

  const box = size === 'sm' ? 'h-16 w-16' : 'h-[92px] w-[92px]';
  const firstImageId = items.find((i) => i.kind === 'image')?.id;

  const neighbors = (item: MediaTrayItem) => {
    const peers = items.filter((i) => i.group === item.group && i.kind === item.kind);
    const idx = peers.findIndex((i) => i.id === item.id);
    return { canPrev: idx > 0, canNext: idx > -1 && idx < peers.length - 1 };
  };

  if (!items.length) return null;

  return (
    <>
      <ul className={cn('flex flex-wrap gap-2.5', className)} aria-label="Uploaded photos and videos">
        {items.map((item) => {
          const { canPrev, canNext } = neighbors(item);
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              layout
              className={cn('group relative overflow-hidden rounded-2xl border border-white/[0.1]', box)}
            >
              <button
                type="button"
                onClick={() => setPreviewId(item.id)}
                className="block h-full w-full"
                aria-label={item.kind === 'video' ? 'Preview video' : 'Preview photo'}
              >
                {item.kind === 'video' ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4 text-white" />
                </span>
              </button>

              {item.kind === 'video' && (
                <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/70 p-1">
                  <Video className="h-3 w-3 text-white" />
                </span>
              )}

              {showCover && item.id === firstImageId && (
                <span className="pointer-events-none absolute left-1.5 bottom-1.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white">
                  Cover
                </span>
              )}

              {item.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55" aria-label="Uploading">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              )}
              {item.status === 'done' && item.id !== firstImageId && (
                <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/70 p-1" aria-label="Uploaded">
                  <Check className="h-3 w-3 text-emerald-400" />
                </span>
              )}
              {item.status === 'error' && onRetry && (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="absolute inset-x-0 bottom-0 bg-red-600/85 py-1 text-[10px] font-medium text-white"
                >
                  Retry
                </button>
              )}

              <button
                type="button"
                aria-label="Remove media"
                onClick={() => onRemove(item.id)}
                className="absolute right-1.5 top-1.5 rounded-full border border-white/10 bg-black/65 p-1 backdrop-blur-md transition hover:bg-black/85"
              >
                <X className="h-3 w-3 text-white" />
              </button>

              {(canPrev || canNext) && item.status !== 'error' && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/75 to-transparent px-1 pb-1 pt-3 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label="Move earlier"
                    disabled={!canPrev}
                    onClick={() => onMove(item.id, -1)}
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move later"
                    disabled={!canNext}
                    onClick={() => onMove(item.id, 1)}
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Media preview</DialogTitle>
          </DialogHeader>
          {preview && (
            preview.kind === 'video' ? (
              <video src={preview.url} className="max-h-[80vh] w-full bg-black" controls autoPlay playsInline />
            ) : (
              <img src={preview.url} alt="" className="max-h-[80vh] w-full bg-black object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaTray;
