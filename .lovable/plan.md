

# Redesign Fees & Commission Section with Role-Based FAQ Mapping

## What Changes

The current Fees & Commission section shows all fee information mixed together (host commission alongside renter fees, seller alongside buyer). This redesign separates the content into three distinct role-based views so users only see what's relevant to them.

## New Layout

The `fees-commission` section in the FAQ page will be restructured with a 3-tab or 3-card navigation:

1. **Renter FAQ** - What renters pay, how checkout works, what the service fee covers
2. **Host FAQ** - What hosts earn, commission breakdown, payout details
3. **Seller FAQ** - What sellers earn, commission on sales, freight considerations

Each role view will include:
- A role-specific pricing card with only their relevant fee (no cross-role fee display)
- Role-specific FAQ questions filtered from the current list
- A dedicated example calculation showing only their perspective
- The pricing calculator scoped to their role

## Technical Details

### 1. New Component: `RoleFeeSection.tsx`
- Three clickable role cards (Renter / Host / Seller) with icons and gradient accents
- Clicking a role reveals that role's fee details, FAQs, and calculator
- Uses existing `Tabs` component for switching between roles

### 2. Update `FAQ.tsx` (fees-commission section)
- Replace the current dual Rentals/Sales grid with the new `RoleFeeSection` component
- Split the existing 7 fee questions into role-specific groups:
  - **Renter**: "When does Vendibook charge fees?", "What is the renter service fee?", "Are there additional fees for freight?", "Are there payment processing fees?"
  - **Host**: "When does Vendibook charge fees?", "What is the host commission for rentals?", "Are there payment processing fees?"
  - **Seller**: "When does Vendibook charge fees?", "What is the seller commission for sales?", "Do buyers pay a platform fee on sales?", "Are there additional fees for freight?"

### 3. Update `PricingCalculator.tsx`
- Add an optional `role` prop to pre-select and lock the calculator to a specific tab
- When role is "renter", show only the renter total (hide host receives)
- When role is "host", show only host receives (hide renter total)
- When role is "seller", show only seller receives
- Competitor comparison stays in seller view only

### 4. Example Calculations
- Renter example: Shows rental price + 12.9% service fee = total they pay
- Host example: Shows rental price - 12.9% commission = what they receive
- Seller example: Shows sale price - 12.9% commission = what they receive (buyer pays $0 extra)

### Files to Create
- `src/components/pricing/RoleFeeSection.tsx` - New role-based tab/card component

### Files to Modify
- `src/pages/FAQ.tsx` - Replace the fees-commission special section with the new role-based component
- `src/components/pricing/PricingCalculator.tsx` - Add optional `role` prop for scoped view

