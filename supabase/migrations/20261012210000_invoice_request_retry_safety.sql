-- One pending invoice intent per buyer/item, even across separate API requests.
create unique index one_pending_invoice_intent_per_buyer
on public.sale_transactions(listing_id,buyer_id)
where invoice_required and status in ('pending','payment_failed');

create function public.close_unpaid_request_intent()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status in ('declined','cancelled','expired') and new.status is distinct from old.status then
    -- Never cancel a funded or uncertain provider transaction.
    if exists(select 1 from public.sale_invoices where sale_id=new.sale_id
      and status in ('payment_processing','paid','disputed','partially_refunded','completed')) then
      raise exception 'Provider reconciliation is required before closing this purchase';
    end if;
    update public.sale_transactions set status='cancelled'
      where id=new.sale_id and invoice_required and status in ('pending','payment_failed');
  end if;
  return new;
end $$;
create trigger close_unpaid_request_intent after update of status on public.sale_purchase_requests
for each row execute function public.close_unpaid_request_intent();
