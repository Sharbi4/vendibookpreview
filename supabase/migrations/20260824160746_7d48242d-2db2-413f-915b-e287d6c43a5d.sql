create or replace function public.is_privileged_financial_writer()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return true;
  end if;
  if current_user in (
    'postgres', 'supabase_admin', 'supabase_auth_admin',
    'supabase_storage_admin', 'service_role'
  ) then
    return true;
  end if;
  if auth.uid() is not null and public.has_role(auth.uid(), 'admin') then
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.secure_booking_request_financials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_days integer;
  v_weeks integer;
  v_base numeric;
  v_delivery numeric;
  v_subtotal numeric;
begin
  if public.is_privileged_financial_writer() then
    return NEW;
  end if;

  if TG_OP = 'INSERT' then
    NEW.status := 'pending';
    NEW.payment_status := 'unpaid';
    NEW.payment_provider := 'paypal';
    NEW.paid_at := null;
    NEW.payment_intent_id := null;
    NEW.checkout_session_id := null;
    NEW.deposit_status := 'pending';
    NEW.deposit_charge_id := null;
    NEW.deposit_refunded_at := null;
    NEW.deposit_refund_notes := null;
    NEW.payout_processed := false;
    NEW.payout_processed_at := null;
    NEW.payout_transfer_id := null;
    NEW.payout_hold_until := null;
    NEW.payout_hold_reason := null;
    NEW.payout_hold_set_by := null;
    NEW.host_confirmed_at := null;
    NEW.shopper_confirmed_at := null;
    NEW.dispute_opened_at := null;
    NEW.dispute_reason := null;
    NEW.dispute_status := null;
    NEW.host_response := null;
    NEW.responded_at := null;
    NEW.host_platform_fee := null;
    NEW.host_fee_rate_pct := null;
    NEW.host_pro_discount := 0;
    NEW.pro_fee_applied := false;
    NEW.fee_locked_at := null;
    NEW.tax_amount := 0;
    NEW.tax_rate_pct := null;
    NEW.tax_source := null;
    NEW.tax_jurisdiction := null;
    NEW.hold_status := 'none';
    NEW.hold_expires_at := null;
    NEW.document_review_status := 'not_required';
    NEW.documents_approved_at := null;
    NEW.documents_approved_by := null;
    NEW.document_rejection_reason := null;
  else
    NEW.payment_status := OLD.payment_status;
    NEW.paid_at := OLD.paid_at;
    NEW.payment_intent_id := OLD.payment_intent_id;
    NEW.checkout_session_id := OLD.checkout_session_id;
    NEW.payment_provider := OLD.payment_provider;
    NEW.deposit_status := OLD.deposit_status;
    NEW.deposit_charge_id := OLD.deposit_charge_id;
    NEW.deposit_refunded_at := OLD.deposit_refunded_at;
    NEW.deposit_refund_notes := OLD.deposit_refund_notes;
    NEW.payout_processed := OLD.payout_processed;
    NEW.payout_processed_at := OLD.payout_processed_at;
    NEW.payout_transfer_id := OLD.payout_transfer_id;
    NEW.payout_hold_until := OLD.payout_hold_until;
    NEW.payout_hold_reason := OLD.payout_hold_reason;
    NEW.payout_hold_set_by := OLD.payout_hold_set_by;
    NEW.host_platform_fee := OLD.host_platform_fee;
    NEW.host_fee_rate_pct := OLD.host_fee_rate_pct;
    NEW.host_pro_discount := OLD.host_pro_discount;
    NEW.pro_fee_applied := OLD.pro_fee_applied;
    NEW.fee_locked_at := OLD.fee_locked_at;
    NEW.tax_amount := OLD.tax_amount;
    NEW.tax_rate_pct := OLD.tax_rate_pct;
    NEW.tax_source := OLD.tax_source;
    NEW.tax_jurisdiction := OLD.tax_jurisdiction;
    NEW.shopper_id := OLD.shopper_id;
    NEW.host_id := OLD.host_id;
    NEW.listing_id := OLD.listing_id;
    NEW.is_instant_book := OLD.is_instant_book;
    if OLD.payment_status <> 'unpaid' or OLD.paid_at is not null then
      NEW.total_price := OLD.total_price;
      NEW.deposit_amount := OLD.deposit_amount;
      NEW.delivery_fee_snapshot := OLD.delivery_fee_snapshot;
      return NEW;
    end if;
  end if;

  select price_hourly, price_daily, price_weekly, delivery_fee,
         deposit_amount, host_id, instant_book
    into l
    from public.listings
   where id = NEW.listing_id;

  if found then
    if TG_OP = 'INSERT' then
      NEW.host_id := l.host_id;
      NEW.is_instant_book := coalesce(l.instant_book, false);
    end if;

    if coalesce(NEW.is_hourly_booking, false)
       and l.price_hourly is not null
       and coalesce(NEW.duration_hours, 0) > 0 then
      v_base := NEW.duration_hours * l.price_hourly;
    else
      v_days := greatest(coalesce(NEW.end_date - NEW.start_date, -1) + 1, 0);
      if l.price_daily is null or v_days <= 0 then
        v_base := 0;
      else
        v_weeks := floor(v_days / 7.0)::integer;
        if l.price_weekly is not null and v_weeks > 0 then
          v_base := (v_weeks * l.price_weekly)
                  + ((v_days - (v_weeks * 7)) * l.price_daily);
        else
          v_base := v_days * l.price_daily;
        end if;
      end if;
    end if;

    v_delivery := case when NEW.fulfillment_selected = 'delivery'
                       then coalesce(l.delivery_fee, 0) else 0 end;
    v_subtotal := round((v_base + v_delivery)::numeric, 2);
    NEW.total_price := round(v_subtotal + round(v_subtotal * 0.129, 2), 2);
    NEW.delivery_fee_snapshot := case when NEW.fulfillment_selected = 'delivery'
                                      then l.delivery_fee else null end;
    NEW.deposit_amount := l.deposit_amount;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_booking_requests_secure_financials on public.booking_requests;
create trigger trg_booking_requests_secure_financials
  before insert or update on public.booking_requests
  for each row execute function public.secure_booking_request_financials();

create or replace function public.secure_sale_transaction_financials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_offer numeric;
  v_fee numeric;
begin
  if public.is_privileged_financial_writer() then
    return NEW;
  end if;

  if TG_OP = 'UPDATE' then
    NEW.listing_id := OLD.listing_id;
    NEW.buyer_id := OLD.buyer_id;
    NEW.seller_id := OLD.seller_id;
    NEW.amount := OLD.amount;
    NEW.platform_fee := OLD.platform_fee;
    NEW.seller_payout := OLD.seller_payout;
    NEW.fee_rate_pct := OLD.fee_rate_pct;
    NEW.pro_discount := OLD.pro_discount;
    NEW.pro_fee_applied := OLD.pro_fee_applied;
    NEW.fee_locked_at := OLD.fee_locked_at;
    NEW.tax_amount := OLD.tax_amount;
    NEW.tax_rate_pct := OLD.tax_rate_pct;
    NEW.tax_source := OLD.tax_source;
    NEW.tax_jurisdiction := OLD.tax_jurisdiction;
    NEW.payment_intent_id := OLD.payment_intent_id;
    NEW.checkout_session_id := OLD.checkout_session_id;
    NEW.payment_provider := OLD.payment_provider;
    NEW.payout_completed_at := OLD.payout_completed_at;
    NEW.transfer_id := OLD.transfer_id;
    NEW.promo_code_id := OLD.promo_code_id;
    NEW.promo_discount := OLD.promo_discount;
    NEW.delivery_fee := OLD.delivery_fee;
    NEW.freight_cost := OLD.freight_cost;
    NEW.freight_payment_status := OLD.freight_payment_status;
    NEW.freight_payment_intent_id := OLD.freight_payment_intent_id;
    NEW.freight_checkout_session_id := OLD.freight_checkout_session_id;
    NEW.freight_paid_at := OLD.freight_paid_at;
    return NEW;
  end if;

  select price_sale, host_id into l
    from public.listings
   where id = NEW.listing_id;
  if not found then
    raise exception 'invalid_listing: no listing %', NEW.listing_id;
  end if;

  select coalesce(o.counter_amount, o.offer_amount) into v_offer
    from public.offers o
   where o.listing_id = NEW.listing_id
     and o.buyer_id = NEW.buyer_id
     and o.status = 'accepted'
   order by o.responded_at desc nulls last, o.updated_at desc
   limit 1;

  NEW.seller_id := l.host_id;
  NEW.amount := coalesce(nullif(v_offer, 0), l.price_sale);
  if NEW.amount is null or NEW.amount <= 0 then
    raise exception 'invalid_amount: listing % has no sale price', NEW.listing_id;
  end if;

  v_fee := round(NEW.amount * 0.129, 2);
  NEW.platform_fee := v_fee;
  NEW.seller_payout := round(NEW.amount - v_fee, 2);
  NEW.fee_rate_pct := 12.9;
  NEW.pro_discount := 0;
  NEW.pro_fee_applied := false;
  NEW.fee_locked_at := null;
  NEW.status := 'pending';
  NEW.payment_provider := 'paypal';
  NEW.payment_intent_id := null;
  NEW.checkout_session_id := null;
  NEW.payout_completed_at := null;
  NEW.transfer_id := null;
  NEW.promo_code_id := null;
  NEW.promo_discount := 0;
  NEW.tax_amount := 0;
  NEW.tax_rate_pct := null;
  NEW.tax_source := null;
  NEW.tax_jurisdiction := null;
  NEW.delivery_fee := 0;
  NEW.freight_cost := 0;
  NEW.freight_payment_status := null;
  NEW.freight_payment_intent_id := null;
  NEW.freight_checkout_session_id := null;
  NEW.freight_paid_at := null;
  NEW.buyer_confirmed_at := null;
  NEW.seller_confirmed_at := null;
  NEW.shipped_at := null;
  NEW.delivered_at := null;
  return NEW;
end;
$$;

drop trigger if exists trg_sale_transactions_secure_financials on public.sale_transactions;
create trigger trg_sale_transactions_secure_financials
  before insert or update on public.sale_transactions
  for each row execute function public.secure_sale_transaction_financials();

create or replace function public.secure_monetization_purchase_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  v_promo_active boolean;
begin
  if public.is_privileged_financial_writer() then
    return NEW;
  end if;

  select * into p
    from public.monetization_products
   where id = NEW.product_id;
  if not found then
    raise exception 'invalid_product: %', NEW.product_id;
  end if;

  v_promo_active := p.promo_price_cents is not null
    and (p.promo_starts_at is null or p.promo_starts_at <= now())
    and (p.promo_ends_at is null or p.promo_ends_at >= now());

  NEW.user_id := auth.uid();
  NEW.amount_cents := case when v_promo_active
                           then p.promo_price_cents else p.price_cents end;
  NEW.discount_applied_cents := case when v_promo_active
                                     then p.price_cents - p.promo_price_cents
                                     else 0 end;
  NEW.discount_code_id := null;
  NEW.currency := coalesce(p.currency, 'USD');
  NEW.status := 'pending';
  NEW.fulfillment_status := 'pending';
  NEW.fulfillment_notes := null;
  NEW.payment_provider := 'paypal';
  NEW.stripe_session_id := null;
  NEW.stripe_payment_intent_id := null;
  NEW.stripe_customer_id := null;
  NEW.paid_at := null;
  NEW.access_starts_at := null;
  NEW.access_ends_at := null;
  NEW.nudge_sent_at := null;
  NEW.refund_status := null;
  NEW.refund_amount_cents := null;
  NEW.refunded_at := null;
  NEW.tax_cents := 0;
  NEW.tax_rate_pct := null;
  NEW.tax_source := null;
  NEW.tax_jurisdiction := null;
  return NEW;
end;
$$;

drop trigger if exists trg_monetization_purchases_secure_insert on public.monetization_purchases;
create trigger trg_monetization_purchases_secure_insert
  before insert on public.monetization_purchases
  for each row execute function public.secure_monetization_purchase_insert();