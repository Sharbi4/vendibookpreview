import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, ExternalLink, Trash2, Loader2, Image as ImageIcon, Pencil, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listDocuments, uploadDocument, softDeleteDocument, restoreDocument, renameDocument,
  getSignedDocUrl, validatePermitFile,
  type PermitDocument, PERMIT_DOC_MAX_PER_ITEM,
} from '@/lib/permitsApi';

interface Props {
  userId: string;
  roadmapId: string;
  itemKey: string;
}

function formatBytes(n?: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(mime?: string | null) {
  if (mime && mime.startsWith('image/')) return ImageIcon;
  return FileText;
}

export default function PermitDocumentUploader({ userId, roadmapId, itemKey }: Props) {
  const [docs, setDocs] = useState<PermitDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await listDocuments(roadmapId);
        if (!cancelled) {
          setDocs(all.filter((d) => d.item_key === itemKey));
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [roadmapId, itemKey]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;

    // Cap per-item count
    const slotsLeft = PERMIT_DOC_MAX_PER_ITEM - docs.length;
    if (slotsLeft <= 0) {
      toast.error(`Max ${PERMIT_DOC_MAX_PER_ITEM} files per permit. Delete one before adding another.`);
      return;
    }
    const toProcess = arr.slice(0, slotsLeft);
    if (arr.length > slotsLeft) {
      toast.warning(`Only ${slotsLeft} more allowed — extras skipped.`);
    }

    setUploading(true);
    let ok = 0;
    try {
      for (const file of toProcess) {
        const reason = validatePermitFile(file);
        if (reason) {
          toast.error(`${file.name}: ${reason}`);
          continue;
        }
        try {
          const doc = await uploadDocument(userId, roadmapId, itemKey, file);
          setDocs((p) => [doc, ...p]);
          ok += 1;
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message || 'Upload failed'}`);
        }
      }
      if (ok > 0) toast.success(ok === 1 ? 'Document uploaded' : `${ok} documents uploaded`);
    } finally {
      setUploading(false);
    }
  }, [userId, roadmapId, itemKey, docs.length]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  };

  const openSigned = async (d: PermitDocument) => {
    try {
      const url = await getSignedDocUrl(d.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message || 'Could not open file');
    }
  };

  const remove = async (d: PermitDocument) => {
    // Optimistic remove with undo
    setDocs((p) => p.filter((x) => x.id !== d.id));
    try {
      await softDeleteDocument(d);
      toast('Document deleted', {
        description: 'Recoverable for 7 days.',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restored = await restoreDocument(d.id);
              setDocs((p) => [restored, ...p]);
              toast.success('Document restored');
            } catch (e: any) {
              toast.error(e?.message || 'Restore failed');
            }
          },
        },
      });
    } catch (e: any) {
      // Roll back optimistic remove
      setDocs((p) => [d, ...p]);
      toast.error(e?.message || 'Delete failed');
    }
  };

  const startRename = (d: PermitDocument) => {
    setRenamingId(d.id);
    setRenameValue(d.file_name);
  };

  const saveRename = async (d: PermitDocument) => {
    const next = renameValue.trim();
    if (!next || next === d.file_name) {
      setRenamingId(null);
      return;
    }
    try {
      const updated = await renameDocument(d.id, next);
      setDocs((p) => p.map((x) => (x.id === d.id ? updated : x)));
      setRenamingId(null);
    } catch (e: any) {
      toast.error(e?.message || 'Rename failed');
    }
  };

  const atLimit = docs.length >= PERMIT_DOC_MAX_PER_ITEM;

  return (
    <div className="space-y-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold flex items-center justify-between">
        <span>Documents</span>
        <span className="text-white/35 normal-case tracking-normal text-[10px]">
          {docs.length}/{PERMIT_DOC_MAX_PER_ITEM}
        </span>
      </div>

      <label
        onDragOver={(e) => { if (!atLimit) { e.preventDefault(); setDragActive(true); } }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'group flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 transition-colors',
          atLimit
            ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/[0.02]'
            : dragActive
              ? 'border-white/45 bg-white/[0.06] cursor-pointer'
              : 'border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] cursor-pointer',
        )}
      >
        <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/15 flex items-center justify-center shrink-0">
          {uploading ? (
            <Loader2 className="h-4 w-4 text-white/80 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4 text-white/80" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium">
            {atLimit ? 'Limit reached' : uploading ? 'Uploading…' : 'Upload permit document'}
          </div>
          <div className="text-[11px] text-white/50">
            {atLimit
              ? `Delete one of the ${PERMIT_DOC_MAX_PER_ITEM} files to add another.`
              : 'PDF, JPG, PNG, HEIC, WEBP · up to 10 MB · take a photo or pick a file'}
          </div>
        </div>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
          multiple
          disabled={atLimit || uploading}
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {loading ? (
        <div className="text-xs text-white/45 italic">Loading documents…</div>
      ) : docs.length === 0 ? (
        <p className="text-xs text-white/45 italic">
          No document uploaded yet — add your permit copy here.
        </p>
      ) : (
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {docs.map((d) => {
              const Icon = iconFor(d.mime_type);
              const isRenaming = renamingId === d.id;
              return (
                <motion.li
                  key={d.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-2.5 py-2"
                >
                  <div className="h-7 w-7 rounded-md bg-white/[0.06] border border-white/15 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-white/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void saveRename(d);
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          autoFocus
                          maxLength={200}
                          className="flex-1 bg-white/[0.06] border border-white/20 rounded px-2 py-1 text-sm text-white outline-none focus:border-[#FF5124]/60"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => void saveRename(d)}
                          className="text-white/70 hover:text-white p-1 rounded"
                          aria-label="Save"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="text-white/50 hover:text-white p-1 rounded"
                          aria-label="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-white truncate">{d.file_name}</div>
                        <div className="text-[11px] text-white/45">
                          {new Date(d.uploaded_at).toLocaleDateString()} · {formatBytes(d.size_bytes)}
                        </div>
                      </>
                    )}
                  </div>
                  {!isRenaming && (
                    <>
                      <button
                        type="button"
                        onClick={() => startRename(d)}
                        className="text-white/55 hover:text-white p-1.5 rounded-md hover:bg-white/[0.06]"
                        aria-label="Rename document"
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openSigned(d)}
                        className="text-white/65 hover:text-white p-1.5 rounded-md hover:bg-white/[0.06]"
                        aria-label="Open document"
                        title="Open"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(d)}
                        className="text-white/45 hover:text-white p-1.5 rounded-md hover:bg-white/[0.06]"
                        aria-label="Delete document"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
