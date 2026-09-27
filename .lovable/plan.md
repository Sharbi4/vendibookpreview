# Seller-covered freight display

## Build
- Add a clear “Free shipping” badge to sale listing cards whenever Vendibook Freight is enabled and the seller covers freight.
- Keep the internal freight estimate based on mileage and the existing $4.50-per-mile calculation, but hide the mileage, rate, and calculated freight amount from buyers on seller-covered listings.
- Show “Seller covers freight” / “Free shipping” in the delivery checker and checkout wherever the buyer-facing freight charge appears.
- Preserve buyer-paid freight estimates and all existing checkout calculations.

## Verify
- Add focused coverage for seller-paid versus buyer-paid freight display rules.
- Check the listing page and delivery flow on desktop and mobile, then confirm the project builds cleanly.
