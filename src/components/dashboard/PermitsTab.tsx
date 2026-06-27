import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileCheck, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  listRoadmaps, getRoadmap, deleteRoadmap, listItemsForUser, upsertItem,
  type SavedRoadmap, type PermitItem,
} from '@/lib/permitsApi';
import ResultsDashboard from '@/components/tools/permit-path/ResultsDashboard';
import PermitItemManager from './permits/PermitItemManager';
import RenewalsStrip from './permits/RenewalsStrip';
import PermitRoadmapCard from './permits/PermitRoadmapCard';

function totalRequirements(r: SavedRoadmap) {
  return (r.result_payload?.categories || []).reduce((s, c) => s + (c.items?.length || 0), 0);
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

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this saved roadmap and all uploaded documents?')) return;
    try {
      await deleteRoadmap(id);
      setRoadmaps((p) => p.filter((r) => r.id !== id));
      toast.success('Roadmap deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  }, []);

  const renewalRows = useMemo(() => {
    if (!items.length || !roadmaps.length) return [];
    const byId = new Map(roadmaps.map((r) => [r.id, r] as const));
    return items
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
        <Button asChild size="sm" className="bg-[#FF5124] hover:bg-[#FF5124]/90 text-white h-9 font-semibold">
          <Link to="/tools/permitpath">
            <Plus className="h-4 w-4 mr-1.5" /> Start a new permit search
          </Link>
        </Button>
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
              onOpen={() => openRoadmap(r.id)}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Detail view component ----------
function PermitsDetail({ roadmap, onBack }: { roadmap: SavedRoadmap; onBack: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Record<string, PermitItem>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const its = await listItemsForUser(user.id);
        if (cancelled) return;
        const map: Record<string, PermitItem> = {};
        for (const it of its) {
          if (it.roadmap_id === roadmap.id) map[it.item_key] = it;
        }
        setItems(map);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user, roadmap.id]);

  if (!user) return null;

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
        <div className="text-[11px] text-white/45">
          Last updated {new Date(roadmap.updated_at).toLocaleDateString()}
        </div>
      </div>

      <ResultsDashboard
        result={roadmap.result_payload}
        renderItemExtra={(node) => {
          const itemKey = node.id;
          // The existing roadmap node has an `issuer` we can prefill into the manager.
          // We re-render with `initial` once the item loads (if it exists).
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
    </div>
  );
}
