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
};

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
