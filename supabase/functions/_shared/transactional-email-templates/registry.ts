/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as paymentReceipt } from './payment-receipt.tsx'
import { template as bookingRequestHost } from './booking-request-host.tsx'
import { template as bookingApprovedGuest } from './booking-approved-guest.tsx'
import { template as bookingDeclinedGuest } from './booking-declined-guest.tsx'
import { template as bookingCancelled } from './booking-cancelled.tsx'
import { template as bookingReminder24h } from './booking-reminder-24h.tsx'
import { template as reviewRequest } from './review-request.tsx'
import { template as offerReceivedSeller } from './offer-received-seller.tsx'
import { template as offerCounterBuyer } from './offer-counter-buyer.tsx'
import { template as offerResolved } from './offer-resolved.tsx'
import { template as saleCompletedSeller } from './sale-completed-seller.tsx'
import { template as payoutSent } from './payout-sent.tsx'
import { template as listingPublished } from './listing-published.tsx'
import { template as listingDraftNudge } from './listing-draft-nudge.tsx'
import { template as stripeOnboardingNudge } from './stripe-onboarding-nudge.tsx'
import { template as documentStatus } from './document-status.tsx'
import { template as newMessage } from './new-message.tsx'
import { template as hostWeeklyDigest } from './host-weekly-digest.tsx'
import { template as hostDailyDigest } from './host-daily-digest.tsx'
import { template as shopperDailyDigest } from './shopper-daily-digest.tsx'
import { template as sellerDailyDigest } from './seller-daily-digest.tsx'
import { template as adminDailyDigest } from './admin-daily-digest.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'booking-confirmation': bookingConfirmation,
  'payment-receipt': paymentReceipt,
  'booking-request-host': bookingRequestHost,
  'booking-approved-guest': bookingApprovedGuest,
  'booking-declined-guest': bookingDeclinedGuest,
  'booking-cancelled': bookingCancelled,
  'booking-reminder-24h': bookingReminder24h,
  'review-request': reviewRequest,
  'offer-received-seller': offerReceivedSeller,
  'offer-counter-buyer': offerCounterBuyer,
  'offer-resolved': offerResolved,
  'sale-completed-seller': saleCompletedSeller,
  'payout-sent': payoutSent,
  'listing-published': listingPublished,
  'listing-draft-nudge': listingDraftNudge,
  'stripe-onboarding-nudge': stripeOnboardingNudge,
  'document-status': documentStatus,
  'new-message': newMessage,
  'host-weekly-digest': hostWeeklyDigest,
  'host-daily-digest': hostDailyDigest,
  'shopper-daily-digest': shopperDailyDigest,
  'seller-daily-digest': sellerDailyDigest,
  'admin-daily-digest': adminDailyDigest,
}
