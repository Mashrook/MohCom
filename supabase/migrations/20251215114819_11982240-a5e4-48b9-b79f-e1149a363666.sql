-- إعادة إنشاء العرض بدون SECURITY DEFINER (يستخدم صلاحيات المستخدم الحالي)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- منح الوصول للمستخدمين المسجلين
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'عرض عام للملفات الشخصية - يستخدم صلاحيات المستخدم الحالي';