-- Fix the user_subscription_status view to use security_invoker instead of security_definer
DROP VIEW IF EXISTS public.user_subscription_status;

CREATE VIEW public.user_subscription_status 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions;

-- Grant select only to authenticated users
GRANT SELECT ON public.user_subscription_status TO authenticated;