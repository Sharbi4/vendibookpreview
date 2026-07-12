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
import { Loader2, Mail, Send, Eye } from "lucide-react";

const CAMPAIGN_ID = "2026-05-31-new-exit-plan-blog-email";

type Result = { sent?: number; failed?: number; attempted?: number; eligibleRecipients?: number };

export default function AdminCampaignNewExitPlan() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  // Do NOT hardcode the internal admin address here — it would end up in the built JS bundle.
  const [testEmail, setTestEmail] = useState("");
  const [busy, setBusy] = useState<null | "test" | "count" | "broadcast">(null);
  const [eligible, setEligible] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const [sentLog, setSentLog] = useState<{ sent: number; failed: number } | null>(null);

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("blog_campaign_sends")
        .select("status")
        .eq("campaign_id", CAMPAIGN_ID)
        .eq("is_test", false);
      if (data) {
        setSentLog({
          sent: data.filter((r) => r.status === "sent").length,
          failed: data.filter((r) => r.status === "failed").length,
        });
      }
    })();
  }, [lastResult]);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("send-blog-campaign", { body });
    if (error) throw error;
    return data as Result;
  };

  const handleCount = async () => {
    setBusy("count");
    try {
      const r = await invoke({ mode: "preview_count" });
      setEligible(r.eligibleRecipients ?? 0);
      toast({ title: "Eligible recipients", description: `${r.eligibleRecipients} users will receive this email.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleTest = async () => {
    setBusy("test");
    try {
      const r = await invoke({ mode: "test", testEmail });
      setLastResult(r);
      toast({ title: "Test sent", description: `Delivered to ${testEmail}` });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const handleBroadcast = async () => {
    setBusy("broadcast");
    try {
      const r = await invoke({ mode: "broadcast" });
      setLastResult(r);
      toast({ title: "Broadcast complete", description: `Sent ${r.sent} · Failed ${r.failed}` });
    } catch (e: any) {
      toast({ title: "Broadcast failed", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (isLoading || isAdmin === null) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog Campaign</h1>
          <p className="text-muted-foreground mt-1">
            One-time editorial email for the new exit plan blog post.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-[#ff5124]" /> Campaign details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Internal ID:</span> <code className="text-xs">{CAMPAIGN_ID}</code></div>
            <div><span className="text-muted-foreground">Subject:</span> A Food Truck, a Recipe, and a Fresh Start</div>
            <div><span className="text-muted-foreground">Article:</span> /blog/new-exit-plan-food-truck-after-layoffs</div>
            {sentLog && (
              <div className="flex gap-2 pt-2">
                <Badge variant="secondary">Sent so far: {sentLog.sent}</Badge>
                {sentLog.failed > 0 && <Badge variant="destructive">Failed: {sentLog.failed}</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>1. Send a test</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="t">Test recipient</Label>
            <Input id="t" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
            <Button onClick={handleTest} disabled={busy !== null || !testEmail} className="bg-[#ff5124] hover:bg-[#e8431a]">
              {busy === "test" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>2. Preview audience size</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Excludes invalid emails, unsubscribed users, and anyone who already received this campaign.
            </p>
            <Button variant="outline" onClick={handleCount} disabled={busy !== null}>
              {busy === "count" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              Count eligible recipients
            </Button>
            {eligible !== null && (
              <div className="text-lg font-semibold">{eligible.toLocaleString()} users</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#ff5124]/40">
          <CardHeader><CardTitle>3. Broadcast to all users</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This sends the campaign to every eligible registered user. The dedup log prevents the same address from being emailed twice for this campaign.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={busy !== null} className="bg-[#ff5124] hover:bg-[#e8431a]">
                  {busy === "broadcast" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send to all users
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send campaign to all registered users?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {eligible !== null
                      ? `This will send to ~${eligible.toLocaleString()} recipients.`
                      : "Run “Count eligible recipients” first if you want a preview."}
                    {" "}This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBroadcast} className="bg-[#ff5124] hover:bg-[#e8431a]">
                    Confirm and send
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {lastResult && lastResult.sent !== undefined && (
              <div className="text-sm pt-2">
                Attempted: <strong>{lastResult.attempted}</strong> · Sent: <strong>{lastResult.sent}</strong> · Failed: <strong>{lastResult.failed}</strong>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
