# Atlas government permit research

Reviewed October 22, 2026 (Arizona). Curated reference material, not a live government connection, exhaustive legal analysis, or approval for a listing. Source URLs, agency names, applicability and concise original summaries are in `src/lib/atlas/atlasPermitKnowledge.ts` and publicly readable at `/atlas#permit-sources`.

## Coverage

- Houston: Texas DSHS statewide licensing effective July 1, 2026, menu-based vehicle types, servicing, Houston fire referral. Older separate Houston health-license instructions must not override the new state pathway.
- Tucson: Pima mobile-unit guide (county government links to the CivicPlus PDF), raw-cooking versus limited-preparation classification, Tucson appliance-specific fire guidance and fixed-location peddler review.
- Los Angeles: county plan check and health-jurisdiction exclusions, city business starter checklist; carts and motorized units differ. Older linked code materials are not treated as current detailed law.
- Miami: Florida DBPR vehicle licensing and self-sufficiency/commissary path; distinguish City of Miami, other municipalities and unincorporated Miami-Dade site approval. County and PortMiami rules are not citywide rules.
- Atlanta: Georgia DPH current food-service hub and linked mobile-unit FAQ; base county versus additional-county authorization, Street Eats public spaces versus private/event vending.
- North Florida: statewide DBPR plus scoped Jacksonville, Tallahassee, Pensacola, St. Augustine, Lake City, Panama City, Gainesville and Ocala references. The region itself is never a permit jurisdiction.

## Important uncertainties

- Florida DBPR guide and checklist sources differ on the closure period triggering plan review. No closure cutoff is asserted; ask DBPR about the actual vehicle/history.
- Gainesville ordinary mobile-vending requirements are not fully verified. Its event page is only an event pathway; Cornerstone terms and old fee schedules are not generalized.
- Ocala's event page was available through the government search result but blocked direct retrieval. Its event scope is explicit; ordinary site/fire review remains an agency question.
- Pensacola's old six-month pilot FAQ and proposed ordinance were excluded. Current business-tax/regulator guidance is not claimed to be a complete truck ordinance.
- Miami's guide expressly exempts food trucks/peddlers from parts of the ordinary fixed-premises checklist; do not promise that every truck needs the same CU as a restaurant.
- No claim is made that all US cities/counties, current site restrictions, tax obligations or every fire/health detail have been researched. Unknown places return a jurisdiction gap rather than a fabricated local checklist.

## Runtime rules

`get_permit_requirements` returns dated sources, their individual scope, unresolved questions and a preparation/site question. State-wide notes may be returned for an unknown Florida/Texas city without claiming local coverage. Notes older than 90 days require a fresh agency check. The system prompt requires this lookup before local legal/permit answers, identifies the authority/review date and forbids guaranteed approvals, transferability, invented fees or processing times.

Before tailoring advice ask for operating city/county and exact site, raw cooking versus reheating versus packaged food, enclosed truck/cart, fuel/grease appliances, water/wastewater, commissary and base county. A listing's equipment can be potentially suitable without being approved. Sources are reference data and cannot authorize customer messages, payments or applications.

## Maintenance

Update the structured notes after checking the linked agencies; update `PERMIT_REVIEWED_ON`, run the Atlas suite and regenerate exports with `node scripts/export-atlas-config.mjs`. Publish the frontend, then use the existing authorized Admin → Reports → Sync Atlas to ElevenLabs path to update the actual provider prompt and tool registry. A source push alone does not update that registry.
