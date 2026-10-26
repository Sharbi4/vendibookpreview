import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MessageSquareText, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import SEO from "@/components/SEO";
import { invokeEdge } from "@/lib/edge/invokeFunction";
import { cn } from "@/lib/utils";

type Thread = { phone: string; last_text: string; last_at: string; count: number; last_reply_at: string | null; needs_reply: boolean };
type Message = { from: "customer" | "vendibook"; text: string; at: string; status?: string };
type ThreadDetail = { phone: string; ticket: { id: string; reference_code: string; status: string } | null; messages: Message[] };

const pretty = (e164: string) => {
  const d = e164.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
};
const when = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Admin → Texts: read and answer texts sent to the support line, (866) 690-6227. */
const AdminTexts = () => {
  const [params, setParams] = useSearchParams();
  const selected = params.get("phone");
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const loadThreads = useCallback(async () => {
    const { data, error: e } = await invokeEdge<{ threads: Thread[] }>("admin-phone-actions", { body: { action: "texts_inbox" } });
    if (e) setError(e); else setThreads(data?.threads ?? []);
  }, []);
  const loadThread = useCallback(async (phone: string) => {
    const { data, error: e } = await invokeEdge<ThreadDetail>("admin-phone-actions", { body: { action: "text_thread", phone } });
    if (e) setError(e); else setDetail(data);
  }, []);

  useEffect(() => { void loadThreads(); const t = window.setInterval(loadThreads, 30000); return () => window.clearInterval(t); }, [loadThreads]);
  useEffect(() => { setDetail(null); setNotice(""); if (selected) void loadThread(selected); }, [selected, loadThread]);

  const waiting = useMemo(() => threads?.filter((t) => t.needs_reply).length ?? 0, [threads]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || draft.trim().length < 2) return;
    setSending(true); setNotice("");
    const { data, error: err } = await invokeEdge<{ message: string }>("admin-phone-actions", {
      body: { action: "text", to_phone: selected, ticket_id: detail?.ticket?.id, message: draft.trim(), idempotency_key: crypto.randomUUID() },
    }, { retries: 0 });
    setSending(false);
    if (err) { setNotice(err); return; }
    setDraft(""); setNotice(data?.message ?? "Sent.");
    await Promise.all([loadThread(selected), loadThreads()]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SEO title="Texts | Vendibook Admin" description="Admin-only support text inbox." noindex />
      <AdminSectionNav />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Texts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Texts people send to (866) 690-6227. Reply here and it goes out from the same number. {waiting > 0 && <strong className="text-foreground">{waiting} waiting for a reply.</strong>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void loadThreads(); if (selected) void loadThread(selected); }}>
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Refresh
        </Button>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-[320px_1fr]">
        <nav aria-label="Conversations" className="rounded-xl border border-border bg-card overflow-hidden">
          {threads === null ? (
            <p className="p-4 text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" aria-hidden />Loading…</p>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No texts yet. Once Twilio sends the support line's texts here, they show up in this list.</p>
          ) : threads.map((t) => (
            <button key={t.phone} type="button" onClick={() => setParams({ phone: t.phone })}
              className={cn("w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors", selected === t.phone && "bg-primary/5")}
              aria-current={selected === t.phone}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{pretty(t.phone)}</span>
                <span className="text-xs text-muted-foreground">{when(t.last_at)}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{t.last_text}</p>
              {t.needs_reply && <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Needs reply</span>}
            </button>
          ))}
        </nav>

        <section className="rounded-xl border border-border bg-card flex flex-col min-h-[420px]" aria-label="Conversation">
          {!selected ? (
            <div className="m-auto text-center text-sm text-muted-foreground p-6">
              <MessageSquareText className="mx-auto mb-2 h-6 w-6" aria-hidden /> Pick a conversation.
            </div>
          ) : (
            <>
              <header className="border-b border-border px-5 py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{pretty(selected)}</p>
                  {detail?.ticket && <p className="text-xs text-muted-foreground">Ticket {detail.ticket.reference_code} · {detail.ticket.status.replace(/_/g, " ")}</p>}
                </div>
                <a className="text-sm text-primary hover:underline" href={`tel:${selected}`}>Call</a>
              </header>
              <ol className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[60vh]">
                {!detail ? <li className="text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" aria-hidden />Loading…</li>
                  : detail.messages.map((m, i) => (
                    <li key={i} className={cn("max-w-[80%] rounded-2xl px-4 py-2 text-sm", m.from === "customer" ? "bg-muted text-foreground" : "ml-auto bg-primary text-primary-foreground")}>
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={cn("mt-1 text-[11px]", m.from === "customer" ? "text-muted-foreground" : "text-primary-foreground/80")}>
                        {when(m.at)}{m.status && m.status !== "sent" ? ` · ${m.status}` : ""}
                      </p>
                    </li>
                  ))}
              </ol>
              <form onSubmit={send} className="border-t border-border p-4 space-y-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} rows={3} placeholder="Write a reply…" aria-label="Reply" />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Sent from (866) 690-6227 with “Vendibook:” and “Reply STOP to opt out.”</p>
                  <Button type="submit" disabled={sending || draft.trim().length < 2}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : <Send className="h-4 w-4 mr-2" aria-hidden />} Send
                  </Button>
                </div>
                {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminTexts;
