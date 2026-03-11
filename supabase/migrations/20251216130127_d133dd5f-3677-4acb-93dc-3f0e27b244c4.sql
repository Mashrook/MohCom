-- Fix security issue: Add RLS policies to public_profiles view
-- The view should only allow users to see their own profile or admins to see all

-- First, let's recreate the view with proper security
DROP VIEW IF EXISTS public_profiles;

-- Create a secure view that uses security_invoker
CREATE VIEW public_profiles WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM profiles
WHERE 
  -- Users can see their own profile
  auth.uid() = id
  -- Or admins can see all profiles
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  );

-- Fix security issue: Add RLS to user_subscription_status view
DROP VIEW IF EXISTS user_subscription_status;

-- Create a secure view for subscription status
CREATE VIEW user_subscription_status WITH (security_invoker = true) AS
SELECT 
  user_id,
  status,
  plan_type,
  current_period_end
FROM subscriptions
WHERE 
  -- Users can only see their own subscription
  auth.uid() = user_id
  -- Or admins can see all subscriptions
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  );