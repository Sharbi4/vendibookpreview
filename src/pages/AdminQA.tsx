import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, PlayCircle } from "lucide-react";

type Step = {
  step: string;
  status: "pass" | "fail" | "skip";
  message: string;
  user_facing_message?: string;
  details?: unknown;
};
type RunResult = {
  test: string;
  passed: boolean;
  total: number;
  passed_count: number;
  failed_count: number;
  steps: Step[];
  started_at?: string;
  finished_at?: string;
};

const TESTS: { id: "signup_login" | "publishing" | "full_journey"; label: string; description: string }[] = [
  { id: "signup_login", label: "Test Signup and Login", description: "Creates a temporary QA user, signs in, refreshes the session, signs out, signs back in, then deletes the user." },
  { id: "publishing",   label: "Test Listing Publishing", description: "Creates a QA host, drafts a listing, attaches a photo, publishes it, verifies dashboard + public page + search visibility, then deletes everything." },
  { id: "full_journey", label: "Test Full User Journey", description: "Runs both tests end-to-end including logout/relogin and listing persistence. Alerts the owner on failure." },
];

export default function AdminQA() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) { setChecking(false); return; }
      const { data } = await supabase.rpc("is_admin", { user_id: user.id });
      setIsAdmin(!!data);
      setChecking(false);
      if (!data) navigate("/", { replace: true });
    })();
  }, [user, navigate]);

  const runTest = async (id: typeof TESTS[number]["id"]) => {
    setRunning(id);
    setResults((prev) => ({ ...prev, [id]: { test: id, passed: false, total: 0, passed_count: 0, failed_count: 0, steps: [] } }));
    const { data, error } = await supabase.functions.invoke("qa-test-runner", { body: { test: id } });
    if (error) {
      setResults((prev) => ({
        ...prev,
        [id]: { test: id, passed: false, total: 1, passed_count: 0, failed_count: 1, steps: [{ step: "invoke", status: "fail", message: error.message, user_facing_message: "Could not start the QA test." }] },
      }));
    } else {
      setResults((prev) => ({ ...prev, [id]: data as RunResult }));
    }
    setRunning(null);
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Internal QA: Customer Journey</h1>
          <p className="text-muted-foreground mt-1">
            Admin-only tools that exercise the real signup, listing, and publish flows. Test users and test listings are auto-deleted at the end of each run.
          </p>
        </div>

        <div className="grid gap-4">
          {TESTS.map((t) => {
            const result = results[t.id];
            const isRunning = running === t.id;
            return (
              <Card key={t.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{t.label}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                  </div>
                  <Button onClick={() => runTest(t.id)} disabled={!!running}>
                    {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                    {isRunning ? "Running…" : "Run"}
                  </Button>
                </CardHeader>
                {result && (
                  <CardContent>
                    <div className="flex items-center gap-3 mb-3">
                      {result.passed
                        ? <Badge className="bg-green-600 hover:bg-green-700">PASS</Badge>
                        : <Badge variant="destructive">FAIL</Badge>}
                      <span className="text-sm text-muted-foreground">
                        {result.passed_count}/{result.total} steps passed
                      </span>
                    </div>
                    <ol className="space-y-2">
                      {result.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm border-l-2 pl-3 py-1"
                            style={{ borderColor: s.status === "pass" ? "rgb(22,163,74)" : s.status === "fail" ? "rgb(220,38,38)" : "rgb(148,163,184)" }}>
                          {s.status === "pass"
                            ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs text-muted-foreground">{s.step}</div>
                            <div>{s.message}</div>
                            {s.user_facing_message && (
                              <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                User would see: “{s.user_facing_message}”
                              </div>
                            )}
                            {s.details ? (
                              <pre className="mt-1 bg-muted/50 rounded px-2 py-1 text-[11px] overflow-x-auto">
                                {JSON.stringify(s.details, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Test accounts use the email pattern <code>qa-bot+TIMESTAMP@vendibook.test</code>. Test listings are titled <code>QA-TEST-…</code> and are deleted as soon as the run finishes. On a Full Journey failure, a HIGH-priority alert is sent to the owner.
        </p>
      </main>
      <Footer />
    </div>
  );
}
