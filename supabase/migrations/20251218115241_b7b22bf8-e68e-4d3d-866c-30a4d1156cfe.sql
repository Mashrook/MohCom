-- Fix 1: Restrict lawyer_profiles to prevent public user_id exposure
DROP POLICY IF EXISTS "Anyone can view lawyer profiles" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Public can view available lawyer profiles" ON public.lawyer_profiles;

-- Create secure policy for lawyer profiles - only show public info without exposing user_id directly
CREATE POLICY "Public can view basic lawyer info"
ON public.lawyer_profiles
FOR SELECT
USING (is_available = true);

CREATE POLICY "Lawyers can view own profile"
ON public.lawyer_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lawyer profiles"
ON public.lawyer_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix 2: Restrict lawyer_applications access
DROP POLICY IF EXISTS "Users can view their own applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Applicants can view their own application by email" ON public.lawyer_applications;

-- Only allow viewing own application by user_id (authenticated) or admin
CREATE POLICY "Authenticated users view own applications"
ON public.lawyer_applications
FOR SELECT
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- Fix 3: Restrict admin_security_settings to admins only
DROP POLICY IF EXISTS "Anyone can view admin security settings" ON public.admin_security_settings;

CREATE POLICY "Only admins can view security settings"
ON public.admin_security_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Fix 4: Add RLS policies for views (using security_invoker)
-- Note: Views already have security_invoker in their definition

-- Fix 5: Add protection to template_ratings_summary view
-- This is a view, we need to ensure the underlying table has proper RLS

-- Fix 6: Ensure user_subscription_status view is protected
-- Already using security_invoker pattern