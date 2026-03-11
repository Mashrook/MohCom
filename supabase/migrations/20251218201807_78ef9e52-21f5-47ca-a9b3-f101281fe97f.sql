-- Drop the mutual conversation access policy
DROP POLICY IF EXISTS "Users can view profiles of mutual conversations" ON public.profiles;