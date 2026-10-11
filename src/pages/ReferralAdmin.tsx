import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  ShieldAlert,
  PlayCircle,
  FileDown,
  Check,
  X,
  Pause,
  DollarSign,
  StickyNote,
  Flag,
} from "lucide-react";

type ActionKind =
  | "approve"
  | "reject"
  | "place_on_hold"
  | "mark_paid_manual"
  | "add_note"
  | "flag_fraud";

const ACTION_META: Record<
  ActionKind,
  { title: string; description: string; confirmLabel: string; requiresNote: boolean; noteLabel: string; extra?: "hold_until" | "severity" }
> = {
  approve: {
    title: "Approve referral",
    description: "Move this referral to approved and make it eligible for payout.",
    confirmLabel: "Approve",
    requiresNote: false,
    noteLabel: "Admin note (optional)",
  },
  reject: {
    title: "Reject referral",
    description: "Reject this referral. It will be marked voided and excluded from payouts.",
    confirmLabel: "Reject",
    requiresNote: true,
    noteLabel: "Reason (required)",
  },
  place_on_hold: {
    title: "Place referral on hold",
    description: "Pause this referral until the hold date passes or you release it.",
    confirmLabel: "Place on hold",
    requiresNote: false,
    noteLabel: "Hold reason (optional)",
    extra: "hold_until",
  },
  mark_paid_manual: {
    title: "Mark as paid manually",
    description: "Record a manual payout. Requires a note for the audit trail.",
    confirmLabel: "Mark paid",
    requiresNote: true,
    noteLabel: "Payout reference / note (required)",
  },
  add_note: {
    title: "Add admin note",
    description: "Append a note to this referral's audit log without changing its status.",
    confirmLabel: "Save note",
    requiresNote: true,
    noteLabel: "Note (required)",
  },
  flag_fraud: {
    title: "Flag for fraud review",
    description: "Create an unresolved fraud flag against this referral for the risk team to review.",
    confirmLabel: "Flag",
    requiresNote: true,
    noteLabel: "Reason (required)",
    extra: "severity",
  },
};

const ReferralAdmin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<ActionKind | null>(null);
  const [dialogReferral, setDialogReferral] = useState<any>(null);
  const [noteValue, setNoteValue] = useState("");
  const [holdUntil, setHoldUntil] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [dialogIdempotencyKey, setDialogIdempotencyKey] = useState<string>("");


  useEffect(() => {
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("is_admin", { user_id: user.id });
      setIsAdmin(!!data);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [r, c, f, fl] = await Promise.all([
        supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("referral_program_config").select("*").order("program_type"),
        supabase
          .from("referral_fraud_flags")
          .select("*")
          .is("resolved_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("app_feature_flags")
          .select("*")
          .in("key", ["referral_program_enabled", "referral_auto_payout_enabled"]),
      ]);
      setReferrals(r.data ?? []);
      setConfig(c.data ?? []);
      setFlags(f.data ?? []);
      setFeatureFlags(fl.data ?? []);
    })();
  }, [isAdmin, running]);

  const flagValue = (key: string) =>
    featureFlags.find((x) => x.key === key)?.enabled ?? (key === "referral_program_enabled");

  const callAdmin = async (body: any, idempotencyKey?: string) => {
    const key = idempotencyKey ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    const { data, error } = await supabase.functions.invoke("referral-admin-action", {
      body: { ...body, idempotency_key: key },
      headers: { "Idempotency-Key": key },
    });
    if (error || (data as any)?.error) {
      toast.error("Action failed");
      return false;
    }
    toast.success((data as any)?.idempotent_replay ? "Already applied" : "Done");
    setRunning((x) => !x);
    return true;
  };

  const setFlag = async (key: string, enabled: boolean) => {
    // Optimistic update
    setFeatureFlags((prev) => {
      const next = prev.filter((x) => x.key !== key);
      return [...next, { key, enabled }];
    });
    const ok = await callAdmin({ action: "set_flag", payload: { key, enabled } });
    if (!ok) {
      setFeatureFlags((prev) => {
        const next = prev.filter((x) => x.key !== key);
        return [...next, { key, enabled: !enabled }];
      });
    }
  };


  const updateConfig = async (program: any) => {
    await callAdmin({
      action: "update_program",
      payload: {
        program_type: program.program_type,
        reward_amount: Number(program.reward_amount),
        min_transaction_value: Number(program.min_transaction_value),
        hold_days: Number(program.hold_days),
        monthly_cap: program.monthly_cap ? Number(program.monthly_cap) : null,
        is_active: !!program.is_active,
      },
    });
  };

  const exportCsv = () => {
    const rows = [
      ["id", "created_at", "program_type", "status", "reward_amount", "referrer_id", "referred_user_id"],
      ...referrals.map((r) => [
        r.id,
        r.created_at,
        r.program_type,
        r.status,
        r.reward_amount,
        r.referrer_id,
        r.referred_user_id,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const openDialog = (action: ActionKind, referral: any) => {
    setDialogAction(action);
    setDialogReferral(referral);
    setNoteValue("");
    setHoldUntil("");
    setSeverity("medium");
    // Pin one idempotency key per dialog open so accidental double-submits dedupe server-side.
    setDialogIdempotencyKey(crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
    setDialogOpen(true);
  };

  const submitDialog = async () => {
    if (!dialogAction || !dialogReferral) return;
    const meta = ACTION_META[dialogAction];
    if (meta.requiresNote && noteValue.trim().length < 3) {
      toast.error("Please add a note (min 3 chars)");
      return;
    }
    setSubmitting(true);
    const body: any = {
      action: dialogAction,
      referral_id: dialogReferral.id,
      note: noteValue || undefined,
    };
    if (dialogAction === "place_on_hold" && holdUntil) {
      body.hold_until = new Date(holdUntil).toISOString();
    }
    if (dialogAction === "flag_fraud") {
      body.payload = { severity, flag_type: "manual_admin_flag" };
    }

    const ok = await callAdmin(body, dialogIdempotencyKey);
    setSubmitting(false);
    if (ok) setDialogOpen(false);
  };

  if (authLoading || isAdmin === null)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin)
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive">
        Admin access required
      </div>
    );

  const programEnabled = flagValue("referral_program_enabled");
  const meta = dialogAction ? ACTION_META[dialogAction] : null;

  return (
    <>
      <SEO title="Referral Admin — Vendibook" description="Internal referral program admin." noindex />
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <h1 className="text-3xl font-bold">Referral Admin</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <FileDown className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Feature flag toggles */}
        <Card className="p-5 mb-6">
          <h2 className="font-semibold mb-4">Program controls</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
              <div>
                <p className="font-medium">Referral program enabled</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When off, /referral shows a waitlist and new referrals are not recorded.
                </p>
                <Badge variant={programEnabled ? "default" : "secondary"} className="mt-2">
                  {programEnabled ? "Live" : "Disabled"}
                </Badge>
              </div>
              <Switch
                checked={programEnabled}
                onCheckedChange={(v) => setFlag("referral_program_enabled", v)}
              />
            </div>
            <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
              <div>
                <p className="font-medium">Referral payouts</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Payouts are reviewed and recorded manually. Export the ledger, send the
                  payment, then use Mark paid to record it with an audit note.
                </p>
                <Badge variant="secondary" className="mt-2">
                  Manual only
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="config">Programs</TabsTrigger>
            <TabsTrigger value="fraud">
              Fraud {flags.length > 0 && <Badge className="ml-2 bg-red-500">{flags.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card className="p-4 mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Date</th>
                    <th>Program</th>
                    <th>Status</th>
                    <th>Reward</th>
                    <th>Referrer</th>
                    <th className="text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => {
                    const terminal = r.status === "paid" || r.status === "voided";
                    return (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="py-2 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td className="capitalize">{r.program_type ?? "—"}</td>
                        <td>
                          <Badge variant="secondary">{r.status}</Badge>
                          {r.admin_notes && (
                            <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px] truncate">
                              {r.admin_notes}
                            </div>
                          )}
                        </td>
                        <td>${Number(r.reward_amount ?? r.referrer_reward_amount ?? 0).toFixed(0)}</td>
                        <td className="font-mono text-xs">{r.referrer_id?.slice(0, 8)}</td>
                        <td className="text-right">
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            {!terminal && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDialog("approve", r)}
                                  title="Approve"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDialog("reject", r)}
                                  title="Reject"
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDialog("place_on_hold", r)}
                                  title="Place on hold"
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Hold
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDialog("mark_paid_manual", r)}
                                  title="Mark paid manually"
                                >
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  Mark paid
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDialog("add_note", r)}
                              title="Add note"
                            >
                              <StickyNote className="h-3 w-3 mr-1" />
                              Note
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDialog("flag_fraud", r)}
                              title="Flag for fraud review"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Flag className="h-3 w-3 mr-1" />
                              Flag
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {referrals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No referrals yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {config.map((c, idx) => (
                <Card key={c.program_type} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold capitalize text-lg">{c.program_type}</h3>
                    <Switch
                      checked={c.is_active}
                      onCheckedChange={(v) => {
                        const next = [...config];
                        next[idx] = { ...c, is_active: v };
                        setConfig(next);
                      }}
                    />
                  </div>
                  {(["reward_amount", "min_transaction_value", "hold_days", "monthly_cap"] as const).map(
                    (field) => (
                      <div key={field} className="mb-2">
                        <Label className="text-xs capitalize">{field.replace(/_/g, " ")}</Label>
                        <Input
                          type="number"
                          value={c[field] ?? ""}
                          onChange={(e) => {
                            const next = [...config];
                            next[idx] = { ...c, [field]: e.target.value };
                            setConfig(next);
                          }}
                          style={{ fontSize: "16px" }}
                        />
                      </div>
                    ),
                  )}
                  <Button className="w-full mt-2" onClick={() => updateConfig(c)}>
                    Save
                  </Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fraud">
            <Card className="p-4 mt-4">
              {flags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No unresolved fraud flags 🎉
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Date</th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Referral</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="py-2">{new Date(f.created_at).toLocaleDateString()}</td>
                        <td className="flex items-center gap-2">
                          <ShieldAlert className="h-3 w-3 text-red-500" /> {f.flag_type}
                        </td>
                        <td>
                          <Badge variant={f.severity === "high" ? "destructive" : "secondary"}>
                            {f.severity}
                          </Badge>
                        </td>
                        <td className="font-mono text-xs">{f.referral_id?.slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Action dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{meta?.title}</DialogTitle>
            <DialogDescription>{meta?.description}</DialogDescription>
          </DialogHeader>

          {dialogReferral && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2 font-mono">
              Referral: {dialogReferral.id?.slice(0, 8)} · Status: {dialogReferral.status} · Reward: $
              {Number(dialogReferral.reward_amount ?? dialogReferral.referrer_reward_amount ?? 0).toFixed(0)}
            </div>
          )}

          {meta?.extra === "hold_until" && (
            <div>
              <Label className="text-xs">Hold until (defaults to +14 days)</Label>
              <Input
                type="datetime-local"
                value={holdUntil}
                onChange={(e) => setHoldUntil(e.target.value)}
                style={{ fontSize: "16px" }}
              />
            </div>
          )}

          {meta?.extra === "severity" && (
            <div>
              <Label className="text-xs">Severity</Label>
              <div className="flex gap-2 mt-1">
                {(["low", "medium", "high"] as const).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={severity === s ? "default" : "outline"}
                    onClick={() => setSeverity(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">{meta?.noteLabel}</Label>
            <Textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              rows={3}
              style={{ fontSize: "16px" }}
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={submitDialog} disabled={submitting}>
              {submitting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {meta?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReferralAdmin;
