-- ============================================================
-- 1. legal_documents — versioned, immutable document store
-- ============================================================
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,                 -- e.g. 'terms_of_service'
  version text NOT NULL,                       -- e.g. 'v1', '2026-07-10.1'
  effective_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',       -- 'draft' | 'active' | 'retired'
  title text NOT NULL,
  summary text,
  body_markdown text NOT NULL,
  content_hash text NOT NULL,                  -- sha256 of body_markdown
  change_summary text,
  slug text NOT NULL,                          -- URL path segment, e.g. 'terms'
  requires_reacceptance boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_type_status
  ON public.legal_documents(document_type, status);
CREATE INDEX IF NOT EXISTS idx_legal_documents_slug
  ON public.legal_documents(slug);

GRANT SELECT ON public.legal_documents TO anon;
GRANT SELECT ON public.legal_documents TO authenticated;
GRANT ALL ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active legal documents are readable by anyone"
  ON public.legal_documents FOR SELECT
  USING (status IN ('active', 'retired'));

CREATE POLICY "Admins can manage legal documents"
  ON public.legal_documents FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Immutability guard: once a row is 'active' or 'retired', the copy is frozen.
-- Only status transitions and requires_reacceptance flag can change.
CREATE OR REPLACE FUNCTION public.legal_documents_freeze()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('active', 'retired') THEN
    IF NEW.body_markdown       IS DISTINCT FROM OLD.body_markdown
       OR NEW.content_hash     IS DISTINCT FROM OLD.content_hash
       OR NEW.title            IS DISTINCT FROM OLD.title
       OR NEW.version          IS DISTINCT FROM OLD.version
       OR NEW.document_type    IS DISTINCT FROM OLD.document_type
       OR NEW.effective_at     IS DISTINCT FROM OLD.effective_at THEN
      RAISE EXCEPTION 'legal_documents row is frozen once active/retired (id=%)', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_documents_freeze ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_freeze
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.legal_documents_freeze();

-- ============================================================
-- 2. user_consents — the acceptance ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_version text NOT NULL,
  document_id uuid REFERENCES public.legal_documents(id),
  trigger_action text NOT NULL,          -- 'signup', 'publish_listing', 'purchase_review', 'rental_request', 'instant_book', 'pay_in_person', 'featured_activation', 'stripe_connect', 'identity_verification'
  acceptance_text text NOT NULL,         -- exact checkbox wording shown to the user
  method text NOT NULL DEFAULT 'checkbox',
  route text,
  application_version text,
  locale text,
  related_ids jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {listing_id, sale_transaction_id, booking_request_id, terms_id, referral_id, ...}
  ip inet,
  user_agent text,
  environment text DEFAULT 'production',
  revoked_at timestamptz,                 -- for withdrawable/marketing consents
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_type
  ON public.user_consents(user_id, document_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_consents_related_gin
  ON public.user_consents USING gin(related_ids);
CREATE INDEX IF NOT EXISTS idx_user_consents_trigger
  ON public.user_consents(trigger_action, created_at DESC);

GRANT SELECT, INSERT ON public.user_consents TO authenticated;
GRANT ALL ON public.user_consents TO service_role;

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own consents"
  ON public.user_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consents"
  ON public.user_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all consents"
  ON public.user_consents FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Never allow updates or deletes: acceptances are immutable audit records.
-- (Absence of UPDATE/DELETE policies + RLS on means neither is possible.)

-- Only revocation is allowed, and only by the same user, via a dedicated RPC.
CREATE OR REPLACE FUNCTION public.revoke_user_consent(
  _consent_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_consents
     SET revoked_at = COALESCE(revoked_at, now()),
         revocation_reason = COALESCE(revocation_reason, _reason)
   WHERE id = _consent_id
     AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_consent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_user_consent(uuid, text) TO authenticated;

-- ============================================================
-- 3. Lookup helpers
-- ============================================================

-- Return the single active version of a document, or null if none.
CREATE OR REPLACE FUNCTION public.current_legal_document(_document_type text)
RETURNS public.legal_documents
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.legal_documents
   WHERE document_type = _document_type
     AND status = 'active'
   ORDER BY effective_at DESC
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_legal_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_legal_document(text) TO anon;
GRANT EXECUTE ON FUNCTION public.current_legal_document(text) TO authenticated;

-- Record consent server-side. Consumers pass the exact wording they showed and
-- the client-visible context. IP/UA are optional (edge functions can supply them).
CREATE OR REPLACE FUNCTION public.record_user_consent(
  _document_type text,
  _document_version text,
  _trigger_action text,
  _acceptance_text text,
  _related_ids jsonb DEFAULT '{}'::jsonb,
  _route text DEFAULT NULL,
  _ip inet DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _locale text DEFAULT NULL,
  _application_version text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_doc public.legal_documents;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF _acceptance_text IS NULL OR length(trim(_acceptance_text)) < 3 THEN
    RAISE EXCEPTION 'acceptance_text_required';
  END IF;

  -- Resolve the document row so we always store a foreign key to the frozen version.
  SELECT * INTO v_doc
    FROM public.legal_documents
   WHERE document_type = _document_type
     AND version = _document_version
   LIMIT 1;

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'unknown_document_version';
  END IF;

  INSERT INTO public.user_consents (
    user_id, document_type, document_version, document_id,
    trigger_action, acceptance_text, related_ids, route,
    ip, user_agent, locale, application_version
  ) VALUES (
    v_uid, _document_type, _document_version, v_doc.id,
    _trigger_action, _acceptance_text, COALESCE(_related_ids, '{}'::jsonb), _route,
    _ip, _user_agent, _locale, _application_version
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_user_consent(
  text, text, text, text, jsonb, text, inet, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_user_consent(
  text, text, text, text, jsonb, text, inet, text, text, text
) TO authenticated;

-- ============================================================
-- 4. Seed the initial v1 draft of each document.
--    Bodies are intentionally substantive placeholders and each carries
--    a visible "pending qualified legal review" banner in the app.
-- ============================================================
INSERT INTO public.legal_documents
  (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary)
VALUES
  ('terms_of_service', 'v1', 'active', 'Vendibook Terms of Service', 'terms',
   'The overall agreement between Vendibook and every person who uses the platform.',
   '# Vendibook Terms of Service (Draft)\n\n_This document is a working draft pending qualified legal review._\n\nThese Terms govern your use of Vendibook. By creating an account or using the platform you agree to them.\n\n## 1. Marketplace role\nVendibook is a marketplace. Listings, prices, availability, and condition are supplied by hosts and sellers, not by Vendibook.\n\n## 2. Accounts\nYou must provide accurate information and keep your credentials secure. Vendibook may suspend accounts that violate these Terms or the Marketplace Rules.\n\n## 3. Payments\nOnline payments are processed by Stripe. Pay-in-Person transactions are between buyer and seller only; Vendibook does not collect or hold those funds.\n\n## 4. Fees\nRentals: 12.9% host commission and 12.9% renter fee. Online sales: 12.9% seller commission, no buyer fee. Pay-in-Person sales: no commission and no buyer fee.\n\n## 5. Cancellations, refunds, and disputes\nCancellation and refund rules for each transaction are shown at checkout and stored with the transaction. Disputes are handled through the in-app process.\n\n## 6. Prohibited use\nSee the Marketplace Rules and Prohibited Listings Policy.\n\n## 7. Termination\nEither party may terminate under the conditions described in the Marketplace Rules.\n\n## 8. Contact\nsupport@vendibook.com\n',
   encode(sha256('tos-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('privacy_policy', 'v1', 'active', 'Vendibook Privacy Policy', 'privacy',
   'What information Vendibook collects, how it is used, and how customers can exercise their privacy rights.',
   '# Vendibook Privacy Policy (Draft)\n\n_This document is a working draft pending qualified legal review._\n\n## 1. Information we collect\nAccount information you provide, listing and transaction data you submit, technical information (IP, browser) needed to operate the platform, and payment information handled by our processor.\n\n## 2. How we use it\nTo operate the marketplace, process transactions, provide support, prevent fraud, and comply with law.\n\n## 3. Sharing\nWith the counterparty of a transaction as needed to fulfill it, with service providers (Stripe, email, SMS), and when required by law.\n\n## 4. Retention\nAs long as needed to provide the service, meet audit and tax obligations, and defend legal claims.\n\n## 5. Your choices\nAccess, correction, deletion, and marketing opt-out via account settings or support@vendibook.com.\n',
   encode(sha256('privacy-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('marketplace_rules', 'v1', 'active', 'Vendibook Marketplace Rules', 'marketplace-rules',
   'The behaviour Vendibook expects from every host, seller, buyer, and renter.',
   '# Marketplace Rules (Draft)\n\n_This document is a working draft pending qualified legal review._\n\n- List only items and spaces you have the legal right to offer.\n- Describe listings accurately, including condition, ownership, and required fees.\n- Do not add mandatory fees after acceptance.\n- Follow local laws and permit requirements.\n- Communicate through Vendibook so the transaction record is complete.\n- Report safety issues promptly.\n',
   encode(sha256('marketplace-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('seller_terms', 'v1', 'active', 'Vendibook Seller Terms', 'seller-terms',
   'Additional obligations for sellers offering items for purchase on Vendibook.',
   '# Seller Terms (Draft)\n\n_This document is a working draft pending qualified legal review._\n\n- You confirm you own the item or are authorized to sell it.\n- You must accurately record payment received and item transfer for every transaction, including Pay-in-Person.\n- Payouts for online sales are released 25 days after the buyer confirms the item.\n- Pay-in-Person sales settle directly between you and the buyer; Vendibook does not hold funds.\n- You must respond to disputes and cancellation requests through the platform.\n',
   encode(sha256('seller-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('renter_terms', 'v1', 'active', 'Vendibook Renter Terms', 'renter-terms',
   'Additional obligations for renters booking rentals, kitchens, and vendor lots on Vendibook.',
   '# Renter Terms (Draft)\n\n_This document is a working draft pending qualified legal review._\n\n- You will use the listing only for its approved purpose and within the host''s access, cleaning, and return requirements.\n- You are responsible for documenting condition at pickup and return.\n- Refundable deposits are shown separately from the rental total and are released within 24 hours after the rental ends if there is no damage or late return.\n- Platform service fees are non-refundable once a booking is confirmed.\n- You must provide the documents the host requires before pickup.\n',
   encode(sha256('renter-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('pay_in_person_acknowledgment', 'v1', 'active', 'Pay-in-Person Acknowledgment', 'pay-in-person-terms',
   'What Pay-in-Person means for the buyer and the seller.',
   '# Pay-in-Person Acknowledgment (Draft)\n\n_This document is a working draft pending qualified legal review._\n\nPay-in-Person means the buyer pays the seller directly. Vendibook does not collect, hold, or release any purchase funds for these transactions.\n\n- Inspect the item in person before you pay.\n- Confirm the transaction details with the seller.\n- Use the Vendibook order page to record payment made and item received.\n- Report any issues from the order page — Vendibook cannot reverse or refund a payment it did not process.\n',
   encode(sha256('pip-v1-draft'::bytea), 'hex'),
   'Initial draft.'),

  ('featured_listing_terms', 'v1', 'active', 'Featured Listing Terms', 'featured-listing-terms',
   'How paid featured placement works on Vendibook.',
   '# Featured Listing Terms (Draft)\n\n_This document is a working draft pending qualified legal review._\n\n- Featured Boost places your listing in eligible featured positions for the duration purchased.\n- Featured Boost does not guarantee a specific number of views, sales, rentals, or ranking position.\n- Boosts do not auto-renew unless a subscription is expressly enabled and disclosed.\n- Refunds are handled per the payment terms displayed at purchase.\n',
   encode(sha256('featured-v1-draft'::bytea), 'hex'),
   'Initial draft.')
ON CONFLICT (document_type, version) DO NOTHING;