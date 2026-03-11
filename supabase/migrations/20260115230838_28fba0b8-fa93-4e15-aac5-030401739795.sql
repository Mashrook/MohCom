-- Remove the policy that allows users to view applications by email lookup
-- This prevents potential data exposure to other authenticated users
DROP POLICY IF EXISTS "users_can_view_own_application" ON public.lawyer_applications;

-- Keep only admin SELECT access
-- The existing "admins_can_view_applications" policy already restricts SELECT to admins only