import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setPendingReferralCode } from "@/hooks/useReferral";
import { Loader2 } from "lucide-react";

const PROGRAM_DESTINATIONS: Record<string, string> = {
  supply: "/list",
  purchase: "/browse",
  rental: "/search",
};

const RHandler = () => {
  const { code } = useParams<{ code: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!code) {
      navigate("/", { replace: true });
      return;
    }
    const program = search.get("p") || "purchase";
    const normalized = code.trim().toUpperCase();

    // Set cookie/localStorage immediately so the user is attributed even if the network call fails
    setPendingReferralCode(normalized);

    (async () => {
      try {
        const { data } = await supabase.functions.invoke("referral-track-click", {
          body: {
            code: normalized,
            program_type: program,
            source: document.referrer,
          },
        });
        const destination = data?.destination || PROGRAM_DESTINATIONS[program] || "/";
        navigate(destination, { replace: true });
      } catch {
        // Even on error, redirect somewhere sensible
        navigate(PROGRAM_DESTINATIONS[program] || "/", { replace: true });
      }
    })();
  }, [code, search, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Applying your referral…</p>
        {error && <p className="text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default RHandler;
