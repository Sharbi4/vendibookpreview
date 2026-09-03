import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Mail, Phone, Truck } from "lucide-react";

const STATUSES = ["new", "quoted", "booked", "closed"] as const;
type Status = (typeof STATUSES)[number];

type FreightRequest = {
  id: string;
  user_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  pickup_location: string;
  delivery_location: string;
  equipment_type: string;
  year: string | null;
  length_ft: string | null;
  width_ft: string | null;
  height_ft: string | null;
  weight_lbs: string | null;
  runs_and_drives: string | null;
  pickup_date: string | null;
  deliver_by_date: string | null;
  notes: string | null;
  source_page: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  quote_amount_cents: number | null;
  quote_notes: string | null;
  quote_transit_days: string | null;
  quoted_at: string | null;
  quoted_by: string | null;
};

type QuoteDraft = { price: string; transit: string; notes: string };

const statusTone: Record<string, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  quoted: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  booked: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  closed: "bg-muted text-muted-foreground border-border",
};

export default function AdminFreightRequests() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<FreightRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, QuoteDraft>>({});
  const [savingQuote, setSavingQuote] = useState<string | null>(null);

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

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("freight_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      toast({ title: "Failed to load freight requests", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as FreightRequest[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("freight_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    toast({ title: `Marked ${status}` });
  };

  const draftFor = (r: FreightRequest): QuoteDraft =>
    quoteDrafts[r.id] ?? {
      price: r.quote_amount_cents != null ? (r.quote_amount_cents / 100).toFixed(2) : "",
      transit: r.quote_transit_days ?? "",
      notes: r.quote_notes ?? "",
    };

  const saveQuote = async (r: FreightRequest) => {
    const draft = draftFor(r);
    const parsed = Number(draft.price.replace(/[^0-9.]/g, ""));
    if (!draft.price.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      toast({ title: "Enter a valid quote price", variant: "destructive" });
      return;
    }
    const payload = {
      quote_amount_cents: Math.round(parsed * 100),
      quote_transit_days: draft.transit.trim() || null,
      quote_notes: draft.notes.trim() || null,
      quoted_at: new Date().toISOString(),
      quoted_by: user?.id ?? null,
      status: "quoted",
    };
    setSavingQuote(r.id);
    const { error } = await supabase.from("freight_requests").update(payload).eq("id", r.id);
    setSavingQuote(null);
    if (error) {
      toast({ title: "Could not save quote", description: error.message, variant: "destructive" });
      return;
    }
    setRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, ...payload } : x)));
    setQuoteDrafts((d) => {
      const next = { ...d };
      delete next[r.id];
      return next;
    });
    toast({ title: "Quote saved", description: `$${parsed.toFixed(2)} recorded for this request.` });
  };

  const quoteMailto = (r: FreightRequest) => {
    const draft = draftFor(r);
    const price = draft.price ? `$${Number(draft.price.replace(/[^0-9.]/g, "") || 0).toFixed(2)}` : "";
    const subject = `Your Vendibook freight quote: ${r.pickup_location} → ${r.delivery_location}`;
    const body = [
      `Hi ${r.contact_name.split(" ")[0] || "there"},`,
      "",
      `Here is your freight quote for the ${r.equipment_type} moving from ${r.pickup_location} to ${r.delivery_location}:`,
      "",
      `Quoted price: ${price}`,
      draft.transit ? `Estimated transit: ${draft.transit}` : "",
      draft.notes ? `Details: ${draft.notes}` : "",
      "",
      "Reply to this email to book, and we'll confirm pickup scheduling.",
      "",
      "Vendibook Freight",
      "support@vendibook.com · (725) 755-9598",
    ]
      .filter(Boolean)
      .join("\n");
    return `mailto:${r.contact_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const saveNote = async (id: string) => {
    const admin_notes = noteDrafts[id] ?? "";
    const { error } = await supabase.from("freight_requests").update({ admin_notes }).eq("id", id);
    if (error) {
      toast({ title: "Could not save note", description: error.message, variant: "destructive" });
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, admin_notes } : x)));
    toast({ title: "Note saved" });
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.contact_name, r.contact_email, r.contact_phone, r.pickup_location, r.delivery_location, r.equipment_type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, filter, search]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dims = (r: FreightRequest) =>
    [r.length_ft && `${r.length_ft} ft L`, r.width_ft && `${r.width_ft} ft W`, r.height_ft && `${r.height_ft} ft H`]
      .filter(Boolean)
      .join(" × ");

  const Field = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value}</p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Freight Requests | Admin" description="Freight quote requests submitted from the site." noindex />
      <Header />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" aria-hidden="true" /> Freight requests
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every quote request submitted from Ship Your Food Truck, with contact details.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, route…"
            className="max-w-sm h-11"
          />
          <div className="flex flex-wrap gap-2">
            {(["all", ...STATUSES] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setFilter(s as Status | "all")}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-20 text-center">No freight requests yet.</p>
        ) : (
          <div className="space-y-4">
            {visible.map((r) => (
              <Card key={r.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {r.pickup_location} → {r.delivery_location}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleString()} · {r.equipment_type}
                        {r.user_id ? " · signed-in user" : " · guest"}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusTone[r.status] ?? ""}>
                      {r.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4 rounded-xl border border-border bg-muted/30 p-4">
                    <Field label="Name" value={r.contact_name} />
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Email</p>
                      <a href={`mailto:${r.contact_email}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 break-all">
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" /> {r.contact_email}
                      </a>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Phone</p>
                      <a href={`tel:${r.contact_phone.replace(/[^\d+]/g, "")}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" aria-hidden="true" /> {r.contact_phone}
                      </a>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-4 gap-4">
                    <Field label="Year" value={r.year} />
                    <Field label="Dimensions" value={dims(r) || null} />
                    <Field label="Weight" value={r.weight_lbs ? `${r.weight_lbs} lbs` : null} />
                    <Field label="Runs and drives" value={r.runs_and_drives} />
                    <Field label="Preferred pickup" value={r.pickup_date} />
                    <Field label="Deliver by" value={r.deliver_by_date} />
                    <Field label="Source" value={r.source_page} />
                  </div>

                  <Field label="Notes from requester" value={r.notes} />

                  <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Quote response</p>
                      {r.quoted_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Last quoted {new Date(r.quoted_at).toLocaleString()}
                          {r.quote_amount_cents != null
                            ? ` · $${(r.quote_amount_cents / 100).toFixed(2)}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor={`price-${r.id}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Quoted price (USD)
                        </label>
                        <Input
                          id={`price-${r.id}`}
                          inputMode="decimal"
                          placeholder="2450.00"
                          className="h-11 mt-1.5 text-base sm:text-sm"
                          value={draftFor(r).price}
                          onChange={(e) =>
                            setQuoteDrafts((d) => ({ ...d, [r.id]: { ...draftFor(r), price: e.target.value } }))
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor={`transit-${r.id}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Estimated transit
                        </label>
                        <Input
                          id={`transit-${r.id}`}
                          placeholder="5–7 days"
                          className="h-11 mt-1.5 text-base sm:text-sm"
                          value={draftFor(r).transit}
                          onChange={(e) =>
                            setQuoteDrafts((d) => ({ ...d, [r.id]: { ...draftFor(r), transit: e.target.value } }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`qnotes-${r.id}`} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Quote details for the customer
                      </label>
                      <Textarea
                        id={`qnotes-${r.id}`}
                        rows={2}
                        placeholder="Carrier, insurance coverage, what's included, expiration…"
                        className="mt-1.5 text-sm"
                        value={draftFor(r).notes}
                        onChange={(e) =>
                          setQuoteDrafts((d) => ({ ...d, [r.id]: { ...draftFor(r), notes: e.target.value } }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void saveQuote(r)} disabled={savingQuote === r.id}>
                        {savingQuote === r.id && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save quote
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={quoteMailto(r)}>
                          <Mail className="w-4 h-4 mr-2" aria-hidden="true" /> Email quote
                        </a>
                      </Button>
                    </div>
                  </div>



                  <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Internal notes</p>
                      <Textarea
                        rows={2}
                        value={noteDrafts[r.id] ?? r.admin_notes ?? ""}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder="Carrier quoted, follow-up date, etc."
                        className="text-sm"
                      />
                    </div>
                    <Button variant="outline" onClick={() => void saveNote(r.id)}>
                      Save note
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={r.status === s ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => void setStatus(r.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
