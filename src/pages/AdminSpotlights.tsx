import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

const STATUSES = ["submitted", "reviewing", "selected", "not_selected", "published"] as const;
type Status = (typeof STATUSES)[number];

type Submission = Record<string, any>;

export default function AdminSpotlights() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const focusId = params.get("id");

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Submission[]>([]);
  const [media, setMedia] = useState<Record<string, { path: string; kind: string; url?: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [openId, setOpenId] = useState<string | null>(focusId);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("spotlight_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Failed to load submissions", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    setRows(data ?? []);

    const ids = (data ?? []).map((r: any) => r.id);
    if (ids.length) {
      const { data: mediaRows } = await supabase
        .from("spotlight_submission_media")
        .select("submission_id, storage_path, kind, sort_order")
        .in("submission_id", ids)
        .order("sort_order", { ascending: true });

      const grouped: Record<string, { path: string; kind: string; url?: string }[]> = {};
      for (const m of mediaRows ?? []) {
        (grouped[m.submission_id] ||= []).push({ path: m.storage_path, kind: m.kind });
      }
      const allPaths = (mediaRows ?? []).map((m: any) => m.storage_path);
      if (allPaths.length) {
        const { data: signed } = await supabase.storage
          .from("spotlight-media")
          .createSignedUrls(allPaths, 3600);
        const map = new Map((signed ?? []).map((s: any) => [s.path, s.signedUrl]));
        for (const list of Object.values(grouped)) {
          for (const item of list) item.url = map.get(item.path) ?? undefined;
        }
      }
      setMedia(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase
      .from("spotlight_submissions")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    toast({ title: `Marked ${status.replace("_", " ")}` });
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const Detail = ({ label, value }: { label: string; value: any }) =>
    value ? (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap break-words">{String(value)}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-6xl py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Business Spotlight submissions</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} total · review, then mark selected or not selected.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
              <span className="ml-1.5 opacity-70">
                {s === "all" ? rows.length : rows.filter((r) => r.status === s).length}
              </span>
            </button>
          ))}
        </div>

        {visible.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No submissions yet.
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {visible.map((r) => {
            const open = openId === r.id;
            const imgs = media[r.id] ?? [];
            return (
              <Card key={r.id} className={open ? "ring-1 ring-primary/30" : undefined}>
                <CardHeader className="cursor-pointer" onClick={() => setOpenId(open ? null : r.id)}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{r.business_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {r.business_type} · {r.city}, {r.state} · {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {imgs.length > 0 && <Badge variant="secondary">{imgs.length} media</Badge>}
                      <Badge>{String(r.status).replace("_", " ")}</Badge>
                    </div>
                  </div>
                </CardHeader>

                {open && (
                  <CardContent className="space-y-6">
                    {imgs.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {imgs.map((m) => (
                          <a
                            key={m.path}
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
                          >
                            {m.url ? (
                              <img src={m.url} alt={m.kind} className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full place-items-center text-xs text-muted-foreground">
                                No preview
                              </span>
                            )}
                            <span className="absolute left-1.5 bottom-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px]">
                              {m.kind}
                            </span>
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Detail label="Contact" value={`${r.contact_name} · ${r.email}${r.phone ? ` · ${r.phone}` : ""}`} />
                      <Detail label="Years operating" value={r.years_operating} />
                      <Detail label="Website" value={r.website} />
                      <Detail label="Listing" value={r.listing_url} />
                      <Detail label="Instagram" value={r.instagram} />
                      <Detail label="Facebook" value={r.facebook} />
                      <Detail label="TikTok" value={r.tiktok} />
                      <Detail label="YouTube" value={r.youtube} />
                      <Detail label="LinkedIn" value={r.linkedin} />
                      <Detail label="Other" value={r.other_social} />
                    </div>

                    <div className="space-y-4">
                      <Detail label="Offerings" value={r.offerings} />
                      <Detail label="Story" value={r.story} />
                      <Detail label="Differentiator" value={r.differentiator} />
                      <Detail label="Proud of" value={r.proud_of} />
                      <Detail label="What's new" value={r.whats_new} />
                    </div>

                    {(r.product_feedback_experience || r.product_feedback_wishlist) && (
                      <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Private product feedback — never publish
                        </p>
                        <Detail label="Experience" value={r.product_feedback_experience} />
                        <Detail label="Wishlist" value={r.product_feedback_wishlist} />
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      {STATUSES.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={r.status === s ? "default" : "outline"}
                          onClick={() => setStatus(r.id, s)}
                        >
                          {s.replace("_", " ")}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`mailto:${r.email}`}>
                          Email submitter <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
