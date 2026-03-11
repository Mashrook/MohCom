-- إصلاح الـ Views المكشوفة للعامة

-- 1. تحويل lawyer_public_info إلى view آمن
DROP VIEW IF EXISTS public.lawyer_public_info;
CREATE OR REPLACE VIEW public.lawyer_public_info
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  lp.id,
  p.full_name,
  p.avatar_url,
  lp.specialty,
  lp.experience_years,
  lp.hourly_rate,
  lp.is_available,
  lp.rating,
  lp.reviews_count,
  lp.location,
  lp.bio,
  lp.badges
FROM public.lawyer_profiles lp
JOIN public.profiles p ON lp.user_id = p.id
WHERE lp.is_available = true 
  AND (
    -- فقط المستخدمين المصادق عليهم يمكنهم رؤية المحامين
    auth.uid() IS NOT NULL
    OR
    -- أو إذا كان إعداد عرض المحامين مفعل
    public.is_lawyer_listing_enabled()
  );

-- 2. تحويل public_profiles إلى view آمن - للمستخدمين المصادق عليهم فقط
DROP VIEW IF EXISTS public.public_profiles;
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles
WHERE 
  -- المستخدم يرى ملفه الشخصي
  id = auth.uid()
  OR
  -- المستخدمين المصادق عليهم يمكنهم رؤية ملفات المستخدمين الآخرين (للرسائل)
  auth.uid() IS NOT NULL;

-- 3. تحويل template_ratings_summary إلى view آمن
DROP VIEW IF EXISTS public.template_ratings_summary;
CREATE OR REPLACE VIEW public.template_ratings_summary
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  template_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings
FROM public.contract_ratings
GROUP BY template_id;

-- 4. إضافة دالة للتحقق من صلاحية الوصول للمحتوى العام
CREATE OR REPLACE FUNCTION public.is_public_content_allowed()
RETURNS BOOLEAN AS $$
BEGIN
  -- السماح بالمحتوى العام للجميع (قوالب العقود المجانية، إلخ)
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- 5. تأمين جدول shared_contracts بشكل أفضل
-- إضافة rate limiting على مستوى قاعدة البيانات
CREATE OR REPLACE FUNCTION public.check_shared_contract_access(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_contract RECORD;
  v_view_count INT;
BEGIN
  SELECT * INTO v_contract
  FROM public.shared_contracts
  WHERE share_token = p_token;
  
  IF v_contract IS NULL THEN
    RETURN false;
  END IF;
  
  -- التحقق من انتهاء الصلاحية
  IF v_contract.expires_at IS NOT NULL AND v_contract.expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- التحقق من حد المشاهدات
  IF COALESCE(v_contract.view_count, 0) >= 1000 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;