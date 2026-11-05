import { useEffect } from "react";
import { EQUINOX_APPLY_URL } from "@/lib/financing/disclosure";

/** /financing now forwards every visitor to the APPROVE portal (owner 2026-11-05). */
export default function FinancingRedirect() {
  useEffect(() => {
    window.location.replace(EQUINOX_APPLY_URL);
  }, []);
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">
        Taking you to APPROVE financing…{" "}
        <a className="font-medium text-primary underline" href={EQUINOX_APPLY_URL}>Continue</a>
      </p>
    </div>
  );
}
