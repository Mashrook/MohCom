
-- Fix public_profiles view to only expose profiles of users who have a public role (lawyers)
-- or the current user's own profile, instead of ALL authenticated users
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.created_at
FROM profiles p
WHERE 
  p.id = auth.uid()  -- Users can see their own profile
  OR EXISTS (
    SELECT 1 FROM lawyer_profiles lp WHERE lp.user_id = p.id AND lp.is_available = true
  )  -- Only show profiles of available lawyers (public directory)
  OR has_role(auth.uid(), 'admin'::app_role);  -- Admins can see all
