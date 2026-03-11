-- Drop the overly permissive public INSERT policy
DROP POLICY IF EXISTS "lawyer_apps_public_insert" ON public.lawyer_applications;

-- Create a new INSERT policy that requires authentication
CREATE POLICY "authenticated_users_can_apply" 
ON public.lawyer_applications 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Ensure no public SELECT access exists - drop any permissive SELECT policies
DROP POLICY IF EXISTS "lawyer_apps_public_select" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Anyone can view lawyer applications" ON public.lawyer_applications;

-- Admins can view all applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.lawyer_applications;
CREATE POLICY "admins_can_view_applications" 
ON public.lawyer_applications 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own application status (using the existing function)
DROP POLICY IF EXISTS "Users can view own application" ON public.lawyer_applications;
CREATE POLICY "users_can_view_own_application" 
ON public.lawyer_applications 
FOR SELECT 
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Admins can update applications (for approval/rejection)
DROP POLICY IF EXISTS "Admins can update applications" ON public.lawyer_applications;
CREATE POLICY "admins_can_update_applications" 
ON public.lawyer_applications 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete applications
DROP POLICY IF EXISTS "Admins can delete applications" ON public.lawyer_applications;
CREATE POLICY "admins_can_delete_applications" 
ON public.lawyer_applications 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));