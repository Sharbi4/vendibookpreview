import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useReferralCode, useMyReferrals, buildReferralUrl, useFeatureFlag, useAcceptReferralTerms } from "@/hooks/useReferral";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Download, Facebook, MessageCircle, Mail, Share2, Twitter, ExternalLink, AlertCircle, Info } from "lucide-react";

const TERMS_VERSION = "2026-05-30";
const PROGRAMS = [
  { key: "all", label: "All" },
  { key: "supply", label: "Supply $150" },
  { key: "purchase", label: "Purchase $500" },
  { key: "rental", label: "Rental $50" },
] as const;

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-200 text-slate-700",
  clicked: "bg-slate-200 text-slate-700",
  signed_up: "bg-blue-100 text-blue-700",
  transaction_started: "bg-blue-100 text-blue-700",
  pending_review: "bg-purple-100 text-purple-700",
  qualified: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  on_hold: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-700",
  voided: "bg-red-100 text-red-700",
};

const EMPTY_REFERRALS: any[] = [];

const ReferralDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: code } = useReferralCode();
  const { data: referralsData } = useMyReferrals();
  const referrals = referralsData ?? EMPTY_REFERRALS;
  const stripe = useStripeConnect();
  const { data: programEnabled = true } = useFeatureFlag("referral_program_enabled", true);
  const acceptTermsMut = useAcceptReferralTerms();

  const [tab, setTab] = useState<string>("all");
  const [destination, setDestination] = useState<"purchase" | "supply" | "rental">("purchase");
  const [qr, setQr] = useState<string>("");
  const [needsTerms, setNeedsTerms] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);

  // Check terms acceptance
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_terms_version_accepted")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.referral_terms_version_accepted !== TERMS_VERSION) {
        setNeedsTerms(true);
      }
    })();
  }, [user?.id]);

  // Load payouts + compute stats
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("referral_payouts")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      setPayouts(data ?? []);
    })();
  }, [user?.id]);

  useEffect(() => {
    const total = referrals.filter((r: any) => r.status === "paid").reduce((s, r: any) => s + Number(r.reward_amount ?? r.referrer_reward_amount ?? 0), 0);
    const pending = referrals.filter((r: any) => ["qualified", "on_hold", "signed_up"].includes(r.status)).reduce((s, r: any) => s + Number(r.reward_amount ?? r.referrer_reward_amount ?? 0), 0);
    const available = referrals.filter((r: any) => r.status === "qualified" && (!r.on_hold_until || new Date(r.on_hold_until) <= new Date())).reduce((s, r: any) => s + Number(r.reward_amount ?? r.referrer_reward_amount ?? 0), 0);
    setStats({ total, pending, available });
  }, [referrals]);

  const link = useMemo(() => {
    if (!code) return "";
    const url = new URL(buildReferralUrl(code.code, "/r/" + code.code));
    url.searchParams.set("p", destination);
    return url.toString();
  }, [code, destination]);

  // QR generation
  useEffect(() => {
    if (!link) return;
    QRCode.toDataURL(link, { width: 512, margin: 2, color: { dark: "#0F0F0F", light: "#FFFFFF" } })
      .then(setQr)
      .catch(() => {});
  }, [link]);

  const filtered = useMemo(() => {
    if (tab === "all") return referrals;
    return (referrals as any[]).filter((r) => r.program_type === tab);
  }, [referrals, tab]);

  const acceptTerms = async () => {
    if (!user?.id) return;
    try {
      await acceptTermsMut.mutateAsync(TERMS_VERSION);
      setNeedsTerms(false);
      toast.success("Terms accepted");
    } catch {
      toast.error("Could not record acceptance. Please try again.");
    }
  };

  const FTC = "(I may earn a referral reward.)";
  const caption = `Check out Vendibook — the food-truck and commercial-kitchen marketplace I'm using. ${FTC}`;

  const share = (channel: string) => {
    const enc = encodeURIComponent;
    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`,
      x: `https://twitter.com/intent/tweet?text=${enc(caption + " " + link)}`,
      sms: `sms:?&body=${enc(caption + " " + link)}`,
      whatsapp: `https://wa.me/?text=${enc(caption + " " + link)}`,
      email: `mailto:?subject=${enc("Check out Vendibook")}&body=${enc(caption + "\n\n" + link)}`,
    };
    if (channel === "native" && navigator.share) {
      navigator.share({ title: "Vendibook", text: caption, url: link }).catch(() => {});
      return;
    }
    window.open(urls[channel], "_blank", "noopener");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (!user) return <Navigate to="/auth?redirect=/referral/dashboard" replace />;

  return (
    <>
      <SEO title="Referral Dashboard — Vendibook" description="Track your referrals and payouts" />
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Referral Dashboard</h1>
            <p className="text-muted-foreground text-sm">Share your link — eligible rewards are paid after admin review.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/referral/terms">View terms <ExternalLink className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>

        {/* Program-disabled banner */}
        {!programEnabled && (
          <Card className="p-4 mb-6 border-slate-300 bg-slate-50 flex items-center gap-3">
            <Info className="h-5 w-5 text-slate-600 shrink-0" />
            <div>
              <p className="font-medium text-slate-900">The referral program is paused</p>
              <p className="text-xs text-slate-700">You can still see prior activity, but new attributions and payouts are temporarily disabled.</p>
            </div>
          </Card>
        )}

        {/* Beta / tax notice */}
        <Card className="p-4 mb-6 border-amber-200 bg-amber-50/50 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Beta program.</strong> You may earn an eligible reward when a qualified referral completes a transaction. All rewards
            go through admin review before payout. Rewards may be taxable income — Vendibook may require a W-9 before payout for U.S.
            referrers earning $600+ in a calendar year. Prohibited: spam, paid traffic, bots, link farms, scraping, fake accounts,
            self-referrals, or mass distribution outside normal personal or business sharing.
          </div>
        </Card>


        {/* Stripe Connect banner */}
        {!stripe.isConnected && (
          <Card className="p-4 mb-6 border-amber-300 bg-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Connect your bank to receive payouts</p>
                <p className="text-xs text-amber-700">Powered by Stripe Connect. Takes about 2 minutes.</p>
              </div>
            </div>
            <Button onClick={() => stripe.connectStripe("/referral/dashboard")} disabled={stripe.isConnecting}>
              {stripe.isConnecting ? "Opening…" : "Connect Stripe"}
            </Button>
          </Card>
        )}

        {/* Earnings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total earned</div>
            <div className="text-3xl font-bold mt-1">${stats.total.toFixed(0)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Pending</div>
            <div className="text-3xl font-bold mt-1 text-amber-600">${stats.pending.toFixed(0)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Available for payout</div>
            <div className="text-3xl font-bold mt-1 text-green-600">${stats.available.toFixed(0)}</div>
          </Card>
        </div>

        {/* Link generator */}
        {code && (
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="font-semibold">Your referral code</h3>
                <p className="text-xs text-muted-foreground">Speakable, shareable, permanent</p>
              </div>
              <div className="font-mono text-xl font-bold tracking-wider text-primary">{code.code}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sharing for</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {(["purchase", "supply", "rental"] as const).map((d) => (
                    <Button
                      key={d}
                      variant={destination === d ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDestination(d)}
                      className="capitalize"
                    >
                      {d}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Input readOnly value={link} className="text-xs font-mono" style={{ fontSize: "16px" }} />
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Button variant="outline" size="sm" onClick={() => share("sms")}><MessageCircle className="h-4 w-4 mr-1" /> SMS</Button>
                <Button variant="outline" size="sm" onClick={() => share("email")}><Mail className="h-4 w-4 mr-1" /> Email</Button>
                <Button variant="outline" size="sm" onClick={() => share("whatsapp")}><MessageCircle className="h-4 w-4 mr-1" /> WA</Button>
                <Button variant="outline" size="sm" onClick={() => share("facebook")}><Facebook className="h-4 w-4 mr-1" /> FB</Button>
                <Button variant="outline" size="sm" onClick={() => share("x")}><Twitter className="h-4 w-4 mr-1" /> X</Button>
                <Button variant="outline" size="sm" onClick={() => share("native")}><Share2 className="h-4 w-4 mr-1" /> More</Button>
              </div>

              {qr && (
                <div className="flex items-center gap-4 pt-4 border-t">
                  <img src={qr} alt="QR code" className="w-24 h-24 rounded border" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">QR code for in-person sharing</p>
                    <p className="text-xs text-muted-foreground mb-2">Print it on a card or show it at an event.</p>
                    <Button size="sm" variant="outline" asChild>
                      <a href={qr} download={`vendibook-${code.code}.png`}>
                        <Download className="h-4 w-4 mr-1" /> Download PNG
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t">FTC: Share copy includes "{FTC}" — required for social posts.</p>
            </div>
          </Card>
        )}

        {/* Referrals table */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Referral activity</h3>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {PROGRAMS.map((p) => (
                <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No referrals yet. Share your link to get started.</p>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Date</th>
                    <th>Program</th>
                    <th>Status</th>
                    <th className="text-right">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtered as any[]).map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="capitalize">{r.program_type || "—"}</td>
                      <td><Badge className={STATUS_STYLE[r.status] ?? STATUS_STYLE.pending}>{r.status}</Badge></td>
                      <td className="text-right font-medium">${Number(r.reward_amount ?? r.referrer_reward_amount ?? 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Payouts */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Payout history</h3>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Transfer ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>${Number(p.amount_net).toFixed(2)}</td>
                      <td><Badge>{p.status}</Badge></td>
                      <td className="font-mono text-xs">{p.stripe_transfer_id || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Terms gate */}
      <Dialog open={needsTerms} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept the referral terms</DialogTitle>
            <DialogDescription>
              Before generating your link, please review and accept the Vendibook Referral Program terms.{" "}
              <Link to="/referral/terms" className="underline text-primary">View full terms</Link>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 py-4">
            <Checkbox id="accept" checked={accepted} onCheckedChange={(c) => setAccepted(!!c)} />
            <label htmlFor="accept" className="text-sm leading-snug">
              I have read and accept the Referral Program terms (version {TERMS_VERSION}), including the no-self-referral, fraud, and tax provisions.
            </label>
          </div>
          <DialogFooter>
            <Button disabled={!accepted} onClick={acceptTerms}>Accept and continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReferralDashboard;
