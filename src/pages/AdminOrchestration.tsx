import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Activity, Settings2, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Rule {
  id: string;
  event_type: string;
  default_channel: string;
  priority: string;
  enabled: boolean;
  cooldown_minutes: number;
  respect_quiet_hours: boolean;
  template_hint: string | null;
}

interface Decision {
  id: string;
  event_type: string;
  chosen_channel: string | null;
  priority: string | null;
  suppressed: boolean;
  suppression_reason: string | null;
  rationale: string | null;
  created_at: string;
}

const AdminOrchestration = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc("is_admin", { user_id: user.id }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: d }] = await Promise.all([
      supabase.from("orchestration_rules").select("*").order("event_type"),
      supabase.from("orchestration_decisions").select("*").order("created_at", { ascending: false }).limit(100)]);
    setRules((r ?? []) as Rule[]);
    setDecisions((d ?? []) as Decision[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const stats = useMemo(() => {
    const total = decisions.length;
    const suppressed = decisions.filter(d => d.suppressed).length;
    const byChannel: Record<string, number> = {};
    decisions.forEach(d => {
      const c = d.chosen_channel || "skip";
      byChannel[c] = (byChannel[c] || 0) + 1;
    });
    return { total, suppressed, byChannel };
  }, [decisions]);

  const updateRule = async (id: string, updates: Partial<Rule>) => {
    const { error } = await supabase.from("orchestration_rules").update(updates).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Rule updated"); load(); }
  };

  if (isLoading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card><CardContent className="py-12 text-center text-muted-foreground">Admin access required.</CardContent></Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-2xl font-semibold">AI Orchestration</h1>
            <p className="text-sm text-muted-foreground">Routing rules, decisions, and ROI for Vendi's communications brain.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Decisions (last 100)" value={stats.total} />
          <StatTile label="Suppressed" value={stats.suppressed} />
          <StatTile label="In-app" value={stats.byChannel.inapp || 0} />
          <StatTile label="SMS" value={stats.byChannel.sms || 0} />
        </div>

        <Tabs defaultValue="decisions">
          <TabsList>
            <TabsTrigger value="decisions"><Activity className="h-4 w-4 mr-1" /> Recent decisions</TabsTrigger>
            <TabsTrigger value="rules"><Settings2 className="h-4 w-4 mr-1" /> Rules</TabsTrigger>
          </TabsList>

          <TabsContent value="decisions" className="space-y-2 mt-4">
            {loading ? <div className="text-center py-8"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div> :
              decisions.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No decisions yet.</p> :
              decisions.map(d => (
                <Card key={d.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono">{d.event_type}</code>
                        {d.suppressed ? (
                          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                            <AlertTriangle className="h-3 w-3 mr-1" /> {d.suppression_reason || "suppressed"}
                          </Badge>
                        ) : (
                          <Badge>{d.chosen_channel}</Badge>
                        )}
                        {d.priority && <Badge variant="secondary">{d.priority}</Badge>}
                      </div>
                      {d.rationale && <p className="text-xs text-muted-foreground mt-1 truncate">{d.rationale}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </span>
                  </CardContent>
                </Card>
              ))
            }
          </TabsContent>

          <TabsContent value="rules" className="space-y-2 mt-4">
            {rules.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-mono">{r.event_type}</CardTitle>
                    <Switch checked={r.enabled} onCheckedChange={(v) => updateRule(r.id, { enabled: v })} />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Default channel</label>
                    <Select value={r.default_channel} onValueChange={(v) => updateRule(r.id, { default_channel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inapp">In-app</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Priority</label>
                    <Select value={r.priority} onValueChange={(v) => updateRule(r.id, { priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Cooldown (min)</label>
                    <Input
                      type="number"
                      defaultValue={r.cooldown_minutes}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v !== r.cooldown_minutes) updateRule(r.id, { cooldown_minutes: v });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="py-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

export default AdminOrchestration;
