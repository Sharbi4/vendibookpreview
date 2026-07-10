/**
 * ReportIssueDialog — one reusable "Report an Issue" surface for the whole app.
 *
 * The dialog auto-captures non-sensitive context (page URL, browser/device, feature
 * area, related record IDs) and submits through the `submit-support-ticket` edge
 * function so priority + confirmation email + admin routing are server-controlled.
 *
 * Opening/submitting the dialog NEVER mutates the parent view: no navigation, no
 * state resets, no writes to draft, purchase, permit, or listing records.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Loader2, Paperclip, X, CheckCircle2 } from "lucide-react";

export type ReportFeatureArea =
  | "listing_wizard"
  | "permit_path"
  | "purchase"
  | "rental"
  | "dashboard"
  | "message"
  | "profile"
  | "listing_page"
  | "review"
  | "fraud"
  | "other";

export interface ReportIssueContext {
  featureArea: ReportFeatureArea;
  defaultCategory?: string;
  wizardStep?: string;
  transactionStatus?: string;
  paymentMethod?: string;
  related?: {
    listing_id?: string | null;
    sale_transaction_id?: string | null;
    booking_id?: string | null;
    permit_roadmap_id?: string | null;
    draft_id?: string | null;
    conversation_id?: string | null;
    review_id?: string | null;
    reported_user_id?: string | null;
  };
  lastErrorId?: string | null;
  lastErrorCategory?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ReportIssueContext;
}

// Category options grouped for the dropdown. Keys must match the server priority map.
const CATEGORIES_BY_AREA: Record<ReportFeatureArea, Array<{ value: string; label: string }>> = {
  listing_wizard: [
    { value: "listing_will_not_publish", label: "Listing won't publish" },
    { value: "listing_will_not_save", label: "Listing won't save" },
    { value: "photo_upload_problem", label: "Photo upload problem" },
    { value: "draft_missing", label: "Draft is missing" },
    { value: "validation_error", label: "Validation error I don't understand" },
    { value: "technical_error", label: "Other technical error" },
    { value: "other", label: "Something else" },
  ],
  permit_path: [
    { value: "permit_path_will_not_save", label: "Permit Path won't save" },
    { value: "permit_path_incorrect_info", label: "Permit info looks wrong" },
    { value: "permit_path_missing_info", label: "Permit info is missing" },
    { value: "permit_path_wrong_location", label: "Wrong city/county/state" },
    { value: "permit_path_resume_error", label: "Can't resume my Permit Path" },
    { value: "technical_error", label: "Technical error" },
    { value: "other", label: "Something else" },
  ],
  purchase: [
    { value: "cannot_access_purchase", label: "I can't access my purchase" },
    { value: "purchase_missing", label: "My purchase is missing" },
    { value: "payment_issue", label: "Payment issue" },
    { value: "pay_in_person_confirmation", label: "Pay-in-person confirmation issue" },
    { value: "item_not_received", label: "I didn't receive the item" },
    { value: "seller_did_not_receive_payment", label: "Seller says they didn't get paid" },
    { value: "purchase_cannot_progress", label: "Order won't move to the next step" },
    { value: "confirmation_action_failed", label: "Confirmation button doesn't work" },
    { value: "suspected_fraud", label: "Suspected fraud" },
    { value: "other", label: "Something else" },
  ],
  rental: [
    { value: "rental_cannot_progress", label: "Rental won't move to the next step" },
    { value: "payment_issue", label: "Payment issue" },
    { value: "confirmation_action_failed", label: "A booking action failed" },
    { value: "other", label: "Something else" },
  ],
  dashboard: [
    { value: "dashboard_missing_item", label: "Something is missing from my dashboard" },
    { value: "technical_error", label: "Dashboard technical error" },
    { value: "other", label: "Something else" },
  ],
  message: [
    { value: "suspicious_message", label: "Suspicious message" },
    { value: "harassment", label: "Harassment" },
    { value: "off_platform_payment_request", label: "Someone asked me to pay off-platform" },
    { value: "other", label: "Something else" },
  ],
  profile: [
    { value: "profile_technical_error", label: "Profile technical error" },
    { value: "other", label: "Something else" },
  ],
  listing_page: [
    { value: "inaccurate_info", label: "Inaccurate information" },
    { value: "suspected_fraud", label: "Suspected fraud" },
    { value: "duplicate_listing", label: "Duplicate listing" },
    { value: "unavailable_item", label: "Item is unavailable" },
    { value: "inappropriate_content", label: "Inappropriate content" },
    { value: "ownership_concern", label: "Ownership concern" },
    { value: "unsafe_prohibited", label: "Unsafe or prohibited activity" },
    { value: "other", label: "Something else" },
  ],
  review: [
    { value: "review_missing", label: "Review isn't available yet" },
    { value: "inappropriate_review", label: "Inappropriate review" },
    { value: "other", label: "Something else" },
  ],
  fraud: [
    { value: "suspected_fraud", label: "Suspected fraud" },
    { value: "unauthorized_transaction", label: "Unauthorized transaction" },
    { value: "security_privacy", label: "Security or privacy concern" },
    { value: "other", label: "Something else" },
  ],
  other: [
    { value: "technical_error", label: "Technical error" },
    { value: "other", label: "Something else" },
  ],
};

const AREA_LABEL: Record<ReportFeatureArea, string> = {
  listing_wizard: "Listing wizard",
  permit_path: "Permit Path",
  purchase: "Purchase",
  rental: "Rental",
  dashboard: "Dashboard",
  message: "Messages",
  profile: "Profile",
  listing_page: "Listing page",
  review: "Reviews",
  fraud: "Fraud / safety",
  other: "General",
};

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB / file
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif", "application/pdf"]);

const schema = z.object({
  title: z.string().trim().min(3, "Give it a short title").max(200),
  description: z.string().trim().min(10, "Add a bit more detail so we can help").max(5000),
  what_i_was_doing: z.string().trim().max(2000).optional(),
  what_happened_instead: z.string().trim().max(2000).optional(),
  reply_email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
});

export function ReportIssueDialog({ open, onOpenChange, context }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const categories = CATEGORIES_BY_AREA[context.featureArea] ?? CATEGORIES_BY_AREA.other;

  const [category, setCategory] = useState(context.defaultCategory || categories[0]?.value || "other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [whatDoing, setWhatDoing] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [replyEmail, setReplyEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ referenceCode: string } | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  // Reset transient state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setSubmitted(null);
      setTitle("");
      setDescription("");
      setWhatDoing("");
      setWhatHappened("");
      setIsBlocking(false);
      setFiles([]);
      setReplyEmail("");
      setCategory(context.defaultCategory || categories[0]?.value || "other");
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [open, context.defaultCategory, categories]);

  const browserInfo = useMemo(() => {
    if (typeof navigator === "undefined") return "";
    return `${navigator.userAgent}`.slice(0, 500);
  }, []);
  const deviceType = useMemo(() => {
    if (typeof navigator === "undefined") return "";
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const merged = [...files];
    for (const f of list) {
      if (merged.length >= MAX_FILES) break;
      if (!ALLOWED_TYPES.has(f.type)) {
        toast({ title: "Unsupported file", description: `${f.name} isn't a supported image/PDF.`, variant: "destructive" });
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast({ title: "File too large", description: `${f.name} is over 10 MB.`, variant: "destructive" });
        continue;
      }
      merged.push(f);
    }
    setFiles(merged);
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to submit a report.", variant: "destructive" });
      return;
    }

    const parsed = schema.safeParse({ title, description, what_i_was_doing: whatDoing, what_happened_instead: whatHappened, reply_email: replyEmail });
    if (!parsed.success) {
      toast({ title: "Please check the form", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload attachments to private bucket under {uid}/{ticketFolder}/
      const ticketFolder = idempotencyKeyRef.current;
      const uploaded: Array<{ path: string; name: string; content_type?: string; size?: number }> = [];
      for (const f of files) {
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
        const path = `${user.id}/${ticketFolder}/${crypto.randomUUID()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("support-ticket-attachments").upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type,
        });
        if (upErr) {
          console.error("attachment upload failed", upErr);
          toast({ title: "Attachment failed", description: `${f.name} could not be uploaded. Your report will still send.`, variant: "destructive" });
          continue;
        }
        uploaded.push({ path, name: f.name, content_type: f.type, size: f.size });
      }

      // 2. Submit ticket via edge function.
      const { data, error } = await supabase.functions.invoke("submit-support-ticket", {
        body: {
          feature_area: context.featureArea,
          category,
          title: parsed.data.title,
          description: parsed.data.description,
          what_i_was_doing: parsed.data.what_i_was_doing || null,
          what_happened_instead: parsed.data.what_happened_instead || null,
          is_blocking: isBlocking,
          reply_email: parsed.data.reply_email || undefined,
          related_listing_id: context.related?.listing_id,
          related_sale_transaction_id: context.related?.sale_transaction_id,
          related_booking_id: context.related?.booking_id,
          related_permit_roadmap_id: context.related?.permit_roadmap_id,
          related_draft_id: context.related?.draft_id,
          related_conversation_id: context.related?.conversation_id,
          related_review_id: context.related?.review_id,
          related_reported_user_id: context.related?.reported_user_id,
          page_url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : "",
          wizard_step: context.wizardStep,
          transaction_status: context.transactionStatus,
          payment_method: context.paymentMethod,
          browser_info: browserInfo,
          device_type: deviceType,
          last_error_id: context.lastErrorId,
          last_error_category: context.lastErrorCategory,
          attachment_storage_paths: uploaded,
          idempotency_key: idempotencyKeyRef.current,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSubmitted({ referenceCode: data.reference_code });

      // Fire-and-forget analytics event (best-effort — never blocks).
      try {
        await supabase.from("analytics_events").insert({
          event_name: "report_issue_submitted",
          user_id: user.id,
          properties: {
            feature_area: context.featureArea,
            category,
            priority: data.priority,
            reference_code: data.reference_code,
          },
        });
      } catch { /* ignore */ }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      toast({ title: "Couldn't submit report", description: msg, variant: "destructive" });
      try {
        await supabase.from("analytics_events").insert({
          event_name: "report_issue_failed",
          user_id: user.id,
          properties: { feature_area: context.featureArea, category, error: msg.slice(0, 200) },
        });
      } catch { /* ignore */ }
    } finally {
      setSubmitting(false);
    }
  };

  // Success state — no navigation, user closes the dialog themselves.
  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              We got your report
            </DialogTitle>
            <DialogDescription>
              Vendibook Customer Success will review it. Save this reference for any follow-up.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Reference</p>
            <p className="mt-1 font-mono text-lg">{submitted.referenceCode}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            You'll receive an email confirmation. Your work on this page hasn't been changed —
            you can continue where you left off. For urgent issues, call (725) 755-9598.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Report an issue — {AREA_LABEL[context.featureArea]}
          </DialogTitle>
          <DialogDescription>
            Submitting this won't change your listing, purchase, rental, or Permit Path.
            Your progress is preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ri-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="ri-category" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ri-title">Short title *</Label>
            <Input id="ri-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Publish button does nothing" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="ri-description">What's going on? *</Label>
            <Textarea id="ri-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={4} placeholder="Describe the problem in your own words." className="mt-1" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ri-doing">What were you trying to do?</Label>
              <Textarea id="ri-doing" value={whatDoing} onChange={(e) => setWhatDoing(e.target.value)} maxLength={2000} rows={2} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ri-happened">What happened instead?</Label>
              <Textarea id="ri-happened" value={whatHappened} onChange={(e) => setWhatHappened(e.target.value)} maxLength={2000} rows={2} className="mt-1" />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="ri-blocking" checked={isBlocking} onCheckedChange={(v) => setIsBlocking(!!v)} />
            <div>
              <Label htmlFor="ri-blocking" className="cursor-pointer">This is preventing me from continuing</Label>
              <p className="text-xs text-muted-foreground">Check this if you can't finish what you were doing.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="ri-email">Reply email (optional)</Label>
            <Input id="ri-email" type="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} placeholder={user?.email || "you@example.com"} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Leave blank to use your account email.</p>
          </div>

          <div>
            <Label>Screenshots or PDFs (optional, max {MAX_FILES} · 10 MB each)</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1 rounded-full border bg-muted/60 px-3 py-1 text-xs">
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button type="button" onClick={() => removeFile(i)} className="ml-1 text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.length < MAX_FILES && (
                <label className="flex cursor-pointer items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs hover:bg-muted/40">
                  <Paperclip className="h-3 w-3" /> Add file
                  <input type="file" hidden accept="image/*,application/pdf" multiple onChange={handleFileSelect} />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>) : "Send report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
