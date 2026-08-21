// Shared responder for RETIRED one-off marketing campaigns (Phase 3).
//
// The campaign already ran. The function is kept as a tombstone so old
// links, admin buttons, and any stray scheduler call fail loudly instead
// of re-mailing an audience. Historical rows in blog_campaign_sends /
// email_events / email_sends are untouched.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function retiredCampaign(opts: {
  campaignId: string;
  retiredOn: string;
  replacement?: string;
}) {
  return (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    console.warn(`[retired-campaign] blocked call to ${opts.campaignId}`);
    return new Response(
      JSON.stringify({
        error: "campaign_retired",
        campaignId: opts.campaignId,
        retiredOn: opts.retiredOn,
        message:
          "This one-off campaign has already been sent and is permanently retired. It cannot send email. " +
          (opts.replacement ? `Use ${opts.replacement} instead.` : "Use an active marketing sender instead."),
      }),
      { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  };
}
