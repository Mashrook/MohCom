-- إضافة security_invoker للـ Views لحماية البيانات

-- إعادة إنشاء public_profiles view مع security_invoker
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE auth.uid() = id 
   OR public.has_role(auth.uid(), 'admin');

-- إعادة إنشاء template_ratings_summary view مع security_invoker
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE VIEW public.template_ratings_summary WITH (security_invoker = true) AS
SELECT 
  template_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- إعادة إنشاء user_subscription_status view مع security_invoker
DROP VIEW IF EXISTS public.user_subscription_status;
CREATE VIEW public.user_subscription_status WITH (security_invoker = true) AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE auth.uid() = user_id 
   OR public.has_role(auth.uid(), 'admin');