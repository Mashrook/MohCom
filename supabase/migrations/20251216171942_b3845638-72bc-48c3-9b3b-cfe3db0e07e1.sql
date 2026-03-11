-- Fix public_profiles view with security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS 
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE auth.uid() = id 
   OR has_role(auth.uid(), 'admin')
   OR has_role(auth.uid(), 'lawyer');

-- Fix template_ratings_summary view with security_invoker
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE VIEW public.template_ratings_summary
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  ROUND(AVG(rating), 1) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- Fix user_subscription_status view with security_invoker
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE auth.uid() = user_id 
   OR has_role(auth.uid(), 'admin');

-- Add admin policies for contract_templates management
CREATE POLICY "Admins can insert contract templates"
ON public.contract_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contract templates"
ON public.contract_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contract templates"
ON public.contract_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy for contract_downloads analytics
CREATE POLICY "Admins can view all downloads"
ON public.contract_downloads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add admin policy for service_trials monitoring
CREATE POLICY "Admins can view all trials"
ON public.service_trials
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));