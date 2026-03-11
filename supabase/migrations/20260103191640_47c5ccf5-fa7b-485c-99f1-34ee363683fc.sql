-- إصلاح مشكلة SECURITY DEFINER للـ views
-- تحويل الـ views إلى SECURITY INVOKER (الافتراضي الآمن)

-- إعادة إنشاء الـ views بدون SECURITY DEFINER
DROP VIEW IF EXISTS public.public_contract_templates;
DROP VIEW IF EXISTS public.public_site_content;
DROP VIEW IF EXISTS public.public_section_settings;
DROP VIEW IF EXISTS public.public_terms_versions;

-- 1. View للقوالب المجانية - SECURITY INVOKER (افتراضي)
CREATE VIEW public.public_contract_templates 
WITH (security_invoker = true) AS
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

-- 2. View للمحتوى العام
CREATE VIEW public.public_site_content 
WITH (security_invoker = true) AS
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

-- 3. View لإعدادات الأقسام المفعلة
CREATE VIEW public.public_section_settings 
WITH (security_invoker = true) AS
SELECT 
  id,
  section_key,
  section_name,
  display_order
FROM public.section_settings
WHERE is_enabled = true;

-- 4. View للشروط والأحكام
CREATE VIEW public.public_terms_versions 
WITH (security_invoker = true) AS
SELECT 
  id,
  document_type,
  version,
  effective_date,
  summary_ar,
  created_at
FROM public.terms_versions;