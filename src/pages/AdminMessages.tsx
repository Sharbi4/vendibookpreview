import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MessagesSquare, Loader2, RefreshCw } from "lucide-react";

type Thread = {
  id: string;
  listing_id: string | null;
  host_id: string;
  shopper_id: string;
  last_message_at: string | null;
  created_at: string;
  listingTitle: string;
  hostName: string;
  shopperName: string;
  preview: string;
  messageCount: number;
};

type Message = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  attachment_name: string | null;
};

const formatWhen = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function AdminMessages() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (cancelled) return;
      if (!data) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data: convos, error } = await supabase
      .from("conversations")
      .select("id, listing_id, host_id, shopper_id, last_message_at, created_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) {
      setLoading(false);
      return;
    }

    const ids = (convos || []).map((c) => c.id);
    const listingIds = [...new Set((convos || []).map((c) => c.listing_id).filter(Boolean))] as string[];
    const userIds = [
      ...new Set((convos || []).flatMap((c) => [c.host_id, c.shopper_id]).filter(Boolean)),
    ] as string[];

    const [{ data: listings }, { data: profiles }, { data: msgs }] = await Promise.all([
      listingIds.length
        ? supabase.from("listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      userIds.length
        ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
      ids.length
        ? supabase
            .from("conversation_messages")
            .select("conversation_id, message, created_at")
            .in("conversation_id", ids)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { conversation_id: string; message: string; created_at: string }[] }),
    ]);

    const listingMap = new Map((listings || []).map((l) => [l.id, l.title]));
    const nameMap = new Map(
      (profiles || []).map((p) => [p.id, p.full_name || p.email || "Unknown user"])
    );
    const previewMap = new Map<string, string>();
    const countMap = new Map<string, number>();
    (msgs || []).forEach((m) => {
      if (!previewMap.has(m.conversation_id)) previewMap.set(m.conversation_id, m.message);
      countMap.set(m.conversation_id, (countMap.get(m.conversation_id) || 0) + 1);
    });

    setThreads(
      (convos || []).map((c) => ({
        ...c,
        listingTitle: c.listing_id ? listingMap.get(c.listing_id) || "Removed listing" : "No listing",
        hostName: nameMap.get(c.host_id) || "Unknown host",
        shopperName: nameMap.get(c.shopper_id) || "Unknown shopper",
        preview: previewMap.get(c.id) || "No messages yet",
        messageCount: countMap.get(c.id) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoadingMessages(true);
    (async () => {
      const { data } = await supabase
        .from("conversation_messages")
        .select("id, sender_id, message, created_at, read_at, attachment_name")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages(data || []);
      setLoadingMessages(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) =>
      [t.listingTitle, t.hostName, t.shopperName, t.preview]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [threads, search]);

  const active = threads.find((t) => t.id === activeId) || null;

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Admin · Messages"
        description="Internal admin inbox for marketplace conversations."
        noindex
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <AdminSectionNav />

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessagesSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Messages</h1>
              <p className="text-muted-foreground text-sm">
                Read-only view of buyer and host conversations.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by listing, host, shopper, or message text"
          className="h-11 md:max-w-md text-base md:text-sm mb-5"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_1fr] gap-5">
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No conversations found.
                </CardContent>
              </Card>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3.5 transition-colors",
                    activeId === t.id
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card hover:border-foreground/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{t.listingTitle}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {t.messageCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {t.hostName} ↔ {t.shopperName}
                  </p>
                  <p className="text-sm text-muted-foreground truncate mt-1">{t.preview}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatWhen(t.last_message_at || t.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>

          <Card className="min-h-[320px]">
            <CardContent className="py-5">
              {!active ? (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Select a conversation to read the full thread.
                </p>
              ) : (
                <>
                  <div className="mb-4 pb-4 border-b border-border">
                    <h2 className="font-semibold">{active.listingTitle}</h2>
                    <p className="text-sm text-muted-foreground">
                      Host: {active.hostName} · Shopper: {active.shopperName}
                    </p>
                  </div>
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages in this thread.</p>
                  ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {messages.map((m) => {
                        const fromHost = m.sender_id === active.host_id;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "rounded-xl border p-3",
                              fromHost
                                ? "border-border bg-muted/40"
                                : "border-primary/25 bg-primary/5"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-medium">
                                {fromHost ? active.hostName : active.shopperName}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {formatWhen(m.created_at)}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                            {m.attachment_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Attachment: {m.attachment_name}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
