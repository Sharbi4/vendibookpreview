/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import {
  assert,
  assertStringIncludes,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { TEMPLATES } from './registry.ts'

/**
 * Fixture-based coverage for the "terms snapshot" block rendered inside the
 * booking / payment confirmation email. Mirrors the on-page
 * transaction-terms panel: each variant (rent-daily-with-deposit,
 * rent-weekly-plus-days, sale-instant) sends a distinct pricing/policy
 * snapshot, and this test locks in that the same snapshot survives the
 * template render into the outgoing email HTML.
 *
 * This is the email-side counterpart to
 * tests/e2e/checkout_pricing_matches_backend.py which asserts the same
 * numbers on the checkout page.
 */

const money = (c: number) => `$${(c / 100).toFixed(2)}`

interface Line { label: string; amountCents: number; kind: string }
interface Snapshot {
  termsVersion: string
  pricing: { lines: Line[] }
  policies: { cancellation: string; acknowledgements: string[] }
}

interface Variant {
  name: string
  data: Record<string, unknown>
  snapshot: Snapshot
}

const VARIANTS: Variant[] = [
  {
    name: 'rent_daily_with_deposit',
    data: {
      guestName: 'Alex',
      listingTitle: 'Downtown Food Truck',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      totalPrice: '$450.00',
      orderNumber: 'VB-1001',
      bookingId: 'bk_1001',
      cityState: 'Phoenix, AZ',
    },
    snapshot: {
      termsVersion: 'v3.rent.daily',
      pricing: {
        lines: [
          { label: '2 days × $150', amountCents: 30000, kind: 'rental' },
          { label: 'Cleaning fee', amountCents: 2500, kind: 'fee' },
          { label: 'Renter fee (12.9%)', amountCents: 4193, kind: 'fee' },
          { label: 'Refundable deposit', amountCents: 10000, kind: 'deposit' },
          { label: 'Total authorized', amountCents: 46693, kind: 'total' },
        ],
      },
      policies: {
        cancellation: 'Full refund up to 48 hours before start.',
        acknowledgements: [
          'I will return the space in the condition I received it.',
          'Deposit released within 24h of successful return.',
        ],
      },
    },
  },
  {
    name: 'rent_weekly_plus_days',
    data: {
      guestName: 'Sam',
      listingTitle: 'Ghost Kitchen — East Side',
      startDate: '2026-09-07',
      endDate: '2026-09-16',
      totalPrice: '$1,200.00',
      orderNumber: 'VB-1002',
      bookingId: 'bk_1002',
      cityState: 'Tempe, AZ',
    },
    snapshot: {
      termsVersion: 'v3.rent.weekly',
      pricing: {
        lines: [
          { label: '1 week × $900', amountCents: 90000, kind: 'rental' },
          { label: '2 extra days × $150', amountCents: 30000, kind: 'rental' },
          { label: 'Renter fee (12.9%)', amountCents: 15480, kind: 'fee' },
          { label: 'Total authorized', amountCents: 135480, kind: 'total' },
        ],
      },
      policies: {
        cancellation: 'Weekly bookings: 50% refund inside 7 days of start.',
        acknowledgements: ['I acknowledge the weekly cancellation policy.'],
      },
    },
  },
  {
    name: 'sale_instant',
    data: {
      guestName: 'Jordan',
      listingTitle: '2022 Custom Food Trailer',
      startDate: '2026-07-11',
      endDate: '2026-07-11',
      totalPrice: '$45,000.00',
      orderNumber: 'VB-2001',
      bookingId: 'bk_2001',
      cityState: 'Mesa, AZ',
    },
    snapshot: {
      termsVersion: 'v3.sale.instant',
      pricing: {
        lines: [
          { label: 'Purchase price', amountCents: 4500000, kind: 'sale' },
          { label: 'Buyer fee', amountCents: 0, kind: 'fee' },
          { label: 'Total charged', amountCents: 4500000, kind: 'total' },
        ],
      },
      policies: {
        cancellation: 'Sales are final once payment is captured.',
        acknowledgements: [
          'I have reviewed the listing details and inspection notes.',
        ],
      },
    },
  },
]

const entry = TEMPLATES['booking-confirmation']
assert(entry, 'booking-confirmation template missing from registry')

for (const variant of VARIANTS) {
  Deno.test(`terms snapshot [${variant.name}]: booking-confirmation email contains full variant`, async () => {
    const html = await renderAsync(
      React.createElement(entry.component, {
        ...variant.data,
        termsSnapshot: variant.snapshot,
        termsVersion: variant.snapshot.termsVersion,
      }),
    )

    // Terms version badge is always rendered when a snapshot is present.
    assertStringIncludes(
      html,
      variant.snapshot.termsVersion,
      `[${variant.name}] termsVersion "${variant.snapshot.termsVersion}" missing from email`,
    )
    assertStringIncludes(html, 'What you agreed to', `[${variant.name}] terms block header missing`)

    // Every priced line must appear with its exact money-formatted amount.
    for (const line of variant.snapshot.pricing.lines) {
      assertStringIncludes(html, line.label, `[${variant.name}] line label "${line.label}" missing`)
      assertStringIncludes(
        html,
        money(line.amountCents),
        `[${variant.name}] amount ${money(line.amountCents)} for "${line.label}" missing`,
      )
    }

    // Cancellation policy prose survives the render verbatim.
    assertStringIncludes(
      html,
      variant.snapshot.policies.cancellation,
      `[${variant.name}] cancellation policy missing`,
    )

    // Each acknowledgement line is rendered as its own bullet.
    for (const ack of variant.snapshot.policies.acknowledgements) {
      assertStringIncludes(html, ack, `[${variant.name}] acknowledgement "${ack}" missing`)
    }

    // Baseline booking context is still present alongside the terms block.
    assertStringIncludes(html, String(variant.data.orderNumber), `[${variant.name}] orderNumber missing`)
    assertStringIncludes(html, String(variant.data.listingTitle), `[${variant.name}] listing title missing`)
  })

  Deno.test(`terms snapshot [${variant.name}]: variants do NOT leak into each other`, async () => {
    // Render THIS variant and confirm no other variant's terms version
    // string accidentally appears — guards against a hard-coded default
    // that would otherwise silently pass the positive check above.
    const html = await renderAsync(
      React.createElement(entry.component, {
        ...variant.data,
        termsSnapshot: variant.snapshot,
        termsVersion: variant.snapshot.termsVersion,
      }),
    )
    for (const other of VARIANTS) {
      if (other.name === variant.name) continue
      assertEquals(
        html.includes(other.snapshot.termsVersion),
        false,
        `[${variant.name}] leaked other variant's termsVersion "${other.snapshot.termsVersion}"`,
      )
    }
  })
}

Deno.test('terms snapshot: omitted snapshot renders NO terms block (opt-in behaviour)', async () => {
  const html = await renderAsync(
    React.createElement(entry.component, {
      guestName: 'Nobody',
      listingTitle: 'Test',
      orderNumber: 'VB-0000',
    }),
  )
  assert(
    !html.includes('What you agreed to'),
    'terms block rendered even though no termsSnapshot was passed',
  )
  assert(
    !html.includes('Terms version'),
    'terms-version footer rendered even though no termsSnapshot was passed',
  )
})
