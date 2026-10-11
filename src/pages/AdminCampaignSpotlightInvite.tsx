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
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, Send, Monitor, Smartphone, ShieldAlert } from "lucide-react";

const CAMPAIGN_ID = "2026-08-business-spotlight-invite";
type Variant = "a" | "b";

export default function AdminCampaignSpotlightInvite() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [variant, setVariant] = useState<Variant>("a");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmail, setTestEmail] = useState("");
  const [previewName, setPreviewName] = useState("Sam");
  const [html, setHtml] = useState("");
  const [subject, setSubject] = useState("");
  const [counts, setCounts] = useState<any>(null);
  const [consentNote, setConsentNote] = useState("");
  const [busy, setBusy] = useState<null | "count" | "preview" | "test">(null);
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

  useEffect(() => {
    if (isAdmin) void refreshLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const invoke = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("send-spotlight-invite", { body });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const doCount = async () => {
    setBusy("count");
    try {
      const d = await invoke({ mode: "preview_count", variant });
      setCounts(d.counts);
      setConsentNote(d.consentNote ?? "");
      setSubject(d.subject ?? "");
      toast({ title: `${d.eligibleRecipients} eligible recipients` });
    } catch (e) {
      toast({ title: "Count failed", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const doPreview = async () => {
    setBusy("preview");
    try {
      const d = await invoke({ mode: "preview_html", variant, previewFirstName: previewName });
      setHtml(d.html);
      setSubject(d.subject);
    } catch (e) {
      toast({ title: "Preview failed", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  const doTest = async () => {
    if (!testEmail.trim()) {
      toast({ title: "Enter a test email", variant: "destructive" });
      return;
    }
    setBusy("test");
    try {
      const d = await invoke({
        mode: "test",
        variant,
        testEmail: testEmail.trim(),
        previewFirstName: previewName,
      });
      toast({ title: `Test sent (${d.sent} sent, ${d.failed} failed)` });
      void refreshLog();
    } catch (e) {
      toast({ title: "Test send failed", description: (e as Error).message, variant: "destructive" });
    }
    setBusy(null);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container max-w-5xl py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Campaign — Business Spotlight invite</h1>
          <p className="text-sm text-muted-foreground">Campaign ID: {CAMPAIGN_ID}</p>
        </div>

        <Card className="border-amber-500/40">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-muted-foreground">
              Broadcast is intentionally not wired to a button. Preview and test freely — the audience
              send requires an explicit server-side confirmation once the public form is verified
              end-to-end.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Subject variant</Label>
              <div className="flex gap-2">
                {(["a", "b"] as Variant[]).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={variant === v ? "default" : "outline"}
                    onClick={() => setVariant(v)}
                  >
                    Variant {v.toUpperCase()}
                  </Button>
                ))}
              </div>
              {subject && <p className="text-sm text-muted-foreground">Subject: “{subject}”</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pname">Preview first name</Label>
                <Input id="pname" value={previewName} onChange={(e) => setPreviewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temail">Test email</Label>
                <Input
                  id="temail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@vendibook.com"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={doCount} disabled={busy !== null}>
                {busy === "count" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span className="ml-2">Count audience</span>
              </Button>
              <Button variant="outline" onClick={doPreview} disabled={busy !== null}>
                {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                <span className="ml-2">Render preview</span>
              </Button>
              <Button variant="cta" onClick={doTest} disabled={busy !== null}>
                {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="ml-2">Send test</span>
              </Button>
            </div>

            {counts && (
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(counts).map(([k, v]) => (
                  <Badge key={k} variant="secondary">
                    {k}: {String(v)}
                  </Badge>
                ))}
              </div>
            )}
            {consentNote && <p className="text-xs text-muted-foreground">{consentNote}</p>}
            {log && (
              <p className="text-xs text-muted-foreground">
                Send log — sent {log.sent} · failed {log.failed} · tests {log.tests}
              </p>
            )}
          </CardContent>
        </Card>

        {html && (
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Preview</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant={device === "desktop" ? "default" : "outline"} onClick={() => setDevice("desktop")}>
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button size="sm" variant={device === "mobile" ? "default" : "outline"} onClick={() => setDevice("mobile")}>
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mx-auto" style={{ maxWidth: device === "mobile" ? 390 : 720 }}>
                <iframe
                  title="Email preview"
                  srcDoc={html}
                  className="w-full rounded-2xl border border-border bg-white"
                  style={{ height: 1100 }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
