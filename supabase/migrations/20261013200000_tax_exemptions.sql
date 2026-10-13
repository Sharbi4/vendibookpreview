-- Sales-tax exemption certificates (owner decision 2026-10-13).
-- A buyer uploads a state exemption or resale certificate and it applies to
-- their checkouts in that state immediately (status 'active'); admins review
-- afterwards and can revoke it. Certificates are private: only the owner and
-- admins can read the row or the file.

create table if not exists public.tax_exemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null check (state ~ '^[A-Z]{2}$'),
  exemption_type text not null
    check (exemption_type in ('resale', 'nonprofit', 'government', 'agricultural', 'manufacturing', 'other')),
  entity_name text not null check (length(btrim(entity_name)) between 2 and 200),
  certificate_number text not null check (length(btrim(certificate_number)) between 2 and 80),
  document_path text not null check (document_path ~ '^[0-9a-f-]{36}/[^/]+$'),
  notes text check (notes is null or length(notes) <= 1000),
  status text not null default 'active' check (status in ('active', 'revoked')),
  attested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(document_path, '/', 1) = user_id::text)
);

create unique index if not exists tax_exemptions_one_active_per_state
  on public.tax_exemptions(user_id, state) where status = 'active';
create index if not exists tax_exemptions_review_queue
  on public.tax_exemptions(created_at desc) where status = 'active' and reviewed_at is null;

alter table public.tax_exemptions enable row level security;
revoke all on public.tax_exemptions from anon;
grant select, insert, update on public.tax_exemptions to authenticated;
grant all on public.tax_exemptions to service_role;

drop policy if exists tax_exemptions_read on public.tax_exemptions;
create policy tax_exemptions_read on public.tax_exemptions for select to authenticated
  using (user_id = (select auth.uid()) or public.has_role((select auth.uid()), 'admin'));

-- Instant on upload: the owner adds an active, unreviewed certificate for their own account.
drop policy if exists tax_exemptions_insert_own on public.tax_exemptions;
create policy tax_exemptions_insert_own on public.tax_exemptions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'active'
    and reviewed_at is null and reviewed_by is null and revoked_at is null and revoked_by is null);

-- Owners may only withdraw their own certificate; admins may review or revoke any.
drop policy if exists tax_exemptions_withdraw_own on public.tax_exemptions;
create policy tax_exemptions_withdraw_own on public.tax_exemptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status = 'revoked');
drop policy if exists tax_exemptions_admin_update on public.tax_exemptions;
create policy tax_exemptions_admin_update on public.tax_exemptions for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'))
  with check (public.has_role((select auth.uid()), 'admin'));

-- Identity and certificate details are fixed once filed; a change means a new certificate.
create or replace function public.guard_tax_exemption_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if row(new.user_id, new.state, new.exemption_type, new.entity_name, new.certificate_number, new.document_path, new.attested_at, new.created_at)
     is distinct from row(old.user_id, old.state, old.exemption_type, old.entity_name, old.certificate_number, old.document_path, old.attested_at, old.created_at) then
    raise exception 'Certificate details cannot be changed; withdraw it and upload a new one';
  end if;
  if old.status = 'revoked' and new.status <> 'revoked' then
    raise exception 'A withdrawn or revoked certificate cannot be reactivated';
  end if;
  if new.status = 'revoked' and old.status <> 'revoked' then
    new.revoked_at := coalesce(new.revoked_at, now());
    new.revoked_by := coalesce(new.revoked_by, auth.uid());
  end if;
  if not public.has_role(auth.uid(), 'admin') and coalesce(auth.role(), '') <> 'service_role'
     and row(new.reviewed_at, new.reviewed_by) is distinct from row(old.reviewed_at, old.reviewed_by) then
    raise exception 'Only an administrator can review a certificate';
  end if;
  if new.reviewed_at is not null and old.reviewed_at is null then
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists guard_tax_exemption_update on public.tax_exemptions;
create trigger guard_tax_exemption_update before update on public.tax_exemptions
  for each row execute function public.guard_tax_exemption_update();

-- Private certificate files: <user_id>/<file>, readable by the owner and admins only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tax-exemption-certificates', 'tax-exemption-certificates', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tax certificates upload own" on storage.objects;
create policy "tax certificates upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'tax-exemption-certificates' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "tax certificates read own or admin" on storage.objects;
create policy "tax certificates read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'tax-exemption-certificates'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.has_role((select auth.uid()), 'admin')));

-- Record which certificate, if any, removed the tax on a charge.
alter table public.booking_requests add column if not exists tax_exemption_id uuid references public.tax_exemptions(id);
alter table public.square_billing_attempts add column if not exists tax_exemption_id uuid references public.tax_exemptions(id);
alter table public.monetization_purchases add column if not exists tax_exemption_id uuid references public.tax_exemptions(id);
