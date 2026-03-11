-- Fix profiles table RLS policies - consolidate and remove redundant/conflicting policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create single consolidated policy for viewing profiles
CREATE POLICY "Users can view profiles with proper access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'lawyer')
);