-- 1) Deduplicate rows so we can safely add unique indexes
-- Keep the most recent row per checkout_session_id
WITH ranked AS (
  SELECT
    id,
    checkout_session_id,
    ROW_NUMBER() OVER (
      PARTITION BY checkout_session_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.sale_transactions
  WHERE checkout_session_id IS NOT NULL
)
DELETE FROM public.sale_transactions st
USING ranked r
WHERE st.id = r.id
  AND r.rn > 1;

-- Keep the most recent row per payment_intent_id
WITH ranked_pi AS (
  SELECT
    id,
    payment_intent_id,
    ROW_NUMBER() OVER (
      PARTITION BY payment_intent_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.sale_transactions
  WHERE payment_intent_id IS NOT NULL
)
DELETE FROM public.sale_transactions st
USING ranked_pi r
WHERE st.id = r.id
  AND r.rn > 1;

-- 2) Prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS sale_transactions_checkout_session_id_uniq
ON public.sale_transactions (checkout_session_id)
WHERE checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sale_transactions_payment_intent_id_uniq
ON public.sale_transactions (payment_intent_id)
WHERE payment_intent_id IS NOT NULL;