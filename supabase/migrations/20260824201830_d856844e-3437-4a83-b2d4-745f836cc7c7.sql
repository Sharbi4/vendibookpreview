-- Fix SUPA_security_definer_view: payment_attempts_safe ran with view-owner
-- (definer) permissions. Make it security-invoker and back it with an explicit
-- buyer-scoped RLS policy + grant so buyers can only ever read their own
-- payment attempt rows.

-- 1. Buyer-scoped SELECT policy on the base table (row-level, mirrors the
--    view's existing buyer_id = auth.uid() filter).
CREATE POLICY "Buyers view own payment attempts"
ON public.payment_attempts
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- 2. Data API privilege required for invoker-mode access through the view.
GRANT SELECT ON public.payment_attempts TO authenticated;

-- 3. Enforce the querying user's permissions/RLS instead of the view owner's.
ALTER VIEW public.payment_attempts_safe SET (security_invoker = on);
