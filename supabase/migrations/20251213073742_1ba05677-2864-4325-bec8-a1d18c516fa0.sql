-- إصلاح مشكلة Security Definer Views
-- تحويل الـ views إلى SECURITY INVOKER (الافتراضي الآمن)

-- 1. إعادة إنشاء public_profiles view بدون security definer
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

-- 2. إعادة إنشاء template_ratings_summary view بدون security definer
DROP VIEW IF EXISTS public.template_ratings_summary;

CREATE VIEW public.template_ratings_summary
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  COUNT(*) as total_ratings,
  AVG(rating)::numeric as average_rating
FROM public.contract_ratings
GROUP BY template_id;