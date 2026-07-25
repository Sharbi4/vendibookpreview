import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileCheck, Plus, Loader2, RefreshCw, Archive, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  listRoadmaps, getRoadmap, softDeleteRoadmap, restoreRoadmap, renameRoadmap,
  listDeletedRoadmaps, listItemsForUser,
  type SavedRoadmap, type PermitItem,
} from '@/lib/permitsApi';
import ResultsDashboard from '@/components/tools/permit-path/ResultsDashboard';
import PermitItemManager from './permits/PermitItemManager';
import RenewalsStrip from './permits/RenewalsStrip';
import PermitRoadmapCard from './permits/PermitRoadmapCard';
import PermitsGate from './permits/PermitsGate';
import { useToolAccess } from '@/hooks/useToolAccess';
import { Flame } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


function totalRequirements(r: SavedRoadmap) {
  return (r.result_payload?.categories || []).reduce((s, c) => s + (c.items?.length || 0), 0);
}

function requiredCount(r: SavedRoadmap) {
  return (r.result_payload?.categories || []).reduce(
    (s, c) =>
      s +
      (c.items || []).filter((it: any) => {
        const rs = typeof it?.requirement_status === 'string' ? it.requirement_status : 'required';
        return rs !== 'optional' && rs !== 'conditional';
      }).length,
    0,
  );
}

export default function PermitsTab() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roadmapId = searchParams.get('roadmap');

  const [roadmaps, setRoadmaps] = useState<SavedRoadmap[]>([]);
  const [items, setItems] = useState<PermitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SavedRoadmap | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load list (and items across all roadmaps for renewals strip).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rs, its] = await Promise.all([
          listRoadmaps(user.id),
          listItemsForUser(user.id),
        ]);
        if (!cancelled) {
          setRoadmaps(rs);
          setItems(its);
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Could not load your permits');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Load detail when ?roadmap=
  useEffect(() => {
    if (!roadmapId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const r = await getRoadmap(roadmapId);
        if (!cancelled) setDetail(r);
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || 'Could not load roadmap');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roadmapId]);

  const openRoadmap = useCallback((id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('roadmap', id);
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const backToList = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('roadmap');
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const [deletedDrawerOpen, setDeletedDrawerOpen] = useState(false);
  const [deletedRoadmaps, setDeletedRoadmaps] = useState<SavedRoadmap[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  const refreshDeleted = useCallback(async () => {
    if (!user) return;
    setDeletedLoading(true);
    try {
      const rs = await listDeletedRoadmaps(user.id);
      setDeletedRoadmaps(rs);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load recently deleted');
    } finally {
      setDeletedLoading(false);
    }
  }, [user]);

  const handleDelete = useCallback(async (r: SavedRoadmap) => {
    // Optimistic remove + undo toast
    setRoadmaps((p) => p.filter((x) => x.id !== r.id));
    try {
      await softDeleteRoadmap(r.id);
      toast('Roadmap deleted', {
        description: 'Recoverable for 7 days from "Recently deleted".',
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              const restored = await restoreRoadmap(r.id);
              setRoadmaps((p) => [restored, ...p.filter((x) => x.id !== restored.id)]);
              toast.success('Roadmap restored');
            } catch (e: any) {
              toast.error(e?.message || 'Restore failed');
            }
          },
        },
      });
    } catch (e: any) {
      // Roll back
      setRoadmaps((p) => [r, ...p.filter((x) => x.id !== r.id)]);
      toast.error(e?.message || 'Delete failed');
    }
  }, []);

  const handleRename = useCallback(async (id: string, label: string) => {
    try {
      const updated = await renameRoadmap(id, label);
      setRoadmaps((p) => p.map((x) => (x.id === id ? updated : x)));
      toast.success('Roadmap renamed');
    } catch (e: any) {
      toast.error(e?.message || 'Rename failed');
      throw e;
    }
  }, []);

  const handleRestore = useCallback(async (id: string) => {
    try {
      const restored = await restoreRoadmap(id);
      setRoadmaps((p) => [restored, ...p.filter((x) => x.id !== restored.id)]);
      setDeletedRoadmaps((p) => p.filter((x) => x.id !== id));
      toast.success('Roadmap restored');
    } catch (e: any) {
      toast.error(e?.message || 'Restore failed');
    }
  }, []);

  const renewalRows = useMemo(() => {
    if (!items.length || !roadmaps.length) return [];
    const byId = new Map(roadmaps.map((r) => [r.id, r] as const));
    return items
      .filter((it) => !it.archived)
      .filter((it) => {
        if (!it.expires_on) return false;
        const t = new Date(it.expires_on).getTime();
        if (isNaN(t)) return false;
        const days = Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
        return days <= 60;
      })
      .map((it) => ({ item: it, roadmap: byId.get(it.roadmap_id)! }))
      .filter((r) => !!r.roadmap)
      .sort((a, b) => (a.item.expires_on || '').localeCompare(b.item.expires_on || ''));
  }, [items, roadmaps]);


  if (!user) return null;

  // ---------- Detail view ----------
  if (roadmapId) {
    if (detailLoading || !detail) {
      return (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return <PermitsDetail roadmap={detail} onBack={backToList} />;
  }

  // ---------- List view ----------
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold mb-1">
            Permits &amp; Licenses
          </div>
          <h2 className="text-2xl font-bold text-white leading-tight">Your saved roadmaps</h2>
          <p className="text-sm text-white/60 mt-1">
            Track progress, store permit numbers, and keep documents in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 text-xs border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
            onClick={() => { void refreshDeleted(); setDeletedDrawerOpen(true); }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Recently deleted
          </Button>
          <Button asChild size="sm" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9 font-semibold">
            <Link to="/tools/permitpath">
              <Plus className="h-4 w-4 mr-1.5" /> Start a new permit search
            </Link>
          </Button>
        </div>
      </div>

      {renewalRows.length > 0 && (
        <RenewalsStrip rows={renewalRows} onOpen={openRoadmap} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : roadmaps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.05] via-[#141418] to-[#101013] p-10 text-center shadow-[0_8px_28px_-14px_rgba(0,0,0,0.7)]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="mx-auto h-12 w-12 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center mb-4">
            <FileCheck className="h-5 w-5 text-white/80" />
          </div>
          <h3 className="text-white font-semibold text-lg">No saved roadmaps yet</h3>
          <p className="text-white/60 text-sm mt-1 max-w-md mx-auto">
            Use PermitPath to generate a roadmap, then save it here to track progress, store permit numbers, and upload documents.
          </p>
          <Button asChild size="sm" className="mt-5 bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9 font-semibold">
            <Link to="/tools/permitpath">
              <Plus className="h-4 w-4 mr-1.5" /> Open PermitPath
            </Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {roadmaps.map((r) => (
            <PermitRoadmapCard
              key={r.id}
              roadmap={r}
              items={items.filter((it) => it.roadmap_id === r.id)}
              totalRequirements={totalRequirements(r)}
              requiredCount={requiredCount(r)}
              onOpen={() => openRoadmap(r.id)}
              onDelete={() => handleDelete(r)}
              onRename={(label) => handleRename(r.id, label)}
            />
          ))}
        </div>
      )}

      <RecentlyDeletedDialog
        open={deletedDrawerOpen}
        onClose={() => setDeletedDrawerOpen(false)}
        rows={deletedRoadmaps}
        loading={deletedLoading}
        onRestore={handleRestore}
      />
    </div>
  );
}

function RecentlyDeletedDialog({
  open,
  onClose,
  rows,
  loading,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  rows: SavedRoadmap[];
  loading: boolean;
  onRestore: (id: string) => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg bg-[#0f0f12] border-white/12 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Recently deleted</DialogTitle>
          <DialogDescription className="text-white/55">
            Roadmaps deleted in the last 7 days. After 7 days they're permanently removed.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-white/60" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-white/55 py-8 text-center">
            Nothing here. Anything you delete will appear here for 7 days.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto -mx-2 px-2">
            {rows.map((r) => {
              const deletedAt = r.deleted_at ? new Date(r.deleted_at) : null;
              const daysLeft = deletedAt
                ? Math.max(0, 7 - Math.floor((Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)))
                : 0;
              const label = r.label || (r.city ? `${r.city}, ${r.state_code}` : r.state_code);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{label}</div>
                    <div className="text-[11px] text-white/45">
                      Deleted {deletedAt?.toLocaleDateString()} · {daysLeft}d left
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/20 bg-white/[0.05] hover:bg-white/[0.10] text-white"
                    onClick={() => void onRestore(r.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Detail view component ----------
function PermitsDetail({ roadmap, onBack }: { roadmap: SavedRoadmap; onBack: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, PermitItem>>({});
  const [archived, setArchived] = useState<PermitItem[]>([]);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const its = await listItemsForUser(user.id);
      const map: Record<string, PermitItem> = {};
      const arch: PermitItem[] = [];
      for (const it of its) {
        if (it.roadmap_id !== roadmap.id) continue;
        if (it.archived) arch.push(it);
        else map[it.item_key] = it;
      }
      setItems(map);
      setArchived(arch);
    } catch { /* ignore */ }
  }, [user, roadmap.id]);

  useEffect(() => { void reload(); }, [reload]);

  // Cross-device sync: when the tab regains focus, re-pull items so edits made
  // on a phone (or laptop) show up here. Per-field merge on the server keeps
  // any in-flight local edits safe.
  useEffect(() => {
    const onFocus = () => { void reload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [reload]);

  if (!user) return null;

  const refreshHref = (() => {
    const params = new URLSearchParams();
    params.set('state', roadmap.state_code);
    if (roadmap.city) params.set('city', roadmap.city);
    if (roadmap.business_type) params.set('businessType', roadmap.business_type);
    params.set('refreshRoadmap', roadmap.id);
    return `/tools/permitpath?${params.toString()}`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-white/70 hover:text-white inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/[0.06]"
        >
          <ArrowLeft className="h-4 w-4" /> All roadmaps
        </button>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 text-xs border-white/20 bg-white/[0.04] hover:bg-white/[0.08] text-white/85"
            title="Re-runs PermitPath and updates requirements while keeping your status, permit numbers and uploads"
          >
            <Link to={refreshHref}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh requirements
            </Link>
          </Button>
          <div className="text-[11px] text-white/45">
            {roadmap.refreshed_at
              ? `Refreshed ${new Date(roadmap.refreshed_at).toLocaleDateString()}`
              : `Updated ${new Date(roadmap.updated_at).toLocaleDateString()}`}
          </div>
        </div>
      </div>

      <ResultsDashboard
        result={roadmap.result_payload}
        renderItemExtra={(node) => {
          const itemKey = node.id;
          const initial = items[itemKey] || null;
          return (
            <PermitItemManager
              key={itemKey + (initial?.id || 'new')}
              userId={user.id}
              roadmapId={roadmap.id}
              itemKey={itemKey}
              defaultIssuer={(node as any).issuer}
              initial={initial}
              onChange={(saved) => setItems((p) => ({ ...p, [itemKey]: saved }))}
            />
          );
        }}
      />

      {archived.length > 0 && (
        <div className="rounded-2xl border border-white/12 bg-white/[0.025] p-5">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="h-4 w-4 text-white/55" />
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-semibold">
              No longer required
            </div>
          </div>
          <p className="text-xs text-white/55 mb-4 leading-relaxed">
            These requirements dropped off the latest refresh. We kept your
            progress, permit numbers, and any uploaded documents in case they
            come back.
          </p>
          <ul className="space-y-2">
            {archived.map((it) => {
              const [cat, ...rest] = it.item_key.split('::');
              const title = rest.join('::') || it.item_key;
              return (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white/85 truncate">{title}</div>
                    <div className="text-[11px] text-white/45 truncate">
                      {cat}
                      {it.permit_number ? ` · #${it.permit_number}` : ''}
                      {it.expires_on ? ` · expires ${it.expires_on}` : ''}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] font-semibold text-white/55 px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04]">
                    Archived
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>

  );
}
