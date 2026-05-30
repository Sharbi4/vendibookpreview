import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Feedback() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessTypeOther, setBusinessTypeOther] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    document.title = "Share your feedback · Vendibook";
    (async () => {
      if (!token) { setLoading(false); return; }
      // Find pending feedback row by token in metadata
      const { data } = await supabase
        .from("feedback_submissions")
        .select("id, context_type, context_id, metadata, rating, message")
        .filter("metadata->>token", "eq", token)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRecord(data);
      if (data?.rating) setDone(true);
      setLoading(false);
    })();
  }, [token]);

  const submit = async () => {
    if (!rating) { toast.error("Please select a rating"); return; }
    setSubmitting(true);
    const resolvedBusinessType = businessType === "Other" ? businessTypeOther.trim() : businessType;
    const newMetadata = {
      ...(record?.metadata || {}),
      token,
      status: "submitted",
      business_type: resolvedBusinessType || null,
      can_share: canShare,
    };
    const { error } = await supabase
      .from("feedback_submissions")
      .update({ rating, nps, message, metadata: newMetadata })
      .eq("id", record.id);
    if (error) { setSubmitting(false); toast.error("Couldn't save feedback"); return; }

    // Notify admin (best-effort, do not block UX)
    supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "feedback-received-admin",
        recipientEmail: "atlasmom421@gmail.com",
        idempotencyKey: `feedback-admin-${record.id}`,
        templateData: {
          fromEmail: record?.email,
          fromName: record?.metadata?.recipient_name,
          rating,
          nps,
          message,
          contextType: record?.context_type,
          contextLabel: record?.metadata?.listing_title,
          businessType: resolvedBusinessType,
          canShare,
        },
      },
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!token || !record) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Feedback link invalid</h1>
          <p className="text-muted-foreground">This feedback link is missing or expired. You can still reach us anytime.</p>
          <Button asChild><Link to="/contact">Contact support</Link></Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-2xl font-semibold">Thank you</h1>
          <p className="text-muted-foreground">Your feedback is logged and reviewed by our team.</p>
          <Button asChild variant="outline"><Link to="/">Back to Vendibook</Link></Button>
        </div>
      </div>
    );
  }

  const isPublish = record.context_type === "listing_publish";
  const label = record.metadata?.listing_title
    ? isPublish
      ? `publishing ${record.metadata.listing_title}`
      : `${record.context_type === "sale" ? "your purchase of" : "your booking at"} ${record.metadata.listing_title}`
    : "your recent experience";

  const businessOptions = [
    "Food truck owner",
    "Commercial kitchen / commissary",
    "Event or venue host",
    "Pop-up / market organizer",
    "Caterer or restaurant",
    "Shopper / customer",
    "Other",
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-xs tracking-[0.2em] text-muted-foreground font-semibold">FEEDBACK</p>
          <h1 className="text-3xl font-semibold tracking-tight">How was {label}?</h1>
          <p className="text-muted-foreground">30 seconds. We read every response.</p>
        </div>

        {isPublish && (
          <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-2">
            <p className="text-xs tracking-[0.2em] text-muted-foreground font-semibold">A NOTE FROM THE FOUNDERS</p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Vendibook is a tech startup built by working food-truck and small-business owners. We kept losing
              deals to clunky tools and hidden fees, so we built the marketplace we wished existed. Every host
              that publishes makes this real — and your honest take shapes what we build next.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Overall rating</p>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setRating(n)} className="p-1" aria-label={`${n} star`}>
                <Star className={`h-8 w-8 transition ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">How likely are you to recommend Vendibook? (0–10)</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({length: 11}, (_, i) => i).map(n => (
              <button
                key={n}
                onClick={() => setNps(n)}
                className={`h-9 w-9 rounded-md border text-sm font-medium transition ${nps === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}
              >{n}</button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">What kind of business are you running?</p>
          <div className="flex flex-wrap gap-2">
            {businessOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setBusinessType(opt)}
                className={`px-3 py-1.5 rounded-full border text-sm transition ${businessType === opt ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-foreground/40"}`}
              >{opt}</button>
            ))}
          </div>
          {businessType === "Other" && (
            <Textarea
              value={businessTypeOther}
              onChange={(e) => setBusinessTypeOther(e.target.value)}
              placeholder="Tell us about your business…"
              rows={2}
            />
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Anything else? (optional)</p>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What worked? What didn't?" rows={5} />
        </div>

        <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={canShare}
            onChange={(e) => setCanShare(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>You can share my feedback or story (anonymously if needed) with the Vendibook community.</span>
        </label>

        <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit feedback"}
        </Button>
      </div>
    </div>
  );
}
