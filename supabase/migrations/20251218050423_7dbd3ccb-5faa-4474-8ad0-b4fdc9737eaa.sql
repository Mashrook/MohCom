-- إصلاح أمان Views بإضافة security_invoker

-- حذف Views القديمة وإعادة إنشائها مع الأمان
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.template_ratings_summary;
DROP VIEW IF EXISTS public.user_subscription_status;

-- إعادة إنشاء public_profiles view مع security_invoker
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE 
  -- السماح فقط للمستخدمين المسجلين برؤية الملفات الشخصية
  auth.uid() IS NOT NULL;

-- إعادة إنشاء template_ratings_summary view مع security_invoker
CREATE VIEW public.template_ratings_summary
WITH (security_invoker = true)
AS
SELECT 
  template_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- إعادة إنشاء user_subscription_status view مع تقييد الوصول
CREATE VIEW public.user_subscription_status
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  plan_type,
  status,
  current_period_end
FROM public.subscriptions
WHERE 
  -- كل مستخدم يرى فقط اشتراكه الخاص، أو المدير يرى الكل
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );

-- منح صلاحيات القراءة للمستخدمين المسجلين
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.template_ratings_summary TO authenticated;
GRANT SELECT ON public.user_subscription_status TO authenticated;