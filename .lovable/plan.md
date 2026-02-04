
# Airbnb-Style Dashboard Redesign Plan

## Summary

Redesign the dashboard pages (Account.tsx, Transactions.tsx, HostDashboard.tsx, ShopperDashboard.tsx) and related components to match Airbnb's clean, minimalist design language as shown in the reference screenshots. Special focus on Payments/Stripe integration sections with branded styling.

---

## Design Analysis from Reference Screenshots

### Key Airbnb Design Patterns Observed:

1. **Account Settings Layout**
   - Two-column layout with sticky left sidebar navigation
   - Section titles use 24px semibold, no icons in header
   - Field rows: Label → Value/Status → "Edit"/"Add" action link aligned right
   - Clean separators between field groups
   - FAQ/info boxes at bottom with pink/red icon accents

2. **Payments Section Pattern**
   - Sub-tabs within section (Payments, Payouts, Service fee)
   - Black filled buttons for primary actions ("Manage payments", "Add payment method")
   - Section groupings with clear headers
   - Gift card and coupon sections

3. **Privacy/Toggle Settings**
   - Toggle switches aligned right
   - Description text below toggle title
   - Section groupings (Read receipts, Listings, Reviews)

4. **Professional Hosting Tools**
   - Enable toggle with description and "Learn more" link
   - Input field with Save/Copy buttons inline
   - Tip text and policy links

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Account.tsx` | Major | Redesign to Airbnb field row pattern with Edit/Add links |
| `src/pages/Transactions.tsx` | Medium | Rename to "Payments & payouts", add Airbnb-style sub-tabs |
| `src/components/dashboard/StripeStatusCard.tsx` | Medium | Redesign with Airbnb payments section styling |
| `src/components/dashboard/NextStepCard.tsx` | Minor | Cleaner Airbnb styling |
| `src/components/dashboard/HostDashboard.tsx` | Minor | Polish stat cards and section headers |
| `src/components/dashboard/ShopperDashboard.tsx` | Minor | Polish tabs and zero-state styling |
| `src/components/account/AirbnbFieldRow.tsx` | Create | Reusable field row component |
| `src/components/account/AirbnbInfoCard.tsx` | Create | FAQ/info card with icon accent |

---

## Implementation Details

### 1. New Component: AirbnbFieldRow.tsx

A reusable field row component matching Airbnb's pattern:

```
┌─────────────────────────────────────────────────────┐
│ Legal name                                     Edit │
│ Shawnna Harbin                                      │
├─────────────────────────────────────────────────────┤
│ Email address                                  Edit │
│ s***n@vendibook.com                                │
├─────────────────────────────────────────────────────┤
│ Phone numbers                                  Add  │
│ Add a number so confirmed guests can get in touch. │
│ You can add other numbers and choose how...         │
└─────────────────────────────────────────────────────┘
```

**Props:**
- `label: string` - Field label (bold)
- `value: string | null` - Current value or "Not provided"
- `description?: string` - Optional helper text
- `action: 'Edit' | 'Add' | 'Start' | 'Create'` - Action link text
- `onAction: () => void` - Click handler
- `locked?: boolean` - Show lock indicator instead of action
- `showDivider?: boolean` - Show bottom border

---

### 2. New Component: AirbnbInfoCard.tsx

FAQ/Info cards with pink/red icon accents (like Airbnb's "Why isn't my info shown here?"):

```typescript
interface AirbnbInfoCardProps {
  icon: LucideIcon;
  iconColor?: 'pink' | 'red' | 'orange';
  title: string;
  description: string;
}
```

**Visual:**
- Light gray background card
- Colored icon in circle (pink/red accent)
- Bold title + muted description

---

### 3. Redesign Account.tsx

**Current State:** Form inputs directly editable in cards

**New State:** Airbnb's read-only display with "Edit" modal pattern

**Section Structure:**

```text
Personal information
├─ Legal name          → "Shawnna Harbin"        [Edit]
├─ Preferred first name → "Not provided"         [Add]
├─ Email address       → "s***n@vendibook.com"   [Edit]
├─ Phone numbers       → "Not provided"          [Add]
│  └─ (helper text: Add a number so guests can...)
├─ Identity verification → "Not started"         [Start]
├─ Residential address → "Not provided"          [Add]
└─ Mailing address     → "Not provided"          [Add]

[Info Cards]
├─ Why isn't my info shown here?
├─ Which details can be edited?
└─ What info is shared with others?
```

**Login & security:**
```text
Login
├─ Password            → "Created" / "Not created"  [Update/Create]

Social accounts
├─ Google              → "Connected" / "Not connected" [Connect/Disconnect]

Account
├─ Deactivate your account → "This action cannot be undone" [Deactivate]
```

**Payments:**
```text
[Sub-tabs: Payments | Payouts | Service fee]

Your payments
├─ Keep track of all your payments and refunds.
└─ [Manage payments] button (black filled)

Payment methods
├─ Add a payment method using our secure payment system...
└─ [Add payment method] button (black filled)

Payout methods (for hosts)
├─ Stripe status: Connected / Not connected
└─ [Manage with Stripe] / [Connect Stripe] button

Gift credit
└─ [Add gift card] button

Coupons
└─ "Your coupons" (empty state or list)
```

---

### 4. Redesign Transactions.tsx → Payments Page

**Changes:**
- Rename page title to "Payments"
- Add sub-tabs matching Airbnb: "Payments" | "Payouts" | "Service fee"
- Payments tab: Your purchases + payment methods
- Payouts tab: Your sales + payout account (Stripe)
- Service fee tab: Fee breakdown and explanation

**Stripe Integration Visual:**
```text
┌─────────────────────────────────────────────────────┐
│ Payouts                                             │
│                                                     │
│ Your payouts                                        │
│ When you receive a payment, we'll transfer funds   │
│ to your payout account.                             │
│                                                     │
│ ┌─────────────────────────────────────────────────┐│
│ │ ● Stripe connected                              ││
│ │   Payments enabled. Funds deposited to *4242.   ││
│ │                              [View in Stripe →] ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Payout schedule                                     │
│ Your next payout will be processed on Feb 5, 2025  │
│                                   [Change schedule] │
└─────────────────────────────────────────────────────┘
```

---

### 5. Enhance StripeStatusCard.tsx

**Current:** Simple success badge

**New:** Full Airbnb-style section with connection status and action

```typescript
// When NOT connected:
<div className="border rounded-xl p-4">
  <h4 className="font-medium">Set up payouts</h4>
  <p className="text-muted-foreground text-sm">
    Add a payout method so we can send you money.
  </p>
  <Button variant="default" className="mt-4 bg-foreground text-background">
    Set up payouts
  </Button>
</div>

// When connected:
<div className="border rounded-xl p-4">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
      <Check className="h-5 w-5 text-primary-foreground" />
    </div>
    <div>
      <p className="font-medium">Stripe connected</p>
      <p className="text-sm text-muted-foreground">Payments enabled</p>
    </div>
  </div>
  <Button variant="outline" className="mt-4">
    View in Stripe
    <ExternalLink className="ml-2 h-4 w-4" />
  </Button>
</div>
```

---

### 6. Dashboard Polish

**HostDashboard.tsx:**
- Simplify header to match Airbnb's minimal style
- Remove heavy shadows on stat cards
- Use border-only cards with subtle hover states
- Section headers: Simple text, no card wrapper

**ShopperDashboard.tsx:**
- Simplify tabs to match Airbnb's underline-only active state
- Remove heavy badge styling on tab counts
- Clean zero-state illustrations

---

## Visual Style Guide (Airbnb Alignment)

### Typography
- Section titles: 22px, semibold (text-foreground)
- Field labels: 16px, medium (text-foreground)
- Field values: 14px, regular (text-muted-foreground)
- Action links: 14px, medium, underline (text-foreground)

### Colors
- Primary accent: Keep current orange/primary for brand consistency
- Stripe accent: Purple (#635bff) for Stripe-related elements
- Info card icons: Pink/rose for privacy notices

### Spacing
- Section padding: 24px vertical between sections
- Field row padding: 16px vertical
- Sidebar item height: 48px

### Buttons
- Primary actions: Black filled button (bg-foreground text-background)
- Secondary: Outline with border
- Action links: Underlined text, no button wrapper

### Borders & Cards
- Cards: 1px border, 12px border-radius
- Minimal shadows (only for elevated elements)
- Separators: 1px border-border

---

## Technical Implementation Notes

### Edit Modal Pattern

Instead of inline form inputs, implement modal-based editing:

1. Click "Edit" on field row
2. Opens dialog/drawer with form inputs
3. Save updates the field and closes modal
4. Field row displays updated value

This matches Airbnb's pattern and simplifies the main page layout.

### State Management

- Each section maintains its own edit state
- Use existing form validation schemas
- Preserve current save logic, just change UI trigger

### Mobile Responsiveness

- Left sidebar becomes top horizontal tabs on mobile
- Field rows stack vertically
- Action links become full-width buttons

---

## Implementation Order

1. Create `AirbnbFieldRow.tsx` component
2. Create `AirbnbInfoCard.tsx` component
3. Refactor `Account.tsx` to use new components
4. Enhance `StripeStatusCard.tsx` with Airbnb payments styling
5. Redesign `Transactions.tsx` with sub-tabs
6. Polish `HostDashboard.tsx` and `ShopperDashboard.tsx`

---

## Expected User Experience

### Before:
- Forms with visible input fields everywhere
- Heavy card styling with shadows
- Cluttered visual hierarchy

### After:
- Clean read-only display with clear "Edit" actions
- Minimal, breathable whitespace
- Clear visual hierarchy with Airbnb's proven patterns
- Stripe/payments section feels native and trustworthy
