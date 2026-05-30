import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldAlert, PlayCircle, FileDown } from "lucide-react";

const ReferralAdmin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [config, setConfig] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!user?.id) { setIsAdmin(false); return; }
    (async () => {
      const { data } = await supabase.rpc("is_admin", { user_id: user.id });
      setIsAdmin(!!data);
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [r, c, f] = await Promise.all([
        supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("referral_program_config").select("*").order("program_type"),
        supabase.from("referral_fraud_flags").select("*").is("resolved_at", null).order("created_at", { ascending: false }),
      ]);
      setReferrals(r.data ?? []);
      setConfig(c.data ?? []);
      setFlags(f.data ?? []);
    })();
  }, [isAdmin, running]);

  const callAdmin = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("referral-admin-action", { body });
    if (error || (data as any)?.error) {
      toast.error("Action failed");
      return false;
    }
    toast.success("Done");
    setRunning((x) => !x); // trigger refetch
    return true;
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
      ...referrals.map((r) => [r.id, r.created_at, r.program_type, r.status, r.reward_amount, r.referrer_id, r.referred_user_id]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const triggerPayout = async () => {
    const { data, error } = await supabase.functions.invoke("referral-payout-batch", { body: { manual: true } });
    if (error) { toast.error("Payout failed"); return; }
    toast.success(`Processed ${(data as any)?.processed ?? 0} payouts`);
  };

  if (authLoading || isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center text-destructive">Admin access required</div>;

  return (
    <>
      <SEO title="Referral Admin — Vendibook" />
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Referral Admin</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><FileDown className="h-4 w-4 mr-1" /> Export CSV</Button>
            <Button onClick={triggerPayout}><PlayCircle className="h-4 w-4 mr-1" /> Run payout batch</Button>
          </div>
        </div>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="config">Programs</TabsTrigger>
            <TabsTrigger value="fraud">Fraud {flags.length > 0 && <Badge className="ml-2 bg-red-500">{flags.length}</Badge>}</TabsTrigger>
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="capitalize">{r.program_type ?? "—"}</td>
                      <td><Badge>{r.status}</Badge></td>
                      <td>${Number(r.reward_amount ?? r.referrer_reward_amount ?? 0).toFixed(0)}</td>
                      <td className="font-mono text-xs">{r.referrer_id?.slice(0, 8)}</td>
                      <td className="space-x-1">
                        {r.status !== "paid" && r.status !== "voided" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => callAdmin({ action: "qualify", referral_id: r.id })}>Qualify</Button>
                            <Button size="sm" variant="ghost" onClick={() => callAdmin({ action: "void", referral_id: r.id, note: prompt("Void reason?") || "" })}>Void</Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
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
                  {(["reward_amount", "min_transaction_value", "hold_days", "monthly_cap"] as const).map((field) => (
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
                  ))}
                  <Button className="w-full mt-2" onClick={() => updateConfig(c)}>Save</Button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fraud">
            <Card className="p-4 mt-4">
              {flags.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No unresolved fraud flags 🎉</p>
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
                        <td className="flex items-center gap-2"><ShieldAlert className="h-3 w-3 text-red-500" /> {f.flag_type}</td>
                        <td><Badge variant={f.severity === "high" ? "destructive" : "secondary"}>{f.severity}</Badge></td>
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
    </>
  );
};

export default ReferralAdmin;
