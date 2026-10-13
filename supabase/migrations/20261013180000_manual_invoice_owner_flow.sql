-- Owner decision 2026-10-13: equipment sale invoices are sent and collected
-- MANUALLY by Vendibook admin (no invoicing API), and seller payouts are
-- released MANUALLY by admin. Applies on top of 20261012014545..20261012220000.
--
-- Flow:
--   buyer request (seller has 14 days, reminders at day 2/7/12, then expires)
--   -> seller approves (equipment reserved, admin alerted to send the invoice)
--   -> admin records the invoice it sent (amounts + optional payment link)
--   -> buyer pays outside the API; admin records the payment (sale becomes paid)
--   -> buyer confirmation + both signatures + saved walkthrough video
--   -> admin alerted to release the seller payment -> admin records the release.
-- No payment provider call happens in this migration or its functions.

alter table public.sale_purchase_requests
  alter column expires_at set default now() + interval '14 days',
  add column if not exists approved_at timestamptz;

alter table public.sale_invoices
  add column if not exists invoice_method text not null default 'manual'
    check (invoice_method in ('manual', 'provider')),
  add column if not exists external_invoice_url text
    check (external_invoice_url is null or external_invoice_url ~ '^https://[^\s]+$'),
  add column if not exists external_invoice_reference text,
  add column if not exists admin_note text,
  add column if not exists payment_reference text,
  add column if not exists payment_recorded_by uuid references auth.users(id),
  add column if not exists release_ready_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists release_reference text,
  add column if not exists released_by uuid references auth.users(id);

-- Every admin gets the in-app alert (and the email through the outbox).
create or replace function public.commerce_notify_admins(_key text, _sale uuid, _actor uuid, _type text, _title text, _message text, _link text)
returns void language plpgsql set search_path = public as $$
declare a uuid;
begin
  for a in select distinct ur.user_id from public.user_roles ur where ur.role::text = 'admin' loop
    perform public.commerce_event(_key || ':admin:' || a, _sale, _actor, a, _type, _title, _message, _link);
  end loop;
end $$;

-- Seller approval reserves the equipment and asks admin to send the invoice.
-- It no longer requires a tax review or issues an invoice by itself.
create or replace function public.commerce_request_action(_request uuid, _actor uuid, _action text, _revision integer, _proposed jsonb default null)
returns jsonb language plpgsql set search_path = public as $$
declare r public.sale_purchase_requests; s public.sale_transactions; l public.listings; inv public.sale_invoices; link text;
begin
  select * into r from public.sale_purchase_requests where id = _request for update;
  if not found or _actor not in (r.buyer_id, r.seller_id) then raise exception 'Not authorized'; end if;
  if _action = 'approve' and r.status = 'approved' and _actor = r.seller_id then
    select * into inv from public.sale_invoices where request_id = r.id;
    return jsonb_build_object('request_id', r.id, 'status', 'approved', 'invoice_id', inv.id);
  end if;
  if r.revision <> _revision or r.expires_at <= now() or r.status not in ('requested', 'under_review', 'revision_pending') then
    raise exception 'Request changed or expired';
  end if;
  select * into s from public.sale_transactions where id = r.sale_id for update;
  if s.status not in ('pending', 'payment_failed') then raise exception 'Sale already progressed'; end if;
  link := '/dashboard/invoices?request=' || r.id;
  if _action = 'review' and _actor = r.seller_id and r.status = 'requested' then
    update public.sale_purchase_requests set status = 'under_review', updated_at = now() where id = r.id;
  elsif _action = 'decline' and _actor = r.seller_id then
    update public.sale_purchase_requests set status = 'declined', updated_at = now() where id = r.id;
    perform public.commerce_event('decline:' || r.id, s.id, _actor, r.buyer_id, 'purchase_declined', 'Request declined',
      'The seller declined your purchase request. No payment was collected.', link);
  elsif _action = 'cancel' and _actor = r.buyer_id then
    update public.sale_purchase_requests set status = 'cancelled', updated_at = now() where id = r.id;
    perform public.commerce_event('cancel-request:' || r.id, s.id, _actor, r.seller_id, 'purchase_cancelled', 'Request canceled',
      'The buyer canceled this request. No payment was collected.', link);
  elsif _action = 'revise' and _actor = r.seller_id then
    if jsonb_typeof(_proposed) <> 'object' or coalesce((_proposed->>'equipment_cents')::bigint, 0) <= 0
       or length(coalesce(_proposed->>'included_items', '')) = 0 then
      raise exception 'Price and included items required';
    end if;
    update public.sale_purchase_requests set status = 'revision_pending',
      proposed_terms = jsonb_build_object('equipment_cents', (_proposed->>'equipment_cents')::bigint, 'included_items', left(_proposed->>'included_items', 4000)),
      revision = revision + 1, updated_at = now() where id = r.id;
    perform public.commerce_event('revision:' || r.id || ':' || (r.revision + 1), s.id, _actor, r.buyer_id, 'purchase_revised',
      'Review revised purchase terms', 'The seller proposed new terms. Your acceptance is required before the sale can be approved.', link);
  elsif _action = 'accept_revision' and _actor = r.buyer_id and r.status = 'revision_pending' then
    update public.sale_purchase_requests set status = 'requested',
      accepted_terms = accepted_terms || jsonb_build_object('amount', (proposed_terms->>'equipment_cents')::numeric / 100,
        'included_items', proposed_terms->>'included_items', 'revision_accepted_at', now(), 'revision_accepted_by', _actor),
      proposed_terms = null, updated_at = now() where id = r.id;
    perform public.commerce_event('revision-accepted:' || r.id || ':' || r.revision, s.id, _actor, r.seller_id, 'revision_accepted',
      'Revised terms accepted', 'The buyer accepted your revised terms. Approve the sale to continue.', link);
  elsif _action = 'approve' and _actor = r.seller_id and r.status in ('requested', 'under_review') then
    select * into l from public.listings where id = r.listing_id for update;
    if l.status <> 'published' or l.host_id <> r.seller_id then raise exception 'Listing unavailable'; end if;
    if exists (select 1 from public.sale_transactions where listing_id = l.id and id <> s.id
               and status in ('paid', 'buyer_confirmed', 'seller_confirmed', 'completed')) then
      raise exception 'Equipment already purchased';
    end if;
    if exists (select 1 from public.sale_invoices where listing_id = l.id
               and status in ('issued', 'payment_processing', 'paid', 'disputed', 'partially_refunded', 'completed'))
       or exists (select 1 from public.sale_purchase_requests o where o.listing_id = l.id and o.id <> r.id and o.status = 'approved') then
      raise exception 'Equipment is reserved for another approved buyer';
    end if;
    update public.sale_purchase_requests set status = 'approved', approved_at = now(), updated_at = now() where id = r.id;
    perform public.commerce_event('approved:' || r.id || ':buyer', s.id, _actor, r.buyer_id, 'purchase_approved', 'Payment Pending',
      'The seller approved your purchase. Vendibook will send your itemized invoice by email and it will also appear in your dashboard. Nothing has been charged.', link);
    perform public.commerce_event('approved:' || r.id || ':seller', s.id, _actor, r.seller_id, 'purchase_approved', 'Sale approved',
      'Your equipment is reserved for this buyer while Vendibook sends the invoice. We will notify you when payment is received.', link);
    perform public.commerce_notify_admins('invoice-requested:' || r.id, s.id, _actor, 'invoice_requested', 'Send invoice',
      'A seller approved a purchase. Prepare and send the invoice, then record it in Vendibook admin.', '/admin/invoices?request=' || r.id);
    return jsonb_build_object('request_id', r.id, 'status', 'approved');
  else
    raise exception 'Action not allowed for this participant and status';
  end if;
  return jsonb_build_object('request_id', r.id);
end $$;

-- Admin records the invoice it sent manually. Amounts are entered by admin.
create or replace function public.commerce_record_invoice_sent(
  _request uuid, _actor uuid, _equipment bigint, _delivery bigint, _freight bigint, _tax bigint, _fee bigint,
  _due_days integer, _invoice_url text default null, _invoice_reference text default null, _note text default null,
  _tax_jurisdiction text default null)
returns uuid language plpgsql set search_path = public as $$
declare r public.sale_purchase_requests; s public.sale_transactions; seller jsonb; inv public.sale_invoices;
begin
  if not public.has_role(_actor, 'admin') then raise exception 'Administrator required'; end if;
  select * into r from public.sale_purchase_requests where id = _request for update;
  if not found or r.status <> 'approved' then raise exception 'Only an approved request can be invoiced'; end if;
  if exists (select 1 from public.sale_invoices where request_id = r.id) then raise exception 'This request already has an invoice'; end if;
  if coalesce(_equipment, 0) <= 0 or coalesce(_delivery, -1) < 0 or coalesce(_freight, -1) < 0 or coalesce(_tax, -1) < 0
     or coalesce(_fee, -1) < 0 or _fee > _equipment then
    raise exception 'Enter valid invoice amounts';
  end if;
  if coalesce(_due_days, 0) not between 1 and 60 then raise exception 'Due date must be 1 to 60 days out'; end if;
  if _invoice_url is not null and _invoice_url !~ '^https://[^\s]+$' then raise exception 'Payment link must start with https://'; end if;
  -- The price is the one the buyer accepted; changes go through the seller's revised-terms step.
  if _equipment <> round((r.accepted_terms->>'amount')::numeric * 100) then
    raise exception 'Equipment price must match the accepted price of %', r.accepted_terms->>'amount';
  end if;
  select * into s from public.sale_transactions where id = r.sale_id for update;
  if s.status not in ('pending', 'payment_failed') then raise exception 'Sale already progressed'; end if;
  select jsonb_build_object('id', id, 'legal_name', coalesce(nullif(business_name, ''), full_name)) into seller
    from public.profiles where id = r.seller_id;
  if length(coalesce(seller->>'legal_name', '')) = 0 then raise exception 'Seller legal name required'; end if;
  insert into public.sale_invoices(request_id, sale_id, listing_id, buyer_id, seller_id, equipment_cents, delivery_cents, freight_cents,
      tax_cents, total_cents, seller_snapshot, buyer_snapshot, terms_snapshot, tax_snapshot, fee_snapshot, due_at,
      invoice_method, external_invoice_url, external_invoice_reference, admin_note)
    values (r.id, s.id, r.listing_id, r.buyer_id, r.seller_id, _equipment, _delivery, _freight, _tax,
      _equipment + _delivery + _freight + _tax, seller,
      jsonb_build_object('id', r.buyer_id, 'name', s.buyer_name, 'email', s.buyer_email), r.accepted_terms,
      jsonb_build_object('method', 'manual_admin', 'jurisdiction', nullif(btrim(_tax_jurisdiction), ''), 'recorded_by', _actor, 'recorded_at', now()),
      jsonb_build_object('base_cents', _equipment, 'fee_cents', _fee, 'rate_pct', round(_fee * 100.0 / _equipment, 2),
        'method', 'manual_admin', 'version', 'equipment-sale-manual-2026-10-13'),
      now() + make_interval(days => _due_days), 'manual', _invoice_url, nullif(btrim(_invoice_reference), ''), nullif(btrim(_note), ''))
    returning * into inv;
  update public.sale_transactions set amount = _equipment / 100.0, platform_fee = _fee / 100.0,
    seller_payout = (_equipment - _fee) / 100.0, tax_amount = _tax / 100.0,
    tax_source = 'reviewed_invoice', tax_jurisdiction = nullif(btrim(_tax_jurisdiction), '') where id = s.id;
  perform public.commerce_event('invoice:' || inv.id || ':buyer', s.id, _actor, r.buyer_id, 'invoice_issued', 'Pay Invoice',
    'Your itemized invoice is ready. Review it and pay from your dashboard or the invoice email.', '/invoices/' || inv.id);
  perform public.commerce_event('invoice:' || inv.id || ':seller', s.id, _actor, r.seller_id, 'invoice_issued', 'Invoice sent',
    'Vendibook sent the buyer''s invoice. Your equipment stays reserved while payment is pending.', '/invoices/' || inv.id);
  return inv.id;
end $$;

-- Admin confirms the buyer paid. The sale becomes paid, which starts the
-- purchase agreement (signnow-agreement-sweep) and handoff steps. Funds are held.
create or replace function public.commerce_record_payment(_invoice uuid, _actor uuid, _reference text, _received_at timestamptz default null)
returns void language plpgsql set search_path = public as $$
declare i public.sale_invoices;
begin
  if not public.has_role(_actor, 'admin') then raise exception 'Administrator required'; end if;
  if length(btrim(coalesce(_reference, ''))) = 0 then raise exception 'Payment reference required'; end if;
  select * into i from public.sale_invoices where id = _invoice for update;
  if not found then raise exception 'Invoice not found'; end if;
  if i.status = 'paid' then return; end if;
  if i.status not in ('issued', 'payment_processing') then raise exception 'Invoice is not awaiting payment'; end if;
  update public.sale_invoices set status = 'paid', paid_at = coalesce(_received_at, now()), payment_reference = btrim(_reference),
    payment_recorded_by = _actor, disbursement_status = 'held', updated_at = now() where id = i.id;
  update public.sale_transactions set status = 'paid' where id = i.sale_id and status in ('pending', 'payment_failed');
  perform public.commerce_event('paid:' || i.id || ':buyer', i.sale_id, _actor, i.buyer_id, 'payment_received', 'Sale Pending',
    'Payment received. Vendibook holds it until the handoff is confirmed, the purchase agreement is signed and the walkthrough video is saved.', '/invoices/' || i.id);
  perform public.commerce_event('paid:' || i.id || ':seller', i.sale_id, _actor, i.seller_id, 'payment_received', 'Buyer paid — arrange the handoff',
    'The buyer''s payment is received and held. Arrange the handoff, sign the purchase agreement and record the walkthrough video to have it released.', '/invoices/' || i.id);
  perform public.commerce_check_release_ready(i.sale_id);
end $$;

-- Ready for release = invoice paid + buyer confirmed + both signatures + saved walkthrough video.
create or replace function public.commerce_check_release_ready(_sale uuid)
returns boolean language plpgsql set search_path = public as $$
declare i public.sale_invoices; sale_status text;
begin
  select * into i from public.sale_invoices where sale_id = _sale and status = 'paid' and released_at is null for update;
  if not found then return false; end if;
  if i.release_ready_at is not null then return true; end if;
  select status into sale_status from public.sale_transactions where id = _sale;
  if sale_status not in ('buyer_confirmed', 'completed') then return false; end if;
  if not exists (select 1 from public.documents d where d.transaction_id = _sale
                 and d.document_type in ('purchase_sale_agreement', 'bill_of_sale') and d.status = 'completed'
                 and d.renter_signed_at is not null and d.host_signed_at is not null) then
    return false;
  end if;
  if not exists (select 1 from public.handoff_media hm join public.handoff_sessions hs on hs.id = hm.handoff_session_id
                 where hs.sale_transaction_id = _sale and hm.media_type = 'video'
                   and hm.storage_path is not null and coalesce(hm.byte_size, 0) > 0) then
    return false;
  end if;
  update public.sale_invoices set release_ready_at = now(), disbursement_status = 'release_requested', updated_at = now() where id = i.id;
  perform public.commerce_notify_admins('release-ready:' || i.id, _sale, null, 'payout_ready', 'Release seller payment',
    'The buyer confirmed the handoff, the purchase agreement is signed and the walkthrough video is saved. Release the seller payment manually, then record it.',
    '/admin/invoices?invoice=' || i.id);
  return true;
end $$;

-- Admin records the manual payout to the seller.
create or replace function public.commerce_record_release(_invoice uuid, _actor uuid, _reference text)
returns void language plpgsql set search_path = public as $$
declare i public.sale_invoices;
begin
  if not public.has_role(_actor, 'admin') then raise exception 'Administrator required'; end if;
  if length(btrim(coalesce(_reference, ''))) = 0 then raise exception 'Payout reference required'; end if;
  select * into i from public.sale_invoices where id = _invoice for update;
  if not found then raise exception 'Invoice not found'; end if;
  if i.released_at is not null then return; end if;
  if i.status <> 'paid' or i.release_ready_at is null then
    raise exception 'Release conditions are not met: buyer confirmation, both signatures and the walkthrough video are required';
  end if;
  update public.sale_invoices set released_at = now(), release_reference = btrim(_reference), released_by = _actor,
    disbursement_status = 'released', status = 'completed', updated_at = now() where id = i.id;
  perform public.commerce_event('released:' || i.id || ':seller', i.sale_id, _actor, i.seller_id, 'payout_released', 'Payment released',
    'Vendibook released your payment for this sale. Thank you for selling on Vendibook.', '/invoices/' || i.id);
end $$;

-- Admin can end an approved request or an unpaid invoice (e.g. buyer never paid).
create or replace function public.commerce_admin_cancel(_request uuid, _actor uuid, _reason text)
returns void language plpgsql set search_path = public as $$
declare r public.sale_purchase_requests; i public.sale_invoices; msg text;
begin
  if not public.has_role(_actor, 'admin') then raise exception 'Administrator required'; end if;
  select * into r from public.sale_purchase_requests where id = _request for update;
  if not found then raise exception 'Request not found'; end if;
  select * into i from public.sale_invoices where request_id = r.id for update;
  if i.id is not null and i.status not in ('issued', 'cancelled', 'expired') then
    raise exception 'A paid invoice must be refunded, not canceled';
  end if;
  if i.id is not null and i.status = 'issued' then
    update public.sale_invoices set status = 'cancelled', updated_at = now() where id = i.id;
  end if;
  if r.status in ('requested', 'under_review', 'revision_pending', 'approved') then
    update public.sale_purchase_requests set status = 'cancelled', updated_at = now() where id = r.id;
  end if;
  msg := 'This purchase was canceled by Vendibook' || coalesce(': ' || nullif(btrim(_reason), ''), '.') || ' No payment was collected.';
  perform public.commerce_event('admin-cancel:' || r.id || ':buyer', r.sale_id, _actor, r.buyer_id, 'purchase_cancelled', 'Purchase canceled', msg, '/dashboard/invoices?request=' || r.id);
  perform public.commerce_event('admin-cancel:' || r.id || ':seller', r.sale_id, _actor, r.seller_id, 'purchase_cancelled', 'Purchase canceled',
    'This purchase was canceled and your equipment is available again.', '/dashboard/invoices?request=' || r.id);
end $$;

-- Hourly sweep (called by expire-stale-offers): seller reminders, 14-day
-- expiry with notices, overdue manual invoices flagged to admin (never
-- auto-cancelled: payment may be in flight outside the API), release checks.
create or replace function public.commerce_expire_unpaid()
returns integer language plpgsql set search_path = public as $$
declare r public.sale_purchase_requests; i public.sale_invoices; affected integer := 0; link text;
begin
  for r in select * from public.sale_purchase_requests
           where status in ('requested', 'under_review') and expires_at > now() loop
    link := '/dashboard/invoices?view=selling&request=' || r.id;
    if r.created_at <= now() - interval '2 days' then
      perform public.commerce_event('request-reminder:' || r.id || ':d2', r.sale_id, null, r.seller_id, 'purchase_reminder',
        'A buyer is waiting for your answer', 'Approve or decline this purchase request. It expires 14 days after it was submitted.', link);
    end if;
    if r.created_at <= now() - interval '7 days' then
      perform public.commerce_event('request-reminder:' || r.id || ':d7', r.sale_id, null, r.seller_id, 'purchase_reminder',
        'Purchase request: one week left', 'This purchase request expires in 7 days if you do not respond.', link);
    end if;
    if r.expires_at <= now() + interval '2 days' then
      perform public.commerce_event('request-reminder:' || r.id || ':final', r.sale_id, null, r.seller_id, 'purchase_reminder',
        'Purchase request expires soon', 'This purchase request expires within 2 days. After that the buyer''s request is canceled.', link);
    end if;
  end loop;

  for r in select * from public.sale_purchase_requests
           where status in ('requested', 'under_review', 'revision_pending') and expires_at <= now() for update skip locked loop
    update public.sale_purchase_requests set status = 'expired', updated_at = now() where id = r.id;
    perform public.commerce_event('request-expired:' || r.id || ':buyer', r.sale_id, null, r.buyer_id, 'purchase_expired', 'Request expired',
      'The seller did not respond within 14 days, so your purchase request was canceled. No payment was collected.', '/dashboard/invoices?request=' || r.id);
    perform public.commerce_event('request-expired:' || r.id || ':seller', r.sale_id, null, r.seller_id, 'purchase_expired', 'Request expired',
      'This purchase request expired after 14 days without a response.', '/dashboard/invoices?view=selling&request=' || r.id);
    affected := affected + 1;
  end loop;

  -- Provider invoices (future) still expire at their due date.
  for i in select * from public.sale_invoices where status = 'issued' and invoice_method = 'provider' and due_at <= now() for update skip locked loop
    update public.sale_invoices set status = 'expired', updated_at = now() where id = i.id;
    update public.sale_purchase_requests set status = 'expired', updated_at = now() where id = i.request_id;
    perform public.commerce_event('invoice-expired:' || i.id || ':buyer', i.sale_id, null, i.buyer_id, 'invoice_expired', 'Invoice expired',
      'The payment window ended. Request a new invoice if you still want to purchase.', '/invoices/' || i.id);
    perform public.commerce_event('invoice-expired:' || i.id || ':seller', i.sale_id, null, i.seller_id, 'invoice_expired', 'Reservation released',
      'The unpaid invoice expired and your equipment is available again.', '/invoices/' || i.id);
    affected := affected + 1;
  end loop;

  for i in select * from public.sale_invoices where status = 'issued' and invoice_method = 'manual' and due_at <= now() loop
    perform public.commerce_notify_admins('invoice-overdue:' || i.id, i.sale_id, null, 'invoice_overdue', 'Invoice overdue',
      'A manually sent invoice is past its due date. Record the payment if it arrived, or cancel the purchase.', '/admin/invoices?invoice=' || i.id);
  end loop;

  for i in select * from public.sale_invoices where status = 'paid' and released_at is null and release_ready_at is null loop
    perform public.commerce_check_release_ready(i.sale_id);
  end loop;
  return affected;
end $$;

-- Re-check release readiness as soon as the buyer confirms or the agreement completes.
create or replace function public.commerce_release_ready_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare sale uuid;
begin
  -- to_jsonb: the same function serves two tables with different columns.
  sale := (to_jsonb(new) ->> case when tg_table_name = 'documents' then 'transaction_id' else 'id' end)::uuid;
  if sale is not null and exists (select 1 from public.sale_invoices where sale_id = sale and status = 'paid' and release_ready_at is null) then
    begin
      perform public.commerce_check_release_ready(sale);
    exception when others then
      -- Never block the underlying write; the hourly sweep retries.
      null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists commerce_release_ready_sale on public.sale_transactions;
create trigger commerce_release_ready_sale after update of status on public.sale_transactions
  for each row when (new.status in ('buyer_confirmed', 'completed')) execute function public.commerce_release_ready_trigger();
drop trigger if exists commerce_release_ready_document on public.documents;
create trigger commerce_release_ready_document after update of status on public.documents
  for each row when (new.status = 'completed' and new.transaction_id is not null) execute function public.commerce_release_ready_trigger();

-- Public availability: an approved request already reserves the equipment.
create or replace function public.equipment_reservation_status(_listings uuid[])
returns table(listing_id uuid, status text) language sql stable security definer set search_path = public as $$
  select i.listing_id,
         case when i.status = 'completed' then 'sold' when i.status in ('issued', 'payment_processing') then 'payment_pending' else 'sale_pending' end
    from public.sale_invoices i
   where i.listing_id = any(_listings[1:100])
     and i.status in ('issued', 'payment_processing', 'paid', 'disputed', 'partially_refunded', 'completed')
  union
  select r.listing_id, 'payment_pending'
    from public.sale_purchase_requests r
   where r.listing_id = any(_listings[1:100]) and r.status = 'approved'
     and not exists (select 1 from public.sale_invoices i where i.request_id = r.id);
$$;
revoke all on function public.equipment_reservation_status(uuid[]) from public;
grant execute on function public.equipment_reservation_status(uuid[]) to anon, authenticated, service_role;

revoke all on function public.commerce_notify_admins(text, uuid, uuid, text, text, text, text),
  public.commerce_record_invoice_sent(uuid, uuid, bigint, bigint, bigint, bigint, bigint, integer, text, text, text, text),
  public.commerce_record_payment(uuid, uuid, text, timestamptz),
  public.commerce_check_release_ready(uuid),
  public.commerce_record_release(uuid, uuid, text),
  public.commerce_admin_cancel(uuid, uuid, text),
  public.commerce_release_ready_trigger()
  from public, anon, authenticated;
grant execute on function public.commerce_notify_admins(text, uuid, uuid, text, text, text, text),
  public.commerce_record_invoice_sent(uuid, uuid, bigint, bigint, bigint, bigint, bigint, integer, text, text, text, text),
  public.commerce_record_payment(uuid, uuid, text, timestamptz),
  public.commerce_check_release_ready(uuid),
  public.commerce_record_release(uuid, uuid, text),
  public.commerce_admin_cancel(uuid, uuid, text)
  to service_role;
