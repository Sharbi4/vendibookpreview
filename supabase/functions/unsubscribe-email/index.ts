import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("unsubscribe-email function invoked");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Processing unsubscribe request for: ${email}`);

    // Check if already in newsletter_subscribers
    const { data: existing } = await supabase
      .from("newsletter_subscribers")
      .select("id, unsubscribed_at")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      if (existing.unsubscribed_at) {
        console.log(`${email} is already unsubscribed`);
        return new Response(
          JSON.stringify({ message: "Already unsubscribed" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Update existing record with unsubscribed_at
      const { error: updateError } = await supabase
        .from("newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating unsubscribe status:", updateError);
        throw new Error("Failed to unsubscribe");
      }
    } else {
      // Insert new record with unsubscribed status
      const { error: insertError } = await supabase
        .from("newsletter_subscribers")
        .insert({
          email: email.toLowerCase(),
          source: "unsubscribe",
          unsubscribed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error inserting unsubscribe record:", insertError);
        throw new Error("Failed to unsubscribe");
      }
    }

    console.log(`Successfully unsubscribed: ${email}`);

    return new Response(
      JSON.stringify({ message: "Successfully unsubscribed" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in unsubscribe-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
