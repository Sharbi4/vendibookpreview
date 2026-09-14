import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, Users } from "lucide-react";

const CAMPAIGN_ID = "2026-09-feature-your-listing";

export default function AdminCampaignFeatureYourListing() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [priceLabel, setPriceLabel] = useState<string>("");
  const [html, setHtml] = useState("");
  const [busy, setBusy] = useState<null | "count" | "preview" | "test" | "broadcast">(null);
  const [log, setLog] = useState<{ sent: number; failed: number; tests: number } | null>(null);

  useEffect(() => { if (!isLoading && !user) navigate("/auth"); }, [user, isLoading, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
      if (!data) navigate("/");
    })();
  }, [user, navigate]);

  const refreshLog = async () => {
    const { data } = await supabase
      .from("blog_campaign_sends").select("status, is_test").eq("campaign_id", CAMPAIGN_ID);
    if (data) {
      setLog({
        sent: data.filter((r) => r.status === "sent" && !r.is_test).length,
        failed: data.filter((r) => r.status === "failed" && !r.is_test).length,
        tests: data.filter((r) => r.is_test).length,
      });
    }
  };

  useEffect(() => { if (isAdmin) void refreshLog(); }, [isAdmin]);

  const invoke = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("send-feature-your-listing", { body });
    if (error) throw error;
    if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    return data as Record<string, never> & Record<string, unknown>;
  };

  const handleCount = async () => {
    setBusy("count");
    try {
      const r = await invoke({ mode: "preview_count" });
      setCounts(r.counts as Record<string, number>);
      setPriceLabel(String(r.priceLabel ?? ""));
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handlePreview = async () => {
    setBusy("preview");
    try {
      const r = await invoke({ mode: "preview_html" });
      setHtml(String(r.html ?? ""));
      setPriceLabel(String(r.priceLabel ?? ""));
    } catch (e) {
      toast({ title: "Preview failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleTest = async () => {
    setBusy("test");
    try {
      const r = await invoke({ mode: "test", testEmail });
      toast({ title: "Test sent", description: `${r.sent} sent, ${r.failed} failed.` });
      await refreshLog();
    } catch (e) {
      toast({ title: "Test failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleBroadcast = async () => {
    const eligible = counts?.mailableSellers ?? 0;
    if (!window.confirm(`Send the Featured Listing campaign to ${eligible} sellers? This cannot be undone.`)) return;
    setBusy("broadcast");
    try {
      const r = await invoke({ mode: "broadcast", confirm: CAMPAIGN_ID });
      toast({ title: "Campaign sent", description: `${r.sent} sent, ${r.failed} failed.` });
      await refreshLog();
      await handleCount();
    } catch (e) {
      toast({ title: "Broadcast failed", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (isLoading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const status = log && log.sent > 0 ? "Sent" : "Draft — not broadcast";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Campaign: Feature your listing</h1>
            <p className="text-sm text-muted-foreground mt-1">Campaign ID: {CAMPAIGN_ID}</p>
          </div>
          <Badge variant={status === "Sent" ? "default" : "secondary"}>{status}</Badge>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sellers with at least one live listing that is not currently Featured. One email per seller,
              unsubscribes and suppressed addresses excluded, already-sent addresses skipped.
            </p>
            <Button onClick={handleCount} disabled={busy !== null} variant="outline">
              {busy === "count" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Refresh counts
            </Button>
            {counts && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {Object.entries(counts).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border p-3">
                    <div className="text-muted-foreground text-xs">{k}</div>
                    <div className="text-lg font-semibold">{String(v)}</div>
                  </div>
                ))}
              </div>
            )}
            {priceLabel && <p className="text-sm">Catalog price for boost-featured-30: <strong>{priceLabel}</strong> / 30 days, one-time.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Preview & test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handlePreview} disabled={busy !== null} variant="outline">
              {busy === "preview" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Load preview
            </Button>
            {html && (
              <iframe title="Email preview" srcDoc={html} className="w-full h-[720px] rounded-lg border border-border bg-white" />
            )}
            <div className="space-y-2">
              <Label htmlFor="testEmail">Send test to</Label>
              <div className="flex gap-2">
                <Input id="testEmail" type="email" value={testEmail} placeholder="you@example.com"
                  onChange={(e) => setTestEmail(e.target.value)} />
                <Button onClick={handleTest} disabled={busy !== null || !testEmail}>
                  {busy === "test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send test
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader className="pb-3"><CardTitle className="text-base">Broadcast</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sends once to every eligible seller. Addresses already mailed for this campaign are skipped automatically.
            </p>
            <Button variant="destructive" onClick={handleBroadcast} disabled={busy !== null}>
              {busy === "broadcast" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send broadcast
            </Button>
            {log && (
              <p className="text-sm text-muted-foreground">
                Sent: {log.sent} · Failed: {log.failed} · Tests: {log.tests}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
