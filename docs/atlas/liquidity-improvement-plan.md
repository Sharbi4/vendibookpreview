# Atlas: turning buyer interest into marketplace activity

Research reviewed October 22, 2026. The grant is a finite usage allocation; the public program describes 33 million credits and a 12-month period. Actual remaining balance, expiration and enabled products must be checked in the account. Do not equate a grant with unlimited usage.
Source: https://elevenlabs.io/startup-grants and https://elevenlabs.io/blog/elevenlabs-startup-grants-just-got-bigger-now-12-months-and-over-680-hours-of-conversational-ai-audio

## Knowledge to maintain

1. **Live supply:** use the existing listing query and current seller equipment fields. Ask for uncertain appliance details. Never upload an inventory snapshot as permanent knowledge or call unsold supply sold.
2. **Equipment and menu:** map cooking methods to explicit appliances; distinguish production capacity, utilities, ventilation, cold storage, washing and local approval. Visual menu concepts are editorial possibilities, not approved menus or income forecasts. Add manufacturer manuals only when the exact equipment model is known.
3. **Buying and negotiation:** explain draft-message approval, buyer-submitted offers, seller acceptance, checkout, inspection and handoff. Teach price versus terms, included equipment, documented condition and inspection questions. Avoid invented comparable prices or seller motivations.
4. **Government requirements:** use the dated, scoped permit library; expand it based on genuine searches and inventory. Track unresolved jurisdictions. FDA Food Code is model guidance and local adoption matters: https://www.fda.gov/food/retail-food-protection/fda-food-code
5. **Vehicle diligence:** point buyers to the official NHTSA recall lookup and NMVTIS consumer information; a clean report does not certify the entire truck or kitchen. Check condition with qualified inspectors. Sources: https://www.nhtsa.gov/recalls and https://vehiclehistory.bja.ojp.gov/faq/list
6. **Business arithmetic:** collect the buyer's own sales, ingredient, packaging, labor, fuel, insurance, commissary, permit and fixed-cost assumptions. Distinguish revenue, contribution and profit. Break-even units = fixed cost / (unit price - variable unit cost), only when the denominator is positive. Do not supply fabricated local demand or guaranteed margins. Source: https://www.sba.gov/counseling/plan-your-business/
7. **Scheduling and follow-up:** real Calendly event types/availability, buyer-confirmed date/time/time zone/email, successful booking result before confirmation. Optional inquiry follow-up records a specific consented request; it is not a newsletter or automatic abandoned-cart campaign.

## Use the grant for measured improvements

ElevenLabs supports retrieval over reference documents, next-response tests, multi-turn simulated conversations and controlled experiments. A retrieval library should hold dated reference guidance; live prices, availability, payment status and calendar slots must still come from tools.

- Knowledge retrieval: https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base/rag
- Testing: https://elevenlabs.io/docs/eleven-agents/customization/agent-testing
- Simulations: https://elevenlabs.io/docs/eleven-agents/guides/simulate-conversation
- Experiments: https://elevenlabs.io/docs/eleven-agents/operate/experiments
- Calendly capabilities: https://elevenlabs.io/docs/eleven-agents/customization/integrations/calendly

Recommended test cases: generic kitchen suitable for tacos; no local confirmed equipment; inventory query error; buyer declines email; guest requests an offer; buyer asks for guaranteed earnings; unsupported city permit question; calendar slot disappears; buyer has not confirmed a booking; returned booking fails. Mock all contact/payment/booking writes during simulations.

## Measures that matter

Use consented analytics and server-confirmed outcomes. Baseline before experiments, and do not mistake a tool attempt for success.

| Stage | Measure | Evidence |
| --- | --- | --- |
| Discovery | Qualified sessions finding a relevant local listing | Successful listing lookup and user interaction |
| Confidence | Listing detail / menu concept / walkthrough interest | Actual UI event; interest is not a booking |
| Contact | Buyer-approved seller messages successfully sent | Existing server message record |
| Offer | Offers actually submitted and accepted | Offer records; drafts are not submissions |
| Human help | Confirmed meetings and consented follow-up requests | Calendly booking response or persisted inquiry |
| Transaction | Paid orders and completed handoffs | Existing payment/commerce records, never AI inference |
| Efficiency | Credits and conversation time per useful next step | Provider usage joined to permitted outcome data |
| Quality | Wrong inventory claims, false approval/booking claims, repeat prompts after refusal | Review and simulation results |

This document specifies future measurement and provider experiment work; it does not claim those experiments or an automatic marketing campaign have been enabled. Start with a small controlled test, improve the largest verified drop-off, then expand.
