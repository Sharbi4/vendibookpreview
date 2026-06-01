import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCw, Search, ExternalLink, CheckCircle2, Circle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ErrorEvent {
  id: string;
  reference_code: string;
  fingerprint: string;
  occurred_at: string;
  priority: "high" | "normal" | "low";
  source: string;
  action: string | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  page_url: string | null;
  user_id: string | null;
  user_email: string | null;
  listing_id: string | null;
  boost_id: string | null;
  payment_id: string | null;
  error_type: string | null;
  error_message: string | null;
  stack: string | null;
  user_agent: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  internal_notes: string | null;
  alert_sent_at: string | null;
  alert_count: number;
}

type PriorityFilter = "all" | "high" | "normal";
type StatusFilter = "all" | "unresolved" | "resolved";

const AdminErrors = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("unresolved");
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingAdmin(false); return; }
      const { data } = await supabase.rpc("is_admin", { user_id: user.id });
      setIsAdmin(!!data);
      setCheckingAdmin(false);
    };
    check();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!checkingAdmin && !isAdmin && user) navigate("/", { replace: true });
  }, [checkingAdmin, isAdmin, user, navigate]);


  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("error_events" as any)
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (priority !== "all") query = query.eq("priority", priority);
    if (status === "unresolved") query = query.eq("resolved", false);
    if (status === "resolved") query = query.eq("resolved", true);
    const { data, error } = await query;
    if (error) {
      toast.error("Failed to load errors", { description: error.message });
    } else {
      setEvents((data as unknown as ErrorEvent[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, priority, status]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const s = search.toLowerCase();
    return events.filter((e) =>
      [e.reference_code, e.user_email, e.error_type, e.error_message, e.action, e.endpoint, e.listing_id]
        .some((v) => (v ?? "").toString().toLowerCase().includes(s))
    );
  }, [events, search]);

  const counts = useMemo(() => {
    const high = events.filter((e) => e.priority === "high" && !e.resolved).length;
    const total = events.length;
    return { high, total };
  }, [events]);

  if (authLoading || checkingAdmin || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12"><Skeleton className="h-64 w-full" /></div>
        <Footer />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
              <AlertTriangle className="h-7 w-7 text-orange-500" />
              Error Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live customer-impacting errors. High-priority alerts route to support@vendibook.com.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Unresolved HIGH" value={counts.high} accent="text-red-500" />
          <StatCard label="Loaded" value={counts.total} />
          <StatCard label="Filter" value={priority === "all" ? "All" : priority.toUpperCase()} />
          <StatCard label="Showing" value={status === "all" ? "All" : status} />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search reference, email, listing id, action, message…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={priority} onValueChange={(v) => setPriority(v as PriorityFilter)}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High only</SelectItem>
                  <SelectItem value="normal">Normal only</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unresolved">Unresolved</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No errors match these filters. 🎉</div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((ev) => <ErrorRow key={ev.id} event={ev} onChanged={load} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent ?? ""}`}>{value}</p>
    </CardContent>
  </Card>
);

const ErrorRow = ({ event, onChanged }: { event: ErrorEvent; onChanged: () => void }) => {
  const [note, setNote] = useState(event.internal_notes ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleResolved = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("error_events" as any)
      .update({
        resolved: !event.resolved,
        resolved_at: !event.resolved ? new Date().toISOString() : null,
      })
      .eq("id", event.id);
    setSaving(false);
    if (error) toast.error("Failed to update", { description: error.message });
    else { toast.success(event.resolved ? "Reopened" : "Marked resolved"); onChanged(); }
  };

  const saveNote = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("error_events" as any)
      .update({ internal_notes: note })
      .eq("id", event.id);
    setSaving(false);
    if (error) toast.error("Failed to save note", { description: error.message });
    else { toast.success("Note saved"); onChanged(); setOpen(false); }
  };

  return (
    <div className="py-3 flex items-start gap-3">
      <button
        onClick={toggleResolved}
        disabled={saving}
        className="mt-1 shrink-0"
        title={event.resolved ? "Mark unresolved" : "Mark resolved"}
      >
        {event.resolved
          ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          : <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{event.reference_code}</code>
          {event.priority === "high" && <Badge variant="destructive" className="text-[10px]">HIGH</Badge>}
          {event.alert_sent_at && <Badge variant="secondary" className="text-[10px]">alerted</Badge>}
          {event.status_code != null && <Badge variant="outline" className="text-[10px]">HTTP {event.status_code}</Badge>}
          <span className="text-xs text-muted-foreground">{new Date(event.occurred_at).toLocaleString()}</span>
        </div>
        <p className="text-sm font-medium mt-1 truncate">
          {event.error_type ?? "error"}: {event.error_message ?? "(no message)"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {event.action ?? "—"} · {event.method ?? ""} {event.endpoint ?? ""}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {event.user_email ?? "(anon)"}
          {event.listing_id && <> · listing <code className="font-mono">{event.listing_id.slice(0, 8)}</code></>}
          {event.payment_id && <> · payment <code className="font-mono">{event.payment_id.slice(0, 12)}</code></>}
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {event.reference_code}
              {event.priority === "high" && <Badge variant="destructive">HIGH</Badge>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <Detail k="When" v={new Date(event.occurred_at).toLocaleString()} />
            <Detail k="Action" v={event.action} />
            <Detail k="Endpoint" v={`${event.method ?? ""} ${event.endpoint ?? ""}`.trim() || null} />
            <Detail k="Status" v={event.status_code} />
            <Detail k="User" v={`${event.user_email ?? "(anon)"} ${event.user_id ?? ""}`.trim()} />
            <Detail k="Listing" v={event.listing_id} />
            <Detail k="Payment / Boost" v={event.payment_id ?? event.boost_id} />
            <Detail k="Page" v={event.page_url} />
            <Detail k="Session" v={event.session_id} />
            <Detail k="User-agent" v={event.user_agent} />
            <Detail k="Alerts sent" v={event.alert_count} />
            {event.error_message && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Error message</p>
                <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap break-words">{event.error_message}</pre>
              </div>
            )}
            {event.stack && (
              <div>
                <p className="text-xs uppercase text-muted-foreground mb-1">Stack</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-64">{event.stack}</pre>
              </div>
            )}
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Internal notes</p>
              <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" className="mt-2" onClick={saveNote} disabled={saving}>Save note</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Detail = ({ k, v }: { k: string; v: string | number | null | undefined }) => (
  <div className="grid grid-cols-[120px_1fr] gap-2">
    <span className="text-xs uppercase text-muted-foreground">{k}</span>
    <span className="text-sm break-all">{v == null || v === "" ? "—" : v}</span>
  </div>
);

export default AdminErrors;
