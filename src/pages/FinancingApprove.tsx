import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePublicFeatureFlag } from "@/hooks/usePublicFeatureFlag";
import { APPROVE_FLAG_KEY, APPROVE_SANDBOX, buildApproveSrcDoc } from "@/lib/financing/approveFrame";

/**
 * Opt-in APPROVE financing page. Nothing from APPROVE loads until the visitor
 * clicks Continue, every time. The vendor script runs only inside a sandboxed
 * srcDoc iframe (opaque origin) and the frame is removed on close/route exit.
 */
export default function FinancingApprove() {
  const flagOn = usePublicFeatureFlag(APPROVE_FLAG_KEY);
  // Dev-preview override only; stripped from production builds.
  const devPreview =
    import.meta.env.DEV && typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("approve_preview") === "1";
  const enabled = flagOn || devPreview;
  const [open, setOpen] = useState(false);
  const srcDoc = useMemo(() => buildApproveSrcDoc(), []);

  useEffect(() => {
    const prev = document.title;
    document.title = "Equipment financing with APPROVE | Vendibook";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.title = prev; meta.remove(); };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Equipment financing with APPROVE</h1>

      {!enabled ? (
        <p className="mt-4 text-muted-foreground">
          This financing option isn't available yet. You can still{" "}
          <Link to="/financing" className="underline">explore our other financing options</Link>.
        </p>
      ) : !open ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-6 space-y-3">
          <p className="text-muted-foreground">
            APPROVE is an independent equipment-financing platform, not a lender. Continuing loads its financing tool here, and
            anything you enter goes straight to APPROVE under their own{" "}
            <a href="https://www.approvepayments.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline">privacy policy</a>{" "}
            and{" "}
            <a href="https://www.approvepayments.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="underline">terms</a>.
          </p>
          <p className="text-muted-foreground">
            Vendibook doesn't share your account or listing details with APPROVE, and we don't fill anything in for you.
            Lenders decide approvals, rates and terms; none are guaranteed. Vendibook is not a lender.
          </p>
          <Button onClick={() => setOpen(true)}>Continue to APPROVE</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Close APPROVE</Button>
          </div>
          <iframe
            data-testid="approve-frame"
            title="APPROVE financing application"
            srcDoc={srcDoc}
            sandbox={APPROVE_SANDBOX}
            referrerPolicy="no-referrer"
            className="h-[900px] w-full rounded-lg border border-border bg-card"
          />
        </div>
      )}
    </main>
  );
}
