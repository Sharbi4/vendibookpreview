/**
 * Admin Support Tickets console.
 * List, filter, view details, reply, add internal notes, change status/priority.
 * Access-gated by is_admin (via has_role) — non-admins hit the RLS wall and see nothing.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldAlert, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type TicketRow = {
  id: string;
  reference_code: string;
  user_id: string | null;
  feature_area: string;
  category: string;
  priority: "urgent" | "high" | "normal" | "low";
  status: "new" | "reviewing" | "waiting_for_user" | "in_progress" | "resolved" | "closed";
  title: string;
  description: string;
  is_blocking: boolean;
  reply_email: string | null;
  page_url: string | null;
  wizard_step: string | null;
  transaction_status: string | null;
  payment_method: string | null;
  browser_info: string | null;
  device_type: string | null;
  related_listing_id: string | null;
  related_sale_transaction_id: string | null;
  related_booking_id: string | null;
  related_permit_roadmap_id: string | null;
  related_conversation_id: string | null;
  related_review_id: string | null;
  related_reported_user_id: string | null;
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_role: "user" | "admin" | "system";
  is_internal_note: boolean;
  body: string;
  created_at: string;
};

const PRIORITY_STYLE: Record<TicketRow["priority"], string> = {
  urgent: "bg-red-500/15 text-red-600 border-red-500/30",
  high: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  normal: "bg-muted text-muted-foreground border-border",
  low: "bg-muted/50 text-muted-foreground border-border",
};

const STATUS_STYLE: Record<TicketRow["status"], string> = {
  new: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  reviewing: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  waiting_for_user: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  in_progress: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  resolved: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export default function AdminSupportTickets() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("ticket"));
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  // 1. Admin check.
  useEffect(() => {
    if (!user) { setCheckingAdmin(false); return; }
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      setCheckingAdmin(false);
    })();
  }, [user]);

  // 2. Load tickets.
  const load = async () => {
    setLoading(true);
    let q = supabase.from("support_tickets" as never).select("*").order("created_at", { ascending: false }).limit(200);
    if (statusFilter === "open") q = q.in("status", ["new", "reviewing", "waiting_for_user", "in_progress"]);
    else if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (priorityFilter !== "all") q = q.eq("priority", priorityFilter);
    if (areaFilter !== "all") q = q.eq("feature_area", areaFilter);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load tickets", description: error.message, variant: "destructive" });
    setTickets((data as unknown as TicketRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin, statusFilter, priorityFilter, areaFilter]);

  // 3. Load messages for selected ticket.
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("support_ticket_messages" as never)
        .select("*")
        .eq("ticket_id", selectedId)
        .order("created_at", { ascending: true });
      setMessages((data as unknown as MessageRow[]) || []);
    })();
  }, [selectedId]);

  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) || null, [tickets, selectedId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const s = search.trim().toLowerCase();
    return tickets.filter((t) =>
      t.title.toLowerCase().includes(s) ||
      t.reference_code.toLowerCase().includes(s) ||
      t.category.toLowerCase().includes(s) ||
      (t.reply_email || "").toLowerCase().includes(s)
    );
  }, [tickets, search]);

  const updateTicket = async (patch: Partial<TicketRow>) => {
    if (!selected) return;
    const { data, error } = await supabase
      .from("support_tickets" as never)
      .update(patch as never)
      .eq("id", selected.id)
      .select("*")
      .single();
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setTickets((prev) => prev.map((t) => (t.id === selected.id ? (data as unknown as TicketRow) : t)));
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("support_ticket_messages" as never).insert({
      ticket_id: selected.id,
      author_id: user.id,
      author_role: "admin",
      is_internal_note: isInternal,
      body: reply.trim(),
    } as never);
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // If it's a user-visible reply, email them via generic-notice.
    if (!isInternal && selected.reply_email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "generic-notice",
            recipientEmail: selected.reply_email,
            idempotencyKey: `support-reply-${selected.id}-${Date.now()}`,
            templateData: {
              subject: `Update on your report — ${selected.reference_code}`,
              kicker: "Customer Success",
              heading: "New update from Vendibook Customer Success",
              paragraphs: [reply.trim()],
              details: [
                { label: "Reference", value: selected.reference_code, mono: true },
                { label: "Your report", value: selected.title },
              ],
              ctaLabel: "Reply from your dashboard",
              ctaUrl: "https://vendibook.com/dashboard",
            },
          },
        });
      } catch (e) { console.error("reply email failed", e); }
    }

    setReply("");
    setIsInternal(false);
    setSending(false);
    // Refresh messages
    const { data } = await supabase
      .from("support_ticket_messages" as never)
      .select("*")
      .eq("ticket_id", selected.id)
      .order("created_at", { ascending: true });
    setMessages((data as unknown as MessageRow[]) || []);
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="text-muted-foreground mt-2">You don't have permission to view support tickets.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const openCount = tickets.filter((t) => ["new", "reviewing", "in_progress"].includes(t.status)).length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Inbox className="h-6 w-6" /> Support Tickets</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {openCount} open · <span className="text-red-500 font-medium">{urgentCount} urgent</span>
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <Input placeholder="Search title, reference, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open (default)</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="waiting_for_user">Waiting for user</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger><SelectValue placeholder="Feature area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                <SelectItem value="listing_wizard">Listing wizard</SelectItem>
                <SelectItem value="permit_path">Permit Path</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="listing_page">Listing page</SelectItem>
                <SelectItem value="fraud">Fraud</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* List */}
          <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No tickets match these filters.</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setParams({ ticket: t.id }); }}
                  className={`w-full text-left p-3 rounded-lg border transition ${selectedId === t.id ? "bg-primary/10 border-primary" : "bg-card hover:bg-muted/40"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{t.reference_code}</span>
                    <Badge variant="outline" className={PRIORITY_STYLE[t.priority]}>{t.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{t.feature_area.replace(/_/g, " ")}</span>
                    <Badge variant="outline" className={STATUS_STYLE[t.status]}>{t.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</p>
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div>
            {!selected ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">Select a ticket to view details.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="text-lg">{selected.title}</CardTitle>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        {selected.reference_code} · {selected.reply_email || "no reply email"}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select value={selected.priority} onValueChange={(v) => updateTicket({ priority: v as TicketRow["priority"] })}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selected.status} onValueChange={(v) => {
                        const patch: Partial<TicketRow> = { status: v as TicketRow["status"] };
                        if (v === "resolved") (patch as { resolved_at?: string }).resolved_at = new Date().toISOString();
                        if (v === "closed") (patch as { closed_at?: string }).closed_at = new Date().toISOString();
                        updateTicket(patch);
                      }}>
                        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="waiting_for_user">Waiting for user</SelectItem>
                          <SelectItem value="in_progress">In progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm whitespace-pre-wrap">{selected.description}</p>

                  <div className="grid gap-2 md:grid-cols-2 text-xs">
                    <div><span className="text-muted-foreground">Category:</span> {selected.category.replace(/_/g, " ")}</div>
                    <div><span className="text-muted-foreground">Feature:</span> {selected.feature_area}</div>
                    <div><span className="text-muted-foreground">Blocking?</span> {selected.is_blocking ? "Yes" : "No"}</div>
                    <div><span className="text-muted-foreground">Device:</span> {selected.device_type || "—"}</div>
                    <div className="md:col-span-2 truncate"><span className="text-muted-foreground">Page:</span> {selected.page_url || "—"}</div>
                    {selected.wizard_step && <div><span className="text-muted-foreground">Wizard step:</span> {selected.wizard_step}</div>}
                    {selected.transaction_status && <div><span className="text-muted-foreground">Tx status:</span> {selected.transaction_status}</div>}
                    {selected.payment_method && <div><span className="text-muted-foreground">Payment:</span> {selected.payment_method}</div>}
                  </div>

                  {/* Related record shortcuts */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selected.related_listing_id && <Link className="text-primary underline" to={`/listing/${selected.related_listing_id}`}>Listing →</Link>}
                    {selected.related_sale_transaction_id && <Link className="text-primary underline" to={`/order-tracking/${selected.related_sale_transaction_id}`}>Order →</Link>}
                    {selected.related_permit_roadmap_id && <span className="text-muted-foreground">Permit roadmap: {selected.related_permit_roadmap_id}</span>}
                  </div>

                  {/* Thread */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Conversation</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {messages.length === 0 && <p className="text-xs text-muted-foreground">No replies yet.</p>}
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-2 rounded text-xs ${
                            m.is_internal_note
                              ? "bg-amber-500/10 border border-amber-500/30"
                              : m.author_role === "admin"
                              ? "bg-primary/10"
                              : "bg-muted"
                          }`}
                        >
                          <div className="flex justify-between mb-1 text-[10px] text-muted-foreground">
                            <span>{m.is_internal_note ? "🔒 Internal note" : m.author_role}</span>
                            <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reply */}
                  <div className="border-t pt-3 space-y-2">
                    <Textarea placeholder="Reply to the user, or add an internal note…" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(!!v)} />
                        Internal note (not sent to user)
                      </label>
                      <Button size="sm" disabled={sending || !reply.trim()} onClick={sendReply}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : isInternal ? "Save note" : "Send reply"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
