import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  ImagePlus,
  X,
  Megaphone,
  Camera,
  Link2,
  Store,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";

const BUSINESS_TYPES = [
  "Food truck",
  "Food trailer",
  "Food cart",
  "Commercial kitchen / commissary",
  "Catering",
  "Coffee / beverage",
  "Dessert / bakery",
  "Event or venue host",
  "Supplier / builder",
  "Other",
];

const MAX_PHOTOS = 8;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type Pending = {
  file: File;
  preview: string;
  kind: "photo" | "logo";
  path?: string;
  uploading: boolean;
  error?: string;
};

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-sale-card p-6 md:p-8 space-y-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function CommunitySpotlight() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<Record<string, string>>({
    contact_name: "",
    email: "",
    phone: "",
    business_name: "",
    business_type: "",
    city: "",
    state: "",
    years_operating: "",
    offerings: "",
    story: "",
    differentiator: "",
    proud_of: "",
    whats_new: "",
    website: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    other_social: "",
    listing_url: "",
    product_feedback_experience: "",
    product_feedback_wishlist: "",
  });

  const [media, setMedia] = useState<Pending[]>([]);
  const [ownsConsent, setOwnsConsent] = useState(false);
  const [pubConsent, setPubConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, email, phone_number, business_name, public_city, public_state")
        .eq("id", user.id)
        .maybeSingle();
      if (!data) return;
      setForm((f) => ({
        ...f,
        contact_name:
          f.contact_name ||
          data.full_name ||
          [data.first_name, data.last_name].filter(Boolean).join(" ") ||
          "",
        email: f.email || data.email || user.email || "",
        phone: f.phone || data.phone_number || "",
        business_name: f.business_name || data.business_name || "",
        city: f.city || data.public_city || "",
        state: f.state || data.public_state || "",
      }));
    })();
  }, [user]);

  useEffect(() => {
    return () => media.forEach((m) => URL.revokeObjectURL(m.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadOne = async (file: File, kind: "photo" | "logo") => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    const path = `submissions/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("spotlight-media").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const onFiles = async (files: FileList | null, kind: "photo" | "logo" = "photo") => {
    if (!files?.length) return;
    const incoming = Array.from(files);
    const room = MAX_PHOTOS - media.length;
    if (room <= 0) {
      toast.error(`You can upload up to ${MAX_PHOTOS} images.`);
      return;
    }
    const batch = incoming.slice(0, room).filter((f) => {
      if (!ALLOWED.includes(f.type)) {
        toast.error(`${f.name}: only JPG, PNG or WebP images are supported.`);
        return false;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} is larger than 10MB.`);
        return false;
      }
      return true;
    });
    if (!batch.length) return;

    const start = media.length;
    setMedia((m) => [
      ...m,
      ...batch.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        kind,
        uploading: true,
      })),
    ]);

    for (let i = 0; i < batch.length; i++) {
      const idx = start + i;
      try {
        const path = await uploadOne(batch[i], kind);
        setMedia((m) => m.map((x, j) => (j === idx ? { ...x, path, uploading: false } : x)));
      } catch (e) {
        setMedia((m) =>
          m.map((x, j) =>
            j === idx ? { ...x, uploading: false, error: (e as Error).message } : x,
          ),
        );
        toast.error(`Upload failed for ${batch[i].name}`);
      }
    }
  };

  const removeMedia = (idx: number) => {
    setMedia((m) => {
      const target = m[idx];
      if (target) URL.revokeObjectURL(target.preview);
      return m.filter((_, i) => i !== idx);
    });
  };

  const uploading = media.some((m) => m.uploading);

  const requiredMissing = useMemo(() => {
    const req = ["contact_name", "email", "business_name", "business_type", "city", "state", "offerings", "story"];
    return req.filter((k) => !form[k]?.trim());
  }, [form]);

  const submit = async () => {
    if (requiredMissing.length) {
      toast.error("Please complete the required fields marked with *");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!ownsConsent || !pubConsent) {
      toast.error("Please confirm both permission checkboxes");
      return;
    }
    if (uploading) {
      toast.error("Please wait for your photos to finish uploading");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...form,
      listing_id: params.get("listing_id") || undefined,
      source: params.get("utm_campaign") || "spotlight_form",
      owns_content_consent: true,
      publication_consent: true,
      marketing_opt_in: marketingOptIn,
      media: media
        .filter((m) => m.path)
        .map((m) => ({
          path: m.path,
          kind: m.kind,
          file_name: m.file.name,
          content_type: m.file.type,
          size: m.file.size,
        })),
    };

    const { data, error } = await supabase.functions.invoke("spotlight-submit", { body: payload });
    setSubmitting(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const seo = (
    <SEO
      title="Vendibook Business Spotlight — share your story"
      description="Tell Vendibook about your food truck, trailer, kitchen or mobile-food business. Selected businesses may be featured on the Vendibook blog, social channels and community emails."
      canonical="/community/spotlight"
    />
  );

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {seo}
        <Header />
        <main className="flex-1 sale-light">
          <div className="container max-w-2xl py-16 md:py-24">
            <div className="rounded-3xl bg-sale-card p-8 md:p-12 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <h1 className="text-3xl font-semibold tracking-tight">Submission received.</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thanks for sharing your story. A real person on the Vendibook team reviews every
                submission. If we'd like to feature your business, we'll reach out by email first —
                nothing gets published without your go-ahead.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button asChild variant="cta" size="lg">
                  <Link to="/search">Explore the marketplace</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/blog">Read Vendibook stories</Link>
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {seo}
      <Header />
      <main className="flex-1 sale-light">
        <div className="container max-w-3xl py-12 md:py-16 space-y-8">
          {/* Hero */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full chip-accent px-3 py-1 text-xs font-medium">
              <Megaphone className="h-3.5 w-3.5" /> Vendibook Business Spotlight
            </span>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
              Tell us what you're building.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl">
              Vendibook is built around the people doing the work. Share your story, a few photos and
              where people can find you. Selected businesses may be featured on the Vendibook blog,
              our social channels or in community emails.
            </p>
            <p className="text-sm text-muted-foreground">
              Free to submit · Takes about 5 minutes · Submitting does not guarantee publication
            </p>
          </div>

          {/* About you */}
          <Section icon={UserIcon} title="About you" description="So we know who we're talking to.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="contact_name" label="Your name" required>
                <Input id="contact_name" value={form.contact_name} onChange={set("contact_name")} className="rounded-2xl text-base" />
              </Field>
              <Field id="email" label="Email" required>
                <Input id="email" type="email" value={form.email} onChange={set("email")} className="rounded-2xl text-base" />
              </Field>
              <Field id="phone" label="Phone (optional)">
                <Input id="phone" value={form.phone} onChange={set("phone")} className="rounded-2xl text-base" />
              </Field>
              <Field id="years_operating" label="Years in business (optional)">
                <Input id="years_operating" value={form.years_operating} onChange={set("years_operating")} placeholder="e.g. 3 years" className="rounded-2xl text-base" />
              </Field>
            </div>
          </Section>

          {/* Your business */}
          <Section icon={Store} title="Your business" description="The essentials, then the story.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="business_name" label="Business name" required>
                <Input id="business_name" value={form.business_name} onChange={set("business_name")} className="rounded-2xl text-base" />
              </Field>
              <Field id="city" label="City" required>
                <Input id="city" value={form.city} onChange={set("city")} className="rounded-2xl text-base" />
              </Field>
              <Field id="state" label="State" required>
                <Input id="state" value={form.state} onChange={set("state")} placeholder="AZ" className="rounded-2xl text-base" />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-semibold">
                  Business type <span className="text-primary">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, business_type: t }))}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        form.business_type === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Field id="offerings" label="What do you serve or offer?" required>
              <Textarea id="offerings" rows={3} value={form.offerings} onChange={set("offerings")} className="rounded-2xl text-base" placeholder="Menu, services, specialties…" />
            </Field>
            <Field id="story" label="Your story" required hint="How you started, what you've learned, where you're headed.">
              <Textarea id="story" rows={6} value={form.story} onChange={set("story")} className="rounded-2xl text-base" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="differentiator" label="What makes you different? (optional)">
                <Textarea id="differentiator" rows={3} value={form.differentiator} onChange={set("differentiator")} className="rounded-2xl text-base" />
              </Field>
              <Field id="proud_of" label="What are you most proud of? (optional)">
                <Textarea id="proud_of" rows={3} value={form.proud_of} onChange={set("proud_of")} className="rounded-2xl text-base" />
              </Field>
            </div>
            <Field id="whats_new" label="Anything new coming up? (optional)" hint="New truck, new location, new menu, events.">
              <Textarea id="whats_new" rows={2} value={form.whats_new} onChange={set("whats_new")} className="rounded-2xl text-base" />
            </Field>
          </Section>

          {/* Find you online */}
          <Section icon={Link2} title="Find you online" description="Where should people go after they read about you?">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="website" label="Website">
                <Input id="website" value={form.website} onChange={set("website")} placeholder="https://" className="rounded-2xl text-base" />
              </Field>
              <Field id="listing_url" label="Your Vendibook listing (optional)">
                <Input id="listing_url" value={form.listing_url} onChange={set("listing_url")} placeholder="https://vendibook.com/listing/…" className="rounded-2xl text-base" />
              </Field>
              <Field id="instagram" label="Instagram">
                <Input id="instagram" value={form.instagram} onChange={set("instagram")} placeholder="@handle" className="rounded-2xl text-base" />
              </Field>
              <Field id="facebook" label="Facebook">
                <Input id="facebook" value={form.facebook} onChange={set("facebook")} className="rounded-2xl text-base" />
              </Field>
              <Field id="tiktok" label="TikTok">
                <Input id="tiktok" value={form.tiktok} onChange={set("tiktok")} className="rounded-2xl text-base" />
              </Field>
              <Field id="youtube" label="YouTube">
                <Input id="youtube" value={form.youtube} onChange={set("youtube")} className="rounded-2xl text-base" />
              </Field>
              <Field id="linkedin" label="LinkedIn">
                <Input id="linkedin" value={form.linkedin} onChange={set("linkedin")} className="rounded-2xl text-base" />
              </Field>
              <Field id="other_social" label="Anywhere else">
                <Input id="other_social" value={form.other_social} onChange={set("other_social")} className="rounded-2xl text-base" />
              </Field>
            </div>
          </Section>

          {/* Photos */}
          <Section
            icon={Camera}
            title="Photos & brand assets"
            description={`Up to ${MAX_PHOTOS} images, 10MB each. JPG, PNG or WebP. Horizontal shots work best.`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {media.map((m, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary/40">
                  <img src={m.preview} alt={m.file.name} className="h-full w-full object-cover" />
                  {m.uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                  {m.error && (
                    <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-2 py-1 text-[10px] text-destructive-foreground">
                      Failed
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove ${m.file.name}`}
                    onClick={() => removeMedia(i)}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-background/85 text-foreground shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setMedia((arr) =>
                        arr.map((x, j) =>
                          j === i ? { ...x, kind: x.kind === "logo" ? "photo" : "logo" } : x,
                        ),
                      )
                    }
                    className="absolute left-1.5 bottom-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium"
                  >
                    {m.kind === "logo" ? "Logo" : "Photo"}
                  </button>
                </div>
              ))}
              {media.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-2xl border border-dashed border-border grid place-items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition"
                >
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs font-medium">Add photos</span>
                </button>
              )}
            </div>
          </Section>

          {/* Vendibook input */}
          <Section
            icon={Megaphone}
            title="Your input on Vendibook"
            description="Private to the Vendibook team — never published."
          >
            <Field id="product_feedback_experience" label="How has your Vendibook experience been?">
              <Textarea id="product_feedback_experience" rows={3} value={form.product_feedback_experience} onChange={set("product_feedback_experience")} className="rounded-2xl text-base" />
            </Field>
            <Field id="product_feedback_wishlist" label="What should we build or fix next?">
              <Textarea id="product_feedback_wishlist" rows={3} value={form.product_feedback_wishlist} onChange={set("product_feedback_wishlist")} className="rounded-2xl text-base" />
            </Field>
          </Section>

          {/* Permissions */}
          <Section icon={ShieldCheck} title="Permissions" description="Required before we can review your submission.">
            <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={ownsConsent} onCheckedChange={(v) => setOwnsConsent(v === true)} className="mt-0.5" />
              <span>
                I own or have the rights to the photos, logos and content I've submitted, and I can
                grant Vendibook permission to use them.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={pubConsent} onCheckedChange={(v) => setPubConsent(v === true)} className="mt-0.5" />
              <span>
                Vendibook may publish my business name, story, photos and links on the Vendibook blog,
                website, social channels and community emails.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={marketingOptIn} onCheckedChange={(v) => setMarketingOptIn(v === true)} className="mt-0.5" />
              <span>Send me occasional Vendibook community updates. (Optional — unsubscribe anytime.)</span>
            </label>

            <div className="border-t border-border pt-6 space-y-4">
              <Button
                onClick={submit}
                disabled={submitting || uploading}
                variant="cta"
                size="lg"
                className="w-full"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit my spotlight"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We review every submission. Submitting does not guarantee publication, and we'll email
                you before anything goes live. See our{" "}
                <Link to="/legal" className="underline">
                  legal center
                </Link>
                .
              </p>
            </div>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
