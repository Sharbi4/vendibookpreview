import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, Monitor, Smartphone, ShieldAlert, Copy, MessageSquare } from "lucide-react";

const CAMPAIGN_ID = "2026-08-equinox-partnership";
const BLOG_SLUG = "vendibook-equinox-food-truck-financing-partnership";
const SMS_CONTENT_TAG = "sms_blast";
const SMS_SHARE_LINK = `https://vendibook.com/share/sms/${BLOG_SLUG}?c=${SMS_CONTENT_TAG}`;
const SMS_MESSAGE = `Vendibook: financing for food trucks, trailers & carts is here via Equinox Funding. Details: ${SMS_SHARE_LINK} Reply STOP to opt out.`;
type Variant = "buyer" | "seller";

export default function AdminCampaignEquinoxPartnership() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [testEmail, setTestEmail] = useState("");
  const [variant, setVariant] = useState<Variant>("buyer");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [counts, setCounts] = useState<any>(null);
  const [consentNote, setConsentNote] = useState<string>("");
  const [busy, setBusy] = useState<null | "count" | "preview" | "test" | "broadcast">(null);
  const [log, setLog] = useState<{ sent: number; failed: number; tests: number } | null>(null);

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

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: label });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  const refreshLog = async () => {
    const { data } = await supabase
      .from("blog_campaign_sends")
      .select("status, is_test")
      .eq("campaign_id", CAMPAIGN_ID);
    if (data) {
      setLog({
        sent: data.filter((r: any) => r.status === "sent" && !r.is_test).length,
        failed: data.filter((r: any) => r.status === "failed" && !r.is_test).length,
        tests: data.filter((r: any) => r.is_test).length,
      });
    }
  };

  useEffect(() => { if (isAdmin) void refreshLog(); }, [isAdmin]);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("send-equinox-partnership", { body });
    if (error) throw error;
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const loadPreview = async (v: Variant) => {
    setBusy("preview");
    try {
      const r = await invoke({ mode: "preview_html", variant: v });
      setHtml(r.html);
      setSubject(r.subject);
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  useEffect(() => { if (isAdmin) void loadPreview(variant); }, [isAdmin, variant]);

  const handleCount = async () => {
    setBusy("count");
    try {
      const r = await invoke({ mode: "preview_count" });
      setCounts(r.counts);
      setConsentNote(r.consentNote ?? "");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleTest = async () => {
    setBusy("test");
    try {
      const r = await invoke({ mode: "test", testEmail, variant });
      toast({ title: "Test sent", description: `${r.sent} sent, ${r.failed} failed.` });
      await refreshLog();
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleBroadcast = async () => {
    setBusy("broadcast");
    try {
      const r = await invoke({ mode: "broadcast", confirm: CAMPAIGN_ID });
      toast({ title: "Campaign sent", description: `${r.sent} sent, ${r.failed} failed.` });
      await refreshLog();
      await handleCount();
    } catch (e: any) {
      toast({ title: "Broadcast failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (isLoading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const status = log && log.sent > 0 ? "Sent" : "Draft — awaiting approval";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Campaign: Vendibook × Equinox Funding</h1>
            <p className="text-sm text-muted-foreground mt-1">Campaign ID: {CAMPAIGN_ID}</p>
          </div>
          <Badge variant={status === "Sent" ? "default" : "secondary"}>{status}</Badge>
        </div>

        <Card className="border-amber-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" /> Consent scope
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            No marketing-consent field exists for registered accounts, so consent is not inferred.
            This campaign is limited to the confirmed newsletter list, minus unsubscribes and
            suppressed addresses. Registered users who never subscribed will not receive it.
            {consentNote && <span className="block mt-2 text-xs">{consentNote}</span>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Tracked SMS share link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Every click is logged, then redirected to the article with
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">utm_source=sms</code>,
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">utm_medium=sms</code>,
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">utm_campaign=vendibook_equinox_partnership</code>, and
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">utm_content={SMS_CONTENT_TAG}</code>.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Share link</Label>
              <div className="flex gap-2">
                <Input readOnly value={SMS_SHARE_LINK} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => void copyText(SMS_SHARE_LINK, "Link copied")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Suggested message (includes opt-out)</Label>
              <div className="flex gap-2">
                <Input readOnly value={SMS_MESSAGE} className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => void copyText(SMS_MESSAGE, "Message copied")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send only to numbers with recorded SMS consent.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Audience</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => void handleCount()} disabled={busy === "count"}>
              {busy === "count" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Count eligible recipients
            </Button>
            {counts && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                {[
                  ["Eligible", counts.total],
                  ["Sellers", counts.seller],
                  ["Buyers", counts.buyer],
                  ["Suppressed", counts.suppressed],
                  ["Already sent", counts.alreadySent],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold">{value as number}</div>
                  </div>
                ))}
              </div>
            )}
            {log && (
              <p className="text-xs text-muted-foreground">
                Delivery log — broadcast sent: {log.sent} · failed: {log.failed} · tests: {log.tests}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {(["buyer", "seller"] as Variant[]).map((v) => (
                <Button key={v} size="sm" variant={variant === v ? "default" : "outline"} onClick={() => setVariant(v)}>
                  {v === "buyer" ? "Buyer variant" : "Seller variant"}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>
                  <Monitor className="h-4 w-4 mr-1.5" /> Desktop
                </Button>
                <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>
                  <Smartphone className="h-4 w-4 mr-1.5" /> Mobile
                </Button>
              </div>
            </div>
            {subject && <p className="text-sm"><span className="text-muted-foreground">Subject: </span><span className="font-medium">{subject}</span></p>}
            <div className="flex justify-center bg-muted/40 rounded-xl p-3 overflow-auto">
              <iframe
                title="Email preview"
                srcDoc={html}
                style={{ width: device === "desktop" ? 680 : 390, height: 900, border: 0, background: "#0a0a0b" }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Test &amp; approve</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Send a test of the {variant} variant</Label>
              <div className="flex gap-2 flex-wrap">
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="max-w-xs"
                />
                <Button variant="outline" onClick={() => void handleTest()} disabled={busy === "test" || !testEmail}>
                  {busy === "test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send test
                </Button>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy === "broadcast" || !counts?.total}>
                  {busy === "broadcast" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Approve &amp; send campaign
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send to {counts?.total ?? 0} subscribers?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This sends the partnership announcement to the confirmed newsletter list only
                    ({counts?.seller ?? 0} seller variant, {counts?.buyer ?? 0} buyer variant).
                    Addresses already sent this campaign are skipped automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleBroadcast()}>Send now</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
