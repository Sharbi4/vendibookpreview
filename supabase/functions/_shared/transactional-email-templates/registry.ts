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
import { template as feedbackRequest } from './feedback-request.tsx'
import { template as bookingAbandoned } from './booking-abandoned.tsx'
import { template as supportReply } from './support-reply.tsx'
import { template as featuredPaymentReceipt } from './featured-payment-receipt.tsx'
import { template as featuredPaymentAdminAlert } from './featured-payment-admin-alert.tsx'
import { template as featuredPaymentRefunded } from './featured-payment-refunded.tsx'
import { template as featuredBoostExpired } from './featured-boost-expired.tsx'
import { template as refundProcessed } from './refund-processed.tsx'
import { template as feedbackReceivedAdmin } from './feedback-received-admin.tsx'
import { template as feedbackWeeklyDigest } from './feedback-weekly-digest.tsx'
import { template as genericNotice } from './generic-notice.tsx'
import { template as referralOnboarding } from './referral-onboarding.tsx'
import { template as referralPostTxPs } from './referral-post-tx-ps.tsx'
import { template as newListingAlert } from './new-listing-alert.tsx'
import { template as accountReadyRecovery } from './account-ready-recovery.tsx'
import { template as complimentaryFeaturedBoost } from './complimentary-featured-boost.tsx'
import { template as cashPurchaseRequestSeller } from './cash-purchase-request-seller.tsx'
import { template as cashPurchaseRequestBuyer } from './cash-purchase-request-buyer.tsx'
import { template as cashSellerConfirmedBuyer } from './cash-seller-confirmed-buyer.tsx'
import { template as cashBuyerConfirmedSeller } from './cash-buyer-confirmed-seller.tsx'


export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-abandoned': bookingAbandoned,
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
  'feedback-request': feedbackRequest,
  'support-reply': supportReply,
  'featured-payment-receipt': featuredPaymentReceipt,
  'featured-payment-admin-alert': featuredPaymentAdminAlert,
  'featured-payment-refunded': featuredPaymentRefunded,
  'featured-boost-expired': featuredBoostExpired,
  'refund-processed': refundProcessed,
  'feedback-received-admin': feedbackReceivedAdmin,
  'feedback-weekly-digest': feedbackWeeklyDigest,
  'generic-notice': genericNotice,
  'referral-onboarding': referralOnboarding,
  'referral-post-tx-ps': referralPostTxPs,
  'new-listing-alert': newListingAlert,
  'account-ready-recovery': accountReadyRecovery,
  'complimentary-featured-boost': complimentaryFeaturedBoost,
}
