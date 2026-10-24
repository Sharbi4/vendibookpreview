-- Preserve the tax decision made at checkout; never infer history from a mutable profile.
alter table public.square_billing_attempts add column if not exists tax_snapshot jsonb;

create or replace function public.copy_square_purchase_tax_snapshot() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.square_billing_attempts;
begin
 if new.payment_provider is distinct from 'square' then return new; end if;
 select * into a from square_billing_attempts
 where payment_id=new.square_payment_id or ('square:'||id::text)=new.idempotency_key limit 1;
 if found and a.tax_snapshot is not null then
  new.tax_cents := a.tax_cents;
  new.tax_rate_pct := (a.tax_snapshot->>'rate_pct')::numeric;
  new.tax_source := a.tax_snapshot->>'source';
  new.tax_jurisdiction := a.tax_snapshot->>'state';
  new.tax_exemption_id := a.tax_exemption_id;
  new.metadata := coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('tax_snapshot',a.tax_snapshot);
 end if;
 return new;
end $$;
revoke all on function public.copy_square_purchase_tax_snapshot() from public,anon,authenticated;
create trigger copy_square_purchase_tax_snapshot before insert on public.monetization_purchases
for each row execute function public.copy_square_purchase_tax_snapshot();
