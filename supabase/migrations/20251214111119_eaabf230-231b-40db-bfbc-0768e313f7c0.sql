-- Fix 1: Add RLS to admin_subscription_view by recreating it with security_invoker
-- First drop the existing view
DROP VIEW IF EXISTS public.admin_subscription_view;

-- Recreate the view with security_invoker = true (respects RLS of underlying tables)
CREATE VIEW public.admin_subscription_view 
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.user_id,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  p.full_name,
  p.email
FROM public.subscriptions s
LEFT JOIN public.profiles p ON s.user_id = p.id;

-- Grant select only to authenticated users (RLS will further restrict)
GRANT SELECT ON public.admin_subscription_view TO authenticated;

-- Fix 2: Create a secure view for profiles that hides email from non-owners/non-admins
-- Update the public_profiles view to ensure it doesn't expose email
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Fix 3: Drop existing permissive SELECT policies on profiles that might leak email
DROP POLICY IF EXISTS "Users can view basic profile info for messaging" ON public.profiles;

-- Create a more restrictive policy for profiles - users can only see their own full profile
-- Admins can see all profiles
-- Other users can only see non-sensitive fields via the public_profiles view
CREATE POLICY "Users can view own profile or admins view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);