-- Preserve accepted versions and existing subscriptions. New purchases only.
begin;
create temporary table featured_legal_stage (like public.legal_documents including defaults) on commit drop;
create unique index on featured_legal_stage(document_type,version);
insert into featured_legal_stage(document_type,version,status,title,slug,summary,body_markdown,effective_at,content_hash,change_summary,requires_reacceptance)
values ('featured_listing_terms','2026-11-07','active','Featured Listing Subscription Terms','featured-listing-terms',
'Recurring Square billing, placement, cancellation and legacy Boost benefits.',
$body$# Featured Listing Subscription Terms

Effective November 7, 2026. These terms apply to new Featured Listing subscriptions offered on a 30-day basis. Earlier subscriptions retain their accepted billing schedule unless you separately agree to a change.

## Price and automatic renewal
Featured is a paid visibility service for one eligible listing. The current offer is $49 USD plus applicable tax every 30 days. Your exact charge is shown before payment. Square processes the initial charge when you subscribe and recurring charges every 30 days until canceled. A 30-day cycle is not a calendar month; renewal dates can move within the calendar. There is no annual Featured option or free trial. Recurring billing requires your affirmative consent.

## Placement and activation
Featured placement begins after payment is confirmed. Placement rotates among eligible listings and may vary with filters, location, inventory and page layout. We do not guarantee a position, impressions, inquiries, buyers, bookings, revenue or a sale. Your listing remains subject to marketplace rules and eligibility requirements.

## Cancel renewal
Before your next charge, open Account → Membership & billing → Featured listing subscriptions and select Cancel renewal. Cancellation stops future renewal and preserves the remaining paid period, subject to eligibility. Check the cancellation confirmation and paid-through date. If cancellation cannot be completed online, contact support@vendibook.com for help. Marking the listing sold stops renewal; rental listings renew until canceled. Removing the app or not visiting the website does not cancel a subscription.

## Refunds and payment problems
Charges for an activated period are generally nonrefundable, including unused days after cancellation or sale, except where required by law. Contact support@vendibook.com about duplicate, unauthorized or incorrect charges or a service that did not activate. These terms do not limit statutory remedies. Unpaid periods do not grant Featured access.

## Separate benefits and changes
Pro's included 30-day Boost credits and previously purchased one-time boosts do not enroll you in this subscription. Unused Pro credits do not roll over. Existing paid time and accepted subscription terms are preserved. We provide at least 30 days' advance notice of price changes and any additional notice or consent required by applicable law. You may cancel before a change takes effect.

## Records and support
Keep your checkout disclosure, receipt and cancellation confirmation. Your subscription record shows its paid-through status. See the [Subscription Terms](/legal/subscription-terms), [Refund & Cancellation Policy](/legal/refund-cancellation-policy) and [Terms](/terms). Contact support@vendibook.com for billing assistance.
$body$,now(),encode(extensions.digest('featured-30-day-2026-11-07','sha256'),'hex'),'New 30-day Featured subscription terms; legacy terms preserved.',true)
on conflict(document_type,version) do nothing;

-- Append a narrow amendment; retain all unrelated operative protections.
insert into featured_legal_stage(document_type,version,status,title,slug,summary,body_markdown,effective_at,content_hash,change_summary,requires_reacceptance)
select document_type,'2026-11-07','active',title,slug,summary,
replace(replace(body_markdown,'Stripe billing portal','Vendibook Account → Membership & billing'),'(725) 755-9598','(866) 690-6227') || E'\n\n## Featured subscription amendment — November 7, 2026\n\nFor new Featured Listing purchases, the Featured Listing Terms (/legal/featured-listing-terms) control any conflicting boost or subscription wording above. Featured is $49 USD plus applicable tax for one listing, charged through Square when you subscribe and every 30 days until canceled, with affirmative recurring consent before payment. Cancel renewal before the next charge from Account → Membership & billing → Featured listing subscriptions. Access continues through the paid period subject to eligibility. Activated periods are generally nonrefundable except where required by law; contact support@vendibook.com for billing errors or service failures. Marking the listing sold stops renewal; rentals renew until canceled. Earlier monthly subscriptions retain their agreed schedule. Included Pro credits and legacy one-time boosts remain non-renewing. No views, inquiries, bookings or sales are guaranteed. Existing rights and at least 30 days advance notice of price changes remain in force.\n',
now(),encode(extensions.digest(document_type||'-featured-30-day-2026-11-07','sha256'),'hex'),'Featured amendment and current billing support; unrelated terms preserved.',true
from (select distinct on(document_type) * from public.legal_documents where document_type in ('subscription_terms','refund_cancellation_policy') and status='active' and version <> '2026-11-07' order by document_type,effective_at desc) previous
on conflict(document_type,version) do nothing;
insert into public.legal_documents(document_type,version,status,title,slug,summary,body_markdown,effective_at,content_hash,change_summary,requires_reacceptance)
select document_type,version,status,title,slug,summary,body_markdown,effective_at,encode(extensions.digest(body_markdown,'sha256'),'hex'),change_summary,requires_reacceptance from featured_legal_stage on conflict(document_type,version) do nothing;
commit;
