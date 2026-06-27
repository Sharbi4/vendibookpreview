import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileText, ExternalLink, Trash2, Loader2, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  listDocuments, uploadDocument, deleteDocument, getSignedDocUrl,
  type PermitDocument, PERMIT_DOC_MAX_BYTES,
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
    setUploading(true);
    try {
      for (const file of arr) {
        if (file.size > PERMIT_DOC_MAX_BYTES) {
          toast.error(`${file.name} is too large (max 10 MB).`);
          continue;
        }
        const doc = await uploadDocument(userId, roadmapId, itemKey, file);
        setDocs((p) => [doc, ...p]);
      }
      toast.success('Document uploaded');
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [userId, roadmapId, itemKey]);

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
    try {
      await deleteDocument(d);
      setDocs((p) => p.filter((x) => x.id !== d.id));
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold">
        Documents
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          'group flex items-center gap-3 rounded-xl border border-dashed px-3 py-3 cursor-pointer transition-colors',
          dragActive
            ? 'border-white/45 bg-white/[0.06]'
            : 'border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]',
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
            {uploading ? 'Uploading…' : 'Upload permit document'}
          </div>
          <div className="text-[11px] text-white/50">
            Drag &amp; drop or click — PDF, JPG, PNG, HEIC, WEBP · up to 10 MB
          </div>
        </div>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,image/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
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
                    <div className="text-sm text-white truncate">{d.file_name}</div>
                    <div className="text-[11px] text-white/45">
                      {new Date(d.uploaded_at).toLocaleDateString()} · {formatBytes(d.size_bytes)}
                    </div>
                  </div>
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
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
