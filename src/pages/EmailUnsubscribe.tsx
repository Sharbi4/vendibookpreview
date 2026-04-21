import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid"; message: string }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function EmailUnsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", message: "Missing unsubscribe token." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json();
        if (data?.valid === true) setState({ kind: "valid" });
        else if (data?.reason === "already_unsubscribed")
          setState({ kind: "already" });
        else
          setState({
            kind: "invalid",
            message: data?.error || "This unsubscribe link is invalid or expired.",
          });
      } catch (e: any) {
        setState({ kind: "invalid", message: e?.message || "Network error." });
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setState({ kind: "submitting" });
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON,
          },
          body: JSON.stringify({ token }),
        }
      );
      const data = await res.json();
      if (data?.success) setState({ kind: "done" });
      else if (data?.reason === "already_unsubscribed")
        setState({ kind: "already" });
      else
        setState({
          kind: "error",
          message: data?.error || "Could not process unsubscribe.",
        });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message || "Network error." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-8 shadow-xl">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.28em] font-semibold text-muted-foreground">
            VENDIBOOK
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Email preferences
          </h1>
        </div>

        {state.kind === "loading" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking your link…</span>
          </div>
        )}

        {state.kind === "valid" && (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Confirm you'd like to unsubscribe from VendiBook app emails.
              You'll still receive essential account and security messages.
            </p>
            <Button
              onClick={confirm}
              className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Confirm unsubscribe
            </Button>
          </>
        )}

        {state.kind === "submitting" && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing…</span>
          </div>
        )}

        {state.kind === "done" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">You're unsubscribed.</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We won't send you further app emails. Changed your mind? Update
              preferences from your account.
            </p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">
              Return to VendiBook →
            </Link>
          </div>
        )}

        {state.kind === "already" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Already unsubscribed.</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This address is no longer receiving app emails.
            </p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">
              Return to VendiBook →
            </Link>
          </div>
        )}

        {(state.kind === "invalid" || state.kind === "error") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {state.kind === "invalid" ? "Invalid link" : "Something went wrong"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">
              Return to VendiBook →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
