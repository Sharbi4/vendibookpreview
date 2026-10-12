-- Additive, disabled-by-default equipment invoice rollout. No historical repricing.
create table public.commerce_rollout (
  id boolean primary key default true check(id),
  requests_enabled boolean not null default false,
  payments_enabled boolean not null default false,
  legal_review_reference text,
  sandbox_validation_reference text,
  enabled_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not requests_enabled or (enabled_at is not null and coalesce(length(legal_review_reference),0)>0)),
  check (not payments_enabled or (requests_enabled and coalesce(length(sandbox_validation_reference),0)>0))
);
insert into public.commerce_rollout(id) values(true);
alter table public.commerce_rollout enable row level security;
grant select on public.commerce_rollout to authenticated;
create policy commerce_rollout_read on public.commerce_rollout for select to authenticated using(true);

create table public.sale_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.sale_transactions(id),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  status text not null default 'requested' check(status in ('requested','under_review','revision_pending','approved','declined','cancelled','expired')),
  accepted_terms jsonb not null,
  proposed_terms jsonb,
  revision integer not null default 1,
  acknowledgement jsonb not null,
  expires_at timestamptz not null default now()+interval '7 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(buyer_id<>seller_id)
);
create index purchase_requests_seller on public.sale_purchase_requests(seller_id,created_at desc);
create index purchase_requests_buyer on public.sale_purchase_requests(buyer_id,created_at desc);
alter table public.sale_purchase_requests enable row level security;
grant select on public.sale_purchase_requests to authenticated;
create policy purchase_request_participants on public.sale_purchase_requests for select to authenticated
  using ((select auth.uid()) in (buyer_id,seller_id) or public.has_role((select auth.uid()),'admin'));

-- Reviewed tax evidence is bound to a request revision. State estimates never qualify.
create table public.commerce_tax_reviews (
  request_id uuid not null references public.sale_purchase_requests(id),
  revision integer not null,
  tax_cents bigint not null check(tax_cents>=0),
  jurisdiction text not null check(length(jurisdiction)>0),
  responsible_party text not null check(responsible_party in ('seller','marketplace','not_taxable')),
  item_classification text not null check(length(item_classification)>0),
  evidence_reference text not null check(length(evidence_reference)>0),
  exemption_reference text,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  primary key(request_id,revision)
);
alter table public.commerce_tax_reviews enable row level security;
grant select on public.commerce_tax_reviews to authenticated;
create policy commerce_tax_admin on public.commerce_tax_reviews for select to authenticated
  using(public.has_role((select auth.uid()),'admin'));

create sequence public.sale_invoice_number;
create table public.sale_invoices (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.sale_purchase_requests(id),
  sale_id uuid not null unique references public.sale_transactions(id),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references auth.users(id),
  seller_id uuid not null references auth.users(id),
  invoice_number text not null unique default 'VB-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.sale_invoice_number')::text,7,'0'),
  status text not null default 'issued' check(status in ('issued','payment_processing','paid','cancelled','expired','disputed','partially_refunded','refunded','completed')),
  currency text not null default 'USD' check(currency='USD'),
  equipment_cents bigint not null check(equipment_cents>0),
  delivery_cents bigint not null check(delivery_cents>=0),
  freight_cents bigint not null check(freight_cents>=0),
  tax_cents bigint not null check(tax_cents>=0),
  total_cents bigint not null check(total_cents=equipment_cents+delivery_cents+freight_cents+tax_cents),
  seller_snapshot jsonb not null,
  buyer_snapshot jsonb not null,
  terms_snapshot jsonb not null,
  tax_snapshot jsonb not null,
  fee_snapshot jsonb not null,
  due_at timestamptz not null default now()+interval '48 hours',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  paypal_capture_id text,
  auto_disbursement_at timestamptz,
  disbursement_status text not null default 'not_funded' check(disbursement_status in ('not_funded','held','release_requested','released','exception','unknown')),
  updated_at timestamptz not null default now()
);
create index invoice_buyer_due on public.sale_invoices(buyer_id,status,due_at);
create index invoice_seller on public.sale_invoices(seller_id,issued_at desc);
-- One physical asset can have only one active reservation, including payment in flight.
create unique index one_reserved_equipment on public.sale_invoices(listing_id)
  where status in ('issued','payment_processing','paid','disputed','partially_refunded','completed');
alter table public.sale_invoices enable row level security;
grant select on public.sale_invoices to authenticated;
create policy invoice_participants on public.sale_invoices for select to authenticated
  using ((select auth.uid()) in (buyer_id,seller_id) or public.has_role((select auth.uid()),'admin'));

-- Durable event/outbox: notification creation and state changes commit together.
create table public.commerce_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  sale_id uuid not null references public.sale_transactions(id),
  actor_id uuid references auth.users(id),
  recipient_id uuid not null references auth.users(id),
  event_type text not null,
  title text not null,
  message text not null,
  link text not null,
  created_at timestamptz not null default now(),
  email_sent_at timestamptz,
  email_attempts integer not null default 0,
  email_next_attempt_at timestamptz not null default now(),
  email_last_error text
);
alter table public.commerce_events enable row level security;
grant select on public.commerce_events to authenticated;
create policy commerce_event_recipient on public.commerce_events for select to authenticated
  using ((select auth.uid())=recipient_id or public.has_role((select auth.uid()),'admin'));

create function public.commerce_event(_key text,_sale uuid,_actor uuid,_recipient uuid,_type text,_title text,_message text,_link text)
returns void language plpgsql set search_path=public as $$
declare inserted uuid;
begin
  insert into public.commerce_events(event_key,sale_id,actor_id,recipient_id,event_type,title,message,link)
    values(_key,_sale,_actor,_recipient,_type,_title,_message,_link) on conflict(event_key) do nothing returning id into inserted;
  if inserted is not null then
    insert into public.notifications(user_id,type,title,message,link) values(_recipient,'sale',_title,_message,_link);
  end if;
end $$;

create function public.commerce_submit_request(_sale uuid,_actor uuid,_ack_version text,_acknowledged boolean)
returns uuid language plpgsql set search_path=public as $$
declare s public.sale_transactions; l public.listings; existing uuid; request_id uuid;
begin
  if not exists(select 1 from public.commerce_rollout where requests_enabled) then raise exception 'Invoice purchases are not activated'; end if;
  if _acknowledged is distinct from true or _ack_version is distinct from 'purchase-request-2026-10-11' then raise exception 'Purchase acknowledgment required'; end if;
  select * into s from public.sale_transactions where id=_sale for update;
  if not found or s.buyer_id<>_actor or s.seller_id=_actor then raise exception 'Not authorized'; end if;
  select id into existing from public.sale_purchase_requests where sale_id=_sale;
  if existing is not null then return existing; end if;
  if s.status not in ('pending','payment_failed') or s.terms_id is null then raise exception 'Purchase cannot be requested'; end if;
  select * into l from public.listings where id=s.listing_id for update;
  if l.status<>'published' or l.mode<>'sale' or l.host_id<>s.seller_id then raise exception 'Listing unavailable'; end if;
  if exists(select 1 from public.sale_invoices where listing_id=s.listing_id and status in ('issued','payment_processing','paid','disputed','partially_refunded','completed')) then raise exception 'Equipment is reserved'; end if;
  insert into public.sale_purchase_requests(sale_id,listing_id,buyer_id,seller_id,accepted_terms,acknowledgement)
  values(s.id,s.listing_id,s.buyer_id,s.seller_id,
    jsonb_build_object('amount',s.amount,'delivery_fee',s.delivery_fee,'freight_cost',s.freight_cost,'freight_payer',coalesce(l.freight_payer,'buyer'),'fulfillment_type',s.fulfillment_type,'delivery_address',s.delivery_address,'delivery_instructions',s.delivery_instructions,'terms_id',s.terms_id,'listing_title',l.title),
    jsonb_build_object('version',_ack_version,'text','I understand that I am expressly requesting to initiate a purchase transaction through Vendibook. I understand that seller approval and a separate invoice payment are required before the purchase can proceed.','accepted_at',now(),'buyer_id',_actor,'listing_id',s.listing_id,'seller_id',s.seller_id,'terms_id',s.terms_id)) returning id into request_id;
  perform public.commerce_event('request:'||request_id||':seller',s.id,_actor,s.seller_id,'purchase_requested','Review purchase request','A buyer requested your equipment. Review the agreed details before approving.','/dashboard/invoices?request='||request_id);
  perform public.commerce_event('request:'||request_id||':buyer',s.id,_actor,s.buyer_id,'purchase_requested','Request Pending','Your request is awaiting seller approval. No payment was collected.','/dashboard/invoices?request='||request_id);
  return request_id;
end $$;

create function public.commerce_review_tax(_request uuid,_actor uuid,_revision integer,_tax bigint,_jurisdiction text,_responsible text,_classification text,_evidence text,_exemption text default null)
returns void language plpgsql set search_path=public as $$
declare r public.sale_purchase_requests;
begin
  if not public.has_role(_actor,'admin') then raise exception 'Administrator required'; end if;
  select * into r from public.sale_purchase_requests where id=_request for update;
  if not found or r.revision<>_revision or r.status not in ('requested','under_review') then raise exception 'Request changed'; end if;
  insert into public.commerce_tax_reviews(request_id,revision,tax_cents,jurisdiction,responsible_party,item_classification,evidence_reference,exemption_reference,reviewed_by)
    values(_request,_revision,_tax,_jurisdiction,_responsible,_classification,_evidence,_exemption,_actor)
    on conflict(request_id,revision) do update set tax_cents=excluded.tax_cents,jurisdiction=excluded.jurisdiction,responsible_party=excluded.responsible_party,item_classification=excluded.item_classification,evidence_reference=excluded.evidence_reference,exemption_reference=excluded.exemption_reference,reviewed_by=excluded.reviewed_by,reviewed_at=now();
end $$;

create function public.commerce_request_action(_request uuid,_actor uuid,_action text,_revision integer,_proposed jsonb default null)
returns jsonb language plpgsql set search_path=public as $$
declare r public.sale_purchase_requests; s public.sale_transactions; l public.listings; tax public.commerce_tax_reviews; inv public.sale_invoices; seller jsonb; equipment bigint; delivery bigint; freight bigint; fee bigint; link text;
begin
  select * into r from public.sale_purchase_requests where id=_request for update;
  if not found or _actor not in (r.buyer_id,r.seller_id) then raise exception 'Not authorized'; end if;
  if _action='approve' and r.status='approved' and _actor=r.seller_id then
    select * into inv from public.sale_invoices where request_id=r.id;
    return jsonb_build_object('invoice_id',inv.id,'status',inv.status);
  end if;
  if r.revision<>_revision or r.expires_at<=now() or r.status not in ('requested','under_review','revision_pending') then raise exception 'Request changed or expired'; end if;
  select * into s from public.sale_transactions where id=r.sale_id for update;
  if s.status not in ('pending','payment_failed') then raise exception 'Sale already progressed'; end if;
  link:='/dashboard/invoices?request='||r.id;
  if _action='review' and _actor=r.seller_id and r.status='requested' then
    update public.sale_purchase_requests set status='under_review',updated_at=now() where id=r.id;
  elsif _action='decline' and _actor=r.seller_id then
    update public.sale_purchase_requests set status='declined',updated_at=now() where id=r.id;
    perform public.commerce_event('decline:'||r.id,s.id,_actor,r.buyer_id,'purchase_declined','Request declined','The seller declined your purchase request. No payment was collected.',link);
  elsif _action='cancel' and _actor=r.buyer_id then
    update public.sale_purchase_requests set status='cancelled',updated_at=now() where id=r.id;
    perform public.commerce_event('cancel-request:'||r.id,s.id,_actor,r.seller_id,'purchase_cancelled','Request canceled','The buyer canceled this unpaid request.',link);
  elsif _action='revise' and _actor=r.seller_id then
    if jsonb_typeof(_proposed)<>'object' or coalesce((_proposed->>'equipment_cents')::bigint,0)<=0 or length(coalesce(_proposed->>'included_items',''))=0 then raise exception 'Price and included items required'; end if;
    update public.sale_purchase_requests set status='revision_pending',proposed_terms=jsonb_build_object('equipment_cents',(_proposed->>'equipment_cents')::bigint,'included_items',left(_proposed->>'included_items',4000)),revision=revision+1,updated_at=now() where id=r.id;
    perform public.commerce_event('revision:'||r.id||':'||(r.revision+1),s.id,_actor,r.buyer_id,'purchase_revised','Review revised purchase terms','The seller proposed new terms. Your acceptance is required before an invoice can be issued.',link);
  elsif _action='accept_revision' and _actor=r.buyer_id and r.status='revision_pending' then
    update public.sale_purchase_requests set status='requested',accepted_terms=accepted_terms||jsonb_build_object('amount',(proposed_terms->>'equipment_cents')::numeric/100,'included_items',proposed_terms->>'included_items','revision_accepted_at',now(),'revision_accepted_by',_actor),proposed_terms=null,updated_at=now() where id=r.id;
    perform public.commerce_event('revision-accepted:'||r.id||':'||r.revision,s.id,_actor,r.seller_id,'revision_accepted','Revised terms accepted','The buyer accepted your revised terms. Review and approve to issue the invoice.',link);
  elsif _action='approve' and _actor=r.seller_id and r.status in ('requested','under_review') then
    select * into l from public.listings where id=r.listing_id for update;
    if l.status<>'published' or l.host_id<>r.seller_id then raise exception 'Listing unavailable'; end if;
    if exists(select 1 from public.sale_transactions where listing_id=l.id and id<>s.id and status in ('paid','buyer_confirmed','seller_confirmed','completed')) then raise exception 'Equipment already purchased'; end if;
    if exists(select 1 from public.sale_invoices where listing_id=l.id and status in ('issued','payment_processing','paid','disputed','partially_refunded','completed')) then raise exception 'Equipment is reserved'; end if;
    select * into tax from public.commerce_tax_reviews where request_id=r.id and revision=r.revision;
    if not found then raise exception 'A reviewed destination tax determination is required before invoice issue'; end if;
    select jsonb_build_object('id',id,'legal_name',coalesce(nullif(business_name,''),full_name)) into seller from public.profiles where id=r.seller_id;
    if length(coalesce(seller->>'legal_name',''))=0 then raise exception 'Seller legal name required'; end if;
    equipment:=round((r.accepted_terms->>'amount')::numeric*100);
    delivery:=round(coalesce((r.accepted_terms->>'delivery_fee')::numeric,0)*100);
    freight:=case when r.accepted_terms->>'freight_payer'='seller' then 0 else round(coalesce((r.accepted_terms->>'freight_cost')::numeric,0)*100) end;
    -- Preserve the rate originally quoted to this request, even on a later revision.
    fee:=round(equipment*coalesce(s.fee_rate_pct,12.9)/100);
    insert into public.sale_invoices(request_id,sale_id,listing_id,buyer_id,seller_id,equipment_cents,delivery_cents,freight_cents,tax_cents,total_cents,seller_snapshot,buyer_snapshot,terms_snapshot,tax_snapshot,fee_snapshot)
      values(r.id,s.id,r.listing_id,r.buyer_id,r.seller_id,equipment,delivery,freight,tax.tax_cents,equipment+delivery+freight+tax.tax_cents,seller,
        jsonb_build_object('id',r.buyer_id,'name',s.buyer_name,'email',s.buyer_email),r.accepted_terms,
        jsonb_build_object('jurisdiction',tax.jurisdiction,'responsible_party',tax.responsible_party,'classification',tax.item_classification,'evidence_reference',tax.evidence_reference,'exemption_reference',tax.exemption_reference,'reviewed_at',tax.reviewed_at),
        jsonb_build_object('base_cents',equipment,'fee_cents',fee,'rate_pct',coalesce(s.fee_rate_pct,12.9),'version','equipment-sale-2026-10-11','processing_fee','recorded separately by payment provider')) returning * into inv;
    update public.sale_transactions set amount=equipment/100.0,platform_fee=fee/100.0,seller_payout=(equipment-fee)/100.0,tax_amount=tax.tax_cents/100.0,tax_source='reviewed_invoice',tax_jurisdiction=tax.jurisdiction where id=s.id;
    update public.sale_purchase_requests set status='approved',updated_at=now() where id=r.id;
    perform public.commerce_event('invoice:'||inv.id||':buyer',s.id,_actor,r.buyer_id,'invoice_issued','Pay Invoice','Your seller approved the purchase. Review the itemized invoice and authorize payment separately.','/invoices/'||inv.id);
    perform public.commerce_event('invoice:'||inv.id||':seller',s.id,_actor,r.seller_id,'invoice_issued','Invoice issued','Your equipment is reserved while this invoice awaits payment.','/invoices/'||inv.id);
    return jsonb_build_object('invoice_id',inv.id,'status','issued');
  else raise exception 'Action not allowed for this participant and status'; end if;
  return jsonb_build_object('request_id',r.id);
end $$;

-- No browser writes or direct RPC access. The edge authenticates users and supplies
-- the actor ID from getUser, never from request JSON. Functions run as invoker.
revoke all on public.commerce_rollout,public.sale_purchase_requests,public.commerce_tax_reviews,public.sale_invoices,public.commerce_events from anon;
revoke insert,update,delete on public.commerce_rollout,public.sale_purchase_requests,public.commerce_tax_reviews,public.sale_invoices,public.commerce_events from authenticated;
grant all on public.commerce_rollout,public.sale_purchase_requests,public.commerce_tax_reviews,public.sale_invoices,public.commerce_events to service_role;
grant usage,select on sequence public.sale_invoice_number to service_role;
revoke all on function public.commerce_event(text,uuid,uuid,uuid,text,text,text,text),public.commerce_submit_request(uuid,uuid,text,boolean),public.commerce_review_tax(uuid,uuid,integer,bigint,text,text,text,text,text),public.commerce_request_action(uuid,uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.commerce_event(text,uuid,uuid,uuid,text,text,text,text),public.commerce_submit_request(uuid,uuid,text,boolean),public.commerce_review_tax(uuid,uuid,integer,bigint,text,text,text,text,text),public.commerce_request_action(uuid,uuid,text,integer,jsonb) to service_role;

create function public.commerce_claim_invoice(_sale uuid,_actor uuid)
returns public.sale_invoices language plpgsql set search_path=public as $$
declare i public.sale_invoices;
begin
  if not exists(select 1 from public.commerce_rollout where payments_enabled) then raise exception 'Invoice payments are awaiting validation'; end if;
  select * into i from public.sale_invoices where sale_id=_sale for update;
  if not found or i.buyer_id<>_actor then raise exception 'Not authorized'; end if;
  if i.status not in ('issued','payment_processing') or (i.status='issued' and i.due_at<=now()) then raise exception 'Invoice is not payable'; end if;
  update public.sale_invoices set status='payment_processing',updated_at=now() where id=i.id;
  -- Remains reserved across network failures: only verified provider recovery may
  -- clear an uncertain payment. An expiry must never race a possible capture.
  return i;
end $$;

create function public.commerce_cancel_invoice(_invoice uuid,_actor uuid)
returns void language plpgsql set search_path=public as $$
declare i public.sale_invoices;
begin
  select * into i from public.sale_invoices where id=_invoice for update;
  if not found or _actor not in(i.buyer_id,i.seller_id) then raise exception 'Not authorized'; end if;
  if i.status='cancelled' then return; end if;
  if i.status<>'issued' then raise exception 'Payment started; provider reconciliation is required before cancellation'; end if;
  update public.sale_invoices set status='cancelled',updated_at=now() where id=i.id;
  update public.sale_purchase_requests set status='cancelled',updated_at=now() where id=i.request_id;
  perform public.commerce_event('invoice-cancel:'||i.id||':buyer',i.sale_id,_actor,i.buyer_id,'invoice_cancelled','Invoice canceled','This unpaid invoice was canceled. The equipment reservation has ended.','/invoices/'||i.id);
  perform public.commerce_event('invoice-cancel:'||i.id||':seller',i.sale_id,_actor,i.seller_id,'invoice_cancelled','Invoice canceled','This unpaid invoice was canceled. The equipment reservation has ended.','/invoices/'||i.id);
end $$;

create function public.commerce_expire_unpaid()
returns integer language plpgsql set search_path=public as $$
declare i public.sale_invoices; affected integer:=0;
begin
  for i in select * from public.sale_invoices where status='issued' and due_at<=now() for update skip locked loop
    update public.sale_invoices set status='expired',updated_at=now() where id=i.id;
    update public.sale_purchase_requests set status='expired',updated_at=now() where id=i.request_id;
    perform public.commerce_event('invoice-expired:'||i.id||':buyer',i.sale_id,null,i.buyer_id,'invoice_expired','Invoice expired','The payment window ended. Request a new invoice if you still want to purchase.','/invoices/'||i.id);
    perform public.commerce_event('invoice-expired:'||i.id||':seller',i.sale_id,null,i.seller_id,'invoice_expired','Reservation released','The unpaid invoice expired and your equipment is available again.','/invoices/'||i.id);
    affected:=affected+1;
  end loop;
  update public.sale_purchase_requests set status='expired',updated_at=now() where status in ('requested','under_review','revision_pending') and expires_at<=now();
  return affected;
end $$;

-- Public availability contains no invoice IDs, parties or monetary amounts.
create function public.equipment_reservation_status(_listings uuid[])
returns table(listing_id uuid,status text) language sql stable security definer set search_path=public as $$
  select i.listing_id,case when i.status='completed' then 'sold' when i.status in ('issued','payment_processing') then 'payment_pending' else 'sale_pending' end
    from public.sale_invoices i where i.listing_id=any(_listings[1:100]) and i.status in ('issued','payment_processing','paid','disputed','partially_refunded','completed');
$$;
revoke all on function public.equipment_reservation_status(uuid[]) from public;
grant execute on function public.equipment_reservation_status(uuid[]) to anon,authenticated,service_role;
revoke all on function public.commerce_claim_invoice(uuid,uuid),public.commerce_cancel_invoice(uuid,uuid),public.commerce_expire_unpaid() from public,anon,authenticated;
grant execute on function public.commerce_claim_invoice(uuid,uuid),public.commerce_cancel_invoice(uuid,uuid),public.commerce_expire_unpaid() to service_role;
