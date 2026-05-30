// marketing-feedback-redirect — logs 1-click feedback then redirects to a thanks page.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VENDIBOOK_BASE_URL } from "../_shared/marketing-templates/constants.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const sendId = url.searchParams.get("s");
  const email = url.searchParams.get("e");
  const rating = url.searchParams.get("r");
  const validRatings = ["helpful", "okay", "not_for_me"];
  if (!sendId || !email || !rating || !validRatings.includes(rating)) {
    return new Response("Invalid feedback link", { status: 400 });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabase.from("email_feedback").insert({
      send_id: sendId,
      recipient_email: email,
      rating,
    });
  } catch (e) {
    console.error("feedback log error", e);
  }
  return Response.redirect(`${VENDIBOOK_BASE_URL}/email/thanks?r=${rating}`, 302);
});
