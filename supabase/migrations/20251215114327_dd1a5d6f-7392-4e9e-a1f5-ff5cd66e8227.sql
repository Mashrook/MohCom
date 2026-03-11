-- إزالة سياسة وصول المحامين للملفات الشخصية لمنع جمع البيانات
DROP POLICY IF EXISTS "Lawyers can view profiles of conversation partners" ON public.profiles;

-- التأكد من أن عرض public_profiles موجود ومحمي
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- منح الوصول للمستخدمين المسجلين فقط للعرض العام
GRANT SELECT ON public.public_profiles TO authenticated;

-- إضافة تعليق توضيحي
COMMENT ON VIEW public.public_profiles IS 'عرض عام للملفات الشخصية يحتوي فقط على البيانات غير الحساسة (الاسم والصورة)';