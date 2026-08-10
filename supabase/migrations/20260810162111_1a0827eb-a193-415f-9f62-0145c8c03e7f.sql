
-- booking_requests: shoppers may only cancel
DROP POLICY IF EXISTS "Shoppers can cancel their pending requests" ON public.booking_requests;
CREATE POLICY "Shoppers can cancel their pending requests"
ON public.booking_requests FOR UPDATE TO authenticated
USING (auth.uid() = shopper_id AND status = 'pending'::booking_status)
WITH CHECK (auth.uid() = shopper_id AND status = 'cancelled'::booking_status);

-- offers: buyers may only cancel
DROP POLICY IF EXISTS "Buyers can cancel pending offers" ON public.offers;
CREATE POLICY "Buyers can cancel pending offers"
ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status = 'pending')
WITH CHECK (auth.uid() = buyer_id AND status = 'cancelled');

-- sale_transactions: constrain each party's status writes
DROP POLICY IF EXISTS "Buyers can update their confirmation" ON public.sale_transactions;
CREATE POLICY "Buyers can update their confirmation"
ON public.sale_transactions FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status = ANY (ARRAY['pending_cash','paid','seller_confirmed']))
WITH CHECK (auth.uid() = buyer_id AND status = ANY (ARRAY['pending_cash','paid','buyer_confirmed','cancelled']));

DROP POLICY IF EXISTS "Sellers can update their confirmation" ON public.sale_transactions;
CREATE POLICY "Sellers can update their confirmation"
ON public.sale_transactions FOR UPDATE TO authenticated
USING (auth.uid() = seller_id AND status = ANY (ARRAY['pending_cash','paid','buyer_confirmed']))
WITH CHECK (auth.uid() = seller_id AND status = ANY (ARRAY['pending_cash','paid','seller_confirmed','cancelled']));
