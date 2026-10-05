import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openPlaidLink } from "@/lib/plaidLink";
import "./signup-phone.css";

type Result = { link_token?: string; identity_verified?: boolean; identity_status?: string | null; message?: string; error?: string };

async function call(action: string): Promise<Result> {
  const { data, error } = await supabase.functions.invoke("verified-seller", { body: { action } });
  let payload = data as Result | null;
  if (error && (error as any).context) {
    try { payload = await (error as any).context.json(); } catch { /* generic */ }
  }
  if (error || payload?.error) throw new Error(payload?.error || "We couldn’t start your identity check. Please try again.");
  return payload ?? {};
}

/** Free, required Plaid identity check shown right after phone verification. */
export default function IdentityVerificationStep({ onDone, onSignOut }: { onDone: () => void; onSignOut: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const startedAutomatically = useRef(false);

  async function verify() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const started = await call("signup-verify");
      if (started.identity_verified) { onDone(); return; }
      if (!started.link_token) { setNotice(started.message || "Your identity check is being reviewed."); return; }
      const outcome = await openPlaidLink(started.link_token);
      const settled = await call("signup-refresh");
      if (settled.identity_verified) { onDone(); return; }
      if (settled.identity_status === "pending_review") setNotice("Thanks! Your identity check is being reviewed. We'll email you when it's done.");
      else if (outcome.exited) setNotice("You closed the check before it finished. Tap the button to pick up where you left off.");
      else if (settled.identity_status === "failed") setError("We couldn't confirm your identity. Tap the button to try once more.");
      else setNotice(settled.message || "Still checking — tap the button again in a moment.");
    } catch (e: any) { setError(e.message || "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (startedAutomatically.current) return;
    startedAutomatically.current = true;
    void verify();
  }, []);

  return <main className="signup-phone-page">
    <section className="signup-phone-card" aria-labelledby="signup-id-title">
      <h1 id="signup-id-title">Opening secure verification…</h1>
      {busy && <Loader2 className="animate-spin mx-auto mt-6" aria-label="Opening secure verification" />}
      {error && <p className="signup-phone-error" role="alert">{error}</p>}
      {notice && <p className="signup-phone-note" role="status">{notice}</p>}
      {!busy && (error || notice) && <button type="button" className="signup-phone-primary" onClick={verify}>Try again</button>}
      {!busy && (error || notice) && <div className="signup-phone-links"><a href="/help">Need help?</a><button type="button" onClick={onSignOut}>Sign out</button></div>}
    </section>
  </main>;
}
