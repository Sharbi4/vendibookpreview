-- Drop and recreate the favorites INSERT policy to use authenticated role
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.favorites;

CREATE POLICY "Users can add their own favorites" 
ON public.favorites 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);