
create table if not exists public.spotlight_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'submitted',
  contact_name text not null,
  business_name text not null,
  email text not null,
  phone text,
  city text not null,
  state text not null,
  website text,
  listing_url text,
  listing_id uuid,
  business_type text not null,
  years_operating text,
  story text not null,
  offerings text not null,
  differentiator text,
  proud_of text,
  whats_new text,
  instagram text,
  facebook text,
  tiktok text,
  youtube text,
  linkedin text,
  other_social text,
  product_feedback_experience text,
  product_feedback_wishlist text,
  owns_content_consent boolean not null default false,
  owns_content_consent_at timestamptz,
  publication_consent boolean not null default false,
  publication_consent_at timestamptz,
  consent_version text not null default '2026-08-spotlight-v1',
  marketing_opt_in boolean not null default false,
  admin_notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.spotlight_submission_media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.spotlight_submissions(id) on delete cascade,
  storage_path text not null,
  kind text not null default 'photo',
  sort_order integer not null default 0,
  file_name text,
  content_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_spotlight_submissions_created on public.spotlight_submissions (created_at desc);
create index if not exists idx_spotlight_media_submission on public.spotlight_submission_media (submission_id);

grant select on public.spotlight_submissions to authenticated;
grant select on public.spotlight_submission_media to authenticated;
grant all on public.spotlight_submissions to service_role;
grant all on public.spotlight_submission_media to service_role;

alter table public.spotlight_submissions enable row level security;
alter table public.spotlight_submission_media enable row level security;

drop policy if exists "Submitters can read their own spotlight submission" on public.spotlight_submissions;
create policy "Submitters can read their own spotlight submission"
  on public.spotlight_submissions for select to authenticated
  using (user_id is not null and user_id = auth.uid());

drop policy if exists "Admins can read all spotlight submissions" on public.spotlight_submissions;
create policy "Admins can read all spotlight submissions"
  on public.spotlight_submissions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update spotlight submissions" on public.spotlight_submissions;
create policy "Admins can update spotlight submissions"
  on public.spotlight_submissions for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Submitters can read their own spotlight media" on public.spotlight_submission_media;
create policy "Submitters can read their own spotlight media"
  on public.spotlight_submission_media for select to authenticated
  using (exists (
    select 1 from public.spotlight_submissions s
    where s.id = submission_id and s.user_id is not null and s.user_id = auth.uid()
  ));

drop policy if exists "Admins can read all spotlight media" on public.spotlight_submission_media;
create policy "Admins can read all spotlight media"
  on public.spotlight_submission_media for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_spotlight_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_spotlight_submissions_updated on public.spotlight_submissions;
create trigger trg_spotlight_submissions_updated
  before update on public.spotlight_submissions
  for each row execute function public.set_spotlight_updated_at();

drop policy if exists "Anyone can upload spotlight media" on storage.objects;
create policy "Anyone can upload spotlight media"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'spotlight-media');

drop policy if exists "Admins can read spotlight media" on storage.objects;
create policy "Admins can read spotlight media"
  on storage.objects for select to authenticated
  using (bucket_id = 'spotlight-media' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can manage spotlight media" on storage.objects;
create policy "Admins can manage spotlight media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'spotlight-media' and public.has_role(auth.uid(), 'admin'));

create or replace function public.submit_general_feedback(
  _rating integer,
  _message text,
  _category text default null,
  _name text default null,
  _email text default null,
  _can_contact boolean default false,
  _can_share boolean default false,
  _page text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
begin
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'invalid_rating';
  end if;
  if _message is null or length(btrim(_message)) < 3 then
    raise exception 'invalid_message';
  end if;

  insert into public.feedback_submissions (user_id, context_type, rating, message, email, metadata)
  values (
    auth.uid(),
    'general',
    _rating,
    left(btrim(_message), 4000),
    nullif(btrim(coalesce(_email, '')), ''),
    jsonb_build_object(
      'status', 'submitted',
      'source', 'general_form',
      'category', nullif(btrim(coalesce(_category, '')), ''),
      'recipient_name', nullif(btrim(coalesce(_name, '')), ''),
      'can_contact', coalesce(_can_contact, false),
      'can_share', coalesce(_can_share, false),
      'page', nullif(btrim(coalesce(_page, '')), '')
    )
  )
  returning id into _id;

  return _id;
end;
$$;

grant execute on function public.submit_general_feedback(integer, text, text, text, text, boolean, boolean, text) to anon, authenticated;
