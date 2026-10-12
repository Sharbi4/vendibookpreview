-- Normalize new/edited sale listings. Historical transactions are untouched.
create or replace function public.require_invoice_listing_payment()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.mode='sale' then
    new.accept_cash_payment:=false;
    new.accept_paypal_checkout:=true;
  end if;
  return new;
end $$;
create trigger a00_invoice_listing_payment before insert or update on public.listings
for each row execute function public.require_invoice_listing_payment();

-- Old browser clients and direct API inserts cannot start new cash orders.
create or replace function public.reject_new_cash_sale()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status::text='pending_cash' then
    raise exception 'Cash sales are retired; submit an invoice purchase request' using errcode='23514';
  end if;
  return new;
end $$;
create trigger a00_reject_new_cash_sale before insert on public.sale_transactions
for each row execute function public.reject_new_cash_sale();
