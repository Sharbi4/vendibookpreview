import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Share2, Facebook, Twitter, MessageCircle, Mail, ExternalLink } from "lucide-react";
import { useReferralCode, useMyReferrals, buildReferralUrl } from "@/hooks/useReferral";
import { useShareKit } from "@/hooks/useShareKit";
import { toast } from "sonner";
import { useEffect } from "react";

export const ReferralPanel = () => {
  const { data: code, isLoading } = useReferralCode();
  const { data: referrals = [] } = useMyReferrals();
  const { templates, generate, share, loading: genLoading } = useShareKit();

  useEffect(() => {
    if (code && templates.length === 0) {
      // Use a generic referral caption (no listing-id needed; we just craft one client-side for now)
    }
  }, [code, templates.length]);

  if (isLoading) return <Card className="p-6">Loading…</Card>;
  if (!code) return null;

  const link = buildReferralUrl(code.code);
  const defaultCaption = `Join me on Vendibook — get $${code.get_amount} off your first booking with my code ${code.code}.`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Referral link copied");
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-primary/15 p-2.5">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Give ${code.give_amount}, Get ${code.get_amount}</h3>
          <p className="text-sm text-muted-foreground">Share your code. When friends complete their first booking, you both earn credit.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input readOnly value={code.code} className="font-mono text-lg tracking-wider" />
          <Button onClick={() => { navigator.clipboard.writeText(code.code); toast.success("Code copied"); }} variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" />
          <Button onClick={copy} variant="outline">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={() => { window.open(link, "_blank", "noopener"); toast.success("Opened your referral link"); }} className="w-full">
          <ExternalLink className="h-4 w-4 mr-1" /> Test your link in a new tab
        </Button>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => { share("facebook", link, defaultCaption); toast.success("Opened Facebook"); }}>
            <Facebook className="h-4 w-4 mr-1" /> FB
          </Button>
          <Button variant="outline" size="sm" onClick={() => { share("x", link, defaultCaption); toast.success("Opened X"); }}>
            <Twitter className="h-4 w-4 mr-1" /> X
          </Button>
          <Button variant="outline" size="sm" onClick={() => { share("sms", link, defaultCaption); toast.success("Opened SMS"); }}>
            <MessageCircle className="h-4 w-4 mr-1" /> SMS
          </Button>
          <Button variant="outline" size="sm" onClick={() => { share("email", link, defaultCaption); toast.success("Opened email"); }}>
            <Mail className="h-4 w-4 mr-1" /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => share("native", link, defaultCaption)}>
            <Share2 className="h-4 w-4 mr-1" /> More
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-border/50">
        <Stat label="Invited" value={code.total_referred} />
        <Stat label="Qualified" value={code.total_qualified} />
        <Stat label="Earned" value={`$${Number(code.total_earned).toFixed(0)}`} />
      </div>

      {referrals.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Recent referrals</h4>
          <ul className="space-y-1.5 max-h-40 overflow-auto">
            {referrals.slice(0, 5).map((r) => (
              <li key={r.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                <span className="capitalize font-medium">{r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="text-center">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
  </div>
);
