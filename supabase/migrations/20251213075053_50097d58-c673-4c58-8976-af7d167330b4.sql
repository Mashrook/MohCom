-- 1. Fix email exposure in profiles - create a view that excludes email for messaging
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- 2. Update profiles RLS policy to restrict email access
DROP POLICY IF EXISTS "Users can view limited profile info for messaging" ON public.profiles;

CREATE POLICY "Users can view limited profile info for messaging" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'lawyer')
);

-- 3. Fix subscriptions - hide Stripe sensitive data from regular users
-- Create a secure view for subscription status only
CREATE OR REPLACE VIEW public.user_subscription_status 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions;

-- Update subscriptions policy to restrict sensitive fields access
DROP POLICY IF EXISTS "Users can only update non-sensitive subscription fields" ON public.subscriptions;

CREATE POLICY "Only service role can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- 4. Fix contract_ratings - only show own ratings or aggregate data
DROP POLICY IF EXISTS "Users can view ratings for analytics" ON public.contract_ratings;

CREATE POLICY "Admins can view all ratings for analytics" 
ON public.contract_ratings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));