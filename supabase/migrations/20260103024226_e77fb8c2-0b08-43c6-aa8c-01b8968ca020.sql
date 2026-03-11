-- ===========================================
-- إصلاح سياسة Storage للـ lawyer-documents (ERROR)
-- ===========================================

-- حذف السياسة القديمة التي تسمح للجميع بالرفع
DROP POLICY IF EXISTS "Anyone can upload lawyer documents" ON storage.objects;

-- إنشاء سياسة جديدة تتطلب مصادقة ومجلد خاص بالمستخدم
CREATE POLICY "Authenticated users can upload lawyer documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lawyer-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ===========================================
-- إصلاح lawyer_profiles لإخفاء user_id من العامة (ERROR)
-- ===========================================

-- حذف السياسات القديمة
DROP POLICY IF EXISTS "Lawyer profiles viewable when listing enabled" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Public can view available lawyer profiles" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Lawyers view own profile" ON public.lawyer_profiles;
DROP POLICY IF EXISTS "Anyone can view available lawyers" ON public.lawyer_profiles;

-- سياسة: المحامي يرى ملفه الشخصي فقط، والمدراء يرون الكل
CREATE POLICY "Lawyers view own profile admins view all"
ON public.lawyer_profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- إنشاء view آمن للعرض العام (بدون user_id)
DROP VIEW IF EXISTS public.lawyer_public_info;

CREATE VIEW public.lawyer_public_info 
WITH (security_invoker = true)
AS
SELECT 
  lp.id,
  p.full_name,
  p.avatar_url,
  lp.specialty,
  lp.experience_years,
  lp.hourly_rate,
  lp.location,
  lp.is_available,
  lp.rating,
  lp.reviews_count,
  lp.badges,
  lp.bio
FROM public.lawyer_profiles lp
JOIN public.profiles p ON lp.user_id = p.id
WHERE lp.is_available = true
  AND public.is_lawyer_listing_enabled();

-- ===========================================
-- تشديد lawyer_applications للمدراء فقط (ERROR)
-- ===========================================

-- حذف جميع السياسات الحالية
DROP POLICY IF EXISTS "Admins can view all applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Authenticated users can submit application" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Only admins can view applications" ON public.lawyer_applications;
DROP POLICY IF EXISTS "Only admins can update applications" ON public.lawyer_applications;

-- سياسة: المدراء فقط يرون كل الطلبات (SELECT)
CREATE POLICY "Admins only view applications"
ON public.lawyer_applications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- سياسة: المستخدمون المصادق عليهم يقدمون طلبات (INSERT)
CREATE POLICY "Auth users submit applications"
ON public.lawyer_applications
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND public.check_lawyer_application_rate_limit(email)
);

-- سياسة: المدراء فقط يحدّثون الطلبات (UPDATE)
CREATE POLICY "Admins only update applications"
ON public.lawyer_applications
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- سياسة: المدراء فقط يحذفون الطلبات (DELETE)
CREATE POLICY "Admins only delete applications"
ON public.lawyer_applications
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));