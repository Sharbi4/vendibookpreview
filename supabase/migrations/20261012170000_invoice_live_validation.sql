-- Owner selected live implementation. Evidence is environment-specific; this
-- migration does not enable checkout, change credentials, or move money.
alter table public.commerce_rollout
  add column payment_environment text not null default 'live'
    check (payment_environment in ('live','sandbox')),
  add column live_validation_reference text;

-- Preserve an already-enabled historical sandbox rollout as sandbox.
update public.commerce_rollout set payment_environment='sandbox'
where payments_enabled and nullif(btrim(sandbox_validation_reference),'') is not null;

do $$
declare c record;
begin
  for c in select conname from pg_constraint
    where conrelid='public.commerce_rollout'::regclass and contype='c'
      and pg_get_constraintdef(oid) like '%sandbox_validation_reference%'
  loop
    execute format('alter table public.commerce_rollout drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.commerce_rollout add constraint commerce_payment_validation
  check (not payments_enabled or (
    requests_enabled and case payment_environment
      when 'live' then nullif(btrim(live_validation_reference),'') is not null
      when 'sandbox' then nullif(btrim(sandbox_validation_reference),'') is not null
      else false end
  ));
comment on column public.commerce_rollout.live_validation_reference is
  'Reference to live deployment and merchant readiness evidence; not a claim that a real purchase or payout was tested.';
