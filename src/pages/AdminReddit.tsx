import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Check, ExternalLink, MessageSquareReply, RefreshCw, Trash2, Users, CalendarClock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type Item = {
  kind: "post" | "comment"; fullname: string; author: string; title: string | null; body: string;
  url: string | null; score: number; num_comments: number | null; created_utc: number; reports: number; removed: boolean;
};
type Status = { ready: boolean; missing: string[]; username: string | null };
type Stats = { subscribers: number | null; active_users: number | null; top_week: Item[] };
type Scheduled = { id: string; title: string; kind: string; scheduled_for: string; status: string; reddit_url: string | null; error: string | null };

async function api<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("reddit-admin", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error ?? msg; } catch { /* keep generic */ }
    }
    throw new Error(msg);
  }
  return data as T;
}

const ago = (s: number) => {
  const m = Math.round((Date.now() / 1000 - s) / 60);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function ItemCard({ item, onDone, moderate }: { item: Item; onDone: () => void; moderate?: boolean }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (body: object, ok: string) => {
    setBusy(true);
    try { await api(body); toast.success(ok); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{item.kind === "comment" ? "Comment" : "Post"} by u/{item.author} · {ago(item.created_utc)} · {item.score} points
          {item.reports > 0 && <span className="ml-2 text-destructive">{item.reports} report{item.reports > 1 ? "s" : ""}</span>}
        </span>
        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">Open <ExternalLink className="h-3 w-3" /></a>}
      </div>
      {item.title && <p className="font-medium text-foreground">{item.title}</p>}
      {item.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{item.body}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => setReplying((v) => !v)}><MessageSquareReply className="h-4 w-4 mr-1" />Reply</Button>
        {moderate && <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "moderate", fullname: item.fullname, decision: "approve" }, "Approved")}><Check className="h-4 w-4 mr-1" />Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => window.confirm("Remove this from the subreddit?") && run({ action: "moderate", fullname: item.fullname, decision: "remove" }, "Removed")}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
        </>}
      </div>
      {replying && (
        <div className="space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply (posts as the moderator account)" className="text-base" />
          <Button size="sm" disabled={busy || !text.trim()} onClick={() => run({ action: "reply", fullname: item.fullname, text }, "Reply posted").then(() => { setText(""); setReplying(false); })}>Post reply</Button>
        </div>
      )}
    </div>
  );
}

const AdminReddit = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [denied, setDenied] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<{ posts: Item[]; comments: Item[] } | null>(null);
  const [queue, setQueue] = useState<Item[] | null>(null);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState({ kind: "self" as "self" | "link", title: "", body: "", url: "", when: "" });
  const [posting, setPosting] = useState(false);

  const loadScheduled = useCallback(async () => {
    const { data } = await supabase.from("reddit_scheduled_posts")
      .select("id,title,kind,scheduled_for,status,reddit_url,error").order("scheduled_for", { ascending: false }).limit(50);
    setScheduled((data as Scheduled[]) ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const s = await api<Status>({ action: "status" });
      setStatus(s);
      await loadScheduled();
      if (!s.ready) return;
      const [st, f, q] = await Promise.all([
        api<Stats>({ action: "stats" }), api<{ posts: Item[]; comments: Item[] }>({ action: "feed" }), api<{ items: Item[] }>({ action: "modqueue" }),
      ]);
      setStats(st); setFeed(f); setQueue(q.items);
    } catch (e) {
      const m = (e as Error).message;
      if (/administrator/i.test(m)) setDenied(true); else setError(m || "Couldn't load Reddit.");
    } finally { setLoading(false); }
  }, [loadScheduled]);
  useEffect(() => { load(); }, [load]);

  const send = async (schedule: boolean) => {
    setPosting(true);
    try {
      const base = { kind: post.kind, title: post.title, body: post.body, url: post.url };
      if (schedule) {
        if (!post.when) throw new Error("Pick a date and time.");
        await api({ action: "schedule", ...base, scheduled_for: new Date(post.when).toISOString() });
        toast.success("Post scheduled");
      } else {
        if (!window.confirm("Post this to r/mobilefoodbiz now?")) return;
        await api({ action: "submit", ...base });
        toast.success("Posted to r/mobilefoodbiz");
      }
      setPost({ kind: post.kind, title: "", body: "", url: "", when: "" });
      load();
    } catch (e) { toast.error((e as Error).message); } finally { setPosting(false); }
  };

  if (denied) return <div className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Administrator access required.</p></div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SEO title="Subreddit · Admin" description="Manage r/mobilefoodbiz" noindex />
      <AdminSectionNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">r/mobilefoodbiz</h1>
          <p className="text-sm text-muted-foreground">{status?.username ? `Acting as u/${status.username}` : "Manage the subreddit"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      {status && !status.ready && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Reddit isn't connected yet. Missing: {status.missing.join(", ")}.
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Members</p><p className="text-2xl font-semibold text-foreground">{stats.subscribers?.toLocaleString() ?? "—"}</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Online now</p><p className="text-2xl font-semibold text-foreground">{stats.active_users?.toLocaleString() ?? "—"}</p></div>
        </div>
      )}

      <Tabs defaultValue="post">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="post">Post</TabsTrigger>
          <TabsTrigger value="queue">Mod queue{queue?.length ? ` (${queue.length})` : ""}</TabsTrigger>
          <TabsTrigger value="feed">New activity</TabsTrigger>
          <TabsTrigger value="stats">Top this week</TabsTrigger>
        </TabsList>

        <TabsContent value="post" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex gap-2">
              <Button size="sm" variant={post.kind === "self" ? "default" : "outline"} onClick={() => setPost({ ...post, kind: "self" })}>Text</Button>
              <Button size="sm" variant={post.kind === "link" ? "default" : "outline"} onClick={() => setPost({ ...post, kind: "link" })}>Link</Button>
            </div>
            <div><Label>Title</Label><Input className="text-base" maxLength={300} value={post.title} onChange={(e) => setPost({ ...post, title: e.target.value })} /></div>
            {post.kind === "self"
              ? <div><Label>Body</Label><Textarea className="text-base min-h-32" value={post.body} onChange={(e) => setPost({ ...post, body: e.target.value })} /></div>
              : <div><Label>Link</Label><Input className="text-base" placeholder="https://vendibook.com/..." value={post.url} onChange={(e) => setPost({ ...post, url: e.target.value })} /></div>}
            <div><Label>Schedule for (optional)</Label><Input className="text-base" type="datetime-local" value={post.when} onChange={(e) => setPost({ ...post, when: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button disabled={posting || !status?.ready || !post.title.trim()} onClick={() => send(false)}><Send className="h-4 w-4 mr-1" />Post now</Button>
              <Button variant="outline" disabled={posting || !status?.ready || !post.title.trim() || !post.when} onClick={() => send(true)}><CalendarClock className="h-4 w-4 mr-1" />Schedule</Button>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="font-medium text-foreground">Scheduled posts</h2>
            {scheduled.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled.</p>}
            {scheduled.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                <div>
                  <p className="text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.scheduled_for).toLocaleString()} · {s.status}{s.error ? ` — ${s.error}` : ""}</p>
                </div>
                {s.status === "scheduled" && <Button size="sm" variant="ghost" onClick={async () => { try { await api({ action: "cancel", id: s.id }); loadScheduled(); } catch (e) { toast.error((e as Error).message); } }}>Cancel</Button>}
                {s.reddit_url && <a className="text-xs text-primary" href={s.reddit_url} target="_blank" rel="noreferrer">View</a>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queue" className="space-y-3">
          {queue?.length === 0 && <p className="text-sm text-muted-foreground">The mod queue is empty.</p>}
          {queue?.map((i) => <ItemCard key={i.fullname} item={i} onDone={load} moderate />)}
        </TabsContent>

        <TabsContent value="feed" className="space-y-3">
          <h2 className="font-medium text-foreground">New posts</h2>
          {feed?.posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
          {feed?.posts.map((i) => <ItemCard key={i.fullname} item={i} onDone={load} moderate />)}
          <h2 className="font-medium text-foreground pt-4">New comments</h2>
          {feed?.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          {feed?.comments.map((i) => <ItemCard key={i.fullname} item={i} onDone={load} moderate />)}
        </TabsContent>

        <TabsContent value="stats" className="space-y-3">
          {stats?.top_week.length === 0 && <p className="text-sm text-muted-foreground">No posts this week.</p>}
          {stats?.top_week.map((i) => <ItemCard key={i.fullname} item={i} onDone={load} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminReddit;
