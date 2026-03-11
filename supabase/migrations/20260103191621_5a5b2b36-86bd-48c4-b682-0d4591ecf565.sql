-- إصلاح المشاكل الأمنية

-- 1. إنشاء view للقوالب المجانية فقط (إخفاء القوالب المميزة)
CREATE OR REPLACE VIEW public.public_contract_templates AS
SELECT 
  id,
  title,
  description,
  category,
  sector,
  content,
  downloads_count,
  average_rating,
  ratings_count,
  created_at,
  updated_at
FROM public.contract_templates
WHERE is_premium = false OR is_premium IS NULL;

-- 2. إنشاء view للمحتوى العام بدون معلومات حساسة
CREATE OR REPLACE VIEW public.public_site_content AS
SELECT 
  id,
  page_key,
  title,
  subtitle,
  description,
  content,
  images,
  updated_at
FROM public.site_content;
-- بدون updated_by

-- 3. إنشاء view لإعدادات الأقسام المفعلة فقط
CREATE OR REPLACE VIEW public.public_section_settings AS
SELECT 
  id,
  section_key,
  section_name,
  display_order
FROM public.section_settings
WHERE is_enabled = true;

-- 4. إنشاء view للشروط والأحكام بدون معلومات المنشئ
CREATE OR REPLACE VIEW public.public_terms_versions AS
SELECT 
  id,
  document_type,
  version,
  effective_date,
  summary_ar,
  created_at
FROM public.terms_versions;
-- بدون created_by

-- 5. تقييد الوصول للقوالب المميزة للمشتركين فقط
DROP POLICY IF EXISTS "Anyone can view contract templates" ON public.contract_templates;

CREATE POLICY "Public can view free templates" ON public.contract_templates
  FOR SELECT
  USING (
    is_premium = false 
    OR is_premium IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s 
      WHERE s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );