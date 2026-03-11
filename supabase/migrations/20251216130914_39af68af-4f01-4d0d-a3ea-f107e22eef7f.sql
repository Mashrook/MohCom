-- Fix security issues with views

-- 1. Fix public_profiles view - add RLS via security_invoker
DROP VIEW IF EXISTS public_profiles;

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
  )
  -- Or lawyers can see profiles of users they've messaged
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'lawyer'
    AND EXISTS (
      SELECT 1 FROM messages m 
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = profiles.id)
         OR (m.receiver_id = auth.uid() AND m.sender_id = profiles.id)
    )
  );

-- 2. Fix template_ratings_summary view - restrict to authenticated users
DROP VIEW IF EXISTS template_ratings_summary;

CREATE VIEW template_ratings_summary WITH (security_invoker = true) AS
SELECT 
  template_id,
  AVG(rating)::numeric(3,2) as average_rating,
  COUNT(*)::integer as total_ratings
FROM contract_ratings
WHERE auth.uid() IS NOT NULL  -- Only authenticated users
GROUP BY template_id;

-- 3. Fix user_subscription_status view - users see only their own
DROP VIEW IF EXISTS user_subscription_status;

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

-- 4. Create a secure function for accessing Stripe IDs (admin only)
CREATE OR REPLACE FUNCTION get_subscription_stripe_ids(target_user_id uuid)
RETURNS TABLE (
  stripe_customer_id text,
  stripe_subscription_id text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only admins can access Stripe IDs
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT s.stripe_customer_id, s.stripe_subscription_id
  FROM subscriptions s
  WHERE s.user_id = target_user_id;
END;
$$;

-- Revoke direct access to sensitive columns for anon and authenticated
-- (This is handled by RLS policies on the subscriptions table)