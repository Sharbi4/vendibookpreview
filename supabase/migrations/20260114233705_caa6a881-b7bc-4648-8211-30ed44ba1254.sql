-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin.user_id
      AND role = 'admin'
  )
$$;

-- Add RLS policy for admins to view all sale_transactions
CREATE POLICY "Admins can view all transactions"
ON public.sale_transactions
FOR SELECT
USING (is_admin(auth.uid()));

-- Add RLS policy for admins to update sale_transactions (for dispute resolution)
CREATE POLICY "Admins can update transactions for dispute resolution"
ON public.sale_transactions
FOR UPDATE
USING (is_admin(auth.uid()));