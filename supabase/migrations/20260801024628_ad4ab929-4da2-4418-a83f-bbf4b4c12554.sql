-- 1. Private, compliance-only legal identity fields (never public).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_first_name text,
  ADD COLUMN IF NOT EXISTS legal_last_name text,
  ADD COLUMN IF NOT EXISTS name_parts_confirmed boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.legal_first_name IS 'PRIVATE: identity/tax/payout/contract use only. Never public.';
COMMENT ON COLUMN public.profiles.legal_last_name IS 'PRIVATE: identity/tax/payout/contract use only. Never public.';
COMMENT ON COLUMN public.profiles.last_name IS 'PRIVATE: only the initial may be shown publicly.';
COMMENT ON COLUMN public.profiles.full_name IS 'PRIVATE legacy account name. Owner/admin/legal-document use only.';

-- 2. Best-effort backfill of first/last from the legacy single-string name.
--    Original full_name is preserved; migrated rows are flagged unconfirmed.
UPDATE public.profiles p
SET
  first_name = COALESCE(NULLIF(btrim(p.first_name), ''), split_part(btrim(regexp_replace(p.full_name, '\s+', ' ', 'g')), ' ', 1)),
  last_name = COALESCE(
    NULLIF(btrim(p.last_name), ''),
    NULLIF(
      btrim(
        substr(
          btrim(regexp_replace(p.full_name, '\s+', ' ', 'g')),
          length(split_part(btrim(regexp_replace(p.full_name, '\s+', ' ', 'g')), ' ', 1)) + 1
        )
      ),
      ''
    )
  ),
  name_parts_confirmed = false
WHERE COALESCE(btrim(p.full_name), '') <> ''
  AND (NULLIF(btrim(p.first_name), '') IS NULL OR NULLIF(btrim(p.last_name), '') IS NULL);

-- 3. Canonical SQL formatter: "First L." — mirrors src/lib/displayName.ts.
CREATE OR REPLACE FUNCTION public.format_public_name(
  _first text,
  _last text,
  _fallback text DEFAULT 'Vendibook member'
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(btrim(_first), '') = '' THEN _fallback
    WHEN COALESCE(btrim(_last), '') = '' THEN btrim(_first)
    ELSE btrim(_first) || ' ' || upper(left(
      split_part(btrim(regexp_replace(_last, '\s+', ' ', 'g')), ' ',
        array_length(string_to_array(btrim(regexp_replace(_last, '\s+', ' ', 'g')), ' '), 1)
      ), 1)) || '.'
  END;
$$;

-- Public display name for a profile row id (business name wins, else "First L.").
CREATE OR REPLACE FUNCTION public.public_display_name(_user_id uuid, _fallback text DEFAULT 'Vendibook member')
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(btrim(p.business_name), ''),
    public.format_public_name(
      COALESCE(NULLIF(btrim(p.first_name), ''), split_part(btrim(p.full_name), ' ', 1)),
      COALESCE(NULLIF(btrim(p.last_name), ''), NULLIF(substr(btrim(p.full_name), length(split_part(btrim(p.full_name), ' ', 1)) + 2), '')),
      _fallback
    ),
    _fallback
  )
  FROM public.profiles p
  WHERE p.id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.format_public_name(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_display_name(uuid, text) TO anon, authenticated, service_role;

-- 4. Public host profile lookup: abbreviated names only, no surname leaves the server.
CREATE OR REPLACE FUNCTION public.get_safe_host_profile(host_user_id uuid)
RETURNS TABLE(
  id uuid, full_name text, first_name text, last_name text, display_name text,
  username text, business_name text, public_city text, public_state text,
  avatar_url text, header_image_url text, identity_verified boolean,
  created_at timestamp with time zone, last_active_at timestamp with time zone,
  bio text, shop_policies jsonb, pinned_listing_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    -- `full_name` is kept for API compatibility but carries only the
    -- privacy-safe public display value ("First L." / business name).
    COALESCE(
      NULLIF(btrim(p.business_name), ''),
      public.format_public_name(
        COALESCE(NULLIF(btrim(p.first_name), ''), split_part(btrim(p.full_name), ' ', 1)),
        COALESCE(NULLIF(btrim(p.last_name), ''), NULLIF(substr(btrim(p.full_name), length(split_part(btrim(p.full_name), ' ', 1)) + 2), '')),
        'Vendibook member'
      )
    ) AS full_name,
    COALESCE(NULLIF(btrim(p.first_name), ''), NULLIF(split_part(btrim(p.full_name), ' ', 1), '')) AS first_name,
    NULL::text AS last_name,          -- surnames are never returned publicly
    COALESCE(
      NULLIF(btrim(p.business_name), ''),
      public.format_public_name(
        COALESCE(NULLIF(btrim(p.first_name), ''), split_part(btrim(p.full_name), ' ', 1)),
        COALESCE(NULLIF(btrim(p.last_name), ''), NULLIF(substr(btrim(p.full_name), length(split_part(btrim(p.full_name), ' ', 1)) + 2), '')),
        'Vendibook member'
      )
    ) AS display_name,
    p.username,
    p.business_name,
    p.public_city,
    p.public_state,
    p.avatar_url,
    p.header_image_url,
    p.identity_verified,
    p.created_at,
    p.last_active_at,
    p.bio,
    p.shop_policies,
    p.pinned_listing_id
  FROM public.profiles p
  WHERE p.id = host_user_id;
$$;

-- 5. Messaging participant lookup: abbreviated name only.
CREATE OR REPLACE FUNCTION public.get_conversation_participant_profile(_user_id uuid)
RETURNS TABLE(id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    CASE
      WHEN p.id = auth.uid() OR public.is_admin(auth.uid()) THEN p.full_name
      ELSE COALESCE(
        NULLIF(btrim(p.business_name), ''),
        public.format_public_name(
          COALESCE(NULLIF(btrim(p.first_name), ''), split_part(btrim(p.full_name), ' ', 1)),
          COALESCE(NULLIF(btrim(p.last_name), ''), NULLIF(substr(btrim(p.full_name), length(split_part(btrim(p.full_name), ' ', 1)) + 2), '')),
          'Vendibook member'
        )
      )
    END AS full_name,
    p.avatar_url
  FROM public.profiles p
  WHERE p.id = _user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE (c.host_id = auth.uid() AND c.shopper_id = p.id)
           OR (c.shopper_id = auth.uid() AND c.host_id = p.id)
      )
      OR p.id = auth.uid()
      OR public.is_admin(auth.uid())
    );
$$;