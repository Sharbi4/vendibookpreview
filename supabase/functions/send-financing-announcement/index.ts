// RETIRED one-off campaign — see _shared/retiredCampaign.ts
// Original creative and send history are preserved in the campaign log tables.
import { retiredCampaign } from "../_shared/retiredCampaign.ts";

Deno.serve(retiredCampaign({
  campaignId: "seller-financing-announcement",
  retiredOn: "2026-08-21",
  replacement: "send-blog-campaign",
}));
