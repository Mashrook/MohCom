-- Drop all existing policies on lawyer_applications to clean up duplicates
DROP POLICY IF EXISTS "Admins can delete lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins only delete applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins only update applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Admins only view applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Auth users submit applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Authenticated users can submit applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Only admins can delete applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Only admins can view all applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Rate limited lawyer applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "admins_can_delete_applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "admins_can_update_applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "admins_can_view_applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "authenticated_users_can_apply" ON public.lawyer_applications;
DROP POLICY IF EXISTS "lawyer_apps_admin_select" ON public.lawyer_applications;
DROP POLICY IF EXISTS "lawyer_apps_admin_update" ON public.lawyer_applications;

-- Make sure RLS is enabled
ALTER TABLE public.lawyer_applications ENABLE ROW LEVEL SECURITY;

-- Create clean, secure policies (authenticated role only, never public)

-- 1. INSERT: Only authenticated users can submit applications with rate limiting
CREATE POLICY "lawyer_apps_insert_authenticated"
ON public.lawyer_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND check_lawyer_application_rate_limit(email)
);

-- 2. SELECT: Only admins can view applications
CREATE POLICY "lawyer_apps_select_admin_only"
ON public.lawyer_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. UPDATE: Only admins can update applications
CREATE POLICY "lawyer_apps_update_admin_only"
ON public.lawyer_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. DELETE: Only admins can delete applications
CREATE POLICY "lawyer_apps_delete_admin_only"
ON public.lawyer_applications
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));