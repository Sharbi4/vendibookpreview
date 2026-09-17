create table public.seller_paypal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tracking_id text not null unique,
  merchant_id text,
  paypal_email text,
  primary_email_confirmed boolean not null default false,
  payments_receivable boolean not null default false,
  oauth_scopes text[] not null default '{}'::text[],
  consent_granted boolean not null default false,
  products jsonb,
  onboarding_status text not null default 'link_sent'
    check (onboarding_status in ('link_sent','onboarding','ready','action_required','disconnected')),
  action_reasons text[] not null default '{}'::text[],
  referral_url text,
  status_payload jsonb,
  last_status_check_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index seller_paypal_accounts_one_active
  on public.seller_paypal_accounts (user_id)
  where archived_at is null;

grant select, insert, update on public.seller_paypal_accounts to authenticated;
grant all on public.seller_paypal_accounts to service_role;

alter table public.seller_paypal_accounts enable row level security;

create policy "Sellers can view their own PayPal connection"
  on public.seller_paypal_accounts for select
  to authenticated
  using (user_id = auth.uid());

create policy "Sellers can insert their own PayPal connection"
  on public.seller_paypal_accounts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Sellers can update their own PayPal connection"
  on public.seller_paypal_accounts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.seller_paypal_ready(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.seller_paypal_accounts
    where user_id = _user_id
      and archived_at is null
      and onboarding_status = 'ready'
      and primary_email_confirmed
      and payments_receivable
      and merchant_id is not null
  )
$$;

grant execute on function public.seller_paypal_ready(uuid) to authenticated, service_role;