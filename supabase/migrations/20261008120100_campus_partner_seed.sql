-- Campus Partner launch schools, 2026-27 academic-year codes.
-- Every code is created INACTIVE: an admin switches each one on from
-- Admin → Revenue & Services → Campus Partners once checkout is verified.
-- Idempotent: re-running leaves existing partners and codes untouched.

INSERT INTO public.campus_partners (name, slug, city, state) VALUES
  ('Pima Community College', 'pima-community-college', 'Tucson', 'AZ'),
  ('Scottsdale Community College', 'scottsdale-community-college', 'Scottsdale', 'AZ'),
  ('Houston City College', 'houston-city-college', 'Houston', 'TX'),
  ('Austin Community College', 'austin-community-college', 'Austin', 'TX'),
  ('San Jacinto College', 'san-jacinto-college', 'Pasadena', 'TX'),
  ('Gwinnett Technical College', 'gwinnett-technical-college', 'Lawrenceville', 'GA'),
  ('Atlanta Technical College', 'atlanta-technical-college', 'Atlanta', 'GA'),
  ('Miami Dade College', 'miami-dade-college', 'Miami', 'FL'),
  ('Florida State College at Jacksonville', 'florida-state-college-at-jacksonville', 'Jacksonville', 'FL'),
  ('Central Piedmont Community College', 'central-piedmont-community-college', 'Charlotte', 'NC'),
  ('Los Angeles Trade-Technical College', 'los-angeles-trade-technical-college', 'Los Angeles', 'CA'),
  ('Schoolcraft College', 'schoolcraft-college', 'Livonia', 'MI'),
  ('College of Southern Nevada', 'college-of-southern-nevada', 'Las Vegas', 'NV')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.discount_codes (
  code, description, campaign_type, partner_id, academic_year, starts_at, ends_at, active,
  rental_percent, rental_cap_cents, purchase_credit_cents, purchase_min_cents,
  per_user_rental_limit, per_user_purchase_limit)
SELECT v.code, p.name || ' Campus Partner benefit (2026-27)', 'campus_partner', p.id, '2026-27',
       '2026-08-01T00:00:00Z', '2027-08-01T00:00:00Z', false,
       10, 10000, 25000, 500000, 2, 1
  FROM (VALUES
    ('PIMA27', 'pima-community-college'),
    ('SCC27', 'scottsdale-community-college'),
    ('HCC27', 'houston-city-college'),
    ('ACC27', 'austin-community-college'),
    ('SANJAC27', 'san-jacinto-college'),
    ('GWINNETT27', 'gwinnett-technical-college'),
    ('ATC27', 'atlanta-technical-college'),
    ('MDC27', 'miami-dade-college'),
    ('FSCJ27', 'florida-state-college-at-jacksonville'),
    ('CPCC27', 'central-piedmont-community-college'),
    ('LATTC27', 'los-angeles-trade-technical-college'),
    ('SCHOOLCRAFT27', 'schoolcraft-college'),
    -- Also created in the parallel promo_codes build (now inactive there).
    ('CSN27', 'college-of-southern-nevada'),
    ('SCOTTSDALE27', 'scottsdale-community-college')
  ) AS v(code, slug)
  JOIN public.campus_partners p ON p.slug = v.slug
ON CONFLICT (code_normalized) DO NOTHING;

-- A parallel build (2026-10-08, Lovable) stored campus codes in promo_codes
-- (program = 'campus_partner') and switched five on. discount_codes is the
-- canonical table; those rows stay switched off and unused.
UPDATE public.promo_codes SET is_active = false, updated_at = now()
 WHERE program = 'campus_partner' AND is_active;
