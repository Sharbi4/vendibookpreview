-- Admin-reviewed weekly digest workflow state (manual send only).
create table public.weekly_digests (
  id uuid primary key default gen_random_uuid(),
  week_key text not null unique, -- e.g. '2026-W35'
  subject text not null default '',
  preview_text text not null default '',
  article_title text not null default '',
  article_excerpt text not null default '',
  article_image_url text not null default '',
  article_url text not null default '',
  whats_new jsonb not null default '[]'::jsonb, -- [{title, body}], max 4
  featured_listing_ids uuid[] not null default '{}', -- max 3
  status text not null default 'draft' check (status in ('draft','ready','approved','sent')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_by uuid references auth.users(id),
  sent_at timestamptz,
  recipient_count integer,
  broadcast_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.weekly_digests to authenticated;
grant all on public.weekly_digests to service_role;

alter table public.weekly_digests enable row level security;

create policy "Admins manage weekly digests"
  on public.weekly_digests for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));