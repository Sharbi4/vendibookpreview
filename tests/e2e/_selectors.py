"""Shared data-testid selectors for the Vendibook E2E suite.

Centralising these keeps every guidance / widget test aligned with the
canonical hook names shipped on the components. When a component's copy or
DOM structure is refactored, only this file needs to change.

Selector convention:
    [data-testid="<slug>"]           — element hook
    [data-testid="<slug>"][data-…]   — variant / state discriminator

Component ownership of each hook:
    howitworks-section        ListingHowItWorks.tsx  (data-variant)
    howitworks-heading        ListingHowItWorks.tsx
    howitworks-open-cta       ListingHowItWorks.tsx
    howitworks-dialog         ListingHowItWorks.tsx  (data-variant)
    howitworks-branch-selector ListingHowItWorks.tsx  (dual mode only)
    howitworks-branch-sale    ListingHowItWorks.tsx  (dual mode only)
    howitworks-branch-rent    ListingHowItWorks.tsx  (dual mode only)
    howitworks-final-cta      ListingHowItWorks.tsx  (data-branch)
    booking-widget-buy-now    BookingWidget.tsx
    booking-widget-rent-cta   BookingWidget.tsx     (data-instant-book)
    rental-widget-cta         RentalBookingWidget.tsx (data-instant-book)
    rental-calendar-day       RentalBookingWidget.tsx
                              (data-day-key, data-day-status, data-day-disabled)
    sale-sticky-buy-now       SaleStickyActionBar.tsx
    sale-mobile-buy-now       SaleListingMobile.tsx
"""

TID = {
    "section": '[data-testid="howitworks-section"]',
    "heading": '[data-testid="howitworks-heading"]',
    "open_cta": '[data-testid="howitworks-open-cta"]',
    "dialog": '[data-testid="howitworks-dialog"]',
    "branch_selector": '[data-testid="howitworks-branch-selector"]',
    "branch_sale": '[data-testid="howitworks-branch-sale"]',
    "branch_rent": '[data-testid="howitworks-branch-rent"]',
    "final_cta": '[data-testid="howitworks-final-cta"]',
    "buy_now_widget": '[data-testid="booking-widget-buy-now"]',
    "rent_cta_widget": '[data-testid="booking-widget-rent-cta"]',
    "rental_cta": '[data-testid="rental-widget-cta"]',
    "calendar_day_enabled": '[data-testid="rental-calendar-day"][data-day-disabled="false"]',
    "sale_sticky_buy": '[data-testid="sale-sticky-buy-now"]',
    "sale_mobile_buy": '[data-testid="sale-mobile-buy-now"]',
}


def visible(sel: str) -> str:
    """Return a Playwright selector that pins ``sel`` to a visible element.
    Guidance renders twice (mobile + desktop wrappers) so :visible is a must."""
    return f"{sel}:visible"


def any_buy_now() -> str:
    """Union selector matching a Buy Now button in any listing surface —
    desktop widget, mobile sticky bar, or sale mobile detail page."""
    return ",".join(
        visible(TID[k]) for k in ("buy_now_widget", "sale_sticky_buy", "sale_mobile_buy")
    )


def any_rent_cta() -> str:
    """Union selector for the primary rent CTA across the two rental widgets."""
    return ",".join(visible(TID[k]) for k in ("rental_cta", "rent_cta_widget"))
