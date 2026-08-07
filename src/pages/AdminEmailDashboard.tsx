import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send, RefreshCw, CheckCircle2, ShieldAlert, Mail, Eye, History } from 'lucide-react';

const INSIGHT_THEMES = [
  "Where we're seeing the most bookings right now",
  "What buyers are searching for most this month",
  "Tips for first-time food truck buyers",
  "How to price your shared kitchen for maximum bookings",
  "What makes a listing get more inquiries",
  "Trends in mobile food businesses"];

const TOOL_CATALOG = [
  { id: "verified", label: "Verified Listings", description: "Every listing reviewed before it goes live." },
  { id: "secure", label: "Secure Payments", description: "All transactions processed through PayPal." },
  { id: "support", label: "24/7 Support", description: "Real people, real answers, any time." },
  { id: "instant", label: "Instant Booking", description: "Reserve a kitchen or space in minutes." },
  { id: "seller", label: "Seller Dashboard", description: "Track inquiries, views, and offers in one place." },
  { id: "checked", label: "Background-Checked Hosts", description: "Rent with confidence." }];

const ROTATION_LABELS: Record<string, string> = {
  purchase: "Purchase Rewards ($500)",
  supply: "Supply Rewards ($150)",
  rental: "Rental Rewards ($50)"};

function nextRotation(last?: string) {
  const order = ["purchase", "supply", "rental"];
  if (!last) return "purchase";
  const idx = order.indexOf(last);
  return order[(idx + 1) % order.length];
}

export default function AdminEmailDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();

  // Admin gate
  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    }});

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/admin/email/dashboard");
  }, [authLoading, user, navigate]);

  // Compose state
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [selectedHeadline, setSelectedHeadline] = useState("");
  const [subject, setSubject] = useState("The Vendibook Report — This Week");
  const [insightTheme, setInsightTheme] = useState(INSIGHT_THEMES[0]);
  const [insight, setInsight] = useState<{ title: string; pullQuote: string; body: string }>({
    title: "", pullQuote: "", body: ""
  });
  const [selectedTools, setSelectedTools] = useState<string[]>(["verified", "secure", "instant"]);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [currentSendId, setCurrentSendId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Content fetch
  const { data: content, refetch: refetchContent, isFetching: contentLoading } = useQuery({
    queryKey: ["marketing-content"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketing-fetch-content");
      if (error) throw error;
      return data;
    }});

  // History
  const { data: history } = useQuery({
    queryKey: ["email-sends-history"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("email_sends")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    }});

  // Latest rotation
  const nextRot = useMemo(() => {
    const last = history?.find((s: any) => s.status === "sent")?.referral_rotation;
    return nextRotation(last);
  }, [history]);

  // Recipient count
  const { data: recipientStats } = useQuery({
    queryKey: ["marketing-recipient-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data: unsubs } = await supabase.from("email_unsubscribes").select("email", { count: "exact" });
      // We can't easily count auth.users from client; estimate via profiles if present
      const { count: profilesCount } = await supabase.from("profiles" as any).select("user_id", { count: "exact", head: true });
      return { unsubscribed: unsubs?.length ?? 0, total: profilesCount ?? 0 };
    }});

  // Mutations
  const generateHeadlines = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketing-compose-assist", {
        body: { mode: "headlines" }});
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setHeadlines(data.headlines);
      if (!selectedHeadline) setSelectedHeadline(data.headlines[0]);
      toast.success("3 headlines generated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to generate headlines")});

  const generateInsight = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketing-compose-assist", {
        body: { mode: "insight", theme: insightTheme }});
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setInsight(data);
      toast.success("Insight generated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to generate insight")});

  const composeIsReady =
    !!selectedHeadline &&
    !!subject.trim() &&
    !!insight.body &&
    !!content?.saleListings?.length &&
    selectedTools.length === 3;

  const buildPayload = () => {
    const tools = selectedTools
      .map((id) => TOOL_CATALOG.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => {
        const iconMap: Record<string, string> = {
          verified: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
          secure: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
          support: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3",
          instant: "M13 10V3L4 14h7v7l9-11h-7z",
          seller: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
          checked: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"};
        return { label: t!.label, description: t!.description, icon: iconMap[t!.id] };
      });

    return {
      saleListings: content?.saleListings ?? [],
      featuredRental: content?.featuredRental ?? null,
      tools,
      insight};
  };

  const saveDraft = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const { data, error } = await supabase
        .from("email_sends")
        .insert({
          subject_line: subject,
          hero_headline: selectedHeadline,
          status: "draft",
          referral_rotation: nextRot,
          composed_payload: payload,
          created_by: user!.id})
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentSendId(data.id);
      qc.invalidateQueries({ queryKey: ["email-sends-history"] });
      toast.success(`Draft saved (Issue #${data.issue_number})`);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save draft")});

  const sendTest = useMutation({
    mutationFn: async () => {
      if (!currentSendId) {
        await saveDraft.mutateAsync();
      }
      const sid = currentSendId ?? (saveDraft.data?.id as string);
      const { data, error } = await supabase.functions.invoke("marketing-send-test", { body: { sendId: sid } });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Test sent to ${data.recipient}`);
      qc.invalidateQueries({ queryKey: ["email-sends-history"] });
      qc.invalidateQueries({ queryKey: ["current-send", currentSendId] });
    },
    onError: (e: any) => toast.error(e?.message || "Test send failed")});

  const approveTest = useMutation({
    mutationFn: async () => {
      if (!currentSendId) throw new Error("No send to approve");
      const { error } = await supabase
        .from("email_sends")
        .update({ status: "test_approved" })
        .eq("id", currentSendId);
      if (error) throw error;
      await supabase
        .from("email_test_sends")
        .update({ approved_at: new Date().toISOString(), approved_by: user!.id })
        .eq("send_id", currentSendId)
        .is("approved_at", null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-send", currentSendId] });
      qc.invalidateQueries({ queryKey: ["email-sends-history"] });
      toast.success("Send unlocked — broadcast available");
    },
    onError: (e: any) => toast.error(e?.message)});

  const broadcast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("marketing-send-broadcast", {
        body: { sendId: currentSendId }});
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sent to ${data.sentCount} users (${data.failedCount} failed)`);
      qc.invalidateQueries({ queryKey: ["email-sends-history"] });
      setCurrentSendId(null);
      setHeadlines([]);
      setSelectedHeadline("");
      setInsight({ title: "", pullQuote: "", body: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Broadcast failed")});

  const { data: currentSend } = useQuery({
    queryKey: ["current-send", currentSendId],
    enabled: !!currentSendId,
    queryFn: async () => {
      const { data } = await supabase.from("email_sends").select("*").eq("id", currentSendId!).single();
      return data;
    },
    refetchInterval: 3000});

  // Live preview via re-using the broadcast renderer would require an edge call.
  // Lightweight client preview: show structured cards mirroring the template.
  // For an accurate preview, call a preview endpoint. We'll do a simple inline summary card.

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-12">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-24 text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Admin Access Required</h1>
          <p className="text-muted-foreground">This page is only available to administrators.</p>
        </div>
      </div>
    );
  }

  const status = currentSend?.status ?? "draft";
  const testApproved = status === "test_approved";
  const testSent = status === "test_sent" || testApproved || status === "sending" || status === "sent";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Mail className="w-7 h-7 text-primary" /> The Vendibook Report
            </h1>
            <p className="text-muted-foreground mt-1">
              Internal compose & send dashboard · Issue #{(history?.[0]?.issue_number ?? 0) + 1} next
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Next rotation: {ROTATION_LABELS[nextRot]}
          </Badge>
        </div>

        <Tabs defaultValue="compose">
          <TabsList className="mb-6">
            <TabsTrigger value="compose">Compose & Send</TabsTrigger>
            <TabsTrigger value="history">Send History</TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* COMPOSE PANEL */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                       Hero Headline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={() => generateHeadlines.mutate()} disabled={generateHeadlines.isPending} variant="outline" size="sm">
                      {generateHeadlines.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Generate 3 options
                    </Button>
                    {headlines.map((h) => (
                      <label key={h} className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition ${selectedHeadline === h ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <input type="radio" name="headline" checked={selectedHeadline === h} onChange={() => setSelectedHeadline(h)} className="mt-1" />
                        <span className="font-serif text-base">{h}</span>
                      </label>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Subject Line</CardTitle></CardHeader>
                  <CardContent>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={80} />
                    <p className="text-xs text-muted-foreground mt-1">{subject.length}/80 chars</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Listings Preview
                      <Button size="sm" variant="ghost" onClick={() => refetchContent()} disabled={contentLoading}>
                        <RefreshCw className={`w-4 h-4 ${contentLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contentLoading && <Skeleton className="h-40 w-full" />}
                    {content && (
                      <>
                        <p className="text-sm text-muted-foreground mb-2">
                          {content.saleListings?.length ?? 0} for-sale listings · {content.featuredRental ? "1 featured rental" : "no rental available"}
                        </p>
                        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                          {content.saleListings?.map((l: any) => (
                            <li key={l.id} className="text-muted-foreground">• {l.title} — {l.price}</li>
                          ))}
                          {content.featuredRental && (
                            <li className="font-medium pt-2 border-t mt-2">★ {content.featuredRental.title} — {content.featuredRental.price}</li>
                          )}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Tools to Highlight (pick 3)</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {TOOL_CATALOG.map((t) => {
                      const checked = selectedTools.includes(t.id);
                      const disabled = !checked && selectedTools.length >= 3;
                      return (
                        <label key={t.id} className={`flex items-start gap-2 p-2 rounded border text-sm ${checked ? "border-primary bg-primary/5" : "border-border"} ${disabled ? "opacity-50" : "cursor-pointer"}`}>
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(c) => {
                              if (c) setSelectedTools([...selectedTools, t.id]);
                              else setSelectedTools(selectedTools.filter((x) => x !== t.id));
                            }}
                          />
                          <div>
                            <div className="font-medium">{t.label}</div>
                            <div className="text-xs text-muted-foreground">{t.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Editorial Insight</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Label>Theme</Label>
                    <Select value={insightTheme} onValueChange={setInsightTheme}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {INSIGHT_THEMES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => generateInsight.mutate()} disabled={generateInsight.isPending} variant="outline" size="sm">
                      {generateInsight.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Generate
                    </Button>
                    {insight.body && (
                      <div className="space-y-2 pt-2">
                        <Input value={insight.title} onChange={(e) => setInsight({ ...insight, title: e.target.value })} placeholder="Title" />
                        <Textarea value={insight.pullQuote} onChange={(e) => setInsight({ ...insight, pullQuote: e.target.value })} placeholder="Pull quote" rows={2} />
                        <Textarea value={insight.body} onChange={(e) => setInsight({ ...insight, body: e.target.value })} placeholder="Body" rows={6} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* PREVIEW + SEND PANEL */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span className="flex items-center gap-2"><Eye className="w-5 h-5" /> Live Preview</span>
                      <div className="flex gap-1">
                        <Button size="sm" variant={previewDevice === "desktop" ? "default" : "ghost"} onClick={() => setPreviewDevice("desktop")}>Desktop</Button>
                        <Button size="sm" variant={previewDevice === "mobile" ? "default" : "ghost"} onClick={() => setPreviewDevice("mobile")}>Mobile</Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#F8F6F4] p-4 rounded">
                      <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: previewDevice === "mobile" ? 375 : 640 }}>
                        <div className="bg-[#0C0C0C] text-center py-8 px-4 text-white">
                          <div className="font-bold tracking-widest text-xs text-zinc-400">THE VENDIBOOK REPORT</div>
                          <div className="text-xs text-zinc-600 mt-2">Issue No. {(history?.[0]?.issue_number ?? 0) + 1}</div>
                        </div>
                        <div className="py-10 px-6 text-center">
                          <h2 className="text-2xl font-serif text-[#1A1A1A] leading-tight">
                            {selectedHeadline || "Generate a headline to preview"}
                          </h2>
                          <p className="text-sm text-[#666] mt-3">Browse this week's freshest listings below.</p>
                        </div>
                        <div className="px-4 pb-6">
                          <div className="text-center text-[10px] tracking-widest text-[#666] mb-3">RECENTLY LISTED FOR SALE</div>
                          <div className="grid grid-cols-2 gap-2 text-[#1A1A1A]">
                            {(content?.saleListings ?? []).slice(0, 6).map((l: any) => (
                              <div key={l.id} className="bg-white p-2">
                                {l.image && <img src={l.image} alt="" className="w-full aspect-video object-cover rounded" />}
                                <div className="font-serif text-sm font-semibold mt-2 line-clamp-2">{l.title}</div>
                                <div className="text-[10px] text-[#666] mt-1">📍 {l.location}</div>
                                <div className="text-[#FF5124] font-bold text-sm mt-1">{l.price}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {content?.featuredRental && (
                          <div className="bg-[#F8F6F4] p-4">
                            <div className="text-center text-[10px] tracking-widest text-[#666] mb-2">FEATURED FOR RENT</div>
                            <div className="bg-white p-3">
                              {content.featuredRental.image && (
                                <img src={content.featuredRental.image} alt="" className="w-full aspect-video object-cover rounded" />
                              )}
                              <div className="font-serif text-lg font-semibold mt-2">{content.featuredRental.title}</div>
                              <div className="text-[#FF5124] font-bold mt-1">{content.featuredRental.price}</div>
                            </div>
                          </div>
                        )}
                        {insight.body && (
                          <div className="px-6 py-6 border-t">
                            <blockquote className="border-l-2 border-[#FF5124] pl-3 italic font-serif text-[#1A1A1A]">
                              "{insight.pullQuote}"
                            </blockquote>
                            <p className="text-sm mt-3 text-[#333] leading-relaxed line-clamp-4">{insight.body}</p>
                          </div>
                        )}
                        <div className="bg-[#0C0C0C] text-white text-center py-4 text-[10px] text-zinc-500">
                          Footer · Unsubscribe · Privacy · ©
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Test Send</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      A test will be sent to the configured test recipient. You must approve the test before broadcast unlocks.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => sendTest.mutate()}
                        disabled={!composeIsReady || sendTest.isPending}
                      >
                        {sendTest.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Send Test
                      </Button>
                      {currentSendId && (
                        <Badge variant="outline">Draft: Issue #{currentSend?.issue_number} · {status}</Badge>
                      )}
                    </div>
                    {testSent && !testApproved && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                        <p className="text-sm mb-3">Test email sent. Did it look correct?</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approveTest.mutate()} disabled={approveTest.isPending}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Yes — Unlock Send
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setCurrentSendId(null); toast.info("Edit and re-test"); }}>
                            No — Edit First
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={!testApproved ? "opacity-50" : ""}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Broadcast to All Users
                      {!testApproved && <Badge variant="outline">Locked until test approved</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">
                      Will send to all opted-in users
                      {recipientStats && <> · {recipientStats.unsubscribed} unsubscribed (excluded)</>}
                    </p>
                    <Button
                      variant="destructive"
                      disabled={!testApproved || broadcast.isPending}
                      onClick={() => {
                        if (confirm("This will send to all opted-in users. This cannot be undone. Continue?")) {
                          broadcast.mutate();
                        }
                      }}
                    >
                      {broadcast.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send to All Users Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Send History</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Issue</th>
                      <th>Date</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Recipients</th>
                      <th>Rotation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history?.map((s: any) => {
                      const health = s.listings_section_replaced || s.rental_section_replaced
                        ? { dot: "🔴", label: "Minimal" }
                        : (s.used_fallback_listings || s.used_fallback_rental)
                        ? { dot: "🟡", label: "Partial" }
                        : { dot: "🟢", label: "Full" };
                      return (
                      <tr key={s.id} className="border-b hover:bg-muted/40">
                        <td className="py-2 font-mono">#{s.issue_number}</td>
                        <td>{s.sent_at ? new Date(s.sent_at).toLocaleDateString() : "—"}</td>
                        <td className="max-w-xs truncate">{s.subject_line}</td>
                        <td>
                          <span title={health.label} className="mr-2">{health.dot}</span>
                          <Badge variant={s.status === "sent" ? "default" : "outline"}>{s.status}</Badge>
                        </td>
                        <td>{s.recipient_count ?? "—"}</td>
                        <td className="text-xs text-muted-foreground">{ROTATION_LABELS[s.referral_rotation] ?? s.referral_rotation}</td>
                      </tr>
                      );
                    })}
                    {!history?.length && (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No sends yet</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
