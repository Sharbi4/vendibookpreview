import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Star, CheckCircle2, MessageSquareHeart } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const RATING_LABELS: Record<number, string> = {
  1: "Rough",
  2: "Needs work",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};

const GENERAL_CATEGORIES = [
  "Marketplace",
  "Listing experience",
  "Buying",
  "Selling",
  "Renting / Hosting",
  "Payments",
  "Financing",
  "Tools",
  "Support",
  "Other",
];

const BUSINESS_OPTIONS = [
  "Food truck owner",
  "Commercial kitchen / commissary",
  "Event or venue host",
  "Pop-up / market organizer",
  "Caterer or restaurant",
  "Shopper / customer",
  "Other",
];

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="rounded-2xl p-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Star
              className={`h-9 w-9 transition ${
                n <= value ? "fill-primary text-primary" : "text-muted-foreground/35"
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">{RATING_LABELS[value]}</span>
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 sale-light">
        <div className="container max-w-2xl py-12 md:py-16">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-sale-card p-6 md:p-8 space-y-8">{children}</div>
  );
}

export default function Feedback() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const token = params.get("token") || "";
  const prefilledNps = params.get("nps");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  // shared
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");

  // contextual
  const [nps, setNps] = useState<number | null>(
    prefilledNps !== null && !Number.isNaN(parseInt(prefilledNps, 10))
      ? parseInt(prefilledNps, 10)
      : null,
  );
  const [businessType, setBusinessType] = useState("");
  const [businessTypeOther, setBusinessTypeOther] = useState("");
  const [canShare, setCanShare] = useState(false);

  // general
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [canContact, setCanContact] = useState(false);

  const isGeneral = !token;

  useEffect(() => {
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_feedback_by_token", { _token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (error) console.warn("feedback lookup failed", error);
      if (!row) setTokenInvalid(true);
      setRecord(row || null);
      if (row?.rating) setDone(true);
      setLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    if (!isGeneral || !user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      setName((prev) => prev || data?.first_name || data?.full_name || "");
      setEmail((prev) => prev || data?.email || user.email || "");
    })();
  }, [isGeneral, user]);

  const submitContextual = async () => {
    if (!rating && nps === null) {
      toast.error("Please select a rating or NPS score");
      return;
    }
    setSubmitting(true);
    const resolvedBusinessType = businessType === "Other" ? businessTypeOther.trim() : businessType;

    const { error } = await supabase.rpc("submit_feedback_by_token", {
      _token: token,
      _rating: rating || null,
      _nps: nps,
      _message: message,
      _business_type: resolvedBusinessType || null,
      _can_share: canShare,
    });
    if (error) {
      setSubmitting(false);
      toast.error("Couldn't save feedback");
      return;
    }

    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "feedback-received-admin",
          recipientEmail: "support@vendibook.com",
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
      })
      .catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  const submitGeneral = async () => {
    if (!rating) {
      toast.error("Please choose a star rating");
      return;
    }
    if (message.trim().length < 3) {
      toast.error("Please add a short note so we know what to fix");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_general_feedback", {
      _rating: rating,
      _message: message.trim().slice(0, 4000),
      _category: category || null,
      _name: name.trim().slice(0, 120) || null,
      _email: email.trim().slice(0, 255) || null,
      _can_contact: canContact,
      _can_share: canShare,
      _page: window.location.pathname,
    });

    if (error) {
      setSubmitting(false);
      toast.error("Couldn't save feedback. Please try again.");
      return;
    }

    supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "feedback-received-admin",
          recipientEmail: "support@vendibook.com",
          idempotencyKey: `feedback-admin-${data}`,
          templateData: {
            fromEmail: email.trim() || undefined,
            fromName: name.trim() || undefined,
            rating,
            nps: null,
            message: message.trim(),
            contextType: "general",
            contextLabel: category || "General feedback",
            businessType: category,
            canShare,
          },
        },
      })
      .catch(() => {});

    setSubmitting(false);
    setDone(true);
  };

  const seo = useMemo(
    () => (
      <SEO
        title={isGeneral ? "Share feedback with Vendibook" : "Share your feedback · Vendibook"}
        description={
          isGeneral
            ? "Tell the Vendibook team what is working and what should be better. Every response is read by a human."
            : "Token-gated feedback page."
        }
        noindex={!isGeneral}
        canonical="/feedback"
      />
    ),
    [isGeneral],
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        {seo}
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (done) {
    return (
      <Shell>
        {seo}
        <div className="rounded-3xl bg-sale-card p-8 md:p-12 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-semibold tracking-tight">Thank you — we read every response.</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your feedback goes straight to the Vendibook team. It shapes what we build, fix, and
            prioritize next — no ticket queue, no black hole.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild variant="cta" size="lg">
              <Link to="/search">Back to the marketplace</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Contact support</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ---------- General feedback ----------
  if (isGeneral || tokenInvalid) {
    return (
      <Shell>
        {seo}
        <div className="space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
              <MessageSquareHeart className="h-3.5 w-3.5" /> Help shape Vendibook
            </span>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">How did Vendibook do?</h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
              {tokenInvalid
                ? "That feedback link has expired, but you can still tell us anything. A quick rating and a few honest words help us decide what to improve next."
                : "A quick rating and a few honest words help us decide what to improve next."}
            </p>
          </div>

          <SurfaceCard>
            <StarPicker value={rating} onChange={setRating} label="Overall rating" />

            <div className="space-y-3">
              <Label htmlFor="general-message" className="text-sm font-semibold">
                What worked well? What could be better?
              </Label>
              <Textarea
                id="general-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={4000}
                placeholder="Tell us what happened, what you were trying to do, or what would make Vendibook better."
                className="rounded-2xl text-base"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold">What is this about? (optional)</p>
              <div className="flex flex-wrap gap-2">
                {GENERAL_CATEGORIES.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCategory(category === opt ? "" : opt)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      category === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fb-name" className="text-sm font-semibold">
                  Name (optional)
                </Label>
                <Input
                  id="fb-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="rounded-2xl text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fb-email" className="text-sm font-semibold">
                  Email (optional)
                </Label>
                <Input
                  id="fb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="rounded-2xl text-base"
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-6">
              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={canContact}
                  onCheckedChange={(v) => setCanContact(v === true)}
                  className="mt-0.5"
                />
                <span>May we contact you about this feedback?</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={canShare}
                  onCheckedChange={(v) => setCanShare(v === true)}
                  className="mt-0.5"
                />
                <span>Vendibook may share this feedback publicly (anonymously if you prefer).</span>
              </label>
            </div>

            <Button
              onClick={submitGeneral}
              disabled={submitting}
              variant="cta"
              size="lg"
              className="w-full"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send feedback"}
            </Button>
          </SurfaceCard>
        </div>
      </Shell>
    );
  }

  // ---------- Contextual (token) feedback ----------
  const isPublish = record.context_type === "listing_publish";
  const listingTitle = record.metadata?.listing_title as string | undefined;
  const contextLine = listingTitle
    ? isPublish
      ? `You just published ${listingTitle}. How did that go?`
      : `${record.context_type === "sale" ? "About your purchase of" : "About your booking at"} ${listingTitle}.`
    : "About your recent experience with Vendibook.";

  return (
    <Shell>
      {seo}
      <div className="space-y-8">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
            <MessageSquareHeart className="h-3.5 w-3.5" /> Help shape Vendibook
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">How did Vendibook do?</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
            {contextLine} A quick rating and a few honest words help us decide what to improve next.
          </p>
        </div>

        {isPublish && (
          <div className="rounded-3xl border border-border bg-secondary/60 p-5 space-y-2">
            <p className="text-[11px] tracking-[0.2em] text-muted-foreground font-semibold">
              A NOTE FROM THE FOUNDERS
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Vendibook is built by working food-truck and small-business owners. We kept losing deals
              to clunky tools and hidden fees, so we built the marketplace we wished existed. Your
              honest take shapes what we build next.
            </p>
          </div>
        )}

        <SurfaceCard>
          <StarPicker value={rating} onChange={setRating} label="Overall rating" />

          <div className="space-y-3">
            <Label htmlFor="ctx-message" className="text-sm font-semibold">
              What worked well? What could be better?
            </Label>
            <Textarea
              id="ctx-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="The more specific, the more useful."
              className="rounded-2xl text-base"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">What kind of business are you running?</p>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setBusinessType(businessType === opt ? "" : opt)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    businessType === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {businessType === "Other" && (
              <Input
                value={businessTypeOther}
                onChange={(e) => setBusinessTypeOther(e.target.value)}
                placeholder="Tell us about your business…"
                className="rounded-2xl text-base"
              />
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              How likely are you to recommend Vendibook? (0–10)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNps(n)}
                  className={`h-9 w-9 rounded-xl border text-sm font-medium transition ${
                    nps === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
            <Checkbox
              checked={canShare}
              onCheckedChange={(v) => setCanShare(v === true)}
              className="mt-0.5"
            />
            <span>
              Vendibook may share my feedback or story (anonymously if needed) with the community.
            </span>
          </label>

          <Button
            onClick={submitContextual}
            disabled={submitting}
            variant="cta"
            size="lg"
            className="w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit feedback"}
          </Button>
        </SurfaceCard>
      </div>
    </Shell>
  );
}
