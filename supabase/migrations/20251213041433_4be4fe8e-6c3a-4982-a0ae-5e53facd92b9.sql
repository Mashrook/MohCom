-- إصلاح مشكلة Security Definer Views
-- حذف العروض القديمة وإعادة إنشائها بـ SECURITY INVOKER

DROP VIEW IF EXISTS public.template_ratings_summary;
DROP VIEW IF EXISTS public.public_profiles;

-- إعادة إنشاء عرض التقييمات المجمعة مع SECURITY INVOKER
CREATE VIEW public.template_ratings_summary 
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  COUNT(*) as total_ratings,
  AVG(rating) as average_rating
FROM public.contract_ratings
GROUP BY template_id;

-- إعادة إنشاء عرض الملفات الشخصية العامة مع SECURITY INVOKER
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- منح صلاحيات القراءة للمستخدمين المصادق عليهم
GRANT SELECT ON public.template_ratings_summary TO authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;