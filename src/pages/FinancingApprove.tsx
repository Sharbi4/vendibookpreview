import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePublicFeatureFlag } from "@/hooks/usePublicFeatureFlag";

export const APPROVE_FLAG_KEY = "approve_financing_enabled";

/**
 * Opt-in APPROVE financing page. The third-party loader runs only inside a
 * sandboxed iframe WITHOUT allow-same-origin / allow-top-navigation, so it
 * gets an opaque origin and cannot read the Vendibook session or redirect
 * the site. No customer data is passed to the frame.
 */
export default function FinancingApprove() {
  const enabled = usePublicFeatureFlag(APPROVE_FLAG_KEY);
  const [consented, setConsented] = useState(false);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Equipment financing options</h1>

      {!enabled ? (
        <p className="mt-4 text-muted-foreground">
          This financing option isn't available yet. You can still{" "}
          <Link to="/financing" className="underline">explore financing</Link>.
        </p>
      ) : !consented ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-6">
          <p className="text-muted-foreground">
            This opens a financing tool from our partner APPROVE. Anything you enter goes to APPROVE, not
            Vendibook, and we don't share your account details with them.
          </p>
          <Button className="mt-4" onClick={() => setConsented(true)}>Continue to APPROVE</Button>
        </div>
      ) : (
        <iframe
          title="APPROVE financing"
          src="/financing/approve-frame.html"
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="mt-6 h-[900px] w-full rounded-lg border border-border bg-card"
        />
      )}
    </main>
  );
}
